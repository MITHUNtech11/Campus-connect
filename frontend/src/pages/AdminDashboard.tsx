/**
 * Admin console — every panel maps to a real endpoint in
 * backend/server/api/admin.cjs (all of which require an ADMIN bearer token).
 *
 *   GET    /api/admin/stats      → aggregate counts
 *   GET    /api/admin/users      → account list
 *   POST   /api/admin/users      → create an account (any role)
 *   PATCH  /api/admin/users/:id  → role / department / name / reputation_score
 *   DELETE /api/admin/users/:id  → remove an account
 *   GET    /api/admin/logs       → the 50 most recent audit_logs rows
 *
 * There is no moderation/report endpoint in the backend, so no moderation
 * queue is shown here — the audit log is the closest real equivalent.
 */

import { useCallback, useEffect, useState, useMemo } from 'react';
import {
  Users,
  GraduationCap,
  CalendarCheck,
  Clock,
  Plus,
  Trash2,
  X,
  Save,
  Pencil,
  ScrollText,
  RefreshCw,
} from 'lucide-react';
import { motion } from 'motion/react';
import { format, parseISO } from 'date-fns';
import { cn } from '../lib/utils';
import api from '../lib/api';
import type { AdminStats, AdminUser, AuditLog, Role, User } from '../types';
import ErrorBanner from '../components/ErrorBanner';

const ROLE_BADGE: Record<string, string> = {
  ADMIN: 'bg-purple-100 text-purple-700',
  TEACHER: 'bg-indigo-100 text-indigo-700',
  STUDENT: 'bg-emerald-100 text-emerald-700',
};

