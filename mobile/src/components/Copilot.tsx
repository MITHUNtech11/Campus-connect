/**
 * Campus Copilot — port of frontend/src/components/Copilot.tsx.
 *
 *   POST /api/copilot/ask  (backend/server/api/copilot.cjs)
 *
 * Real retrieval over live Supabase data — no third-party LLM. Every reply's
 * `data` is the actual rows retrieved for the question, rendered below the
 * templated text as grounding, with the same per-intent card shapes as the web
 * component (availability/office_hours → teacher rows, announcements → titles,
 * slots → subject+time, activity → block counts, fallback → mentor matches).
 * Same four quick prompts.
 *
 * The web version is a FAB plus a slide-out drawer pinned bottom-right. Here it
 * is a FAB plus a bottom-sheet Modal — the phone equivalent of the same shape.
 * Rendered once at the root (App.tsx), overlaid on every authenticated screen.
 */

import { useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  View,
} from 'react-native';
import { Text, TextInput } from './Text';
import { MapPin, Send, Sparkles, Star, X } from 'lucide-react-native';
import api from '../lib/api';
import { Avatar, ErrorBanner } from './ui';
import { cn, errMessage } from '../lib/utils';
import { colors } from '../lib/colors';
import type { CopilotReply } from '../types';

const QUICK_PROMPTS = [
  "Who's free in Computer Science?",
  "Show today's announcements",
  'Which block is busiest?',
  'Any open Databases slots?',
];

interface Message {
  role: 'user' | 'copilot';
  text: string;
  intent?: CopilotReply['intent'];
  data?: Record<string, unknown>[];
}

export default function Copilot({ onOpenProfile }: { onOpenProfile: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
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
      setMessages((prev) => [
        ...prev,
        { role: 'copilot', text: res.reply, intent: res.intent, data: res.data },
      ]);
    } catch (err) {
      setError(errMessage(err, 'The copilot could not answer that right now'));
    } finally {
      setSending(false);
    }
  };

  const openProfile = (id: string) => {
    setOpen(false);
    onOpenProfile(id);
  };

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityLabel="Open Campus Copilot"
        className="absolute bottom-24 right-5 w-14 h-14 rounded-full bg-indigo-600 items-center justify-center shadow-lg"
      >
        <Sparkles size={24} color={colors.white} />
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="slide"
        onRequestClose={() => setOpen(false)}
      >
        <KeyboardAvoidingView
          className="flex-1 justify-end bg-slate-900/40"
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View className="bg-white rounded-t-3xl h-[80%] overflow-hidden">
            <View className="p-4 bg-indigo-900 flex-row items-center gap-2">
              <Sparkles size={20} color={colors.white} />
              <View className="flex-1">
                <Text className="font-bold text-sm text-white">Campus Copilot</Text>
                <Text className="text-[11px] text-indigo-200">
                  Real answers from live campus data
                </Text>
              </View>
              <Pressable onPress={() => setOpen(false)} hitSlop={10}>
                <X size={22} color={colors.white} />
              </Pressable>
            </View>

            <ScrollView
              ref={scrollRef}
              className="flex-1"
              contentContainerClassName="p-4 gap-3"
              keyboardShouldPersistTaps="handled"
            >
              {messages.length === 0 && (
                <Text className="text-center text-sm text-slate-400 py-6">
                  Ask about faculty availability, office hours, announcements, campus activity, or
                  open slots.
                </Text>
              )}

              {messages.map((m, i) => (
                <View
                  key={i}
                  className={cn('flex-row', m.role === 'user' ? 'justify-end' : 'justify-start')}
                >
                  <View
                    className={cn(
                      'max-w-[85%] rounded-2xl px-3.5 py-2.5',
                      m.role === 'user' ? 'bg-indigo-600' : 'bg-slate-100',
                    )}
                  >
                    <Text
                      className={cn(
                        'text-sm leading-relaxed',
                        m.role === 'user' ? 'text-white' : 'text-slate-800',
                      )}
                    >
                      {m.text}
                    </Text>
                    {!!m.data?.length && (
                      <CopilotDataCards
                        intent={m.intent}
                        data={m.data}
                        onOpenProfile={openProfile}
                      />
                    )}
                  </View>
                </View>
              ))}

              {sending && (
                <View className="flex-row justify-start">
                  <View className="bg-slate-100 rounded-2xl px-3.5 py-2.5">
                    <Text className="text-sm text-slate-500">Looking that up…</Text>
                  </View>
                </View>
              )}

              {!!error && <ErrorBanner message={error} className="p-2.5" />}
            </ScrollView>

            {messages.length === 0 && (
              <View className="px-4 pb-2 flex-row flex-wrap gap-1.5">
                {QUICK_PROMPTS.map((p) => (
                  <Pressable
                    key={p}
                    onPress={() => ask(p)}
                    className="px-2.5 py-1.5 rounded-full bg-indigo-50"
                  >
                    <Text className="text-[11px] font-medium text-indigo-700">{p}</Text>
                  </Pressable>
                ))}
              </View>
            )}

            <View className="p-3 border-t border-slate-100 flex-row items-center gap-2">
              <TextInput
                value={input}
                onChangeText={setInput}
                placeholder="Ask about campus…"
                placeholderTextColor={colors.slate400}
                editable={!sending}
                onSubmitEditing={() => ask(input)}
                className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-900"
              />
              <Pressable
                onPress={() => ask(input)}
                disabled={sending || !input.trim()}
                className={cn(
                  'w-11 h-11 rounded-xl bg-indigo-600 items-center justify-center',
                  (sending || !input.trim()) && 'opacity-50',
                )}
              >
                <Send size={16} color={colors.white} />
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

