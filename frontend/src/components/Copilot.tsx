/**
 * Campus Copilot — a chat FAB/drawer backed by real retrieval over live
 * Supabase data (POST /api/copilot/ask, backend/server/api/copilot.cjs).
 *
 * The original prototype frontend had an "AI Copilot" drawer with the same
 * shape (FAB + slide-out chat + quick-prompt chips) but no network call at
 * all — just four hardcoded canned replies. This is the real version: every
 * reply's `data` is the actual rows retrieved for the question, rendered
 * below the templated text as grounding. No third-party LLM is involved.
 */

import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, X, Send, MapPin, Star } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import api, { avatarFor } from '../lib/api';
import type { CopilotReply } from '../types';
import ErrorBanner from './ErrorBanner';

const QUICK_PROMPTS = [
  "Who's free in Computer Science?",
  'Show today\'s announcements',
  'Which block is busiest?',
  'Any open Databases slots?',
];

interface Message {
  role: 'user' | 'copilot';
  text: string;
  intent?: CopilotReply['intent'];
  data?: Record<string, unknown>[];
}

export default function Copilot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, open]);

  const ask = async (text: string) => {
    const question = text.trim();
    if (!question || sending) return;
    setMessages((prev) => [...prev, { role: 'user', text: question }]);
    setInput('');
    setSending(true);
    setError(null);
    try {
      const res = await api.copilot.ask(question);
      setMessages((prev) => [...prev, { role: 'copilot', text: res.reply, intent: res.intent, data: res.data }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The copilot could not answer that right now');
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Open Campus Copilot"
        className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-indigo-600 text-white shadow-xl shadow-indigo-600/30 flex items-center justify-center hover:bg-indigo-700 transition-colors"
      >
        {open ? <X className="w-6 h-6" /> : <Sparkles className="w-6 h-6" />}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            className="fixed bottom-24 right-6 z-40 w-[calc(100vw-3rem)] max-w-sm h-[32rem] bg-white rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden"
          >
            <div className="p-4 border-b border-slate-100 bg-gradient-to-r from-indigo-900 to-blue-900 text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              <div>
                <h2 className="font-bold text-sm leading-tight">Campus Copilot</h2>
                <p className="text-[11px] text-indigo-200">Real answers from live campus data</p>
              </div>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.length === 0 && (
                <div className="text-center text-sm text-slate-400 py-6">
                  Ask about faculty availability, office hours, announcements, campus activity, or open slots.
                </div>
              )}

              {messages.map((m, i) => (
                <div key={i} className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}>
                  <div
                    className={cn(
                      'max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm',
                      m.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-800',
                    )}
                  >
                    <p className="leading-relaxed">{m.text}</p>
                    {m.data && m.data.length > 0 && <CopilotDataCards intent={m.intent} data={m.data} />}
                  </div>
                </div>
              ))}

              {sending && (
                <div className="flex justify-start">
                  <div className="bg-slate-100 text-slate-500 rounded-2xl px-3.5 py-2.5 text-sm animate-pulse">
                    Looking that up…
                  </div>
                </div>
              )}

              {error && <ErrorBanner message={error} className="p-2.5 text-xs" />}
            </div>

            {messages.length === 0 && (
              <div className="px-4 pb-2 flex flex-wrap gap-1.5">
                {QUICK_PROMPTS.map((p) => (
                  <button
                    key={p}
                    onClick={() => ask(p)}
                    className="px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 text-[11px] font-medium hover:bg-indigo-100 transition-colors"
                  >
                    {p}
                  </button>
                ))}
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                ask(input);
              }}
              className="p-3 border-t border-slate-100 flex items-center gap-2"
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about campus…"
                disabled={sending}
                className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-600 outline-none disabled:opacity-60"
              />
              <button
                type="submit"
                disabled={sending || !input.trim()}
                className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center hover:bg-indigo-700 disabled:opacity-50 shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

/** Grounding cards under a copilot reply — the actual rows the reply was built from. */
function CopilotDataCards({ intent, data }: { intent?: CopilotReply['intent']; data: Record<string, unknown>[] }) {
  if (intent === 'availability' || intent === 'office_hours') {
    return (
      <div className="mt-2 space-y-1.5">
        {data.slice(0, 5).map((row) => (
          <Link
            key={String(row.id)}
            to={`/profile/${row.id}`}
            className="flex items-center gap-2 bg-white rounded-lg px-2.5 py-1.5 border border-slate-200 hover:border-indigo-300 transition-colors"
          >
            <img src={avatarFor(String(row.name))} alt="" className="w-6 h-6 rounded-full shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-900 truncate">{String(row.name)}</p>
              {!!row.cabin_block && (
                <p className="text-[10px] text-slate-500 flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> {String(row.cabin_block)}
                  {row.cabin_room ? ` · ${row.cabin_room}` : ''}
                </p>
              )}
            </div>
          </Link>
        ))}
      </div>
    );
  }

  if (intent === 'announcements') {
    return (
      <div className="mt-2 space-y-1.5">
        {data.slice(0, 3).map((row) => (
          <div key={String(row.id)} className="bg-white rounded-lg px-2.5 py-1.5 border border-slate-200">
            <p className="text-xs font-semibold text-slate-900 truncate">{String(row.title)}</p>
          </div>
        ))}
      </div>
    );
  }

  if (intent === 'slots') {
    return (
      <div className="mt-2 space-y-1.5">
        {data.slice(0, 5).map((row) => (
          <div key={String(row.id)} className="bg-white rounded-lg px-2.5 py-1.5 border border-slate-200">
            <p className="text-xs font-semibold text-slate-900 truncate">{String(row.subject)} — {String(row.topic)}</p>
            <p className="text-[10px] text-slate-500">{String(row.date)} at {String(row.time)}</p>
          </div>
        ))}
      </div>
    );
  }

  if (intent === 'activity') {
    return (
      <div className="mt-2 space-y-1.5">
        {data.slice(0, 3).map((row) => (
          <div key={String(row.block)} className="bg-white rounded-lg px-2.5 py-1.5 border border-slate-200 flex justify-between">
            <span className="text-xs font-semibold text-slate-900">{String(row.block)}</span>
            <span className="text-[10px] text-slate-500">{String(row.available)}/{String(row.total)} free</span>
          </div>
        ))}
      </div>
    );
  }

  // fallback intent — mentor matches
  return (
    <div className="mt-2 space-y-1.5">
      {data.slice(0, 3).map((row) => (
        <Link
          key={String(row.id)}
          to={`/profile/${row.id}`}
          className="flex items-center justify-between gap-2 bg-white rounded-lg px-2.5 py-1.5 border border-slate-200 hover:border-indigo-300 transition-colors"
        >
          <span className="text-xs font-semibold text-slate-900 truncate">{String(row.name)}</span>
          <span className="text-[10px] text-amber-600 flex items-center gap-0.5 shrink-0">
            <Star className="w-3 h-3 fill-current" /> {(Number(row.score) * 100).toFixed(0)}%
          </span>
        </Link>
      ))}
    </div>
  );
}