export default function AdminDashboard({ user }: { user: User }) {
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
  const [editForm, setEditForm] = useState({ role: '', department: '', reputation_score: 100 });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, u, l] = await Promise.all([api.admin.stats(), api.admin.users(), api.admin.logs()]);
      setStats(s);
      setUsers(u);
      setLogs(l);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load admin data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const adminAnalytics = useMemo(() => {
    const deptCounts: Record<string, number> = {};
    for (const u of users) {
      const dept = u.department || 'General';
      deptCounts[dept] = (deptCounts[dept] || 0) + 1;
    }
    const deptData = Object.entries(deptCounts).map(([name, value]) => ({ name, value }));
    const deptMax = Math.max(...deptData.map((d) => d.value), 1);

    const roleCounts = {
      student: 0,
      teacher: 0,
      admin: 0,
    };
    for (const u of users) {
      const role = String(u.role || 'STUDENT').toLowerCase();
      if (role in roleCounts) {
        roleCounts[role as keyof typeof roleCounts] += 1;
      }
    }

    const repSums = { student: 0, teacher: 0 };
    const repCounts = { student: 0, teacher: 0 };
    for (const u of users) {
      const role = String(u.role || 'STUDENT').toLowerCase();
      if (role === 'student' || role === 'teacher') {
        repSums[role] += u.reputation_score || 0;
        repCounts[role] += 1;
      }
    }
    const avgReps = {
      student: repCounts.student ? Math.round(repSums.student / repCounts.student) : 100,
      teacher: repCounts.teacher ? Math.round(repSums.teacher / repCounts.teacher) : 100,
    };

    return {
      deptData,
      deptMax,
      roleCounts,
      avgReps,
    };
  }, [users]);

  const createUser = async (e: React.FormEvent) => {
    e.preventDefault();
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
      setError(err instanceof Error ? err.message : 'Could not create the account');
    } finally {
      setBusy(null);
    }
  };

  const startEdit = (u: AdminUser) => {
    setEditingId(u.id);
    setEditForm({
      role: u.role,
      department: u.department || '',
      reputation_score: u.reputation_score,
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
      setError(err instanceof Error ? err.message : 'Could not update the account');
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
      setError(err instanceof Error ? err.message : 'Could not delete the account');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Admin Console</h1>
          <p className="text-slate-500 mt-1">
            Account management, campus-wide metrics, and the audit trail.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={load}
            disabled={loading}
            className="px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-medium hover:bg-slate-50 flex items-center gap-2 disabled:opacity-60"
          >
            <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} /> Refresh
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors shadow-sm flex items-center gap-2"
          >
            <Plus className="w-5 h-5" /> New Account
          </button>
        </div>
      </div>

      {error && <ErrorBanner message={error} />}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatTile
          icon={<Users className="w-5 h-5" />}
          label="Total users"
          value={stats?.total_users}
          tone="indigo"
        />
        <StatTile
          icon={<GraduationCap className="w-5 h-5" />}
          label="Teachers"
          value={stats?.total_teachers}
          tone="purple"
        />
        <StatTile
          icon={<CalendarCheck className="w-5 h-5" />}
          label="Total bookings"
          value={stats?.total_bookings}
          tone="emerald"
        />
        <StatTile
          icon={<Clock className="w-5 h-5" />}
          label="Pending bookings"
          value={stats?.pending_bookings}
          tone="amber"
        />
      </div>

      {/* Admin Analytics Block */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* Department Distribution */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
          <h3 className="text-lg font-bold text-slate-900 mb-1">Department Demographics</h3>
          <p className="text-xs text-slate-500 mb-6">User distribution across different university departments.</p>
          
          <div className="space-y-4">
            {adminAnalytics.deptData.length === 0 ? (
              <p className="text-sm text-slate-400 py-4 text-center">No user demographics available.</p>
            ) : (
              adminAnalytics.deptData.map((d) => {
                const percentage = Math.round((d.value / adminAnalytics.deptMax) * 100);
                return (
                  <div key={d.name} className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-slate-700">{d.name}</span>
                      <span className="text-indigo-600 font-bold">{d.value} users</span>
                    </div>
                    <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                      <div className="bg-indigo-600 h-full rounded-full transition-all duration-500" style={{ width: `${percentage}%` }}></div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Roles and Reputations metrics card */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-6">
          <div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">Role & Engagement Metrics</h3>
            <p className="text-xs text-slate-500">Breakdown of roles and engagement quality indices.</p>
          </div>

          {/* Role stack */}
          <div>
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Role Ratios</h4>
            {(() => {
              const total = stats?.total_users || 1;
              const sPct = Math.round((adminAnalytics.roleCounts.student / total) * 100);
              const tPct = Math.round((adminAnalytics.roleCounts.teacher / total) * 100);
              const aPct = Math.round((adminAnalytics.roleCounts.admin / total) * 100);
              return (
                <div className="space-y-3">
                  <div className="w-full bg-slate-100 h-4 rounded-full overflow-hidden flex">
                    <div className="bg-emerald-500 h-full" style={{ width: `${sPct}%` }} title={`Students: ${sPct}%`}></div>
                    <div className="bg-indigo-500 h-full" style={{ width: `${tPct}%` }} title={`Teachers: ${tPct}%`}></div>
                    <div className="bg-purple-500 h-full" style={{ width: `${aPct}%` }} title={`Admins: ${aPct}%`}></div>
                  </div>
                  <div className="flex justify-between text-[10px] font-semibold text-slate-500">
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> Students ({sPct}%)</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-indigo-500"></span> Teachers ({tPct}%)</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-purple-500"></span> Admins ({aPct}%)</span>
                  </div>
                </div>
              );
            })()}
          </div>

          <div className="pt-4 border-t border-slate-100">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Average Reputation Score</h4>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-slate-600">Students Reputation Index</span>
                  <span className="text-emerald-600 font-bold">{adminAnalytics.avgReps.student} / 100</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${Math.min(adminAnalytics.avgReps.student, 100)}%` }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-slate-600">Teachers Reputation Index</span>
                  <span className="text-indigo-600 font-bold">{adminAnalytics.avgReps.teacher} / 100</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-indigo-500 h-full rounded-full" style={{ width: `${Math.min(adminAnalytics.avgReps.teacher, 100)}%` }}></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Users */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">User Accounts</h2>
          <span className="text-sm text-slate-500">{users.length} accounts</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
              <tr>
                <th className="text-left font-semibold px-6 py-3">Name</th>
                <th className="text-left font-semibold px-6 py-3">Email</th>
                <th className="text-left font-semibold px-6 py-3">Role</th>
                <th className="text-left font-semibold px-6 py-3">Department</th>
                <th className="text-left font-semibold px-6 py-3">Reputation</th>
                <th className="text-left font-semibold px-6 py-3">Joined</th>
                <th className="text-right font-semibold px-6 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-slate-500">
                    {loading ? 'Loading…' : 'No accounts found.'}
                  </td>
                </tr>
              ) : (
                users.map((u) => {
                  const editing = editingId === u.id;
                  return (
                    <tr key={u.id} className="hover:bg-slate-50/60">
                      <td className="px-6 py-4 font-medium text-slate-900 whitespace-nowrap">
                        {u.name}
                        {u.id === user.id && (
                          <span className="ml-2 text-[10px] uppercase font-bold text-indigo-600">
                            you
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-slate-500 whitespace-nowrap">{u.email}</td>
                      <td className="px-6 py-4">
                        {editing ? (
                          <select
                            value={editForm.role}
                            onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                            className="px-2 py-1 rounded-lg border border-slate-200 text-xs bg-white"
                          >
                            <option value="STUDENT">STUDENT</option>
                            <option value="TEACHER">TEACHER</option>
                            <option value="ADMIN">ADMIN</option>
                          </select>
                        ) : (
                          <span
                            className={cn(
                              'px-2.5 py-1 rounded-full text-[11px] font-bold',
                              ROLE_BADGE[u.role?.toUpperCase()] || 'bg-slate-100 text-slate-600',
                            )}
                          >
                            {u.role}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        {editing ? (
                          <input
                            value={editForm.department}
                            onChange={(e) =>
                              setEditForm({ ...editForm, department: e.target.value })
                            }
                            className="px-2 py-1 rounded-lg border border-slate-200 text-xs w-36"
                          />
                        ) : (
                          u.department || '—'
                        )}
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        {editing ? (
                          <input
                            type="number"
                            value={editForm.reputation_score}
                            onChange={(e) =>
                              setEditForm({
                                ...editForm,
                                reputation_score: Number(e.target.value),
                              })
                            }
                            className="px-2 py-1 rounded-lg border border-slate-200 text-xs w-20"
                          />
                        ) : (
                          <span className="font-semibold">{u.reputation_score}</span>
                        )}
                        {!editing && u.no_shows > 0 && (
                          <span className="ml-2 text-[11px] text-red-500">
                            {u.no_shows} no-shows
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-slate-400 text-xs whitespace-nowrap">
                        {u.created_at ? format(parseISO(u.created_at), 'MMM d, yyyy') : '—'}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-1">
                          {editing ? (
                            <>
                              <button
                                onClick={() => saveEdit(u.id)}
                                disabled={busy === u.id}
                                className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg disabled:opacity-50"
                                title="Save"
                              >
                                <Save className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setEditingId(null)}
                                className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg"
                                title="Cancel"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => startEdit(u)}
                                className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"
                                title="Edit"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => deleteUser(u)}
                                disabled={busy === u.id}
                                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-50"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Audit log */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <h2 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
          <ScrollText className="w-5 h-5 text-indigo-600" /> Audit Trail
          <span className="text-sm font-normal text-slate-400">(50 most recent)</span>
        </h2>

        {logs.length === 0 ? (
          <p className="text-sm text-slate-500 py-8 text-center">
            {loading ? 'Loading…' : 'No audit entries recorded yet.'}
          </p>
        ) : (
          <ol className="relative border-l border-slate-200 ml-2 space-y-4">
            {logs.map((log) => (
              <li key={log.id} className="ml-6">
                <span className="absolute -left-1.5 w-3 h-3 bg-indigo-500 rounded-full ring-4 ring-white" />
                <p className="text-sm text-slate-800">{log.action}</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {log.actor_email || 'system'} •{' '}
                  {log.created_at ? format(parseISO(log.created_at), 'MMM d, yyyy h:mm a') : ''}
                </p>
              </li>
            ))}
          </ol>
        )}
      </div>

      {/* Create account modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-900">Create account</h2>
              <button
                onClick={() => setShowCreate(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={createUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Full name</label>
                <input
                  required
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-600 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={createForm.email}
                  onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-600 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Temporary password
                </label>
                <input
                  type="text"
                  required
                  minLength={6}
                  value={createForm.password}
                  onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-600 outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
                  <select
                    value={createForm.role}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, role: e.target.value as Role })
                    }
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-indigo-600 outline-none"
                  >
                    <option value="student">Student</option>
                    <option value="teacher">Teacher</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Department</label>
                  <input
                    value={createForm.department}
                    onChange={(e) => setCreateForm({ ...createForm, department: e.target.value })}
                    placeholder="General"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-600 outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={busy === 'create'}
                className="w-full py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 disabled:opacity-70"
              >
                {busy === 'create' ? 'Creating…' : 'Create account'}
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </div>
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
  tone: 'indigo' | 'purple' | 'emerald' | 'amber';
}) {
  const tones = {
    indigo: 'bg-indigo-50 text-indigo-600',
    purple: 'bg-purple-50 text-purple-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
  };
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
      <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center mb-3', tones[tone])}>
        {icon}
      </div>
      <p className="text-3xl font-bold text-slate-900">{value ?? '—'}</p>
      <p className="text-sm text-slate-500 mt-1">{label}</p>
    </div>
  );
}
