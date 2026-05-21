import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { CactusLogo } from '../components/CactusLogo';
import { useAuth } from '../context/AuthContext';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as { redirect?: string; companyName?: string } | null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { error: err } = await signIn(email, password, rememberMe);
    setLoading(false);
    if (err) { setError(err); return; }
    navigate(state?.redirect ?? '/', { state });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8F6F1] px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl border border-[#E8EDE9] shadow-xl shadow-[#1C3B2E]/6 p-8">
          <div className="flex justify-center mb-8">
            <CactusLogo size="lg" />
          </div>

          <h2 className="text-center text-xl text-[#0F1A14] mb-1" style={{ fontFamily: '"Playfair Display", serif' }}>
            Sign in
          </h2>
          <p className="text-center text-sm text-[#4A5E52] mb-6">
            {state?.companyName
              ? `You'll be redirected to analyse "${state.companyName}"`
              : 'Access the Cactus Intelligence Platform'}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[#4A5E52] mb-1.5 uppercase tracking-wide">Email</label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                required placeholder="you@cactuspartners.in"
                className="w-full px-4 py-2.5 rounded-lg border border-[#E8EDE9] bg-[#F8F6F1] text-[#0F1A14] text-sm outline-none focus:border-[#2E6B4F] focus:ring-1 focus:ring-[#2E6B4F] transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#4A5E52] mb-1.5 uppercase tracking-wide">Password</label>
              <input
                type="password" value={password} onChange={e => setPassword(e.target.value)}
                required placeholder="••••••••"
                className="w-full px-4 py-2.5 rounded-lg border border-[#E8EDE9] bg-[#F8F6F1] text-[#0F1A14] text-sm outline-none focus:border-[#2E6B4F] focus:ring-1 focus:ring-[#2E6B4F] transition-colors"
              />
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox" checked={rememberMe} onChange={e => setRememberMe(e.target.checked)}
                className="w-4 h-4 accent-[#2E6B4F] rounded"
              />
              <span className="text-sm text-[#4A5E52]">Remember me for 7 days</span>
            </label>

            {error && (
              <p className="text-sm text-[#C0392B] bg-[#C0392B]/8 border border-[#C0392B]/20 rounded-lg px-3 py-2">{error}</p>
            )}

            <button
              type="submit" disabled={loading}
              className="w-full py-3 bg-[#3D9970] hover:bg-[#2E7D5A] disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition-colors"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>
        <p className="mt-4 text-center text-xs text-[#9BB0A1]">Cactus Partners · cactusvp.com</p>
      </div>
    </div>
  );
}
