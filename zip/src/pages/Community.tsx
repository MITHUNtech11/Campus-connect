import { useState } from 'react';
import { User } from '../types';
import { MessageSquare, ThumbsUp, ArrowRight, Share2 } from 'lucide-react';

export default function Community({ user }: { user: User }) {
  const [activeTab, setActiveTab] = useState('doubts');
  
  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-4xl mx-auto">
      
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Community Hub</h1>
          <p className="text-slate-500 mt-1">Connect, discuss, and learn together.</p>
        </div>
        
        <button className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors shadow-sm flex items-center gap-2">
          <MessageSquare className="w-5 h-5" />
          Ask a Question
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        <button 
          onClick={() => setActiveTab('doubts')}
          className={`px-6 py-4 font-medium text-sm border-b-2 transition-colors ${activeTab === 'doubts' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          Doubt Feed
        </button>
        <button 
          onClick={() => setActiveTab('resources')}
          className={`px-6 py-4 font-medium text-sm border-b-2 transition-colors ${activeTab === 'resources' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          Resource Hub
        </button>
        <button 
          onClick={() => setActiveTab('alumni')}
          className={`px-6 py-4 font-medium text-sm border-b-2 transition-colors ${activeTab === 'alumni' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          Alumni Bridge
        </button>
      </div>

      {/* Feed Content */}
      <div className="space-y-6">
        {activeTab === 'doubts' && [1, 2, 3].map(i => (
          <div key={i} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
            <div className="flex gap-4">
              <div className="flex flex-col items-center gap-2 mt-1">
                <button className="text-slate-400 hover:text-indigo-600 transition-colors">
                  <ThumbsUp className="w-5 h-5" />
                </button>
                <span className="font-bold text-slate-700">{12 * i}</span>
              </div>
              
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-xs font-semibold">
                    Computer Science
                  </span>
                  <span className="text-slate-400 text-sm">• 2 hours ago</span>
                </div>
                
                <h3 className="text-lg font-bold text-slate-900 mb-2">
                  {i === 1 ? 'Confused about BCNF and 3NF in DBMS' : i === 2 ? 'Need help with A* Algorithm implementation in Python' : 'Best resources for learning React Hooks?'}
                </h3>
                <p className="text-slate-600 mb-4 line-clamp-2">
                  I'm trying to understand the exact difference between Boyce-Codd Normal Form and Third Normal Form. I know BCNF is stricter, but I can't figure out a good real-world example where a table is in 3NF but not BCNF. Can someone explain?
                </p>
                
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100">
                  <div className="flex items-center gap-3">
                    <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=Student${i}`} alt="" className="w-8 h-8 rounded-full bg-slate-100" />
                    <span className="text-sm font-medium text-slate-700">Student {i}</span>
                  </div>
                  
                  <div className="flex items-center gap-4 text-slate-500 text-sm">
                    <span className="flex items-center gap-1.5 hover:text-indigo-600 cursor-pointer transition-colors">
                      <MessageSquare className="w-4 h-4" /> {i * 3} Answers
                    </span>
                    <span className="flex items-center gap-1.5 hover:text-indigo-600 cursor-pointer transition-colors">
                      <Share2 className="w-4 h-4" /> Share
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Accepted Answer snippet */}
            {i === 1 && (
              <div className="ml-14 mt-6 bg-emerald-50 rounded-xl p-4 border border-emerald-100 relative">
                <div className="absolute top-0 left-0 w-1 h-full bg-emerald-400 rounded-l-xl"></div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-emerald-700 font-bold text-xs uppercase tracking-wider">Teacher Answer</span>
                  <span className="text-slate-500 text-xs">• Dr. Priya Desai</span>
                </div>
                <p className="text-slate-700 text-sm">
                  The classic example involves a table (Student, Subject, Teacher). If a student can take many subjects, a subject can be taught by many teachers, but each teacher only teaches one subject...
                </p>
                <button className="text-emerald-700 text-sm font-medium mt-2 flex items-center gap-1 hover:underline">
                  Read full answer <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        ))}
        
        {activeTab !== 'doubts' && (
          <div className="text-center py-16 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
            <h3 className="text-slate-500 font-medium">Content for this tab is coming soon.</h3>
          </div>
        )}
      </div>

    </div>
  );
}