/** Grounding cards under a copilot reply — the actual rows the reply was built from. */
function CopilotDataCards({
  intent,
  data,
  onOpenProfile,
}: {
  intent?: CopilotReply['intent'];
  data: Record<string, unknown>[];
  onOpenProfile: (id: string) => void;
}) {
  if (intent === 'availability' || intent === 'office_hours') {
    return (
      <View className="mt-2 gap-1.5">
        {data.slice(0, 5).map((row) => (
          <Pressable
            key={String(row.id)}
            onPress={() => onOpenProfile(String(row.id))}
            className="flex-row items-center gap-2 bg-white rounded-lg px-2.5 py-1.5 border border-slate-200"
          >
            <Avatar name={String(row.name)} size={24} />
            <View className="flex-1">
              <Text className="text-xs font-semibold text-slate-900" numberOfLines={1}>
                {String(row.name)}
              </Text>
              {!!row.cabin_block && (
                <View className="flex-row items-center gap-1">
                  <MapPin size={10} color={colors.slate500} />
                  <Text className="text-[10px] text-slate-500">
                    {String(row.cabin_block)}
                    {row.cabin_room ? ` · ${row.cabin_room}` : ''}
                  </Text>
                </View>
              )}
            </View>
          </Pressable>
        ))}
      </View>
    );
  }

  if (intent === 'announcements') {
    return (
      <View className="mt-2 gap-1.5">
        {data.slice(0, 3).map((row) => (
          <View
            key={String(row.id)}
            className="bg-white rounded-lg px-2.5 py-1.5 border border-slate-200"
          >
            <Text className="text-xs font-semibold text-slate-900" numberOfLines={1}>
              {String(row.title)}
            </Text>
          </View>
        ))}
      </View>
    );
  }

  if (intent === 'slots') {
    return (
      <View className="mt-2 gap-1.5">
        {data.slice(0, 5).map((row) => (
          <View
            key={String(row.id)}
            className="bg-white rounded-lg px-2.5 py-1.5 border border-slate-200"
          >
            <Text className="text-xs font-semibold text-slate-900" numberOfLines={1}>
              {String(row.subject)} — {String(row.topic)}
            </Text>
            <Text className="text-[10px] text-slate-500">
              {String(row.date)} at {String(row.time)}
            </Text>
          </View>
        ))}
      </View>
    );
  }

  if (intent === 'activity') {
    return (
      <View className="mt-2 gap-1.5">
        {data.slice(0, 3).map((row) => (
          <View
            key={String(row.block)}
            className="bg-white rounded-lg px-2.5 py-1.5 border border-slate-200 flex-row justify-between"
          >
            <Text className="text-xs font-semibold text-slate-900">{String(row.block)}</Text>
            <Text className="text-[10px] text-slate-500">
              {String(row.available)}/{String(row.total)} free
            </Text>
          </View>
        ))}
      </View>
    );
  }

  // fallback intent — mentor matches
  return (
    <View className="mt-2 gap-1.5">
      {data.slice(0, 3).map((row) => (
        <Pressable
          key={String(row.id)}
          onPress={() => onOpenProfile(String(row.id))}
          className="flex-row items-center justify-between gap-2 bg-white rounded-lg px-2.5 py-1.5 border border-slate-200"
        >
          <Text className="flex-1 text-xs font-semibold text-slate-900" numberOfLines={1}>
            {String(row.name)}
          </Text>
          <View className="flex-row items-center gap-0.5">
            <Star size={10} color={colors.amber600} fill={colors.amber600} />
            <Text className="text-[10px] text-amber-600">
              {(Number(row.score) * 100).toFixed(0)}%
            </Text>
          </View>
        </Pressable>
      ))}
    </View>
  );
}
