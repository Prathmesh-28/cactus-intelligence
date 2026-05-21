import { useEffect, useState } from 'react';
import { Users, Settings, Shield, Plus, Edit2, Trash2, RotateCcw, Check, X, ChevronDown, ChevronRight } from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { users as usersApi, settings as settingsApi, type ApiUser } from '../lib/api';
import { useAuth } from '../context/AuthContext';

type AdminTab = 'users' | 'settings' | 'audit';

// ── Inline-editable setting row ───────────────────────────────
function SettingRow({ settingKey, value, description, onSave }: {
  settingKey: string;
  value: unknown;
  description: string | null;
  onSave: (key: string, val: unknown) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(JSON.stringify(value));
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const save = async () => {
    setSaving(true); setErr('');
    try {
      const parsed = JSON.parse(draft);
      await onSave(settingKey, parsed);
      setEditing(false);
    } catch {
      setErr('Invalid JSON value');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="px-5 py-4 border-b border-[#E8EDE9] last:border-0">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <code className="text-xs font-mono text-[#2E6B4F] bg-[#F0F7F2] px-1.5 py-0.5 rounded">{settingKey}</code>
          {description && <p className="text-xs text-[#4A5E52] mt-1">{description}</p>}
        </div>

        {editing ? (
          <div className="flex items-center gap-2 flex-1 max-w-xs">
            <input
              value={draft}
              onChange={e => setDraft(e.target.value)}
              className="flex-1 text-xs font-mono px-2 py-1.5 border border-[#2E6B4F] rounded-lg outline-none bg-white text-[#0F1A14]"
            />
            <button onClick={save} disabled={saving} className="p-1.5 bg-[#27AE60] text-white rounded-lg hover:bg-[#229954]">
              <Check size={12} />
            </button>
            <button onClick={() => { setEditing(false); setDraft(JSON.stringify(value)); }} className="p-1.5 bg-[#E8EDE9] text-[#4A5E52] rounded-lg hover:bg-[#D4E0D7]">
              <X size={12} />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-[#0F1A14] bg-[#F8F6F1] px-2 py-1 rounded border border-[#E8EDE9] max-w-[180px] truncate">
              {JSON.stringify(value)}
            </span>
            <button onClick={() => setEditing(true)} className="p-1.5 text-[#9BB0A1] hover:text-[#2E6B4F] transition-colors">
              <Edit2 size={12} />
            </button>
          </div>
        )}
      </div>
      {err && <p className="text-xs text-[#C0392B] mt-1">{err}</p>}
    </div>
  );
}

// ── User row ──────────────────────────────────────────────────
function UserRow({ u, currentUserId, onUpdate, onReset, onDeactivate }: {
  u: ApiUser;
  currentUserId: string;
  onUpdate: (id: string, updates: Partial<{ role: string; is_active: boolean }>) => Promise<void>;
  onReset: (id: string) => Promise<string>;
  onDeactivate: (id: string) => Promise<void>;
}) {
  const [showPassword, setShowPassword] = useState('');

  const ROLE_COLORS: Record<string, string> = {
    admin: 'bg-[#1C3B2E]/10 text-[#1C3B2E]',
    analyst: 'bg-[#2E6B4F]/10 text-[#2E6B4F]',
    viewer: 'bg-[#E8EDE9] text-[#4A5E52]',
  };

  return (
    <div className={`flex items-center gap-4 px-5 py-4 ${!u.is_active ? 'opacity-50' : ''}`}>
      <div className="w-8 h-8 rounded-full bg-[#1C3B2E]/10 flex items-center justify-center text-xs font-bold text-[#1C3B2E] shrink-0">
        {(u.name ?? u.email)[0].toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[#0F1A14]">{u.name ?? '—'}</p>
        <p className="text-xs text-[#4A5E52] truncate">{u.email}</p>
      </div>
      <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${ROLE_COLORS[u.role] ?? ROLE_COLORS.viewer}`}>
        {u.role}
      </span>
      {!u.is_active && <span className="text-xs px-2 py-0.5 rounded-full bg-[#C0392B]/10 text-[#C0392B]">Inactive</span>}

      {/* Role selector */}
      {u.id !== currentUserId && (
        <select
          value={u.role}
          onChange={e => onUpdate(u.id, { role: e.target.value })}
          className="text-xs border border-[#E8EDE9] rounded-lg px-2 py-1 bg-white text-[#0F1A14] outline-none"
        >
          <option value="admin">Admin</option>
          <option value="analyst">Analyst</option>
          <option value="viewer">Viewer</option>
        </select>
      )}

      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={async () => { const p = await onReset(u.id); setShowPassword(p); }}
          className="p-1.5 text-[#9BB0A1] hover:text-[#E67E22] transition-colors"
          title="Reset password"
        >
          <RotateCcw size={14} />
        </button>
        {u.id !== currentUserId && (
          <button
            onClick={() => onDeactivate(u.id)}
            className="p-1.5 text-[#9BB0A1] hover:text-[#C0392B] transition-colors"
            title={u.is_active ? 'Deactivate' : 'Already inactive'}
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>

      {showPassword && (
        <div className="absolute right-6 mt-16 bg-white border border-[#E8EDE9] rounded-xl shadow-xl p-4 z-50 max-w-xs">
          <p className="text-xs text-[#4A5E52] mb-2">New temporary password:</p>
          <code className="text-sm font-mono bg-[#F0F7F2] px-3 py-1.5 rounded-lg text-[#1C3B2E] block mb-3">{showPassword}</code>
          <button onClick={() => setShowPassword('')} className="text-xs text-[#2E6B4F] hover:underline">Close</button>
        </div>
      )}
    </div>
  );
}

// ── Main Admin Page ────────────────────────────────────────────
export function Admin() {
  const { user: me } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminTab>('users');
  const [userList, setUserList] = useState<ApiUser[]>([]);
  const [settingsMap, setSettingsMap] = useState<Record<string, unknown>>({});
  const [settingsMeta, setSettingsMeta] = useState<Record<string, { description: string | null }>>({});
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingSettings, setLoadingSettings] = useState(false);

  // Invite form
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState('analyst');
  const [inviting, setInviting] = useState(false);
  const [inviteResult, setInviteResult] = useState<{ tempPassword: string; email: string } | null>(null);
  const [showInviteForm, setShowInviteForm] = useState(false);

  useEffect(() => {
    if (activeTab === 'users') loadUsers();
    if (activeTab === 'settings') loadSettings();
  }, [activeTab]);

  const loadUsers = async () => {
    setLoadingUsers(true);
    try { const { users } = await usersApi.list(); setUserList(users); } catch {}
    setLoadingUsers(false);
  };

  const loadSettings = async () => {
    setLoadingSettings(true);
    try {
      const { settings, meta } = await settingsApi.getAll();
      setSettingsMap(settings);
      setSettingsMeta(meta as Record<string, { description: string | null }>);
    } catch {}
    setLoadingSettings(false);
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviting(true);
    try {
      const { user, tempPassword } = await usersApi.create(inviteEmail, inviteName, inviteRole);
      setInviteResult({ tempPassword, email: user.email });
      setUserList(prev => [user, ...prev]);
      setInviteEmail(''); setInviteName(''); setInviteRole('analyst');
      setShowInviteForm(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to invite user');
    }
    setInviting(false);
  };

  const handleUpdate = async (id: string, updates: Partial<{ role: string; is_active: boolean }>) => {
    const { user: updated } = await usersApi.update(id, updates);
    setUserList(prev => prev.map(u => u.id === id ? { ...u, ...updated } : u));
  };

  const handleReset = async (id: string): Promise<string> => {
    const { tempPassword } = await usersApi.resetPassword(id);
    return tempPassword;
  };

  const handleDeactivate = async (id: string) => {
    if (!confirm('Deactivate this user? They will lose access immediately.')) return;
    await usersApi.deactivate(id);
    setUserList(prev => prev.map(u => u.id === id ? { ...u, is_active: false } : u));
  };

  const handleSaveSetting = async (key: string, value: unknown) => {
    await settingsApi.set(key, value);
    setSettingsMap(prev => ({ ...prev, [key]: value }));
  };

  const TABS: { id: AdminTab; label: string; icon: React.ReactNode }[] = [
    { id: 'users', label: 'Team Members', icon: <Users size={16} /> },
    { id: 'settings', label: 'Platform Settings', icon: <Settings size={16} /> },
  ];

  return (
    <div className="min-h-screen bg-[#F8F6F1]">
      <Navbar />

      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-[#1C3B2E] flex items-center justify-center">
            <Shield size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#1C3B2E]" style={{ fontFamily: '"Playfair Display", serif' }}>
              Admin Console
            </h1>
            <p className="text-xs text-[#4A5E52]">Cactus Intelligence · {me?.email}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 border-b border-[#E8EDE9]">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
                activeTab === t.id
                  ? 'border-[#1C3B2E] text-[#1C3B2E]'
                  : 'border-transparent text-[#4A5E52] hover:text-[#0F1A14]'
              }`}
            >
              {t.icon}{t.label}
            </button>
          ))}
        </div>

        {/* ── Users tab ──────────────────────────────────────── */}
        {activeTab === 'users' && (
          <div className="space-y-4">
            {/* Invite result banner */}
            {inviteResult && (
              <div className="bg-[#27AE60]/8 border border-[#27AE60]/25 rounded-xl p-4 flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-[#0F1A14]">User created: {inviteResult.email}</p>
                  <p className="text-xs text-[#4A5E52] mt-1">Temporary password:
                    <code className="ml-1 font-mono bg-white px-2 py-0.5 rounded border border-[#E8EDE9] text-[#1C3B2E]">
                      {inviteResult.tempPassword}
                    </code>
                  </p>
                  <p className="text-xs text-[#9BB0A1] mt-1">Share this with the team member — they should change it on first login.</p>
                </div>
                <button onClick={() => setInviteResult(null)} className="text-[#9BB0A1] hover:text-[#4A5E52]"><X size={16} /></button>
              </div>
            )}

            {/* Invite form */}
            <div className="bg-white border border-[#E8EDE9] rounded-xl overflow-hidden shadow-sm">
              <button
                onClick={() => setShowInviteForm(v => !v)}
                className="w-full flex items-center justify-between px-5 py-4 text-sm font-semibold text-[#0F1A14] hover:bg-[#F8F6F1] transition-colors"
              >
                <span className="flex items-center gap-2"><Plus size={16} className="text-[#2E6B4F]" />Invite Team Member</span>
                {showInviteForm ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </button>
              {showInviteForm && (
                <form onSubmit={handleInvite} className="px-5 pb-5 border-t border-[#E8EDE9] pt-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs text-[#4A5E52] mb-1 font-medium uppercase tracking-wide">Email *</label>
                      <input
                        type="email" required value={inviteEmail}
                        onChange={e => setInviteEmail(e.target.value)}
                        placeholder="analyst@cactuspartners.in"
                        className="w-full px-3 py-2 border border-[#E8EDE9] rounded-lg text-sm bg-[#F8F6F1] text-[#0F1A14] outline-none focus:border-[#2E6B4F]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-[#4A5E52] mb-1 font-medium uppercase tracking-wide">Name</label>
                      <input
                        value={inviteName} onChange={e => setInviteName(e.target.value)}
                        placeholder="Full name"
                        className="w-full px-3 py-2 border border-[#E8EDE9] rounded-lg text-sm bg-[#F8F6F1] text-[#0F1A14] outline-none focus:border-[#2E6B4F]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-[#4A5E52] mb-1 font-medium uppercase tracking-wide">Role</label>
                      <select
                        value={inviteRole} onChange={e => setInviteRole(e.target.value)}
                        className="w-full px-3 py-2 border border-[#E8EDE9] rounded-lg text-sm bg-[#F8F6F1] text-[#0F1A14] outline-none focus:border-[#2E6B4F]"
                      >
                        <option value="analyst">Analyst</option>
                        <option value="viewer">Viewer (read-only)</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>
                  </div>
                  <button
                    type="submit" disabled={inviting}
                    className="mt-3 px-5 py-2 bg-[#1C3B2E] text-white text-sm font-semibold rounded-lg hover:bg-[#152C22] disabled:opacity-60 transition-colors"
                  >
                    {inviting ? 'Creating...' : 'Create & Get Password'}
                  </button>
                </form>
              )}
            </div>

            {/* Users list */}
            <div className="bg-white border border-[#E8EDE9] rounded-xl overflow-hidden shadow-sm">
              <div className="px-5 py-3 border-b border-[#E8EDE9] bg-[#FAFCFA] flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-[#4A5E52]">Team ({userList.length})</h3>
              </div>
              {loadingUsers ? (
                <p className="text-sm text-[#4A5E52] text-center py-8">Loading...</p>
              ) : (
                <div className="relative divide-y divide-[#E8EDE9]">
                  {userList.map(u => (
                    <UserRow
                      key={u.id} u={u}
                      currentUserId={me?.id ?? ''}
                      onUpdate={handleUpdate}
                      onReset={handleReset}
                      onDeactivate={handleDeactivate}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Settings tab ───────────────────────────────────── */}
        {activeTab === 'settings' && (
          <div className="bg-white border border-[#E8EDE9] rounded-xl overflow-hidden shadow-sm">
            <div className="px-5 py-3 border-b border-[#E8EDE9] bg-[#FAFCFA]">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-[#4A5E52]">Platform Settings</h3>
              <p className="text-xs text-[#9BB0A1] mt-0.5">Click the edit icon to change any value. Accepts JSON values.</p>
            </div>
            {loadingSettings ? (
              <p className="text-sm text-center py-8 text-[#4A5E52]">Loading settings...</p>
            ) : (
              Object.entries(settingsMap).map(([key, value]) => (
                <SettingRow
                  key={key}
                  settingKey={key}
                  value={value}
                  description={settingsMeta[key]?.description ?? null}
                  onSave={handleSaveSetting}
                />
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
