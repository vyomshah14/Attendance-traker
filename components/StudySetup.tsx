import React, { useState } from 'react';
import { Subject, StudyTopic } from '../types';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { BookMarked, Brain, ArrowRight, Plus, X } from 'lucide-react';

interface StudySetupProps {
  subjects: Subject[];
  onComplete: (updatedSubjects: Subject[]) => void;
  onSkip: () => void;
}

export const StudySetup: React.FC<StudySetupProps> = ({ subjects, onComplete, onSkip }) => {
  const [step, setStep] = useState<'ASK' | 'ADD_TOPICS'>('ASK');
  const [localSubjects, setLocalSubjects] = useState<Subject[]>(subjects);
  const [activeSubjectId, setActiveSubjectId] = useState<string>(subjects[0]?.id || '');
  const [newTopic, setNewTopic] = useState('');

  const handleAddTopic = () => {
    if (!newTopic.trim()) return;
    
    setLocalSubjects(prev => prev.map(sub => {
      if (sub.id === activeSubjectId) {
        const topic: StudyTopic = {
          id: Math.random().toString(36).substr(2, 9),
          name: newTopic.trim(),
          isCompleted: false
        };
        return { ...sub, topics: [...sub.topics, topic] };
      }
      return sub;
    }));
    setNewTopic('');
  };

  const removeTopic = (subId: string, topicId: string) => {
    setLocalSubjects(prev => prev.map(sub => {
      if (sub.id === subId) {
        return { ...sub, topics: sub.topics.filter(t => t.id !== topicId) };
      }
      return sub;
    }));
  };

  if (step === 'ASK') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-600 to-indigo-700 p-4">
        <div className="bg-white p-8 rounded-3xl shadow-2xl max-w-lg w-full text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-purple-100 rounded-bl-full -mr-8 -mt-8 opacity-50"></div>
          
          <div className="inline-flex items-center justify-center p-4 bg-purple-50 rounded-full mb-6">
            <Brain className="w-12 h-12 text-purple-600" />
          </div>
          
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Track Your Study Progress?</h2>
          <p className="text-gray-600 mb-8 text-lg leading-relaxed">
            Would you like to maintain detailed records of your study sessions, track topics, and mark work done with follow-ups?
          </p>
          
          <div className="space-y-3">
            <Button onClick={() => setStep('ADD_TOPICS')} className="w-full py-3 text-lg">
              Yes, I want to track my studies
            </Button>
            <Button onClick={onSkip} variant="ghost" className="w-full text-gray-400 hover:text-gray-600">
              No thanks, just attendance
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6 min-h-screen pb-24">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
          <BookMarked className="text-primary" />
          Add Study Topics
        </h2>
        <p className="text-gray-600 mt-2">
          Break down your subjects into topics to track what you've studied.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Subject List */}
        <div className="md:col-span-1 space-y-2">
          <h3 className="font-semibold text-gray-500 text-sm uppercase tracking-wider mb-2">Subjects</h3>
          {localSubjects.map(sub => (
            <button
              key={sub.id}
              onClick={() => setActiveSubjectId(sub.id)}
              className={`w-full text-left p-3 rounded-lg transition-all flex justify-between items-center ${
                activeSubjectId === sub.id 
                  ? 'bg-primary text-white shadow-md' 
                  : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-100'
              }`}
            >
              <span className="font-medium truncate">{sub.name}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${activeSubjectId === sub.id ? 'bg-white/20' : 'bg-gray-200'}`}>
                {sub.topics.length}
              </span>
            </button>
          ))}
        </div>

        {/* Topic Editor */}
        <div className="md:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          {activeSubjectId ? (
            <>
              <h3 className="text-xl font-bold text-gray-800 mb-4">
                Topics for {localSubjects.find(s => s.id === activeSubjectId)?.name}
              </h3>
              
              <div className="flex gap-2 mb-6">
                <Input 
                  label="" 
                  placeholder="Add a topic (e.g. Thermodynamics, Algebra)" 
                  value={newTopic}
                  onChange={e => setNewTopic(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddTopic()}
                  className="mb-0"
                />
                <Button onClick={handleAddTopic} disabled={!newTopic} className="shrink-0">
                  <Plus size={20} />
                </Button>
              </div>

              <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                {localSubjects.find(s => s.id === activeSubjectId)?.topics.length === 0 && (
                  <p className="text-gray-400 text-center py-8 italic">No topics added yet.</p>
                )}
                {localSubjects.find(s => s.id === activeSubjectId)?.topics.map(topic => (
                  <div key={topic.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg group">
                    <span className="text-gray-700">{topic.name}</span>
                    <button 
                      onClick={() => removeTopic(activeSubjectId, topic.id)}
                      className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X size={18} />
                    </button>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-full flex items-center justify-center text-gray-400">
              Select a subject to add topics
            </div>
          )}
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-md border-t border-gray-200 md:static md:bg-transparent md:border-0 md:p-0 z-10 mt-8 flex justify-end">
        <Button 
          className="w-full md:w-auto py-3 px-8 text-lg shadow-lg" 
          onClick={() => onComplete(localSubjects)}
        >
          Finish Setup <ArrowRight size={20} />
        </Button>
      </div>
    </div>
  );
};
