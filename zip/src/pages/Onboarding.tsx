import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User } from '../types';
import { Map, Sparkles, QrCode, Calendar, ArrowRight, CheckCircle2 } from 'lucide-react';
import { cn } from '../lib/utils';

export default function Onboarding({ user, onComplete }: { user: User, onComplete: () => void }) {
  const [step, setStep] = useState(0);
  const [isCompleting, setIsCompleting] = useState(false);

  const studentSteps = [
    {
      title: "Welcome to CampusConnect!",
      description: "Let's show you around your new smart campus ecosystem.",
      icon: <Sparkles className="w-12 h-12 text-indigo-500" />
    },
    {
      title: "AI-Powered Mentor Search",
      description: "Just type your doubt, like 'I need help with SQL Joins'. Our AI will find the best available teacher for your specific question.",
      icon: <Sparkles className="w-12 h-12 text-indigo-500" />
    },
    {
      title: "Live Campus Heatmap",
      description: "See where teachers are in real-time. Green zones have high mentor availability, red zones are crowded.",
      icon: <Map className="w-12 h-12 text-emerald-500" />
    },
    {
      title: "Reputation Score",
      description: "Attend your booked slots and leave helpful reviews to boost your score. High scores get priority booking during Exam Mode!",
      icon: <CheckCircle2 className="w-12 h-12 text-amber-500" />
    }
  ];

  const teacherSteps = [
    {
      title: "Welcome, Professor!",
      description: "Let's set up your digital presence on CampusConnect.",
      icon: <Sparkles className="w-12 h-12 text-indigo-500" />
    },
    {
      title: "One-Tap QR Check-in",
      description: "Scan the QR code in any classroom or block to instantly broadcast your live location to students.",
      icon: <QrCode className="w-12 h-12 text-blue-500" />
    },
    {
      title: "Manage Doubt Slots",
      description: "Create 1-on-1 or group doubt sessions. Toggle 'Exam Mode' to prioritize students who urgently need help.",
      icon: <Calendar className="w-12 h-12 text-emerald-500" />
    }
  ];

  const steps = user.role === 'student' ? studentSteps : teacherSteps;

  const handleNext = async () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      setIsCompleting(true);
      try {
        await fetch(`/api/users/\${user.id}/onboard`, { method: 'POST' });
        onComplete();
      } catch(e) {
        console.error(e);
        onComplete(); // fallback
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-8 animate-in zoom-in-95 duration-300">
        <div className="flex flex-col items-center text-center">
          <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-6">
            {steps[step].icon}
          </div>
          
          <h2 className="text-2xl font-bold text-slate-900 mb-4">{steps[step].title}</h2>
          <p className="text-slate-600 mb-10 leading-relaxed">
            {steps[step].description}
          </p>

          <div className="w-full flex items-center justify-between">
            <div className="flex gap-2">
              {steps.map((_, i) => (
                <div 
                  key={i} 
                  className={cn(
                    "h-2 rounded-full transition-all duration-300", 
                    i === step ? "w-6 bg-indigo-600" : "w-2 bg-slate-200"
                  )} 
                />
              ))}
            </div>
            
            <button 
              onClick={handleNext}
              disabled={isCompleting}
              className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors flex items-center gap-2"
            >
              {isCompleting ? "Loading..." : (step === steps.length - 1 ? "Let's Go!" : "Next")}
              {!isCompleting && step !== steps.length - 1 && <ArrowRight className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
