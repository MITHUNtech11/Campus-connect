import { useState, useEffect } from 'react';
import { User, Teacher, Slot } from '../types';
import { QrCode, MapPin, Users, Plus, Calendar as CalendarIcon, Clock, X } from 'lucide-react';
import { cn } from '../lib/utils';
import { format, parseISO } from 'date-fns';

export default function TeacherDashboard({ user }: { user: User }) {
  const [teacherData, setTeacherData] = useState<Teacher | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [isChangingStatus, setIsChangingStatus] = useState(false);
  
  // Slot creation modal state
  const [showSlotModal, setShowSlotModal] = useState(false);
  const [slotForm, setSlotForm] = useState({
    topic: '',
    type: 'Group',
    date: '',
    time: '',
    examMode: false
  });

  const fetchData = async () => {
    // In a real app we'd fetch the specific teacher via user ID, fallback to mock user for prototype
    const res = await fetch(`/api/teachers/\${user.id}`);
    if(res.ok) {
      setTeacherData(await res.json());
    } else {
      const resFallback = await fetch('/api/teachers/t1');
      setTeacherData(await resFallback.json());
    }

    const slotRes = await fetch(`/api/slots?teacherId=\${user.id}`);
    if(slotRes.ok) {
      setSlots(await slotRes.json());
    } else {
      const fallbackSlots = await fetch('/api/slots?teacherId=t1');
      setSlots(await fallbackSlots.json());
    }
  };

  useEffect(() => {
    fetchData();
  }, [user.id]);

  const handleSimulateQRScan = async () => {
    if (!teacherData) return;
    setIsCheckingIn(true);
    
    await new Promise(r => setTimeout(r, 800));

    const response = await fetch(`/api/teachers/\${teacherData.id}/checkin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        location: { block: 'Block B', floor: '1st Floor', room: 'Lab 102' },
        status: 'Available',
        signatureAvailable: true
      })
    });
    const data = await response.json();
    setTeacherData(data);
    setIsCheckingIn(false);
  };

  const handleChangeStatus = async (newStatus: string) => {
    if (!teacherData) return;
    setIsChangingStatus(true);
    const response = await fetch(`/api/teachers/\${teacherData.id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    });
    if (response.ok) {
      const data = await response.json();
      setTeacherData(data);
    }
    setIsChangingStatus(false);
  };

  const handleCreateSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teacherData || !slotForm.date || !slotForm.time) return;
    
    // Create a dummy start time based on inputs
    const startTimeStr = `\${slotForm.date}T\${slotForm.time}:00`;
    const startDate = new Date(startTimeStr);
    const endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // +1 hr
    
    const response = await fetch('/api/slots', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        teacherId: teacherData.id,
        startTime: startDate.toISOString(),
        endTime: endDate.toISOString(),
        topic: slotForm.topic,
        type: slotForm.type,
        examMode: slotForm.examMode
      })
    });
    
    if (response.ok) {
      const newSlot = await response.json();
      setSlots([...slots, newSlot]);
      setShowSlotModal(false);
      setSlotForm({ topic: '', type: 'Group', date: '', time: '', examMode: false });
    }
  };

  if (!teacherData) return <div className="p-8 text-center text-slate-500 animate-pulse">Loading dashboard...</div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* Top Section: Quick Actions & Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* QR Check-in Card */}
        <div className="md:col-span-1 bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mb-4">
            <QrCode className="w-8 h-8" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 mb-2">Campus Check-in</h2>
          <p className="text-sm text-slate-500 mb-6">Scan room QR code to update your live location on the student heatmap.</p>
          
          <button 
            onClick={handleSimulateQRScan}
            disabled={isCheckingIn}
            className="w-full py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-75 flex items-center justify-center gap-2"
          >
            {isCheckingIn ? (
              <span className="animate-pulse">Scanning...</span>
            ) : (
              <>Simulate Scan QR <MapPin className="w-4 h-4" /></>
            )}
          </button>
        </div>

        {/* Current Status Card */}
        <div className="md:col-span-2 bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 shadow-sm text-white relative overflow-hidden">
          <div className="absolute -right-10 -bottom-10 opacity-10">
            <Users className="w-64 h-64" />
          </div>
          
          <div className="relative z-10">
            <div className="flex justify-between items-start mb-8">
              <div>
                <h2 className="text-2xl font-bold mb-1">Current Status</h2>
                <p className="text-slate-400 text-sm">Visible to all students</p>
              </div>
              <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full backdrop-blur-sm">
                <StarRating rating={teacherData.rating} />
                <span className="font-bold">{teacherData.rating}</span>
                <span className="text-slate-300 text-sm">({teacherData.reviewCount})</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
                <p className="text-slate-400 text-xs mb-1 uppercase tracking-wider">Location</p>
                {teacherData.location ? (
                  <p className="font-medium flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-emerald-400" />
                    {teacherData.location.block}, {teacherData.location.room}
                  </p>
                ) : (
                  <p className="font-medium text-slate-400">Not checked in</p>
                )}
              </div>
              
              <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm flex flex-col justify-center relative group">
                <p className="text-slate-400 text-xs mb-1 uppercase tracking-wider">Availability</p>
                <div className="flex items-center gap-2">
                  <div className={cn(
                    "w-2.5 h-2.5 rounded-full",
                    teacherData.status === 'Available' ? "bg-emerald-400" :
                    teacherData.status === 'Busy' ? "bg-red-400" : "bg-amber-400"
                  )}></div>
                  <select 
                    value={teacherData.status}
                    onChange={(e) => handleChangeStatus(e.target.value)}
                    disabled={isChangingStatus}
                    className="font-medium bg-transparent text-white focus:outline-none appearance-none cursor-pointer hover:text-indigo-200 transition-colors"
                  >
                    <option value="Available" className="text-slate-900">Available</option>
                    <option value="Busy" className="text-slate-900">Busy</option>
                    <option value="In Class" className="text-slate-900">In Class</option>
                    <option value="Offline" className="text-slate-900">Offline</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Manage Slots */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-slate-900">Booking Calendar</h3>
            <button 
              onClick={() => setShowSlotModal(true)}
              className="p-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors flex items-center gap-2 px-3 text-sm font-medium"
            >
              <Plus className="w-4 h-4" /> New Slot
            </button>
          </div>
          
          <div className="space-y-4">
            {slots.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-sm">No upcoming slots. Create one!</div>
            ) : (
              slots.map(slot => {
                const start = parseISO(slot.startTime);
                return (
                  <div key={slot.id} className="p-4 rounded-xl border border-slate-100 flex justify-between items-center bg-slate-50 hover:border-indigo-100 transition-colors">
                    <div className="flex gap-4 items-center">
                      <div className="w-12 h-12 rounded-full bg-indigo-100 flex flex-col items-center justify-center text-indigo-700">
                        <span className="text-xs font-bold uppercase leading-none">{format(start, 'ha')}</span>
                        <span className="text-[10px] uppercase">{format(start, 'MMM d')}</span>
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900">{slot.topic}</h4>
                        <p className="text-sm text-slate-500">{slot.type} Session • {slot.status}</p>
                      </div>
                    </div>
                    {slot.examMode && (
                      <span className="px-3 py-1 bg-amber-100 text-amber-700 text-xs font-bold rounded-full">Exam Mode</span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Need Students Requests */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-slate-900">"Need Students" Requests</h3>
            <button className="p-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors">
              <Plus className="w-5 h-5" />
            </button>
          </div>
          
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mx-auto mb-3">
              <Users className="w-8 h-8" />
            </div>
            <p className="text-slate-500 text-sm">You haven't posted any requests yet.<br/>Looking for a Teaching Assistant or Research Interns?</p>
            <button className="mt-4 px-4 py-2 text-indigo-600 text-sm font-medium hover:bg-indigo-50 rounded-lg transition-colors">
              Create Request
            </button>
          </div>
        </div>
      </div>

      {/* Slot Creation Modal */}
      {showSlotModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-900">Create New Slot</h2>
              <button onClick={() => setShowSlotModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleCreateSlot} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Topic / Subject</label>
                <input 
                  type="text" required
                  value={slotForm.topic} onChange={e => setSlotForm({...slotForm, topic: e.target.value})}
                  placeholder="e.g. DBMS Normalization" 
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-600 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
                  <input 
                    type="date" required
                    value={slotForm.date} onChange={e => setSlotForm({...slotForm, date: e.target.value})}
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-600 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Time</label>
                  <input 
                    type="time" required
                    value={slotForm.time} onChange={e => setSlotForm({...slotForm, time: e.target.value})}
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-600 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Session Type</label>
                <select 
                  value={slotForm.type} onChange={e => setSlotForm({...slotForm, type: e.target.value})}
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-600 outline-none bg-white"
                >
                  <option value="1-on-1">1-on-1</option>
                  <option value="Group">Group Session</option>
                </select>
              </div>

              <div className="flex items-center gap-3 p-4 bg-amber-50 rounded-xl border border-amber-100">
                <input 
                  type="checkbox" id="examMode"
                  checked={slotForm.examMode} onChange={e => setSlotForm({...slotForm, examMode: e.target.checked})}
                  className="w-5 h-5 text-amber-600 rounded border-amber-300 focus:ring-amber-500"
                />
                <label htmlFor="examMode" className="text-sm font-medium text-amber-900 cursor-pointer">
                  Emergency Exam Mode Slot
                </label>
              </div>

              <button 
                type="submit"
                className="w-full py-3 mt-4 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors"
              >
                Create Slot
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5 text-amber-400">
      <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
    </div>
  );
}
