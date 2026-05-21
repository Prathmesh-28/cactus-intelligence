import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Clock, ArrowRight, Trash2 } from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { analyses, type ApiAnalysis } from '../lib/api';

export function History() {
  const [list, setList] = useState<ApiAnalysis[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    analyses.list().then(({ analyses: rows }) => { setList(rows); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const handleDelete = async (id: string) => {
    await analyses.delete(id);
    setList(prev => prev.filter(a => a.id !== id));
  };

  const STATUS_COLORS: Record<string, string> = {
    complete: 'bg-[#27AE60]/10 text-[#27AE60]',
    processing: 'bg-[#E67E22]/10 text-[#E67E22]',
    pending: 'bg-[#E8EDE9] text-[#4A5E52]',
    error: 'bg-[#C0392B]/10 text-[#C0392B]',
  };

  return (
    <div className="min-h-screen bg-[#F8F6F1]">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-[#1C3B2E]" style={{ fontFamily: '"Playfair Display", serif' }}>
            Analysis History
          </h1>
          <p className="text-sm text-[#4A5E52]">{list.length} analyses</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <p className="text-sm text-[#4A5E52]">Loading...</p>
          </div>
        ) : list.length === 0 ? (
          <div className="bg-white border border-[#E8EDE9] rounded-2xl p-12 text-center shadow-sm">
            <Clock size={32} className="text-[#9BB0A1] mx-auto mb-3" />
            <p className="text-base font-medium text-[#0F1A14] mb-1">No analyses yet</p>
            <p className="text-sm text-[#4A5E52] mb-4">Search for a company to get started.</p>
            <Link to="/" className="inline-flex items-center gap-2 px-4 py-2 bg-[#3D9970] text-white text-sm font-semibold rounded-xl hover:bg-[#2E7D5A] transition-colors">
              Start Analysing <ArrowRight size={14} />
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {list.map(a => {
              const profile = a.company_profile as Record<string, unknown> | null;
              const signal = (a.investment_signals as Record<string, unknown> | null)?.signal as string | undefined;
              return (
                <div key={a.id} className="bg-white border border-[#E8EDE9] rounded-xl px-5 py-4 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <p className="font-semibold text-[#0F1A14]">{a.company_name}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${STATUS_COLORS[a.status] ?? STATUS_COLORS.pending}`}>
                        {a.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-[#4A5E52]">
                      {Boolean(profile?.sector) && <span>{String(profile?.sector)}</span>}
                      {Boolean(profile?.sector) && <span>·</span>}
                      <span>{new Date(a.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                      {a.created_by_name && <><span>·</span><span>{a.created_by_name}</span></>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {signal && (
                      <span className={`text-xs px-2.5 py-1 rounded-full font-bold ${
                        signal === 'GO' ? 'bg-[#27AE60]/10 text-[#27AE60]' :
                        signal === 'PASS' ? 'bg-[#C0392B]/10 text-[#C0392B]' :
                        'bg-[#E67E22]/10 text-[#E67E22]'
                      }`}>{signal}</span>
                    )}
                    {a.status === 'complete' && (
                      <Link
                        to={`/analysis/${a.company_slug}`}
                        state={{ companyName: a.company_name }}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-[#2E6B4F] border border-[#D4E0D7] rounded-lg hover:bg-[#F0F7F2] transition-colors"
                      >
                        View <ArrowRight size={12} />
                      </Link>
                    )}
                    <button onClick={() => handleDelete(a.id)} className="p-1.5 text-[#9BB0A1] hover:text-[#C0392B] transition-colors rounded" title="Delete">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
