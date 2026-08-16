import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  MessageSquare,
  ThumbsUp,
  X,
  Send,
  Search,
  Plus,
  Check,
  CheckCircle2,
  HelpCircle,
  Clock,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { cn } from '../lib/utils';
import api, { avatarFor, avatarSrc } from '../lib/api';
import type { CommunityPost, User as UserType } from '../types';
import ErrorBanner from '../components/ErrorBanner';

const SUBJECT_SUGGESTIONS = [
  'Database Systems',
  'Mock Interview',
  'Resume Review',
  'Career Guidance',
  'Algorithms',
  'Web Development',
  'Data Structures'
];

export default function Community({ user }: { user: UserType }) {
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showAsk, setShowAsk] = useState(false);
  const [askForm, setAskForm] = useState({ subject: '', question: '' });
  const [busy, setBusy] = useState<string | null>(null);

  const [answerFor, setAnswerFor] = useState<string | null>(null);
  const [answerText, setAnswerText] = useState('');

  // Search and Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Solved' | 'Open'>('All');
  const [sortBy, setSortBy] = useState<'latest' | 'upvotes' | 'answers'>('latest');

  // Track upvoted states locally to prevent repeat clicks
  const [localUpvoted, setLocalUpvoted] = useState<Record<string, boolean>>({});

  const load = async () => {
    try {
      const communityFeed = await api.community.list();
      setPosts(communityFeed);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load the community feed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const ask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!askForm.subject.trim() || !askForm.question.trim()) return;
    setBusy('ask');
    setError(null);
    try {
      const post = await api.community.create({
        subject: askForm.subject.trim(),
        question: askForm.question.trim(),
      });
      setPosts((prev) => [{ ...post, answers: post.answers || [] }, ...prev]);
      setAskForm({ subject: '', question: '' });
      setShowAsk(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not post your question');
    } finally {
      setBusy(null);
    }
  };

  const handleUpvote = async (id: string) => {
    if (localUpvoted[id] || busy === id) return;
    setBusy(id);
    try {
      const upvotes = await api.community.upvote(id);
      setPosts((prev) => prev.map((p) => (p.id === id ? { ...p, upvotes } : p)));
      setLocalUpvoted((prev) => ({ ...prev, [id]: true }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not upvote');
    } finally {
      setBusy(null);
    }
  };

  const postAnswer = async (postId: string) => {
    if (!answerText.trim()) return;
    setBusy(postId);
    setError(null);
    try {
      const newAnswer = await api.community.answer(postId, {
        author: user.name,
        text: answerText.trim(),
      });
      setPosts((prev) =>
        prev.map((p) => (p.id === postId ? { ...p, answers: [...(p.answers || []), newAnswer] } : p)),
      );
      setAnswerText('');
      setAnswerFor(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not post your answer');
    } finally {
      setBusy(null);
    }
  };

  // Extract unique subjects from actual post data to build dynamic filter tabs
  const subjectTags = useMemo(() => {
    const tags = new Set<string>();
    posts.forEach((p) => {
      if (p.subject) tags.add(p.subject);
    });
    return ['All', ...Array.from(tags)];
  }, [posts]);

  // Statistics counters for the visual header panel
  const stats = useMemo(() => {
    const total = posts.length;
    const solved = posts.filter((p) => p.solved).length;
    const totalUpvotes = posts.reduce((acc, p) => acc + (p.upvotes || 0), 0);
    const solvedRate = total > 0 ? Math.round((solved / total) * 100) : 0;
    return { total, solved, totalUpvotes, solvedRate };
  }, [posts]);

  // Filter and Sort logic
  const filteredPosts = useMemo(() => {
    let result = [...posts];

    // Search query match
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.question.toLowerCase().includes(q) ||
          p.subject.toLowerCase().includes(q) ||
          (p.author?.name || '').toLowerCase().includes(q)
      );
    }

    // Category filter
    if (selectedSubject !== 'All') {
      result = result.filter((p) => p.subject === selectedSubject);
    }

    // Status filter
    if (statusFilter === 'Solved') {
      result = result.filter((p) => p.solved);
    } else if (statusFilter === 'Open') {
      result = result.filter((p) => !p.solved);
    }

    // Sort options
    if (sortBy === 'upvotes') {
      result.sort((a, b) => b.upvotes - a.upvotes);
    } else if (sortBy === 'answers') {
      result.sort((a, b) => (b.answers?.length || 0) - (a.answers?.length || 0));
    } else {
      result.sort((a, b) => parseISO(b.created_at).getTime() - parseISO(a.created_at).getTime());
    }

    return result;
  }, [posts, searchQuery, selectedSubject, statusFilter, sortBy]);

  const getTagStyle = (subject: string) => {
    const s = subject.toLowerCase();
    if (s.includes('interview') || s.includes('career') || s.includes('placement')) {
      return 'bg-amber-50 text-amber-700 border border-amber-200/60';
    }
    if (s.includes('database') || s.includes('sql')) {
      return 'bg-indigo-50 text-indigo-700 border border-indigo-200/60';
    }
    if (s.includes('algorithm') || s.includes('structure') || s.includes('code')) {
      return 'bg-emerald-50 text-emerald-700 border border-emerald-200/60';
    }
    return 'bg-slate-50 text-slate-600 border border-slate-200/60';
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-5xl mx-auto pb-12">
      {/* HEADER SECTION */}
      <div className="relative overflow-hidden bg-slate-900 rounded-3xl p-8 md:p-10 shadow-lg text-white border border-slate-800">
        <div className="absolute right-0 bottom-0 top-0 w-1/3 bg-gradient-to-l from-indigo-600/20 to-transparent pointer-events-none rounded-r-3xl" />
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/10 rounded-full text-xs font-semibold text-indigo-300 backdrop-blur-md">
              <Sparkles className="w-3.5 h-3.5" />
              Smart Campus Hub
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">Community discussions</h1>
            <p className="text-slate-400 text-sm max-w-md">
              Solve technical challenges, get feedback from peers, and connect with faculty mentors.
            </p>
          </div>
          <button
            onClick={() => setShowAsk(true)}
            className="px-6 py-3 bg-indigo-600 text-white rounded-2xl font-semibold hover:bg-indigo-500 transition-all shadow-md shadow-indigo-600/25 flex items-center gap-2 border border-indigo-500 hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus className="w-5 h-5" />
            Ask a Question
          </button>
        </div>

        {/* Quick Stats Panel */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8 pt-8 border-t border-white/10 text-slate-300">
          <div className="p-3 bg-white/5 rounded-2xl border border-white/5">
            <p className="text-xs text-slate-400 font-medium">Total Questions</p>
            <p className="text-xl font-bold mt-1 text-white">{stats.total}</p>
          </div>
          <div className="p-3 bg-white/5 rounded-2xl border border-white/5">
            <p className="text-xs text-slate-400 font-medium">Solved Discussions</p>
            <p className="text-xl font-bold mt-1 text-emerald-400">{stats.solved}</p>
          </div>
          <div className="p-3 bg-white/5 rounded-2xl border border-white/5">
            <p className="text-xs text-slate-400 font-medium">Total Upvotes</p>
            <p className="text-xl font-bold mt-1 text-indigo-400">{stats.totalUpvotes}</p>
          </div>
          <div className="p-3 bg-white/5 rounded-2xl border border-white/5">
            <p className="text-xs text-slate-400 font-medium">Solved Ratio</p>
            <p className="text-xl font-bold mt-1 text-sky-400">{stats.solvedRate}%</p>
          </div>
        </div>
      </div>

      {error && <ErrorBanner message={error} />}

      {/* FILTER & CONTROL PANEL */}
      <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-200/80 space-y-4">
        {/* Search and Sort controls */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:max-w-md">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search subjects, questions, or authors..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none text-sm transition-all"
            />
          </div>

          <div className="flex gap-3 w-full md:w-auto self-end md:self-center justify-end">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-indigo-100 outline-none bg-white text-slate-700"
              >
                <option value="All">All statuses</option>
                <option value="Solved">Solved only</option>
                <option value="Open">Open doubts</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Sort:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-indigo-100 outline-none bg-white text-slate-700"
              >
                <option value="latest">Latest first</option>
                <option value="upvotes">Most upvoted</option>
                <option value="answers">Most answers</option>
              </select>
            </div>
          </div>
        </div>

        {/* Dynamic subject tag filter tabs */}
        <div className="border-t border-slate-100 pt-4 flex flex-wrap gap-2 items-center">
          <span className="text-xs font-bold text-slate-400 uppercase mr-1">Topics:</span>
          {subjectTags.map((tag) => (
            <button
              key={tag}
              onClick={() => setSelectedSubject(tag)}
              className={cn(
                'px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-200',
                selectedSubject === tag
                  ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                  : 'bg-slate-50 text-slate-600 border-slate-200/70 hover:bg-slate-100'
              )}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      {/* DISCUSSIONS FEED LIST */}
      <div className="space-y-5">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
            <div className="w-8 h-8 rounded-full border-4 border-indigo-600/30 border-t-indigo-600 animate-spin" />
            <p className="text-sm font-medium animate-pulse">Loading discussions feed...</p>
          </div>
        ) : filteredPosts.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-3xl border border-slate-200/80 p-8">
            <div className="w-16 h-16 bg-slate-50 border border-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400 shadow-sm">
              <HelpCircle className="w-8 h-8" />
            </div>
            <h3 className="text-slate-800 font-bold text-lg">No discussions found</h3>
            <p className="text-slate-500 text-sm max-w-sm mx-auto mt-1">
              Try adjusting your search criteria, category filters, or click "Ask a Question" to start a new discussion.
            </p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {filteredPosts.map((post) => (
              <motion.div
                key={post.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.3 }}
                className={cn(
                  "bg-white rounded-3xl p-6 shadow-sm border transition-all duration-300 hover:border-slate-300 hover:shadow-md",
                  post.solved && "border-l-4 border-l-emerald-500"
                )}
              >
                <div className="flex gap-4 md:gap-6">
                  {/* Vertical Upvote Sidebar widget */}
                  <div className="flex flex-col items-center justify-start shrink-0">
                    <button
                      onClick={() => handleUpvote(post.id)}
                      disabled={localUpvoted[post.id] || busy === post.id}
                      className={cn(
                        "w-11 h-11 rounded-2xl flex flex-col items-center justify-center border transition-all duration-200 active:scale-95",
                        localUpvoted[post.id]
                          ? "bg-indigo-50 border-indigo-200 text-indigo-600"
                          : "bg-slate-50 border-slate-200 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50/50 hover:border-indigo-200"
                      )}
                      title="Upvote this discussion"
                    >
                      <ThumbsUp className="w-4 h-4" />
                    </button>
                    <span className="font-extrabold text-sm text-slate-700 mt-2">{post.upvotes}</span>
                  </div>

                  {/* Main post body area */}
                  <div className="flex-1 min-w-0 space-y-3">
                    {/* Tags row */}
                    <div className="flex items-center gap-2 flex-wrap text-xs">
                      <span className={cn('px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider', getTagStyle(post.subject))}>
                        {post.subject}
                      </span>
                      {post.solved && (
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/50 text-xs font-semibold flex items-center gap-1">
                          <Check className="w-3.5 h-3.5 stroke-[3]" /> Solved
                        </span>
                      )}
                      <span className="text-slate-400 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {formatDistanceToNow(parseISO(post.created_at), { addSuffix: true })}
                      </span>
                    </div>

                    {/* Question text */}
                    <p className="text-slate-800 text-[15px] font-medium leading-relaxed whitespace-pre-line">
                      {post.question}
                    </p>

                    {/* Author metadata block */}
                    {post.author && (
                      <div className="flex items-center gap-2.5 bg-slate-50/60 rounded-2xl p-2.5 border border-slate-100 max-w-fit">
                        <img
                          src={avatarSrc(post.author)}
                          alt=""
                          className="w-7 h-7 rounded-full bg-white border border-slate-200 shrink-0"
                        />
                        <div className="text-xs">
                          <span className="text-slate-400">Asked by </span>
                          <Link
                            to={`/profile/${post.user_id}`}
                            className="text-indigo-600 hover:text-indigo-700 font-bold hover:underline"
                          >
                            {post.author.name}
                          </Link>
                          <span className={cn(
                            "ml-2 px-1.5 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wide",
                            post.author.role.toLowerCase() === 'teacher' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-200 text-slate-700'
                          )}>
                            {post.author.role}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Divider & Actions line */}
                    <div className="flex items-center justify-between pt-4 border-t border-slate-100 mt-4">
                      <span className="text-sm text-slate-500 font-semibold flex items-center gap-1.5">
                        <MessageSquare className="w-4 h-4 text-indigo-500" />
                        {post.answers?.length || 0} answer{(post.answers?.length || 0) === 1 ? '' : 's'}
                      </span>
                      <button
                        onClick={() => {
                          setAnswerFor(answerFor === post.id ? null : post.id);
                          setAnswerText('');
                        }}
                        className="px-4 py-1.5 border border-slate-200 hover:border-indigo-300 text-xs font-bold text-slate-700 rounded-xl hover:text-indigo-600 transition-colors shadow-sm bg-white"
                      >
                        {answerFor === post.id ? 'Cancel reply' : 'Write answer'}
                      </button>
                    </div>

                    {/* Reply Input Panel */}
                    {answerFor === post.id && (
                      <motion.div
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-4 flex gap-2 border border-slate-100 bg-slate-50 p-2 rounded-2xl items-center"
                      >
                        <input
                          value={answerText}
                          onChange={(e) => setAnswerText(e.target.value)}
                          placeholder="Share your guidance or answer detail..."
                          className="flex-1 px-4 py-2.5 bg-white rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-100 outline-none"
                          autoFocus
                        />
                        <button
                          onClick={() => postAnswer(post.id)}
                          disabled={busy === post.id || !answerText.trim()}
                          className="px-4 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-500 disabled:opacity-50 flex items-center gap-2 text-sm font-semibold shadow-sm transition-colors"
                        >
                          <Send className="w-4 h-4" /> Send
                        </button>
                      </motion.div>
                    )}

                    {/* Answers Thread timeline */}
                    {(post.answers || []).length > 0 && (
                      <div className="mt-6 border-l-2 border-slate-100 pl-4 space-y-4">
                        {post.answers.map((a) => (
                          <div
                            key={a.id}
                            className="bg-slate-50/50 hover:bg-slate-50 rounded-2xl p-4 border border-slate-100 flex gap-3 transition-colors"
                          >
                            <img
                              src={avatarFor(a.author)}
                              alt=""
                              className="w-8 h-8 rounded-full bg-white border border-slate-200 shrink-0"
                            />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-bold text-slate-800">{a.author}</span>
                                {a.role && (
                                  <span className={cn(
                                    "px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wide",
                                    a.role.toLowerCase() === 'teacher' ? 'bg-indigo-100 text-indigo-700' :
                                    a.role.toLowerCase() === 'admin' ? 'bg-amber-100 text-amber-700' : 'bg-slate-200 text-slate-700'
                                  )}>
                                    {a.role}
                                  </span>
                                )}
                              </div>
                              <p className="text-slate-700 text-[13.5px] leading-relaxed">{a.text}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      {/* ASK THE COMMUNITY SLIDE-IN MODAL */}
      <AnimatePresence>
        {showAsk && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white rounded-3xl shadow-2xl max-w-xl w-full p-6 md:p-8 border border-slate-100"
            >
              <div className="flex items-center justify-between mb-6 border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-950">Ask the community</h2>
                    <p className="text-xs text-slate-500">Post a new doubt or query on the general board</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowAsk(false)}
                  className="text-slate-400 hover:text-slate-600 transition-colors p-1.5 hover:bg-slate-50 rounded-xl"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={ask} className="space-y-5">
                <div>
                  <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-2">Subject / Tag</label>
                  <input
                    required
                    value={askForm.subject}
                    onChange={(e) => setAskForm({ ...askForm, subject: e.target.value })}
                    placeholder="e.g. Database Systems, Career Advice, Exams"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none text-sm transition-all"
                  />

                  {/* Tag quick suggestions */}
                  <div className="flex flex-wrap gap-1.5 mt-2.5">
                    {SUBJECT_SUGGESTIONS.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => setAskForm({ ...askForm, subject: tag })}
                        className="px-2 py-1 bg-slate-50 text-slate-600 border border-slate-200/80 rounded-lg text-[10px] font-bold hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 transition-colors"
                      >
                        + {tag}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-2">Detailed Question</label>
                  <textarea
                    required
                    rows={5}
                    value={askForm.question}
                    onChange={(e) => setAskForm({ ...askForm, question: e.target.value })}
                    placeholder="Describe your query in detail so peers and professors can help you best..."
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none text-sm transition-all resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={busy === 'ask' || !askForm.subject.trim() || !askForm.question.trim()}
                  className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-500 transition-all shadow-md shadow-indigo-600/20 disabled:opacity-50 hover:scale-[1.01]"
                >
                  {busy === 'ask' ? 'Posting to board...' : 'Post Question'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
