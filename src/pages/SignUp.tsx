import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import emailjs from '@emailjs/browser';
import { CactusLogo } from '../components/CactusLogo';
import { useAuth } from '../context/AuthContext';

const EMAILJS_SERVICE  = import.meta.env.VITE_EMAILJS_SERVICE_ID  as string | undefined;
const EMAILJS_TEMPLATE = import.meta.env.VITE_EMAILJS_TEMPLATE_ID as string | undefined;
const EMAILJS_KEY      = import.meta.env.VITE_EMAILJS_PUBLIC_KEY  as string | undefined;

async function sendWelcomeEmail(toName: string, toEmail: string) {
  if (!EMAILJS_SERVICE || !EMAILJS_TEMPLATE || !EMAILJS_KEY) return;
  await emailjs.send(
    EMAILJS_SERVICE,
    EMAILJS_TEMPLATE,
    { to_name: toName, to_email: toEmail, reply_to: 'noreply@cactuspartners.in' },
    EMAILJS_KEY,
  );
}

export function SignUp() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signUp } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { error: err } = await signUp(email, name, password);
    setLoading(false);
    if (err) { setError(err); return; }
    // Fire-and-forget welcome email — don't block navigation on failure
    sendWelcomeEmail(name, email).catch(() => {});
    navigate('/');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8F6F1] px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl border border-[#E8EDE9] shadow-xl shadow-[#1C3B2E]/6 p-8">
          <div className="flex justify-center mb-8">
            <CactusLogo size="lg" />
          </div>

          <h2 className="text-center text-xl text-[#0F1A14] mb-1" style={{ fontFamily: '"Playfair Display", serif' }}>
            Create Account
          </h2>
          <p className="text-center text-sm text-[#4A5E52] mb-6">
            Join the Cactus Intelligence Platform
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[#4A5E52] mb-1.5 uppercase tracking-wide">Full Name</label>
              <input
                type="text" value={name} onChange={e => setName(e.target.value)}
                required placeholder="Your full name"
                className="w-full px-4 py-2.5 rounded-lg border border-[#E8EDE9] bg-[#F8F6F1] text-[#0F1A14] text-sm outline-none focus:border-[#2E6B4F] focus:ring-1 focus:ring-[#2E6B4F] transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#4A5E52] mb-1.5 uppercase tracking-wide">Work Email</label>
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
                required placeholder="Min. 6 characters"
                minLength={6}
                className="w-full px-4 py-2.5 rounded-lg border border-[#E8EDE9] bg-[#F8F6F1] text-[#0F1A14] text-sm outline-none focus:border-[#2E6B4F] focus:ring-1 focus:ring-[#2E6B4F] transition-colors"
              />
            </div>

            {error && (
              <p className="text-sm text-[#C0392B] bg-[#C0392B]/8 border border-[#C0392B]/20 rounded-lg px-3 py-2">{error}</p>
            )}

            <button
              type="submit" disabled={loading}
              className="w-full py-3 bg-[#3D9970] hover:bg-[#2E7D5A] disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition-colors"
            >
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          <p className="text-center text-sm text-[#4A5E52] mt-5">
            Already have an account?{' '}
            <Link to="/login" className="text-[#2E6B4F] font-semibold hover:underline">
              Sign in
            </Link>
          </p>
        </div>
        <p className="mt-4 text-center text-xs text-[#9BB0A1]">Cactus Partners · cactusvp.com</p>
      </div>
    </div>
  );
}
