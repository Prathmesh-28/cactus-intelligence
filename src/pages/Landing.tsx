import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, BarChart2, Users, TrendingUp } from 'lucide-react';
import { CactusLogo } from '../components/CactusLogo';
import { useAuth } from '../context/AuthContext';

const EXAMPLE_COMPANIES = ['Kapture CX', 'Intangles', 'Bellatrix Aerospace', 'Zetwerk', 'Oyo Rooms'];
const QUOTES = [
  'Resilience is built before conditions turn.',
  'The cactus blooms when others wilt.',
  'Intelligence precedes investment.',
];

export function Landing() {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    const slug = query.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-');
    if (user) {
      navigate(`/analysis/${slug}`, { state: { companyName: query.trim() } });
    } else {
      navigate('/login', { state: { redirect: `/analysis/${slug}`, companyName: query.trim() } });
    }
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#F8F6F1' }}>
      {/* Navbar */}
      <nav className="bg-[#1C3B2E] border-b border-[#2E6B4F]/40">
        <div className="max-w-screen-xl mx-auto px-6 h-14 flex items-center justify-between">
          <CactusLogo size="sm" inverted />
          <div className="flex items-center gap-4">
            {user ? (
              <>
                <a href="/history" className="text-sm text-[#A8C4B0] hover:text-white transition-colors">History</a>
                <a href="/login" className="text-sm text-[#A8C4B0] hover:text-white transition-colors">Sign out</a>
              </>
            ) : (
              <a href="/login" className="text-sm text-[#A8C4B0] hover:text-white transition-colors">Sign in</a>
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-20 relative overflow-hidden">
        {/* Dot grid background */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(circle, #C5D9CB 1px, transparent 1px)',
            backgroundSize: '28px 28px',
            opacity: 0.45,
          }}
        />

        <div className="relative z-10 flex flex-col items-center max-w-3xl w-full text-center">
          {/* Badge */}
          <div className="mb-6 inline-flex items-center gap-2 px-3 py-1 bg-[#1C3B2E]/8 border border-[#1C3B2E]/15 rounded-full text-xs text-[#2E6B4F] font-medium tracking-wide uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-[#3D9970] animate-pulse" />
            Cactus Intelligence Platform
          </div>

          <h1
            className="text-5xl md:text-6xl font-bold text-[#1C3B2E] leading-tight mb-5"
            style={{ fontFamily: '"Playfair Display", Georgia, serif' }}
          >
            Competitive Intelligence.
            <br />
            <span className="italic text-[#2E6B4F]">Built for Resilient Investing.</span>
          </h1>

          <p
            className="text-lg text-[#4A5E52] mb-10 max-w-xl leading-relaxed"
            style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}
          >
            Enter any company. Instantly map their competitive landscape, leadership structure, and talent signals.
          </p>

          {/* Search form */}
          <form onSubmit={handleSubmit} className="w-full max-w-2xl">
            <div className="flex gap-3 bg-white rounded-xl border border-[#E8EDE9] shadow-lg shadow-[#1C3B2E]/8 p-2">
              <div className="flex-1 flex items-center gap-3 px-3">
                <Search size={18} className="text-[#4A5E52] shrink-0" />
                <input
                  type="text"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Enter a company name (e.g. Kapture CX, Intangles, Bellatrix Aerospace)..."
                  className="flex-1 bg-transparent text-[#0F1A14] placeholder-[#9BB0A1] text-sm outline-none py-2"
                  style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}
                />
              </div>
              <button
                type="submit"
                disabled={!query.trim()}
                className="shrink-0 px-6 py-2.5 bg-[#3D9970] hover:bg-[#2E7D5A] disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition-colors"
              >
                Analyse
              </button>
            </div>
          </form>

          {/* Example companies */}
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <span className="text-xs text-[#9BB0A1]">Try:</span>
            {EXAMPLE_COMPANIES.map(c => (
              <button
                key={c}
                onClick={() => setQuery(c)}
                className="text-xs px-2.5 py-1 rounded-full border border-[#D4E0D7] bg-white text-[#2E6B4F] hover:border-[#2E6B4F] hover:bg-[#F0F7F2] transition-colors"
              >
                {c}
              </button>
            ))}
          </div>

          {/* Feature pills */}
          <div className="mt-12 flex flex-wrap gap-3 justify-center">
            {[
              { icon: <Users size={14} />, label: 'Org Chart Mapping' },
              { icon: <BarChart2 size={14} />, label: 'Competitor Discovery' },
              { icon: <TrendingUp size={14} />, label: 'Investment Signals' },
            ].map(f => (
              <div
                key={f.label}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-[#E8EDE9] rounded-full text-sm text-[#4A5E52] shadow-sm"
              >
                <span className="text-[#2E6B4F]">{f.icon}</span>
                {f.label}
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Rotating quote footer */}
      <footer className="bg-[#1C3B2E]/6 border-t border-[#E8EDE9] py-4 text-center">
        <p className="text-xs text-[#4A5E52] italic">
          "{QUOTES[Math.floor(Date.now() / 5000) % QUOTES.length]}"
        </p>
      </footer>
    </div>
  );
}
