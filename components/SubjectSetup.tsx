import React, { useState, useRef } from 'react';
import { Subject, ExtractedSubject } from '../types';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Plus, Trash2, Upload, Sparkles, BookOpen, Link as LinkIcon, Image as ImageIcon, AlertCircle } from 'lucide-react';
import { extractSubjectsFromTimetable } from '../services/geminiService';

interface SubjectSetupProps {
  onComplete: (subjects: Subject[]) => void;
}

export const SubjectSetup: React.FC<SubjectSetupProps> = ({ onComplete }) => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [newSubject, setNewSubject] = useState('');
  const [newTotalLectures, setNewTotalLectures] = useState<string>('0');
  const [newAttendedLectures, setNewAttendedLectures] = useState<string>('0');
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadMode, setUploadMode] = useState<'file' | 'link' | 'drive'>('file');
  const [imageUrl, setImageUrl] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addSubject = () => {
    if (!newSubject.trim()) return;
    
    const subject: Subject = {
      id: Math.random().toString(36).substr(2, 9),
      name: newSubject.trim(),
      totalLectures: parseInt(newTotalLectures) || 0,
      attendedLectures: parseInt(newAttendedLectures) || 0,
      schedule: [],
      history: [],
      topics: []
    };

    setSubjects([...subjects, subject]);
    setNewSubject('');
    setNewTotalLectures('0');
    setNewAttendedLectures('0');
  };

  const removeSubject = (id: string) => {
    setSubjects(subjects.filter(s => s.id !== id));
  };

  const updateSubjectCount = (id: string, field: 'total' | 'attended', value: string) => {
    const numValue = parseInt(value) || 0;
    setSubjects(prev => prev.map(s => {
      if (s.id === id) {
        return {
          ...s,
          totalLectures: field === 'total' ? numValue : s.totalLectures,
          attendedLectures: field === 'attended' ? numValue : s.attendedLectures
        };
      }
      return s;
    }));
  };

  const processExtractedSubjects = (extractedSubjects: ExtractedSubject[]) => {
    const aiSubjects = extractedSubjects.map(extracted => ({
      id: Math.random().toString(36).substr(2, 9),
      name: extracted.name,
      totalLectures: extracted.total || 0,
      attendedLectures: extracted.attended || 0,
      schedule: extracted.schedule || [],
      history: [],
      topics: []
    }));
    setSubjects(prev => [...prev, ...aiSubjects]);
  };

  // --- Image Compression Logic ---
  const compressImage = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      // If it's a PDF or text, return as base64 directly without resizing
      if (!blob.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
        return;
      }

      const url = URL.createObjectURL(blob);
      const img = new Image();
      img.src = url;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1024; // Resize to max 1024px width for speed
        let width = img.width;
        let height = img.height;

        if (width > MAX_WIDTH) {
          height = Math.round(height * (MAX_WIDTH / width));
          width = MAX_WIDTH;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);

        // Compress to JPEG 70% quality
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
        URL.revokeObjectURL(url);
        resolve(compressedBase64);
      };
      img.onerror = (err) => {
        URL.revokeObjectURL(url);
        reject(err);
      };
    });
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setErrorMsg('');
    try {
      // Compress if image, else read as is
      const base64 = await compressImage(file);
      
      // If original was image, we send as jpeg after compression
      // If PDF, we send as original type
      const mimeType = file.type.startsWith('image/') ? 'image/jpeg' : file.type;

      try {
        const result = await extractSubjectsFromTimetable(base64, mimeType);
        processExtractedSubjects(result.subjects);
      } catch (err: any) {
        setErrorMsg(err.message || "Failed to read timetable.");
      } finally {
        setIsProcessing(false);
      }
    } catch (error) {
      console.error(error);
      setErrorMsg("Error processing file.");
      setIsProcessing(false);
    }
  };

  const fetchResourceWithFallback = async (url: string): Promise<{ blob: Blob, mimeType: string }> => {
    const fetchWithTimeout = (resource: string, timeout = 5000) => {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), timeout);
      return fetch(resource, { signal: controller.signal })
        .then(response => {
          clearTimeout(id);
          return response;
        });
    };

    const validateAndReturn = (blob: Blob) => {
      const validTypes = ['image/', 'application/pdf', 'text/'];
      const isValid = validTypes.some(t => blob.type.startsWith(t));
      if (!isValid && blob.type !== 'application/json') {
        console.warn(`Warning: Uncommon file type ${blob.type}. AI parsing might fail.`);
      }
      return { blob, mimeType: blob.type || 'text/html' }; 
    };

    // 1. Try Direct (Short timeout to fail fast if CORS blocks)
    try {
      const res = await fetchWithTimeout(url, 3000); 
      if (res.ok) {
        const blob = await res.blob();
        return validateAndReturn(blob);
      }
    } catch (e) {
      // Ignore and try proxy
    }

    // 2. Try Proxy 1 (Medium timeout)
    try {
      const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`;
      const res = await fetchWithTimeout(proxyUrl, 8000);
      if (res.ok) {
        const blob = await res.blob();
        // Check if proxy returned an HTML error page instead of image
        if (blob.type.includes('text/html') && url.match(/\.(png|jpg|jpeg|webp)$/i)) {
           throw new Error("Proxy returned HTML instead of Image");
        }
        return validateAndReturn(blob);
      }
    } catch (e) {
       // Ignore and try next
    }

    // 3. Try Proxy 2 (Longer timeout)
    try {
      const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
      const res = await fetchWithTimeout(proxyUrl, 10000);
      if (res.ok) {
        const blob = await res.blob();
        return validateAndReturn(blob);
      }
    } catch (e) {
       // All failed
    }

    throw new Error("Unable to access link. Please ensure it is public.");
  };

  const handleUrlUpload = async () => {
    if (!imageUrl) return;
    setIsProcessing(true);
    setErrorMsg('');
    
    try {
       const { blob, mimeType } = await fetchResourceWithFallback(imageUrl);
       
       // Compress before sending
       const base64 = await compressImage(blob);
       // Determine final mime type (if image, it became jpeg)
       const finalMimeType = blob.type.startsWith('image/') ? 'image/jpeg' : mimeType;

       try {
         const result = await extractSubjectsFromTimetable(base64, finalMimeType);
         processExtractedSubjects(result.subjects);
       } catch (err: any) {
         console.error(err);
         setErrorMsg(err.message || "AI could not extract subjects.");
       } finally {
         setIsProcessing(false);
       }

    } catch (e) {
      console.error(e);
      setErrorMsg("Could not load content from this link. Please save it as a file and use 'Upload File'.");
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-8 min-h-screen">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
          <BookOpen className="text-primary" />
          Subject & Attendance Setup
        </h2>
        <p className="text-gray-600 mt-2">
          Add your subjects. You can also upload a timetable or attendance report to auto-fill details and schedule.
        </p>
      </div>

      {/* AI Upload Section */}
      <div className="bg-white rounded-xl shadow-sm border border-indigo-100 overflow-hidden mb-8">
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-4 border-b border-indigo-100">
           <h3 className="font-bold text-indigo-900 flex items-center gap-2">
              <Sparkles className="text-accent" size={20} />
              Auto-Fill via AI
            </h3>
        </div>
        
        <div className="p-6">
          <div className="flex gap-4 mb-4 border-b border-gray-100 pb-2 overflow-x-auto">
             <button 
               onClick={() => { setUploadMode('file'); setErrorMsg(''); }}
               className={`pb-2 text-sm font-medium transition-colors whitespace-nowrap ${uploadMode === 'file' ? 'text-primary border-b-2 border-primary' : 'text-gray-500 hover:text-gray-700'}`}
             >
               Upload File
             </button>
             <button 
               onClick={() => { setUploadMode('link'); setErrorMsg(''); }}
               className={`pb-2 text-sm font-medium transition-colors whitespace-nowrap ${uploadMode === 'link' ? 'text-primary border-b-2 border-primary' : 'text-gray-500 hover:text-gray-700'}`}
             >
               Any Link / Drive
             </button>
          </div>

          {errorMsg && (
            <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg flex items-center gap-2 animate-fadeIn">
              <AlertCircle size={16} className="shrink-0" /> 
              <span>{errorMsg}</span>
            </div>
          )}

          {uploadMode === 'file' && (
            <div className="flex flex-col items-center justify-center border-2 border-dashed border-indigo-200 rounded-xl p-8 bg-indigo-50/50 hover:bg-indigo-50 transition-colors cursor-pointer" onClick={() => fileInputRef.current?.click()}>
               <input 
                  type="file" 
                  ref={fileInputRef}
                  className="hidden" 
                  accept="image/*,application/pdf"
                  onChange={handleFileUpload}
                />
                <Upload className="w-10 h-10 text-indigo-400 mb-2" />
                <p className="text-sm text-indigo-700 font-medium">Click to upload document</p>
                <p className="text-xs text-indigo-400 mt-1">Timetable, Attendance Report (Img/PDF)</p>
                {isProcessing && <p className="text-sm text-accent mt-2 animate-pulse font-medium">Compressing & Analyzing...</p>}
            </div>
          )}

          {uploadMode === 'link' && (
            <div className="space-y-3">
              <p className="text-xs text-gray-500">Paste any link: Image, PDF, Google Doc, or Google Sheet.</p>
              <div className="flex flex-col sm:flex-row gap-2">
                <Input 
                  label="" 
                  placeholder="https://docs.google.com/..." 
                  value={imageUrl}
                  onChange={e => setImageUrl(e.target.value)}
                  className="mb-0"
                />
                <Button onClick={handleUrlUpload} disabled={!imageUrl || isProcessing}>
                   {isProcessing ? 'Scanning...' : 'Scan Link'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Manual Entry */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-6 relative overflow-visible">
        <h3 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
          <Plus size={18} className="text-gray-400" />
          Add Subject Manually
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
          <div className="md:col-span-6">
            <Input 
              label="Subject Name" 
              placeholder="e.g. Mathematics" 
              value={newSubject}
              onChange={e => setNewSubject(e.target.value)}
            />
          </div>
          <div className="md:col-span-3">
             <Input 
              label="Total Held" 
              type="number"
              placeholder="0" 
              value={newTotalLectures}
              onChange={e => setNewTotalLectures(e.target.value)}
            />
          </div>
          <div className="md:col-span-3">
             <Input 
              label="Attended" 
              type="number"
              placeholder="0" 
              value={newAttendedLectures}
              onChange={e => setNewAttendedLectures(e.target.value)}
            />
          </div>
        </div>
        <Button onClick={addSubject} disabled={!newSubject} className="mt-4 w-full md:w-auto">
          Add Subject
        </Button>
      </div>

      {/* List */}
      <div className="space-y-3 mb-24">
        <h3 className="font-semibold text-gray-700 pl-1">Your Subjects ({subjects.length})</h3>
        {subjects.length === 0 && (
          <div className="text-center py-12 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50">
            <ImageIcon className="mx-auto h-12 w-12 text-gray-300 mb-2" />
            <p>No subjects added yet.</p>
          </div>
        )}
        {subjects.map(sub => (
          <div key={sub.id} className="flex flex-col sm:flex-row sm:items-center justify-between bg-white p-4 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow gap-4">
            <div className="flex items-center gap-4 flex-1">
              <div className="h-10 w-10 rounded-full bg-indigo-100 flex-shrink-0 flex items-center justify-center text-indigo-600 font-bold">
                {sub.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="font-bold text-gray-800 truncate" title={sub.name}>{sub.name}</p>
                {sub.schedule && sub.schedule.length > 0 && (
                   <p className="text-xs text-green-600 font-medium">{sub.schedule.length} classes scheduled</p>
                )}
              </div>
            </div>
            
            {/* Editable Counts */}
            <div className="flex items-center gap-3">
              <div className="flex flex-col">
                 <label className="text-[10px] text-gray-400 font-semibold mb-1">Held</label>
                 <input 
                   type="number" 
                   min="0"
                   className="w-16 p-1 border border-gray-200 rounded text-center text-sm focus:ring-1 focus:ring-primary outline-none"
                   value={sub.totalLectures}
                   onChange={(e) => updateSubjectCount(sub.id, 'total', e.target.value)}
                 />
              </div>
              <div className="flex flex-col">
                 <label className="text-[10px] text-gray-400 font-semibold mb-1">Attended</label>
                 <input 
                   type="number" 
                   min="0"
                   className="w-16 p-1 border border-gray-200 rounded text-center text-sm focus:ring-1 focus:ring-primary outline-none"
                   value={sub.attendedLectures}
                   onChange={(e) => updateSubjectCount(sub.id, 'attended', e.target.value)}
                 />
              </div>
              <button 
                onClick={() => removeSubject(sub.id)}
                className="text-gray-400 hover:text-red-500 p-2 rounded-full hover:bg-red-50 transition-colors ml-2 mt-4"
              >
                <Trash2 size={18} />
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-md border-t border-gray-200 md:static md:bg-transparent md:border-0 md:p-0 z-10">
        <Button 
          className="w-full py-4 text-lg shadow-lg" 
          disabled={subjects.length === 0}
          onClick={() => onComplete(subjects)}
        >
          Next Step
        </Button>
      </div>
    </div>
  );
};