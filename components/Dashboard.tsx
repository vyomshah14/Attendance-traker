import React, { useState, useEffect } from 'react';
import { Subject, UserProfile, AttendanceRecord, StudyLog, ClassSchedule } from '../types';
import { Button } from './ui/Button';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { CheckCircle, XCircle, Clock, CalendarOff, ArrowLeft, X, BookOpen, AlertCircle, CheckSquare, Flag, PenTool, Plus, Calendar, Edit2, Save, Bell, ChevronRight } from 'lucide-react';

interface DashboardProps {
  subjects: Subject[];
  user: UserProfile;
  onUpdateSubjects: (subjects: Subject[]) => void;
  onBack: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ subjects, user, onUpdateSubjects, onBack }) => {
  const [localSubjects, setLocalSubjects] = useState<Subject[]>(subjects);
  const [selectedHistorySubject, setSelectedHistorySubject] = useState<Subject | null>(null);
  const [selectedEditSubject, setSelectedEditSubject] = useState<Subject | null>(null);
  const [activeTab, setActiveTab] = useState<'ATTENDANCE' | 'STUDY'>('ATTENDANCE');
  
  // Study Tracker State
  const [studyLogs, setStudyLogs] = useState<StudyLog[]>([]);
  const [isLoggingWork, setIsLoggingWork] = useState(false);
  const [logSubjectId, setLogSubjectId] = useState(subjects[0]?.id || '');
  const [logDescription, setLogDescription] = useState('');
  const [logNeedsFollowUp, setLogNeedsFollowUp] = useState(false);
  const [logFollowUpDate, setLogFollowUpDate] = useState('');

  // Clock for reminders
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    // Update time every minute to refresh reminders
    const timer = setInterval(() => setCurrentTime(new Date()), 60000); 
    return () => clearInterval(timer);
  }, []);

  // --- Attendance Logic ---

  const updateAttendance = (id: string, type: 'present' | 'absent' | 'cancelled') => {
    const updated = localSubjects.map(sub => {
      if (sub.id !== id) return sub;
      
      let newTotal = sub.totalLectures;
      let newAttended = sub.attendedLectures;
      
      const record: AttendanceRecord = {
        id: Math.random().toString(36).substr(2, 9),
        date: new Date().toISOString(),
        status: type
      };

      const newHistory = [...(sub.history || []), record];

      if (type === 'present') {
        newTotal++;
        newAttended++;
      } else if (type === 'absent') {
        newTotal++;
      }
      
      return { 
        ...sub, 
        totalLectures: newTotal, 
        attendedLectures: newAttended,
        history: newHistory
      };
    });
    setLocalSubjects(updated);
    onUpdateSubjects(updated);
  };

  const handleEditSubjectSave = (id: string, newTotal: number, newAttended: number) => {
    const updated = localSubjects.map(sub => {
      if(sub.id === id) {
        return { ...sub, totalLectures: newTotal, attendedLectures: newAttended };
      }
      return sub;
    });
    setLocalSubjects(updated);
    onUpdateSubjects(updated);
    setSelectedEditSubject(null);
  };

  const getPercentage = (sub: Subject) => {
    return sub.totalLectures === 0 ? 100 : Math.round((sub.attendedLectures / sub.totalLectures) * 100);
  };

  const getStatusMessage = (sub: Subject) => {
    const percentage = getPercentage(sub);
    const target = user.targetAttendance;
    
    if (percentage >= target) {
      const bunkable = Math.floor((100 * sub.attendedLectures - target * sub.totalLectures) / target);
      if (bunkable <= 0) return { msg: "On track. Don't miss!", color: "text-yellow-600", bg: "bg-yellow-100" };
      return { msg: `Can bunk ${bunkable} classes`, color: "text-green-600", bg: "bg-green-100" };
    } else {
      const needed = Math.ceil((target * sub.totalLectures - 100 * sub.attendedLectures) / (100 - target));
      return { msg: `Attend next ${needed} classes!`, color: "text-red-600", bg: "bg-red-100" };
    }
  };

  // Overall Attendance
  const totalClasses = localSubjects.reduce((acc, curr) => acc + curr.totalLectures, 0);
  const totalAttended = localSubjects.reduce((acc, curr) => acc + curr.attendedLectures, 0);
  const overallPercentage = totalClasses === 0 ? 100 : Math.round((totalAttended / totalClasses) * 100);
  
  const chartData = [
    { name: 'Attended', value: totalAttended },
    { name: 'Missed', value: totalClasses - totalAttended },
  ];
  const COLORS = ['#10B981', '#EF4444'];

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  };
  
  const formatShortDate = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // --- Schedule & Reminder Logic ---
  
  const getMinutesFromMidnight = (timeStr: string): number => {
    if (!timeStr) return -1;
    try {
      // Handle range "10:00 AM - 11:00 AM" -> take "10:00 AM"
      const startStr = timeStr.split('-')[0].trim().toUpperCase();
      
      const match = startStr.match(/(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?/);
      if (!match) return -1;
      
      let [_, hStr, mStr, meridiem] = match;
      let hours = parseInt(hStr);
      let minutes = mStr ? parseInt(mStr) : 0;
      
      if (meridiem === 'PM' && hours < 12) hours += 12;
      if (meridiem === 'AM' && hours === 12) hours = 0;
      
      return hours * 60 + minutes;
    } catch (e) {
      return -1;
    }
  };

  const getCurrentDaySchedule = () => {
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const currentDay = days[currentTime.getDay()];
    
    const todaysClasses: { subject: string, time: string, day: string, startMinutes: number }[] = [];
    
    localSubjects.forEach(sub => {
      if(sub.schedule) {
        sub.schedule.forEach(sched => {
          if(sched.day && sched.day.toLowerCase() === currentDay.toLowerCase()) {
            todaysClasses.push({
              subject: sub.name,
              time: sched.time,
              day: sched.day,
              startMinutes: getMinutesFromMidnight(sched.time)
            });
          }
        });
      }
    });

    return todaysClasses.sort((a, b) => a.startMinutes - b.startMinutes);
  };

  const todaysSchedule = getCurrentDaySchedule();

  const getUpcomingClass = () => {
    const currentMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();
    // Find the first class that hasn't started yet, or started recently (within last 15 mins implies 'Now')
    // For "Upcoming", strictly look for startMinutes > currentMinutes
    const upcoming = todaysSchedule.find(c => c.startMinutes > currentMinutes);
    return upcoming;
  };

  const upcomingClass = getUpcomingClass();
  const timeUntilClass = upcomingClass ? upcomingClass.startMinutes - (currentTime.getHours() * 60 + currentTime.getMinutes()) : 0;
  const hoursUntil = Math.floor(timeUntilClass / 60);
  const minutesUntil = timeUntilClass % 60;

  // --- Study Logic ---

  const handleLogSubmit = () => {
    if(!logDescription) return;
    const newLog: StudyLog = {
      id: Math.random().toString(36).substr(2, 9),
      subjectId: logSubjectId,
      description: logDescription,
      needsFollowUp: logNeedsFollowUp,
      followUpDate: logNeedsFollowUp ? logFollowUpDate : undefined,
      timestamp: new Date().toISOString()
    };
    setStudyLogs([newLog, ...studyLogs]);
    setLogDescription('');
    setLogNeedsFollowUp(false);
    setLogFollowUpDate('');
    setIsLoggingWork(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20 font-sans">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10 border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center mb-4">
             <div>
              <h1 className="text-xl font-bold text-gray-800">Hi, {user.name.split(' ')[0]} 👋</h1>
              <p className="text-xs text-gray-500 truncate max-w-[200px]">{user.college}</p>
             </div>
             <div className={`flex items-center gap-2 px-4 py-2 rounded-full shadow-sm ${overallPercentage >= user.targetAttendance ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                <span className="text-sm font-bold">Overall: {overallPercentage}%</span>
             </div>
          </div>
          
          {/* Tab Switcher */}
          <div className="flex p-1 bg-gray-100 rounded-lg">
            <button 
              onClick={() => setActiveTab('ATTENDANCE')}
              className={`flex-1 py-2 text-sm font-semibold rounded-md transition-all ${activeTab === 'ATTENDANCE' ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Attendance
            </button>
            <button 
              onClick={() => setActiveTab('STUDY')}
              className={`flex-1 py-2 text-sm font-semibold rounded-md transition-all ${activeTab === 'STUDY' ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Study Tracker
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        
        {activeTab === 'ATTENDANCE' ? (
          <>
            {/* Reminder Banner */}
            {upcomingClass && (
               <div className="bg-indigo-600 rounded-xl p-4 shadow-lg text-white flex items-center justify-between animate-fadeIn transform transition-all hover:scale-[1.01]">
                 <div className="flex items-center gap-4">
                   <div className="bg-white/20 p-3 rounded-full animate-pulse">
                     <Bell size={24} className="text-white" />
                   </div>
                   <div>
                     <p className="text-xs text-indigo-200 font-semibold uppercase tracking-wider">Upcoming Lecture</p>
                     <h3 className="font-bold text-lg leading-tight">{upcomingClass.subject}</h3>
                     <p className="text-sm text-indigo-100 mt-1 flex items-center gap-1">
                       <Clock size={14} /> 
                       Starts at {upcomingClass.time.split('-')[0].trim()}
                     </p>
                   </div>
                 </div>
                 <div className="text-right bg-white/10 px-3 py-2 rounded-lg backdrop-blur-sm">
                   <span className="block text-2xl font-bold">
                     {hoursUntil > 0 ? `${hoursUntil}h ` : ''}{minutesUntil}m
                   </span>
                   <span className="text-[10px] text-indigo-200 uppercase">Remaining</span>
                 </div>
               </div>
            )}

            {/* Today's Schedule Card */}
            {todaysSchedule.length > 0 && (
               <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-200">
                 <h3 className="font-bold text-lg mb-3 flex items-center gap-2 text-gray-800">
                   <Calendar size={20} className="text-primary" /> Today's Schedule
                 </h3>
                 <div className="space-y-2">
                   {todaysSchedule.map((cls, idx) => {
                     const currentMins = currentTime.getHours() * 60 + currentTime.getMinutes();
                     // Simplified check: assume 1 hour duration if range not parsed, so end is start + 60
                     // If range exists in string "10:00 - 11:00", we could parse end time.
                     // For now, simple logic: Past = start < current - 60, Active = start <= current, Future = start > current
                     const isPast = cls.startMinutes < (currentMins - 60); 
                     const isUpcoming = cls.startMinutes > currentMins;
                     const isNow = !isPast && !isUpcoming;

                     return (
                       <div key={idx} className={`flex justify-between items-center p-3 rounded-lg border transition-colors ${
                         isNow ? 'bg-indigo-50 border-indigo-200' : isPast ? 'bg-gray-50 border-gray-100 opacity-60' : 'bg-white border-gray-100'
                       }`}>
                         <div className="flex items-center gap-3">
                           <div className={`w-2 h-2 rounded-full ${isNow ? 'bg-green-500 animate-pulse' : isPast ? 'bg-gray-300' : 'bg-indigo-300'}`}></div>
                           <span className={`font-semibold text-sm ${isPast ? 'text-gray-500 line-through' : 'text-gray-800'}`}>{cls.subject}</span>
                         </div>
                         <div className="flex items-center gap-2">
                           {isNow && <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold">NOW</span>}
                           <span className="text-xs text-gray-500 font-mono bg-gray-100 px-2 py-1 rounded">{cls.time}</span>
                         </div>
                       </div>
                     );
                   })}
                 </div>
               </div>
            )}

            {/* Overall Stats Card */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col sm:flex-row items-center justify-around gap-6">
              <div className="w-32 h-32 relative flex-shrink-0">
                 <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={35}
                      outerRadius={50}
                      fill="#8884d8"
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <span className="text-sm font-bold text-gray-600">{overallPercentage}%</span>
                </div>
              </div>
              <div className="flex-1 space-y-2 text-center sm:text-left">
                <h3 className="font-bold text-gray-800 text-lg">Attendance Summary</h3>
                <p className="text-sm text-gray-500 leading-relaxed">
                  Your target is <span className="font-bold text-primary">{user.targetAttendance}%</span>.
                  {overallPercentage < user.targetAttendance 
                    ? " You need to focus on attending more classes to reach your goal."
                    : " You are doing great! Keep maintaining your attendance."}
                </p>
              </div>
            </div>

            {/* Subjects Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {localSubjects.map(sub => {
                const status = getStatusMessage(sub);
                const pct = getPercentage(sub);
                
                return (
                  <div key={sub.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 relative overflow-hidden group">
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="font-bold text-lg text-gray-800 truncate pr-2 w-3/4" title={sub.name}>{sub.name}</h3>
                      <div className="flex gap-1">
                        <button 
                          onClick={() => setSelectedEditSubject(sub)}
                          className="text-gray-400 hover:text-primary transition-colors p-1"
                          title="Edit Counts"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          onClick={() => setSelectedHistorySubject(sub)}
                          className="text-gray-400 hover:text-primary transition-colors p-1"
                          title="View History"
                        >
                          <Clock size={16} />
                        </button>
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center text-sm mb-4">
                      <span className="text-gray-500 font-medium">{sub.attendedLectures} / {sub.totalLectures}</span>
                      <span className={`text-xs px-2 py-1 rounded-full font-bold ${status.bg} ${status.color}`}>
                        {status.msg}
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="relative w-full bg-gray-100 rounded-full h-3 mb-6 overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-700 ease-out ${pct >= user.targetAttendance ? 'bg-gradient-to-r from-emerald-400 to-emerald-500' : 'bg-gradient-to-r from-red-400 to-red-500'}`} 
                        style={{ width: `${pct}%` }}
                      ></div>
                      <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white drop-shadow-md">
                        {pct}%
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="grid grid-cols-3 gap-2">
                      <Button 
                        variant="ghost" 
                        className="bg-emerald-50 text-emerald-600 hover:bg-emerald-100 hover:scale-105 active:scale-95 text-xs px-2 py-2"
                        onClick={() => updateAttendance(sub.id, 'present')}
                      >
                        <CheckCircle size={16} /> Present
                      </Button>
                      <Button 
                        variant="ghost" 
                        className="bg-red-50 text-red-600 hover:bg-red-100 hover:scale-105 active:scale-95 text-xs px-2 py-2"
                        onClick={() => updateAttendance(sub.id, 'absent')}
                      >
                        <XCircle size={16} /> Absent
                      </Button>
                      <Button 
                        variant="ghost" 
                        className="bg-gray-50 text-gray-500 hover:bg-gray-100 hover:scale-105 active:scale-95 text-xs px-2 py-2"
                        onClick={() => updateAttendance(sub.id, 'cancelled')}
                        title="Class Cancelled"
                      >
                        <CalendarOff size={16} /> Off
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          /* STUDY TRACKER VIEW */
          <div className="space-y-6 animate-fadeIn">
            <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100">
              <div>
                <h2 className="text-2xl font-bold text-gray-800">Study Logs</h2>
                <p className="text-xs text-gray-500">Track your daily progress and revision</p>
              </div>
              <Button onClick={() => setIsLoggingWork(true)} className="shadow-lg hover:shadow-xl transform transition hover:-translate-y-0.5">
                <Plus size={18} /> Log Work
              </Button>
            </div>

            {/* Subject Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               {localSubjects.map(sub => (
                 <div key={sub.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                    <h3 className="font-bold text-lg text-gray-800 mb-2 flex items-center gap-2">
                      <BookOpen size={18} className="text-primary" /> {sub.name}
                    </h3>
                    <div className="space-y-1">
                      {sub.topics && sub.topics.length > 0 ? (
                        sub.topics.map(topic => (
                          <div key={topic.id} className="text-sm text-gray-600 flex items-center gap-2 px-2 py-1 rounded hover:bg-gray-50">
                             <span className="w-1.5 h-1.5 rounded-full bg-indigo-300"></span>
                             {topic.name}
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-gray-400 italic">No specific topics added.</p>
                      )}
                    </div>
                 </div>
               ))}
            </div>

            {/* Recent Logs */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
               <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                 <h3 className="font-bold text-gray-700">Recent Activity</h3>
                 <span className="text-xs text-gray-400">{studyLogs.length} entries</span>
               </div>
               <div className="divide-y divide-gray-100">
                 {studyLogs.length === 0 ? (
                   <div className="p-12 text-center text-gray-400">
                     <CheckSquare className="w-12 h-12 mx-auto mb-3 opacity-20" />
                     <p>No study logs yet. Click "Log Work" to start tracking.</p>
                   </div>
                 ) : (
                   studyLogs.map(log => {
                     const subjectName = localSubjects.find(s => s.id === log.subjectId)?.name || 'Unknown Subject';
                     return (
                       <div key={log.id} className="p-4 hover:bg-gray-50 transition-colors group">
                          <div className="flex justify-between items-start mb-1">
                             <div className="flex items-center gap-2 flex-wrap">
                               <span className="text-xs font-bold text-primary uppercase tracking-wider bg-indigo-50 px-2 py-0.5 rounded">{subjectName}</span>
                               {log.needsFollowUp && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-white bg-orange-500 px-2 py-0.5 rounded-full">
                                  <Flag size={10} /> 
                                  {log.followUpDate ? `Follow-up: ${formatShortDate(log.followUpDate)}` : 'Follow-up needed'}
                                </span>
                               )}
                             </div>
                             <span className="text-xs text-gray-400 whitespace-nowrap">{formatDate(log.timestamp)}</span>
                          </div>
                          <p className="text-gray-800 mt-2 text-sm">{log.description}</p>
                       </div>
                     );
                   })
                 )}
               </div>
            </div>
          </div>
        )}
      </div>

      {/* History Modal */}
      {selectedHistorySubject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[80vh]">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-lg text-gray-800">{selectedHistorySubject.name} History</h3>
              <button onClick={() => setSelectedHistorySubject(null)} className="p-1 hover:bg-gray-200 rounded-full">
                <X size={20} />
              </button>
            </div>
            
            <div className="overflow-y-auto p-4 flex-1">
              {!selectedHistorySubject.history || selectedHistorySubject.history.length === 0 ? (
                <div className="text-center text-gray-400 py-8">
                  <Clock className="w-12 h-12 mx-auto mb-2 opacity-20" />
                  <p>No attendance history recorded yet.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {[...selectedHistorySubject.history].reverse().map((record) => (
                    <div key={record.id} className="flex justify-between items-center p-3 rounded-lg border border-gray-50 bg-gray-50 hover:bg-gray-100 transition-colors">
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-gray-700">{formatDate(record.date)}</span>
                        <span className="text-xs text-gray-400">Manual Entry</span>
                      </div>
                      <span className={`text-xs font-bold px-2 py-1 rounded capitalize
                        ${record.status === 'present' ? 'bg-green-100 text-green-700' : 
                          record.status === 'absent' ? 'bg-red-100 text-red-700' : 'bg-gray-200 text-gray-600'}`}>
                        {record.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="p-4 border-t border-gray-100 text-center">
              <Button variant="secondary" className="w-full" onClick={() => setSelectedHistorySubject(null)}>Close</Button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Edit Subject Modal */}
      {selectedEditSubject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
             <div className="flex justify-between items-center mb-4">
                 <h3 className="text-lg font-bold text-gray-800">Edit {selectedEditSubject.name}</h3>
                 <button onClick={() => setSelectedEditSubject(null)} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
              </div>
              <p className="text-xs text-gray-500 mb-4">
                Manually correct the baseline numbers if they are incorrect. This is useful for initializing data.
              </p>
              
              <div className="space-y-4">
                <div className="flex flex-col gap-1">
                   <label className="text-sm font-semibold text-gray-700">Total Lectures Held</label>
                   <input 
                     type="number"
                     className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                     defaultValue={selectedEditSubject.totalLectures}
                     id="edit-total"
                   />
                </div>
                <div className="flex flex-col gap-1">
                   <label className="text-sm font-semibold text-gray-700">Lectures Attended</label>
                   <input 
                     type="number"
                     className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                     defaultValue={selectedEditSubject.attendedLectures}
                     id="edit-attended"
                   />
                </div>
                
                <div className="pt-2">
                   <Button onClick={() => {
                      const t = parseInt((document.getElementById('edit-total') as HTMLInputElement).value) || 0;
                      const a = parseInt((document.getElementById('edit-attended') as HTMLInputElement).value) || 0;
                      handleEditSubjectSave(selectedEditSubject.id, t, a);
                   }} className="w-full">
                     <Save size={18} /> Save Changes
                   </Button>
                </div>
              </div>
          </div>
        </div>
      )}

      {/* Log Work Modal */}
      {isLoggingWork && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fadeIn">
           <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
              <div className="flex justify-between items-center mb-4">
                 <h3 className="text-xl font-bold text-gray-800">Log Study Session</h3>
                 <button onClick={() => setIsLoggingWork(false)} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
              </div>
              
              <div className="space-y-4">
                <div>
                   <label className="text-sm font-semibold text-gray-700 block mb-1">Subject</label>
                   <select 
                     className="w-full p-2 border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                     value={logSubjectId}
                     onChange={(e) => setLogSubjectId(e.target.value)}
                   >
                     {localSubjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                   </select>
                </div>

                <div>
                   <label className="text-sm font-semibold text-gray-700 block mb-1">What work did you do?</label>
                   <textarea 
                     className="w-full p-3 border border-gray-200 rounded-lg bg-gray-50 focus:bg-white focus:ring-2 focus:ring-primary outline-none transition-all resize-none h-24"
                     placeholder="e.g. Completed Chapter 4 exercises, Revised formulas..."
                     value={logDescription}
                     onChange={(e) => setLogDescription(e.target.value)}
                   />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 bg-orange-50 rounded-lg border border-orange-100 cursor-pointer" onClick={() => setLogNeedsFollowUp(!logNeedsFollowUp)}>
                     <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${logNeedsFollowUp ? 'bg-orange-500 border-orange-500' : 'border-gray-300 bg-white'}`}>
                        {logNeedsFollowUp && <CheckCircle size={14} className="text-white" />}
                     </div>
                     <label className="text-sm text-gray-800 font-medium cursor-pointer">Mark for follow-up (Needs revision)</label>
                  </div>
                  
                  {logNeedsFollowUp && (
                     <div className="bg-orange-50/50 p-3 rounded-lg border border-orange-100 animate-fadeIn">
                       <label className="text-xs font-bold text-orange-700 mb-1 block flex items-center gap-1">
                          <Calendar size={12} /> Target Date
                       </label>
                       <input 
                         type="date"
                         className="w-full p-2 border border-gray-200 rounded text-sm focus:ring-2 focus:ring-orange-200 outline-none"
                         value={logFollowUpDate}
                         onChange={(e) => setLogFollowUpDate(e.target.value)}
                       />
                     </div>
                  )}
                </div>

                <div className="flex gap-3 pt-4">
                  <Button variant="secondary" className="flex-1" onClick={() => setIsLoggingWork(false)}>Cancel</Button>
                  <Button className="flex-1" onClick={handleLogSubmit} disabled={!logDescription}>Save Log</Button>
                </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};