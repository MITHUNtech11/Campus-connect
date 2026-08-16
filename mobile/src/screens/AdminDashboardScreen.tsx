/**
 * Admin console — port of frontend/src/pages/AdminDashboard.tsx.
 *
 *   GET    /api/admin/stats      → aggregate counts
 *   GET    /api/admin/users      → account list
 *   POST   /api/admin/users      → create an account (any role)
 *   PATCH  /api/admin/users/:id  → role / department / name / reputation_score
 *   DELETE /api/admin/users/:id  → remove an account
 *   GET    /api/admin/logs       → the 50 most recent audit_logs rows
 *
 * There is no moderation/report endpoint in the backend, so no moderation queue
 * is shown here — the audit log is the closest real equivalent.
 *
 * One layout deviation: the web app's seven-column user table becomes a list of
 * per-account cards. A horizontally-scrolling table is unusable on a phone; the
 * same fields and the same inline edit (role / department / reputation) are all
 * present, just stacked.
 */

import { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
import { Text } from '../components/Text';
import { format, parseISO } from 'date-fns';
import {
  CalendarCheck,
  Clock,
  GraduationCap,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  ScrollText,
  Trash2,
  Users,
  X,
} from 'lucide-react-native';
import api from '../lib/api';
import {
  Button,
  Card,
  DialogModal,
  ErrorBanner,
  Field,
  IconButton,
  OptionRow,
  Pill,
  SectionTitle,
} from '../components/ui';
import { cn, errMessage } from '../lib/utils';
import { colors } from '../lib/colors';
import type { AdminStats, AdminUser, AuditLog, Role, User } from '../types';

const ROLE_BADGE: Record<string, string> = {
  ADMIN: 'bg-purple-100 text-purple-700',
  TEACHER: 'bg-indigo-100 text-indigo-700',
  STUDENT: 'bg-emerald-100 text-emerald-700',
};

const BACKEND_ROLES = ['STUDENT', 'TEACHER', 'ADMIN'] as const;
const CREATE_ROLES = ['student', 'teacher', 'admin'] as const;

export default function AdminDashboardScreen({ user }: { user: User }) {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'student' as Role,
    department: '',
  });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ role: '', department: '', reputation_score: '100' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, u, l] = await Promise.all([api.admin.stats(), api.admin.users(), api.admin.logs()]);
      setStats(s);
      setUsers(u);
      setLogs(l);
      setError(null);
    } catch (err) {
      setError(errMessage(err, 'Could not load admin data'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const createUser = async () => {
    setBusy('create');
    setError(null);
    try {
      await api.admin.createUser({
        name: createForm.name.trim(),
        email: createForm.email.trim(),
        password: createForm.password,
        role: createForm.role,
        department: createForm.department || undefined,
      });
      await load();
      setCreateForm({ name: '', email: '', password: '', role: 'student', department: '' });
      setShowCreate(false);
    } catch (err) {
      setError(errMessage(err, 'Could not create the account'));
    } finally {
      setBusy(null);
    }
  };

  const startEdit = (u: AdminUser) => {
    setEditingId(u.id);
    setEditForm({
      role: u.role,
      department: u.department || '',
      reputation_score: String(u.reputation_score),
    });
  };

  const saveEdit = async (id: string) => {
    setBusy(id);
    setError(null);
    try {
      const updated = await api.admin.updateUser(id, {
        role: editForm.role,
        department: editForm.department,
        reputation_score: Number(editForm.reputation_score),
      });
      setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, ...updated } : u)));
      setEditingId(null);
    } catch (err) {
      setError(errMessage(err, 'Could not update the account'));
    } finally {
      setBusy(null);
    }
  };

  const deleteUser = async (u: AdminUser) => {
    if (u.id === user.id) {
      setError('You cannot delete the account you are signed in with.');
      return;
    }
    setBusy(u.id);
    setError(null);
    try {
      await api.admin.deleteUser(u.id);
      setUsers((prev) => prev.filter((x) => x.id !== u.id));
    } catch (err) {
      setError(errMessage(err, 'Could not delete the account'));
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <ScrollView
        className="bg-slate-50"
        contentContainerClassName="p-4 pb-28 gap-6"
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.indigo600} />
        }
      >
        <View>
          <Text className="text-2xl font-bold text-slate-900">Admin Console</Text>
          <Text className="text-slate-500 mt-1">
            Account management, campus-wide metrics, and the audit trail.
          </Text>
          <View className="flex-row gap-2 mt-4">
            <Button
              label="Refresh"
              variant="ghost"
              onPress={load}
              disabled={loading}
              icon={<RefreshCw size={16} color={colors.slate700} />}
              className="flex-1"
            />
            <Button
              label="New Account"
              onPress={() => setShowCreate(true)}
              icon={<Plus size={16} color={colors.white} />}
              className="flex-1"
            />
          </View>
        </View>

        {!!error && <ErrorBanner message={error} />}

        {/* Stats */}
        <View className="flex-row flex-wrap gap-3">
          <StatTile
            icon={<Users size={18} color={colors.indigo600} />}
            label="Total users"
            value={stats?.total_users}
            tone="bg-indigo-50"
          />
          <StatTile
            icon={<GraduationCap size={18} color={colors.purple600} />}
            label="Teachers"
            value={stats?.total_teachers}
            tone="bg-purple-50"
          />
          <StatTile
            icon={<CalendarCheck size={18} color={colors.emerald600} />}
            label="Total bookings"
            value={stats?.total_bookings}
            tone="bg-emerald-50"
          />
          <StatTile
            icon={<Clock size={18} color={colors.amber600} />}
            label="Pending bookings"
            value={stats?.pending_bookings}
            tone="bg-amber-50"
          />
        </View>

        {/* Users */}
        <Card>
          <View className="flex-row items-center justify-between mb-5">
            <SectionTitle>User Accounts</SectionTitle>
            <Text className="text-sm text-slate-500">{users.length} accounts</Text>
          </View>

          <View className="gap-3">
            {users.length === 0 ? (
              <Text className="text-center py-8 text-slate-500">
                {loading ? 'Loading…' : 'No accounts found.'}
              </Text>
            ) : (
              users.map((u) => {
                const editing = editingId === u.id;
                return (
                  <View
                    key={u.id}
                    className="p-4 rounded-xl border border-slate-100 bg-slate-50 gap-3"
                  >
                    <View className="flex-row items-start justify-between gap-3">
                      <View className="flex-1">
                        <View className="flex-row items-center gap-2">
                          <Text className="font-semibold text-slate-900" numberOfLines={1}>
                            {u.name}
                          </Text>
                          {u.id === user.id && (
                            <Text className="text-[10px] uppercase font-bold text-indigo-600">
                              you
                            </Text>
                          )}
                        </View>
                        <Text className="text-sm text-slate-500" numberOfLines={1}>
                          {u.email}
                        </Text>
                        <Text className="text-[11px] text-slate-400 mt-0.5">
                          Joined{' '}
                          {u.created_at ? format(parseISO(u.created_at), 'MMM d, yyyy') : '—'}
                        </Text>
                      </View>

                      <View className="flex-row items-center gap-1">
                        {editing ? (
                          <>
                            <IconButton
                              label="Save"
                              onPress={() => saveEdit(u.id)}
                              disabled={busy === u.id}
                            >
                              <Save size={16} color={colors.emerald600} />
                            </IconButton>
                            <IconButton label="Cancel" onPress={() => setEditingId(null)}>
                              <X size={16} color={colors.slate400} />
                            </IconButton>
                          </>
                        ) : (
                          <>
                            <IconButton label="Edit" onPress={() => startEdit(u)}>
                              <Pencil size={16} color={colors.slate400} />
                            </IconButton>
                            <IconButton
                              label="Delete"
                              onPress={() => deleteUser(u)}
                              disabled={busy === u.id}
                            >
                              <Trash2 size={16} color={colors.slate400} />
                            </IconButton>
                          </>
                        )}
                      </View>
                    </View>

                    {editing ? (
                      <View className="gap-3">
                        <OptionRow
                          label="Role"
                          options={BACKEND_ROLES}
                          value={editForm.role.toUpperCase() as (typeof BACKEND_ROLES)[number]}
                          onChange={(role) => setEditForm({ ...editForm, role })}
                        />
                        <Field
                          label="Department"
                          value={editForm.department}
                          onChangeText={(department) => setEditForm({ ...editForm, department })}
                        />
                        <Field
                          label="Reputation"
                          value={editForm.reputation_score}
                          onChangeText={(reputation_score) =>
                            setEditForm({ ...editForm, reputation_score })
                          }
                          keyboardType="number-pad"
                        />
                      </View>
                    ) : (
                      <View className="flex-row items-center flex-wrap gap-2">
                        <Pill
                          className={ROLE_BADGE[u.role?.toUpperCase()] || 'bg-slate-100'}
                          textClassName={ROLE_BADGE[u.role?.toUpperCase()] || 'text-slate-600'}
                        >
                          {u.role}
                        </Pill>
                        <Text className="text-xs text-slate-600">{u.department || '—'}</Text>
                        <Text className="text-xs font-semibold text-slate-700">
                          Rep {u.reputation_score}
                        </Text>
                        {u.no_shows > 0 && (
                          <Text className="text-[11px] text-red-500">{u.no_shows} no-shows</Text>
                        )}
                      </View>
                    )}
                  </View>
                );
              })
            )}
          </View>
        </Card>

        {/* Audit log */}
        <Card>
          <View className="flex-row items-center gap-2 mb-5">
            <ScrollText size={18} color={colors.indigo600} />
            <SectionTitle>Audit Trail</SectionTitle>
            <Text className="text-sm text-slate-400">(50 most recent)</Text>
          </View>

          {logs.length === 0 ? (
            <Text className="text-sm text-slate-500 py-6 text-center">
              {loading ? 'Loading…' : 'No audit entries recorded yet.'}
            </Text>
          ) : (
            <View className="border-l border-slate-200 ml-1.5 gap-4">
              {logs.map((log) => (
                <View key={log.id} className="pl-5">
                  <View className="absolute -left-[5px] top-1 w-2.5 h-2.5 bg-indigo-500 rounded-full" />
                  <Text className="text-sm text-slate-800">{log.action}</Text>
                  <Text className="text-xs text-slate-400 mt-0.5">
                    {log.actor_email || 'system'} •{' '}
                    {log.created_at ? format(parseISO(log.created_at), 'MMM d, yyyy h:mm a') : ''}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </Card>
      </ScrollView>

      {/* Create account modal */}
      <DialogModal
        visible={showCreate}
        title="Create account"
        onClose={() => setShowCreate(false)}
      >
        <ScrollView contentContainerClassName="gap-4" keyboardShouldPersistTaps="handled">
          <Field
            label="Full name"
            value={createForm.name}
            onChangeText={(name) => setCreateForm({ ...createForm, name })}
          />
          <Field
            label="Email"
            value={createForm.email}
            onChangeText={(email) => setCreateForm({ ...createForm, email })}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <Field
            label="Temporary password"
            hint="(min 6 characters)"
            value={createForm.password}
            onChangeText={(password) => setCreateForm({ ...createForm, password })}
          />
          <OptionRow
            label="Role"
            options={CREATE_ROLES}
            value={createForm.role}
            onChange={(role) => setCreateForm({ ...createForm, role })}
          />
          <Field
            label="Department"
            value={createForm.department}
            onChangeText={(department) => setCreateForm({ ...createForm, department })}
            placeholder="General"
          />
          <Button
            label={busy === 'create' ? 'Creating…' : 'Create account'}
            onPress={createUser}
            disabled={
              busy === 'create' ||
              !createForm.name ||
              !createForm.email ||
              createForm.password.length < 6
            }
          />
        </ScrollView>
      </DialogModal>
    </>
  );
}

function StatTile({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value?: number;
  tone: string;
}) {
  return (
    <View className="flex-1 min-w-[45%] bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
      <View className={cn('w-10 h-10 rounded-xl items-center justify-center mb-3', tone)}>
        {icon}
      </View>
      <Text className="text-3xl font-bold text-slate-900">{value ?? '—'}</Text>
      <Text className="text-sm text-slate-500 mt-1">{label}</Text>
    </View>
  );
}
