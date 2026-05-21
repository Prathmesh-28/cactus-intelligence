import { useState, useCallback } from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import { ChevronRight, RefreshCw, Download, Search } from 'lucide-react';
import { CactusLogo } from '../components/CactusLogo';
import { PipelineProgress } from '../components/PipelineProgress';
import { OverviewTab } from '../components/tabs/OverviewTab';
import { OrgChartTab } from '../components/tabs/OrgChartTab';
import { TalentInsightsTab } from '../components/tabs/TalentInsightsTab';
import { InvestmentSignalsTab } from '../components/tabs/InvestmentSignalsTab';
import { useAnalysis } from '../hooks/useAnalysis';
import { exportPDF } from '../lib/exportPdf';
import type { ApiAnalysis } from '../lib/api';
import type { OrgChart } from '../types';

export function AnalysisDashboard() {
  const { companySlug = '' } = useParams<{ companySlug: string }>();
  const location = useLocation();
  const state = location.state as { companyName?: string } | null;

  const companyName = state?.companyName
    || companySlug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

  const { analysis, loading, currentStep, errorStep, retryStep } = useAnalysis(companySlug, companyName);
  const [localAnalysis, setLocalAnalysis] = useState<ApiAnalysis | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [exporting, setExporting] = useState(false);

  // Merge backend data with any local edits
  const display = localAnalysis ?? analysis;

  const handleUpdate = useCallback((updated: ApiAnalysis) => {
    setLocalAnalysis(updated);
  }, []);

  const isPipelineRunning = currentStep < 6 && !errorStep;

  if (loading || (isPipelineRunning && !display?.company_profile)) {
    return (
      <PipelineProgress
        companyName={companyName}
        currentStep={currentStep > 5 ? 5 : currentStep}
        errorStep={errorStep}
        onRetry={retryStep}
      />
    );
  }

  // Sync analysis into local if not yet set
  if (analysis && !localAnalysis) setLocalAnalysis(analysis);

  const competitors = (display?.competitors?.competitors ?? []) as Array<{ name: string }>;
  const orgCharts = (display?.org_charts ?? {}) as Record<string, OrgChart>;

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'orgchart-target', label: `Org Chart — ${companyName}` },
    ...competitors.map((c, i) => ({ id: `orgchart-${i}`, label: `Org Chart — ${c.name}` })),
    { id: 'talent', label: 'Talent Insights' },
    { id: 'signals', label: 'Investment Signals' },
  ];

  const renderContent = () => {
    if (!display) return null;
    if (activeTab === 'overview') return <OverviewTab analysis={display} onUpdate={handleUpdate} />;
    if (activeTab === 'orgchart-target') {
      const chart = orgCharts[companyName] ?? orgCharts[display.company_name] ?? orgCharts['target'] ?? null;
      return chart ? <OrgChartTab orgChart={chart} /> : <NoData />;
    }
    if (activeTab.startsWith('orgchart-')) {
      const idx = parseInt(activeTab.replace('orgchart-', ''));
      const comp = competitors[idx];
      if (!comp) return <NoData />;
      const chart = orgCharts[comp.name] ?? null;
      return chart ? <OrgChartTab orgChart={chart} /> : <NoData />;
    }
    if (activeTab === 'talent') return <TalentInsightsTab analysis={display} onUpdate={handleUpdate} />;
    if (activeTab === 'signals') return <InvestmentSignalsTab analysis={display} onUpdate={handleUpdate} />;
    return null;
  };

  const handleExportPDF = async () => {
    if (!display) return;
    setExporting(true);
    try { await exportPDF(display); } finally { setExporting(false); }
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#F8F6F1]">
      {/* Top nav */}
      <nav className="sticky top-0 z-50 bg-[#1C3B2E] border-b border-[#2E6B4F]/40">
        <div className="max-w-screen-2xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Link to="/"><CactusLogo size="sm" inverted /></Link>
            <ChevronRight size={14} className="text-[#4A7C5F] shrink-0" />
            <span className="text-[#A8C4B0] text-sm font-medium truncate">{companyName}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {isPipelineRunning && (
              <div className="flex items-center gap-1.5 text-xs text-[#A8C4B0]">
                <RefreshCw size={12} className="animate-spin" />
                Step {currentStep}/5...
              </div>
            )}
            <button
              onClick={handleExportPDF}
              disabled={exporting || !display}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-[#A8C4B0] hover:text-white border border-[#2E6B4F] hover:border-white/30 rounded-lg transition-colors disabled:opacity-40"
            >
              <Download size={12} />Export PDF
            </button>
            <Link to="/" className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-[#A8C4B0] hover:text-white hover:bg-white/10 rounded-lg transition-colors">
              <Search size={12} />New Search
            </Link>
          </div>
        </div>
      </nav>

      <div className="flex flex-1 max-w-screen-2xl w-full mx-auto">
        {/* Sidebar */}
        <aside className="hidden md:flex flex-col w-60 shrink-0 border-r border-[#E8EDE9] bg-white/60 py-4">
          <div className="px-4 mb-4">
            <div className="bg-[#1C3B2E]/6 border border-[#1C3B2E]/10 rounded-xl p-3">
              <p className="text-xs font-semibold text-[#0F1A14] truncate">{companyName}</p>
              {display?.company_profile && (
                <p className="text-xs text-[#2E6B4F] mt-0.5">
                  {String((display.company_profile as Record<string, unknown>)?.sector ?? '')}
                </p>
              )}
            </div>
          </div>
          <nav className="flex-1 px-2 overflow-y-auto">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full text-left px-3 py-2.5 rounded-lg mb-0.5 text-sm transition-colors truncate ${
                  activeTab === tab.id
                    ? 'bg-[#1C3B2E] text-white font-medium'
                    : 'text-[#4A5E52] hover:bg-[#F0F7F2] hover:text-[#0F1A14]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </aside>

        {/* Mobile select */}
        <div className="md:hidden px-4 pt-3 pb-1 w-full">
          <select
            value={activeTab}
            onChange={e => setActiveTab(e.target.value)}
            className="w-full px-3 py-2 border border-[#E8EDE9] rounded-lg text-sm bg-white text-[#0F1A14] outline-none"
          >
            {tabs.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
        </div>

        {/* Main content */}
        <main className="flex-1 min-w-0 p-4 md:p-6 overflow-y-auto">
          {errorStep && (
            <div className="mb-4 flex items-center justify-between px-4 py-3 bg-[#C0392B]/8 border border-[#C0392B]/20 rounded-xl text-sm text-[#C0392B]">
              <span>Step {errorStep} failed. Partial data shown below.</span>
              <button onClick={() => retryStep(errorStep)} className="flex items-center gap-1.5 font-medium hover:underline">
                <RefreshCw size={12} /> Retry Step {errorStep}
              </button>
            </div>
          )}
          {display ? renderContent() : (
            <div className="flex items-center justify-center py-20">
              <p className="text-sm text-[#4A5E52]">No data available yet.</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function NoData() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <p className="text-sm font-medium text-[#0F1A14] mb-1">Limited public data available</p>
      <p className="text-xs text-[#4A5E52] max-w-sm">We couldn't find enough public information for this company's structure.</p>
    </div>
  );
}
