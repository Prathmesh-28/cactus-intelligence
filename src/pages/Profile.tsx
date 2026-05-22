import { useState } from 'react';
import { updatePassword, updateProfile, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { firebaseAuth } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { Navbar } from '../components/Navbar';
import { User, Mail, Shield, Lock, CheckCircle, AlertCircle } from 'lucide-react';

export function Profile() {
  const { user, setUser } = useAuth();

  const [name, setName] = useState(user?.name ?? '');
  const [nameStatus, setNameStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwStatus, setPwStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [pwError, setPwError] = useState('');

  const handleNameSave = async () => {
    const fb = firebaseAuth.currentUser;
    if (!fb || !name.trim() || name.trim() === user?.name) return;
    setNameStatus('saving');
    try {
      await updateProfile(fb, { displayName: name.trim() });
      if (user) setUser({ ...user, name: name.trim() });
      setNameStatus('saved');
      setTimeout(() => setNameStatus('idle'), 2000);
    } catch {
      setNameStatus('error');
    }
  };

  const handlePasswordChange = async () => {
    setPwError('');
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPwError('All fields are required');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwError('New passwords do not match');
      return;
    }
    if (newPassword.length < 8) {
      setPwError('New password must be at least 8 characters');
      return;
    }
    const fb = firebaseAuth.currentUser;
    if (!fb || !fb.email) return;
    setPwStatus('saving');
    try {
      const cred = EmailAuthProvider.credential(fb.email, currentPassword);
      await reauthenticateWithCredential(fb, cred);
      await updatePassword(fb, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPwStatus('saved');
      setTimeout(() => setPwStatus('idle'), 3000);
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? '';
      setPwError(
        code === 'auth/wrong-password' || code === 'auth/invalid-credential'
          ? 'Current password is incorrect'
          : code === 'auth/weak-password'
          ? 'New password is too weak'
          : 'Password change failed'
      );
      setPwStatus('error');
    }
  };

  if (!user) return null;

  const roleLabel = user.role === 'admin' ? 'Administrator' : 'Analyst';
  const roleColor = user.role === 'admin' ? 'text-emerald-400 bg-emerald-400/10' : 'text-sky-400 bg-sky-400/10';
  const initials = (user.name ?? user.email).slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen bg-[#0F1F17]">
      <Navbar />
      <div className="max-w-2xl mx-auto px-6 py-10 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-[#2E6B4F] flex items-center justify-center text-2xl font-bold text-white">
            {initials}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">{user.name ?? user.email}</h1>
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${roleColor}`}>
              {roleLabel}
            </span>
          </div>
        </div>

        {/* Account info */}
        <div className="bg-[#1C3B2E]/60 border border-[#2E6B4F]/30 rounded-xl p-6 space-y-4">
          <h2 className="text-sm font-semibold text-[#A8C4B0] uppercase tracking-wider">Account Details</h2>

          <div className="flex items-center gap-3">
            <Mail size={16} className="text-[#4A7C5F] shrink-0" />
            <div>
              <p className="text-xs text-[#4A7C5F]">Email</p>
              <p className="text-white text-sm">{user.email}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Shield size={16} className="text-[#4A7C5F] shrink-0" />
            <div>
              <p className="text-xs text-[#4A7C5F]">Role</p>
              <p className="text-white text-sm">{roleLabel}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <User size={16} className="text-[#4A7C5F] shrink-0" />
            <div className="flex-1">
              <p className="text-xs text-[#4A7C5F] mb-1">Display Name</p>
              <div className="flex gap-2">
                <input
                  value={name}
                  onChange={e => { setName(e.target.value); setNameStatus('idle'); }}
                  onKeyDown={e => e.key === 'Enter' && handleNameSave()}
                  className="flex-1 bg-[#0F1F17] border border-[#2E6B4F]/50 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-[#3D9970]"
                  placeholder="Your name"
                />
                <button
                  onClick={handleNameSave}
                  disabled={nameStatus === 'saving' || !name.trim() || name.trim() === user.name}
                  className="px-4 py-1.5 text-sm rounded-lg bg-[#3D9970] text-white font-medium hover:bg-[#2E7D5A] disabled:opacity-40 transition-colors"
                >
                  {nameStatus === 'saving' ? 'Saving…' : nameStatus === 'saved' ? 'Saved' : 'Save'}
                </button>
              </div>
              {nameStatus === 'saved' && (
                <p className="mt-1 text-xs text-emerald-400 flex items-center gap-1"><CheckCircle size={12} /> Name updated</p>
              )}
              {nameStatus === 'error' && (
                <p className="mt-1 text-xs text-red-400 flex items-center gap-1"><AlertCircle size={12} /> Update failed</p>
              )}
            </div>
          </div>
        </div>

        {/* Change password */}
        <div className="bg-[#1C3B2E]/60 border border-[#2E6B4F]/30 rounded-xl p-6 space-y-4">
          <h2 className="text-sm font-semibold text-[#A8C4B0] uppercase tracking-wider flex items-center gap-2">
            <Lock size={14} /> Change Password
          </h2>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-[#4A7C5F] mb-1 block">Current password</label>
              <input
                type="password"
                value={currentPassword}
                onChange={e => { setCurrentPassword(e.target.value); setPwStatus('idle'); setPwError(''); }}
                className="w-full bg-[#0F1F17] border border-[#2E6B4F]/50 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#3D9970]"
                placeholder="Enter current password"
              />
            </div>
            <div>
              <label className="text-xs text-[#4A7C5F] mb-1 block">New password</label>
              <input
                type="password"
                value={newPassword}
                onChange={e => { setNewPassword(e.target.value); setPwStatus('idle'); setPwError(''); }}
                className="w-full bg-[#0F1F17] border border-[#2E6B4F]/50 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#3D9970]"
                placeholder="At least 8 characters"
              />
            </div>
            <div>
              <label className="text-xs text-[#4A7C5F] mb-1 block">Confirm new password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={e => { setConfirmPassword(e.target.value); setPwStatus('idle'); setPwError(''); }}
                onKeyDown={e => e.key === 'Enter' && handlePasswordChange()}
                className="w-full bg-[#0F1F17] border border-[#2E6B4F]/50 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#3D9970]"
                placeholder="Repeat new password"
              />
            </div>
            {pwError && (
              <p className="text-xs text-red-400 flex items-center gap-1"><AlertCircle size={12} />{pwError}</p>
            )}
            {pwStatus === 'saved' && (
              <p className="text-xs text-emerald-400 flex items-center gap-1"><CheckCircle size={12} /> Password changed successfully</p>
            )}
            <button
              onClick={handlePasswordChange}
              disabled={pwStatus === 'saving'}
              className="w-full py-2 rounded-lg bg-[#3D9970] text-white text-sm font-medium hover:bg-[#2E7D5A] disabled:opacity-40 transition-colors"
            >
              {pwStatus === 'saving' ? 'Updating…' : 'Update Password'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
