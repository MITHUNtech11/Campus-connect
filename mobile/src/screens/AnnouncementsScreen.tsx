/**
 * Campus announcements — port of frontend/src/pages/Announcements.tsx.
 *
 *   GET    /api/announcements          → everyone (pinned first, then newest)
 *   POST   /api/announcements          → teacher/admin  { title, content }
 *   PATCH  /api/announcements/:id/pin  → teacher/admin, toggles pinned
 *   DELETE /api/announcements/:id      → teacher/admin
 */

import { useEffect, useState } from 'react';
import { FlatList, Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { Text } from '../components/Text';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { format, parseISO } from 'date-fns';
import { Megaphone, Pin, PinOff, Plus, Trash2 } from 'lucide-react-native';
import api from '../lib/api';
import {
  Button,
  DialogModal,
  EmptyState,
  ErrorBanner,
  Field,
  IconButton,
} from '../components/ui';
import { cn, errMessage } from '../lib/utils';
import { colors } from '../lib/colors';
import type { Announcement, User } from '../types';
import type { RootStackParamList } from '../navigation/types';

/** Pinned first, then newest — mirrors the backend's own ordering (announcements.cjs). */
function sortAnnouncements(items: Announcement[]): Announcement[] {
  return [...items].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
}

export default function AnnouncementsScreen({ user }: { user: User }) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const canManage = user.role === 'teacher' || user.role === 'admin';

  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', content: '' });

  const load = async () => {
    try {
      setItems(await api.announcements.list());
      setError(null);
    } catch (err) {
      setError(errMessage(err, 'Could not load announcements'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const create = async () => {
    setBusy('create');
    setError(null);
    try {
      const created = await api.announcements.create({
        title: form.title.trim(),
        content: form.content.trim(),
      });
      setItems((prev) => sortAnnouncements([created, ...prev]));
      setForm({ title: '', content: '' });
      setShowForm(false);
    } catch (err) {
      setError(errMessage(err, 'Could not publish the announcement'));
    } finally {
      setBusy(null);
    }
  };

  const togglePin = async (id: string) => {
    setBusy(id);
    setError(null);
    try {
      const updated = await api.announcements.togglePin(id);
      setItems((prev) => sortAnnouncements(prev.map((a) => (a.id === id ? updated : a))));
    } catch (err) {
      setError(errMessage(err, 'Could not update the pin'));
    } finally {
      setBusy(null);
    }
  };

  const remove = async (id: string) => {
    setBusy(id);
    setError(null);
    try {
      await api.announcements.remove(id);
      setItems((prev) => prev.filter((a) => a.id !== id));
    } catch (err) {
      setError(errMessage(err, 'Could not delete the announcement'));
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <FlatList
        className="bg-slate-50"
        contentContainerClassName="p-4 pb-28 gap-4"
        data={items}
        keyExtractor={(a) => a.id}
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
              <Text className="text-2xl font-bold text-slate-900">Announcements</Text>
              <Text className="text-slate-500 mt-1">
                Campus-wide notices from faculty and administration.
              </Text>
            </View>
            {canManage && (
              <Button
                label="New Announcement"
                onPress={() => setShowForm(true)}
                icon={<Plus size={18} color={colors.white} />}
              />
            )}
            {!!error && <ErrorBanner message={error} />}
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <Text className="text-center py-12 text-slate-500">Loading announcements…</Text>
          ) : (
            <EmptyState
              icon={<Megaphone size={36} color={colors.slate300} />}
              title="Nothing has been announced yet."
            />
          )
        }
        renderItem={({ item: a }) => (
          <View
            className={cn(
              'rounded-2xl p-5 border',
              a.pinned ? 'bg-amber-50 border-amber-200' : 'bg-white border-slate-200',
            )}
          >
            <View className="flex-row items-start justify-between gap-3">
              <View className="flex-1">
                <View className="flex-row items-center flex-wrap gap-2 mb-2">
                  {a.pinned && (
                    <View className="flex-row items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-200">
                      <Pin size={11} color={colors.amber900} />
                      <Text className="text-[11px] font-bold text-amber-900">Pinned</Text>
                    </View>
                  )}
                  {!!a.author &&
                    (a.posted_by ? (
                      <Pressable
                        onPress={() => navigation.navigate('Profile', { id: a.posted_by! })}
                      >
                        <Text className="text-xs font-bold text-indigo-600">
                          By {a.author.name}
                        </Text>
                      </Pressable>
                    ) : (
                      <Text className="text-xs font-semibold text-slate-500">
                        By {a.author.name}
                      </Text>
                    ))}
                  <Text className="text-xs text-slate-400">
                    {format(parseISO(a.created_at), 'MMM d, yyyy • h:mm a')}
                  </Text>
                </View>
                <Text className="text-lg font-bold text-slate-900 mb-2">{a.title}</Text>
                <Text className="text-slate-600 leading-relaxed">{a.content}</Text>
              </View>

              {canManage && (
                <View className="flex-row items-center gap-1">
                  <IconButton
                    label={a.pinned ? 'Unpin' : 'Pin to top'}
                    onPress={() => togglePin(a.id)}
                    disabled={busy === a.id}
                  >
                    {a.pinned ? (
                      <PinOff size={16} color={colors.slate400} />
                    ) : (
                      <Pin size={16} color={colors.slate400} />
                    )}
                  </IconButton>
                  <IconButton label="Delete" onPress={() => remove(a.id)} disabled={busy === a.id}>
                    <Trash2 size={16} color={colors.slate400} />
                  </IconButton>
                </View>
              )}
            </View>
          </View>
        )}
      />

      <DialogModal
        visible={showForm}
        title="New announcement"
        onClose={() => setShowForm(false)}
      >
        <ScrollView contentContainerClassName="gap-4" keyboardShouldPersistTaps="handled">
          <Field
            label="Title"
            value={form.title}
            onChangeText={(title) => setForm({ ...form, title })}
            placeholder="e.g. Library hours extended"
          />
          <Field
            label="Content"
            value={form.content}
            onChangeText={(content) => setForm({ ...form, content })}
            placeholder="What do students and faculty need to know?"
            multiline
          />
          <Button
            label={busy === 'create' ? 'Publishing…' : 'Publish'}
            onPress={create}
            disabled={busy === 'create' || !form.title.trim() || !form.content.trim()}
          />
        </ScrollView>
      </DialogModal>
    </>
  );
}
