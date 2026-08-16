import { useState, useEffect } from 'react';
import { User, Teacher, Slot, Review } from '../types';
import { Sparkles, MapPin, Search, Calendar, Star, Clock, AlertTriangle, ShieldCheck, X, MessageSquare, ThumbsUp, Minus, ThumbsDown } from 'lucide-react';
import { cn } from '../lib/utils';
import { format, parseISO } from 'date-fns';

export default function StudentDashboard({ user }: { user: User }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [aiRecommendation, setAiRecommendation] = useState<{ teacher: Teacher, explanation: string } | null>(null);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  
  // Teacher profile & booking state
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [teacherSlots, setTeacherSlots] = useState<Slot[]>([]);
  const [teacherReviews, setTeacherReviews] = useState<Review[]>([]);
  const [isBooking, setIsBooking] = useState<string | null>(null);

  // New review state
  const [reviewComment, setReviewComment] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  useEffect(() => {
    fetch('/api/teachers')
      .then(res => res.json())
      .then(data => setTeachers(data));
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    setAiRecommendation(null);
    try {
      const response = await fetch('/api/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchQuery })
      });
      const data = await response.json();
      setAiRecommendation(data);
    } catch (error) {
      console.error(error);
    } finally {
      setIsSearching(false);
    }
  };

  const viewTeacherProfile = async (teacher: Teacher) => {
    setSelectedTeacher(teacher);
    setReviewComment('');
    setReviewRating(5);
    try {
      const [slotsRes, reviewsRes] = await Promise.all([
        fetch(`/api/slots?teacherId=${teacher.id}`),
        fetch(`/api/reviews?teacherId=${teacher.id}`)
      ]);
      setTeacherSlots(await slotsRes.json());
      setTeacherReviews(await reviewsRes.json());
    } catch (e) {
      console.error(e);
    }
  };

  const submitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeacher || !reviewComment.trim()) return;
    setIsSubmittingReview(true);
    try {
      const response = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teacherId: selectedTeacher.id,
          studentId: user.id,
          rating: reviewRating,
          comment: reviewComment
        })
      });
      if (response.ok) {
        const newReview = await response.json();
        setTeacherReviews([newReview, ...teacherReviews]);
        setReviewComment('');
        
        // Refresh teachers to get updated sentiment score
        const tRes = await fetch('/api/teachers');
        const updatedTeachers = await tRes.json();
        setTeachers(updatedTeachers);
        const updatedSelected = updatedTeachers.find((t: Teacher) => t.id === selectedTeacher.id);
        if (updatedSelected) setSelectedTeacher(updatedSelected);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const bookSlot = async (slotId: string) => {
    setIsBooking(slotId);
    try {
      const response = await fetch(`/api/slots/\${slotId}/book`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId: user.id })
      });
      if (response.ok) {
        setTeacherSlots(teacherSlots.map(s => s.id === slotId ? { ...s, status: 'Booked', bookedById: user.id } : s));
      }
    } catch(e) {
      console.error(e);
    } finally {
      setIsBooking(null);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header section with Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="col-span-1 md:col-span-2 bg-gradient-to-br from-indigo-900 to-blue-900 rounded-2xl p-8 text-white shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <Sparkles className="w-48 h-48" />
          </div>
          <div className="relative z-10">
            <h1 className="text-3xl font-bold mb-2">Welcome back, {user.name.split(' ')[0]}!</h1>
            <p className="text-indigo-100 max-w-md">
              Find the right mentor for your doubts, track campus activity, and build your academic reputation.
            </p>
            
            <form onSubmit={handleSearch} className="mt-8 relative max-w-xl">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Sparkles className="h-5 w-5 text-indigo-400" />
              </div>
              <input
                type="text"
                placeholder="Ask AI: 'I need help with SQL Joins'"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="block w-full pl-12 pr-24 py-4 rounded-xl border-0 ring-1 ring-white/20 bg-white/10 text-white placeholder:text-indigo-200 focus:ring-2 focus:ring-white focus:bg-white/20 transition-all backdrop-blur-sm"
              />
              <button 
                type="submit"
                disabled={isSearching}
                className="absolute inset-y-2 right-2 px-4 bg-white text-indigo-900 font-medium rounded-lg hover:bg-indigo-50 transition-colors disabled:opacity-75 flex items-center gap-2"
              >
                {isSearching ? <span className="animate-pulse">Finding...</span> : 'Search'}
              </button>
            </form>
          </div>
        </div>
        
        {/* Reputation Score */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-slate-700">Reputation Score</h3>
              <ShieldCheck className="w-5 h-5 text-emerald-500" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold text-slate-900">95</span>
              <span className="text-sm font-medium text-slate-500">/ 100</span>
            </div>
            <p className="text-sm text-slate-500 mt-2">Top 5% of your batch</p>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-100">
            <div className="flex justify-between text-xs text-slate-500 mb-1">
              <span>Next tier: Priority Booking</span>
              <span>100</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2">
              <div className="bg-emerald-500 h-2 rounded-full" style={{ width: '95%' }}></div>
            </div>
          </div>
        </div>
      </div>

      {/* AI Recommendation Result */}
      {aiRecommendation && (
        <div className="bg-indigo-50 rounded-2xl p-6 border border-indigo-100 shadow-sm animate-in zoom-in-95 duration-300">
          <div className="flex items-start gap-4">
            <div className="bg-indigo-600 p-3 rounded-xl text-white shadow-lg">
              <Sparkles className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-indigo-900 mb-1">AI Recommendation</h3>
              <p className="text-indigo-800 text-sm mb-4">{aiRecommendation.explanation}</p>
              
              <div className="bg-white rounded-xl p-4 border border-indigo-100 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <img src={aiRecommendation.teacher.avatar} alt="" className="w-12 h-12 rounded-full ring-2 ring-indigo-50" />
                  <div>
                    <h4 className="font-bold text-slate-900">{aiRecommendation.teacher.name}</h4>
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <Star className="w-4 h-4 text-amber-400 fill-current" />
                      <span className="font-medium text-slate-700">{aiRecommendation.teacher.rating}</span>
                      <span>•</span>
                      <span>{aiRecommendation.teacher.department}</span>
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => viewTeacherProfile(aiRecommendation.teacher)}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors shadow-sm"
                >
                  View Profile
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Live Campus Map Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-slate-900">Live Campus Activity</h2>
            <button className="text-sm text-indigo-600 font-medium hover:text-indigo-700 flex items-center gap-1">
              View Full Map <MapPin className="w-4 h-4" />
            </button>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {['Block A', 'Block B', 'Block C', 'Library'].map((block, i) => (
              <div key={block} className={cn(
                "p-4 rounded-xl border transition-colors",
                i === 1 ? "bg-red-50 border-red-100" : i === 0 ? "bg-amber-50 border-amber-100" : "bg-emerald-50 border-emerald-100"
              )}>
                <div className="flex justify-between items-start mb-2">
                  <span className="font-semibold text-slate-900">{block}</span>
                  <div className={cn(
                    "w-2 h-2 rounded-full",
                    i === 1 ? "bg-red-500" : i === 0 ? "bg-amber-500" : "bg-emerald-500"
                  )}></div>
                </div>
                <p className="text-xs text-slate-500">
                  {i === 1 ? "High Activity (12+ Mentors)" : i === 0 ? "Medium Activity (5 Mentors)" : "Low Activity (2 Mentors)"}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Exam Mode Alerts */}
        <div className="bg-amber-50 rounded-2xl p-6 border border-amber-200">
          <div className="flex items-center gap-2 text-amber-700 mb-4">
            <AlertTriangle className="w-5 h-5" />
            <h2 className="text-lg font-bold">Exam Mode Active</h2>
          </div>
          <p className="text-sm text-amber-800 mb-4">
            End-semester exams are approaching. Emergency slots are prioritized for students with Reputation Score &gt; 80.
          </p>
          <div className="space-y-3">
            <div className="bg-white p-3 rounded-lg border border-amber-100 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-900">DBMS Review</p>
                <p className="text-xs text-slate-500">Dr. Priya • Today, 4 PM</p>
              </div>
              <button 
                onClick={() => teachers.find(t => t.name.includes("Priya")) && viewTeacherProfile(teachers.find(t => t.name.includes("Priya"))!)}
                className="text-xs px-3 py-1.5 bg-amber-100 text-amber-700 font-medium rounded-md hover:bg-amber-200"
              >
                Book Fast
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Available Teachers / Mentors Directory */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-slate-900">Available Mentors Directory</h2>
          <div className="text-sm text-slate-500">{teachers.length} teachers found</div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {teachers.map(teacher => (
            <div key={teacher.id} className="p-5 rounded-2xl border border-slate-100 hover:border-indigo-100 hover:shadow-md transition-all bg-slate-50 flex flex-col">
              <div className="flex gap-4 items-start mb-4">
                <img src={teacher.avatar} alt={teacher.name} className="w-14 h-14 rounded-xl ring-2 ring-white shadow-sm bg-white" />
                <div className="flex-1">
                  <h3 className="font-bold text-slate-900 text-lg leading-tight">{teacher.name}</h3>
                  <p className="text-sm text-slate-500 line-clamp-1">{teacher.department}</p>
                </div>
              </div>
              
              <div className="space-y-2 mb-6 flex-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500 flex items-center gap-1.5"><Star className="w-4 h-4 text-amber-400 fill-current" /> {teacher.rating} rating</span>
                  <span className="text-slate-500 flex items-center gap-1.5"><MapPin className="w-4 h-4" /> {teacher.location?.block || 'Campus'}</span>
                </div>
                <div className="flex items-center justify-between text-sm pt-1">
                  <span className="text-slate-500">Status</span>
                  <div className="flex items-center gap-1.5">
                    <div className={cn(
                      "w-2 h-2 rounded-full",
                      teacher.status === 'Available' ? "bg-emerald-500" :
                      teacher.status === 'Busy' ? "bg-amber-500" : "bg-red-500"
                    )}></div>
                    <span className="font-medium text-slate-700">{teacher.status}</span>
                  </div>
                </div>
              </div>
              
              <button 
                onClick={() => viewTeacherProfile(teacher)}
                className="w-full py-2.5 bg-white border border-slate-200 text-indigo-600 font-medium rounded-xl hover:bg-indigo-50 hover:border-indigo-200 transition-colors"
              >
                View Profile & Book
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Teacher Profile & Booking Modal */}
      {selectedTeacher && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-6 border-b border-slate-100 relative">
              <button 
                onClick={() => setSelectedTeacher(null)} 
                className="absolute top-6 right-6 text-slate-400 hover:text-slate-600"
              >
                <X className="w-6 h-6" />
              </button>
              
              <div className="flex items-center gap-6">
                <img src={selectedTeacher.avatar} className="w-24 h-24 rounded-2xl ring-4 ring-indigo-50" />
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <div>
                      <h2 className="text-2xl font-bold text-slate-900 mb-1">{selectedTeacher.name}</h2>
                      <p className="text-slate-600 font-medium mb-3">{selectedTeacher.designation} • {selectedTeacher.department}</p>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center justify-end gap-1 text-amber-500 font-bold text-lg">
                        <Star className="w-5 h-5 fill-current" /> {selectedTeacher.rating}
                      </div>
                      <p className="text-xs text-slate-500">{selectedTeacher.reviewCount} reviews</p>
                      
                      <div className="mt-2 flex items-center gap-1.5 px-2 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-bold border border-indigo-100">
                        <Sparkles className="w-3.5 h-3.5" />
                        AI Sentiment: {selectedTeacher.sentimentScore}/100
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {selectedTeacher.subjects.map(s => (
                      <span key={s} className="px-2.5 py-1 bg-slate-100 text-slate-600 text-xs font-medium rounded-md">{s}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6">
              <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-indigo-600" />
                Available Slots
              </h3>
              
              <div className="space-y-4">
                {teacherSlots.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">No slots available right now.</div>
                ) : (
                  teacherSlots.map(slot => {
                    const start = parseISO(slot.startTime);
                    const isBooked = slot.status === 'Booked' || slot.bookedById;
                    return (
                      <div key={slot.id} className={cn("p-4 rounded-xl border flex justify-between items-center transition-colors", isBooked ? "bg-slate-50 border-slate-200 opacity-75" : "bg-white border-slate-200 hover:border-indigo-300 shadow-sm")}>
                        <div className="flex gap-4 items-center">
                          <div className={cn("w-14 h-14 rounded-full flex flex-col items-center justify-center", isBooked ? "bg-slate-200 text-slate-600" : "bg-indigo-100 text-indigo-700")}>
                            <span className="text-sm font-bold uppercase leading-none">{format(start, 'ha')}</span>
                            <span className="text-[10px] uppercase">{format(start, 'MMM d')}</span>
                          </div>
                          <div>
                            <h4 className="font-bold text-slate-900">{slot.topic}</h4>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">{slot.type}</span>
                              {slot.examMode && <span className="text-xs font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full flex items-center gap-1"><AlertTriangle className="w-3 h-3"/> Exam Mode</span>}
                            </div>
                          </div>
                        </div>
                        
                        <button 
                          disabled={!!isBooked || isBooking === slot.id}
                          onClick={() => bookSlot(slot.id)}
                          className={cn(
                            "px-4 py-2 rounded-lg font-medium transition-colors text-sm",
                            isBooked 
                              ? "bg-slate-100 text-slate-400 cursor-not-allowed" 
                              : "bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm"
                          )}
                        >
                          {isBooking === slot.id ? "Booking..." : isBooked ? "Booked" : "Book Slot"}
                        </button>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="mt-8 pt-8 border-t border-slate-100">
                <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-indigo-600" />
                  Student Reviews
                </h3>

                {/* Submit new review form */}
                <form onSubmit={submitReview} className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6">
                  <h4 className="text-sm font-bold text-slate-900 mb-2">Write a Review</h4>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-sm text-slate-600">Rating:</span>
                    <div className="flex items-center">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setReviewRating(star)}
                          className={cn("p-1", reviewRating >= star ? "text-amber-400" : "text-slate-300")}
                        >
                          <Star className="w-5 h-5 fill-current" />
                        </button>
                      ))}
                    </div>
                  </div>
                  <textarea
                    required
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    placeholder="How was your experience with this mentor?"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-600 outline-none mb-3 resize-none"
                    rows={3}
                  />
                  <div className="flex justify-end">
                    <button 
                      type="submit"
                      disabled={isSubmittingReview || !reviewComment.trim()}
                      className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 disabled:opacity-50"
                    >
                      {isSubmittingReview ? "Submitting..." : "Post Review"}
                    </button>
                  </div>
                </form>

                {/* Reviews List */}
                <div className="space-y-4">
                  {teacherReviews.length === 0 ? (
                    <div className="text-center py-6 text-slate-500 text-sm">No reviews yet. Be the first to share your experience!</div>
                  ) : (
                    teacherReviews.map(review => (
                      <div key={review.id} className="p-4 rounded-xl border border-slate-100 bg-white shadow-sm">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center gap-2 text-amber-500 text-sm font-bold">
                            <Star className="w-4 h-4 fill-current" /> {review.rating}.0
                          </div>
                          {review.sentiment && (
                            <span className={cn(
                              "text-[10px] uppercase font-bold px-2 py-0.5 rounded-full flex items-center gap-1",
                              review.sentiment === 'Positive' ? "bg-emerald-100 text-emerald-700" :
                              review.sentiment === 'Negative' ? "bg-red-100 text-red-700" :
                              "bg-slate-100 text-slate-700"
                            )}>
                              {review.sentiment === 'Positive' ? <ThumbsUp className="w-3 h-3" /> :
                               review.sentiment === 'Negative' ? <ThumbsDown className="w-3 h-3" /> :
                               <Minus className="w-3 h-3" />}
                              {review.sentiment}
                            </span>
                          )}
                        </div>
                        <p className="text-slate-700 text-sm leading-relaxed">{review.comment}</p>
                        <div className="mt-2 text-[10px] text-slate-400">
                          {format(parseISO(review.createdAt), 'MMM d, yyyy h:mm a')}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
