import React, { useState, useEffect } from 'react';
import { Onboarding } from './components/Onboarding';
import { SubjectSetup } from './components/SubjectSetup';
import { StudySetup } from './components/StudySetup';
import { Dashboard } from './components/Dashboard';
import { AppView, Subject, UserProfile } from './types';

function App() {
  const [view, setView] = useState<AppView>('ONBOARDING');
  
  // App State
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);

  // Simple persistence to avoid data loss on refresh during demo
  useEffect(() => {
    const savedUser = localStorage.getItem('st_user');
    const savedSubjects = localStorage.getItem('st_subjects');
    if (savedUser && savedSubjects) {
      setUserProfile(JSON.parse(savedUser));
      
      // Migration: Ensure history and topics exist on loaded subjects
      const parsedSubjects = JSON.parse(savedSubjects) as Subject[];
      const migratedSubjects = parsedSubjects.map(s => ({
        ...s,
        history: s.history || [],
        topics: s.topics || []
      }));
      
      setSubjects(migratedSubjects);
      setView('DASHBOARD');
    }
  }, []);

  useEffect(() => {
    if (userProfile) localStorage.setItem('st_user', JSON.stringify(userProfile));
    if (subjects.length > 0) localStorage.setItem('st_subjects', JSON.stringify(subjects));
  }, [userProfile, subjects]);

  const handleOnboardingComplete = (profile: UserProfile) => {
    setUserProfile(profile);
    setView('SUBJECT_SETUP');
  };

  const handleSubjectSetupComplete = (newSubjects: Subject[]) => {
    setSubjects(newSubjects);
    setView('STUDY_SETUP');
  };

  const handleStudySetupComplete = (updatedSubjects: Subject[]) => {
    setSubjects(updatedSubjects);
    setView('DASHBOARD');
  };

  const handleSubjectsUpdate = (updatedSubjects: Subject[]) => {
    setSubjects(updatedSubjects);
  };

  return (
    <div className="antialiased text-gray-900 bg-gray-50 min-h-screen">
      {view === 'ONBOARDING' && (
        <Onboarding onComplete={handleOnboardingComplete} />
      )}
      
      {view === 'SUBJECT_SETUP' && (
        <SubjectSetup onComplete={handleSubjectSetupComplete} />
      )}

      {view === 'STUDY_SETUP' && (
        <StudySetup 
          subjects={subjects} 
          onComplete={handleStudySetupComplete}
          onSkip={() => setView('DASHBOARD')}
        />
      )}

      {view === 'DASHBOARD' && userProfile && (
        <Dashboard 
          subjects={subjects} 
          user={userProfile} 
          onUpdateSubjects={handleSubjectsUpdate}
          onBack={() => setView('SUBJECT_SETUP')} 
        />
      )}
    </div>
  );
}

export default App;