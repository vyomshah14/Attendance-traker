import React, { useState } from 'react';
import { UserProfile } from '../types';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { User, School, Mail, Phone, Target, ArrowRight, Sparkles } from 'lucide-react';

interface OnboardingProps {
  onComplete: (profile: UserProfile) => void;
}

const INDIAN_COLLEGES = [
  // IITs & Premier Institutes
  "Indian Institute of Technology (IIT), Bombay",
  "Indian Institute of Technology (IIT), Delhi",
  "Indian Institute of Technology (IIT), Madras",
  "Indian Institute of Technology (IIT), Kanpur",
  "Indian Institute of Technology (IIT), Kharagpur",
  "Indian Institute of Technology (IIT), Roorkee",
  "Indian Institute of Technology (IIT), Guwahati",
  "Indian Institute of Science (IISc), Bangalore",
  "All India Institute of Medical Sciences (AIIMS), Delhi",
  "Jawaharlal Nehru University (JNU), Delhi",
  "University of Delhi (DU)",
  "Banaras Hindu University (BHU)",
  "Birla Institute of Technology and Science (BITS), Pilani",
  "Vellore Institute of Technology (VIT)",
  "Manipal Academy of Higher Education",
  "Amity University",
  "SRM Institute of Science and Technology",
  "Anna University, Chennai",
  "Jadavpur University, Kolkata",
  "National Institute of Technology (NIT), Trichy",
  "National Institute of Technology (NIT), Warangal",
  "Thapar Institute of Engineering and Technology",
  "Lovely Professional University (LPU)",
  "Chandigarh University",
  "Symbiosis International University",
  "Narsee Monjee Institute of Management Studies (NMIMS)",
  "Christ University, Bangalore",
  "Jamia Millia Islamia, Delhi",
  "Aligarh Muslim University (AMU)",
  "Savitribai Phule Pune University",
  "University of Mumbai",
  "Visvesvaraya Technological University (VTU)",
  
  // Navi Mumbai Colleges
  "Fr. C. Rodrigues Institute of Technology (FCRIT), Vashi",
  "Ramrao Adik Institute of Technology (RAIT), Nerul",
  "SIES Graduate School of Technology, Nerul",
  "Terna Engineering College, Nerul",
  "Pillai College of Engineering, Panvel",
  "Datta Meghe College of Engineering, Airoli",
  "Bharati Vidyapeeth College of Engineering, Kharghar",
  "MGM College of Engineering and Technology, Kamothe",
  "Saraswati College of Engineering, Kharghar",
  "AC Patil College of Engineering, Kharghar",
  "Lokmanya Tilak College of Engineering, Koparkhairane",
  "ICL Motilal Jhunjhunwala College, Vashi",
  "Karmaveer Bhaurao Patil College, Vashi",
  "SIES College of Arts, Science and Commerce, Nerul",
  "Western College of Commerce and Business Management, Sanpada",
  "Changu Kana Thakur Arts, Commerce and Science College, New Panvel",
  "IES Management College and Research Centre, Bandra/Navi Mumbai",
  "ITM Business School, Kharghar"
];

export const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
  const [formData, setFormData] = useState<UserProfile>({
    name: '',
    college: '',
    age: '',
    email: '',
    phone: '',
    targetAttendance: 75
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.name && formData.college && formData.targetAttendance) {
      onComplete(formData);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 p-4 relative overflow-hidden">
      {/* Decorative Circles */}
      <div className="absolute top-0 left-0 w-64 h-64 bg-white opacity-10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-yellow-400 opacity-10 rounded-full blur-3xl translate-x-1/4 translate-y-1/4"></div>

      <div className="bg-white/95 backdrop-blur-xl p-8 md:p-10 rounded-3xl shadow-2xl w-full max-w-xl relative z-10 border border-white/20">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center p-4 bg-indigo-50 rounded-2xl mb-4 shadow-sm transform transition hover:scale-110 duration-300">
            <Sparkles className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 tracking-tight">Attendance Tracker</h1>
          <p className="text-primary font-semibold mt-2 text-lg italic">"Master your time, Master your grades."</p>
          <p className="text-gray-500 mt-2 text-sm">Your academic journey, managed intelligently.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
             <Input 
              label="Full Name" 
              placeholder="e.g. Rahul Sharma" 
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
              required
              className="bg-gray-50 border-gray-200 focus:bg-white transition-colors"
            />
             <div className="flex flex-col gap-1 w-full">
              <label className="text-sm font-semibold text-gray-700">Age</label>
              <input 
                type="number"
                placeholder="20"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-gray-50 focus:bg-white transition-all"
                value={formData.age}
                onChange={e => setFormData({...formData, age: e.target.value})}
              />
            </div>
          </div>
          
          <div className="flex flex-col gap-1 w-full">
            <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <School size={16} /> Institute / College
            </label>
            <input 
              list="colleges"
              placeholder="Search or type your college..."
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-gray-50 focus:bg-white transition-all"
              value={formData.college}
              onChange={e => setFormData({...formData, college: e.target.value})}
              required
            />
            <datalist id="colleges">
              {INDIAN_COLLEGES.map((college, idx) => (
                <option key={idx} value={college} />
              ))}
            </datalist>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
             <Input 
              label="Phone Number" 
              type="tel" 
              placeholder="+91 98765 43210" 
              value={formData.phone}
              onChange={e => setFormData({...formData, phone: e.target.value})}
              className="bg-gray-50 border-gray-200 focus:bg-white"
            />
             <Input 
              label="Email Address" 
              type="email" 
              placeholder="student@example.com" 
              value={formData.email}
              onChange={e => setFormData({...formData, email: e.target.value})}
              required
              className="bg-gray-50 border-gray-200 focus:bg-white"
            />
          </div>

          <div className="pt-4 border-t border-gray-100 mt-4">
            <label className="text-sm font-semibold text-gray-700 mb-3 block flex items-center justify-between">
              <span className="flex items-center gap-2"><Target size={16} /> Target Attendance Goal</span>
              <span className="text-xl font-bold text-primary bg-indigo-50 px-3 py-1 rounded-lg">{formData.targetAttendance}%</span>
            </label>
            <input 
              type="range" 
              min="50" 
              max="100" 
              value={formData.targetAttendance} 
              onChange={e => setFormData({...formData, targetAttendance: Number(e.target.value)})}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary hover:accent-indigo-700 transition-all"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-2">
              <span>50% (Relaxed)</span>
              <span>75% (Standard)</span>
              <span>100% (Strict)</span>
            </div>
          </div>

          <Button type="submit" className="w-full mt-8 py-4 text-lg shadow-lg hover:shadow-xl transform transition hover:-translate-y-1">
            Get Started <ArrowRight size={20} />
          </Button>
        </form>
      </div>
    </div>
  );
};