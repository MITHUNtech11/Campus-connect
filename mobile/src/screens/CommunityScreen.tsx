/**
 * Community Q&A — port of frontend/src/pages/Community.tsx.
 *
 *   GET  /api/community            → posts (answers are a JSONB array on the row)
 *   POST /api/community            → ask a question  { subject, question }
 *   POST /api/community/:id/answer → answer          { author, text }
 *   POST /api/community/:id/upvote → upvote the post
 */

import { useEffect, useState } from 'react';
import { FlatList, Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { Text, TextInput } from '../components/Text';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { MessageSquare, Send, ThumbsUp } from 'lucide-react-native';
import api from '../lib/api';
import {
  Avatar,
  Button,
  DialogModal,
  EmptyState,
  ErrorBanner,
  Field,
  IconButton,
} from '../components/ui';
import { errMessage } from '../lib/utils';
import { colors } from '../lib/colors';
import type { CommunityPost, User } from '../types';
import type { RootStackParamList } from '../navigation/types';

export default function CommunityScreen({ user }: { user: User }) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showAsk, setShowAsk] = useState(false);
  const [askForm, setAskForm] = useState({ subject: '', question: '' });
  const [busy, setBusy] = useState<string | null>(null);

  const [answerFor, setAnswerFor] = useState<string | null>(null);
  const [answerText, setAnswerText] = useState('');

  const load = async () => {
    try {
      setPosts(await api.community.list());
      setError(null);
    } catch (err) {
      setError(errMessage(err, 'Could not load the community feed'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const ask = async () => {
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
      setError(errMessage(err, 'Could not post your question'));
    } finally {
      setBusy(null);
    }
  };

  const upvote = async (id: string) => {
    setBusy(id);
    try {
      const upvotes = await api.community.upvote(id);
      setPosts((prev) => prev.map((p) => (p.id === id ? { ...p, upvotes } : p)));
    } catch (err) {
      setError(errMessage(err, 'Could not upvote'));
    } finally {
      setBusy(null);
    }
  };

  const answer = async (postId: string) => {
    if (!answerText.trim()) return;
    setBusy(postId);
    setError(null);
    try {
      const newAnswer = await api.community.answer(postId, {
        author: user.name,
        text: answerText.trim(),
      });
      setPosts((prev) =>
        prev.map((p) => (p.id === postId ? { ...p, answers: [...p.answers, newAnswer] } : p)),
      );
      setAnswerText('');
      setAnswerFor(null);
    } catch (err) {
      setError(errMessage(err, 'Could not post your answer'));
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <FlatList
        className="bg-slate-50"
        contentContainerClassName="p-4 pb-28 gap-4"
        data={posts}
        keyExtractor={(p) => p.id}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load();
            }}
            tintColor={colors.indigo600}
          />
        }
        ListHeaderComponent={
          <View className="gap-4 mb-4">
            <View>
              <Text className="text-2xl font-bold text-slate-900">Community Hub</Text>
              <Text className="text-slate-500 mt-1">Connect, discuss, and learn together.</Text>
            </View>
            <Button
              label="Ask a Question"
              onPress={() => setShowAsk(true)}
              icon={<MessageSquare size={18} color={colors.white} />}
            />
            {!!error && <ErrorBanner message={error} />}
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <Text className="text-center py-12 text-slate-500">Loading questions…</Text>
          ) : (
            <EmptyState title="No questions yet — be the first to ask one." />
          )
        }
        renderItem={({ item: post }) => (
          <View className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
            <View className="flex-row gap-4">
              <View className="items-center gap-1 mt-1">
                <IconButton onPress={() => upvote(post.id)} disabled={busy === post.id}>
                  <ThumbsUp size={20} color={colors.slate400} />
                </IconButton>
                <Text className="font-bold text-slate-700">{post.upvotes}</Text>
              </View>

              <View className="flex-1">
                <View className="flex-row items-center flex-wrap gap-2 mb-2">
                  <View className="px-2.5 py-0.5 rounded-full bg-indigo-50">
                    <Text className="text-xs font-semibold text-indigo-700">{post.subject}</Text>
                  </View>
                  {!!post.author && (
                    <Pressable
                      onPress={() => navigation.navigate('Profile', { id: post.user_id })}
                    >
                      <Text className="text-xs font-bold text-indigo-600">
                        By {post.author.name}
                      </Text>
                    </Pressable>
                  )}
                  <Text className="text-xs text-slate-400">
                    • {formatDistanceToNow(parseISO(post.created_at), { addSuffix: true })}
                  </Text>
                  {post.solved && (
                    <View className="px-2.5 py-0.5 rounded-full bg-emerald-50">
                      <Text className="text-xs font-semibold text-emerald-700">Solved</Text>
                    </View>
                  )}
                </View>

                <Text className="text-slate-800 leading-relaxed">{post.question}</Text>

                <View className="flex-row items-center justify-between mt-4 pt-4 border-t border-slate-100">
                  <View className="flex-row items-center gap-1.5">
                    <MessageSquare size={16} color={colors.slate500} />
                    <Text className="text-sm text-slate-500">
                      {post.answers.length} answer{post.answers.length === 1 ? '' : 's'}
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => {
                      setAnswerFor(answerFor === post.id ? null : post.id);
                      setAnswerText('');
                    }}
                  >
                    <Text className="text-sm font-medium text-indigo-600">
                      {answerFor === post.id ? 'Cancel' : 'Answer'}
                    </Text>
                  </Pressable>
                </View>

                {answerFor === post.id && (
                  <View className="mt-4 flex-row gap-2">
                    <TextInput
                      value={answerText}
                      onChangeText={setAnswerText}
                      placeholder="Share what you know…"
                      placeholderTextColor={colors.slate400}
                      className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-900"
                    />
                    <Pressable
                      onPress={() => answer(post.id)}
                      disabled={busy === post.id || !answerText.trim()}
                      className="px-4 justify-center bg-indigo-600 rounded-xl"
                    >
                      <Send size={16} color={colors.white} />
                    </Pressable>
                  </View>
                )}

                {post.answers.length > 0 && (
                  <View className="mt-4 gap-3">
                    {post.answers.map((a) => (
                      <View
                        key={a.id}
                        className="bg-slate-50 rounded-xl p-4 border border-slate-100 flex-row gap-3"
                      >
                        <Avatar name={a.author} size={32} />
                        <View className="flex-1">
                          <Text className="text-xs font-semibold text-slate-700 mb-1">
                            {a.author}
                          </Text>
                          <Text className="text-slate-700 text-sm leading-relaxed">{a.text}</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            </View>
          </View>
        )}
      />

      <DialogModal visible={showAsk} title="Ask the community" onClose={() => setShowAsk(false)}>
        <ScrollView contentContainerClassName="gap-4" keyboardShouldPersistTaps="handled">
          <Field
            label="Subject"
            value={askForm.subject}
            onChangeText={(subject) => setAskForm({ ...askForm, subject })}
            placeholder="e.g. Database Systems"
          />
          <Field
            label="Question"
            value={askForm.question}
            onChangeText={(question) => setAskForm({ ...askForm, question })}
            placeholder="Describe your doubt in detail…"
            multiline
          />
          <Button
            label={busy === 'ask' ? 'Posting…' : 'Post Question'}
            onPress={ask}
            disabled={busy === 'ask' || !askForm.subject.trim() || !askForm.question.trim()}
          />
        </ScrollView>
      </DialogModal>
    </>
  );
}
