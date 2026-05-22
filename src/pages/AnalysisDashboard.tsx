import { useState, useCallback } from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import { ChevronRight, RefreshCw, Download, Search, PenLine } from 'lucide-react';
import { CactusLogo } from '../components/CactusLogo';
import { PipelineProgress } from '../components/PipelineProgress';
import { ManualCompanyForm, type ManualCompanyData } from '../components/ManualCompanyForm';
import { ManualCompetitorsForm, ManualOrgChartForm, ManualTalentForm, ManualSignalsForm } from '../components/ManualStepForms';
import { OverviewTab } from '../components/tabs/OverviewTab';
import { OrgChartTab } from '../components/tabs/OrgChartTab';
import { TalentInsightsTab } from '../components/tabs/TalentInsightsTab';
import { InvestmentSignalsTab } from '../components/tabs/InvestmentSignalsTab';
import { useAnalysis } from '../hooks/useAnalysis';
import { exportPDF } from '../lib/exportPdf';
import { analyses as analysesApi } from '../lib/api';
import type { ApiAnalysis } from '../lib/api';
import type { OrgChart } from '../types';

export function AnalysisDashboard() {
  const { companySlug = '' } = useParams<{ companySlug: string }>();
  const location = useLocation();
  const state = location.state as { companyName?: string; manual?: boolean } | null;

  const companyName = state?.companyName
    || companySlug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

  const startManual = state?.manual === true;

  const { analysis, loading, currentStep, errorStep, error, retryStep } = useAnalysis(companySlug, companyName, startManual);
  const [localAnalysis, setLocalAnalysis] = useState<ApiAnalysis | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [exporting, setExporting] = useState(false);
  const [showManualForm, setShowManualForm] = useState(false);
  const [manualSubmitting, setManualSubmitting] = useState(false);

  const display = localAnalysis ?? analysis;

  const handleUpdate = useCallback((updated: ApiAnalysis) => {
    setLocalAnalysis(updated);
  }, []);

  // ── ALL hooks must be declared before any early returns ──────────────────────
  const handleManualSubmit = useCallback(async (data: unknown, forStep: number) => {
    setManualSubmitting(true);
    try {
      let resolvedAnalysis = analysis ?? localAnalysis;
      if (!resolvedAnalysis) {
        const { analysis: created } = await analysesApi.create(companyName);
        resolvedAnalysis = created;
        setLocalAnalysis(created);
      }
      const id = resolvedAnalysis.id;

      if (forStep === 1) {
        await analysesApi.patchProfile(id, data as ManualCompanyData);
        setLocalAnalysis(prev => ({ ...(prev ?? resolvedAnalysis!), company_profile: data as Record<string, unknown> }));
      } else if (forStep === 2) {
        await analysesApi.patchCompetitors(id, data);
        setLocalAnalysis(prev => prev ? { ...prev, competitors: data as ApiAnalysis['competitors'] } : null);
      } else if (forStep === 3) {
        await analysesApi.patchOrgCharts(id, data);
        setLocalAnalysis(prev => prev ? { ...prev, org_charts: data as Record<string, unknown> } : null);
      } else if (forStep === 4) {
        await analysesApi.patchTalent(id, data);
        setLocalAnalysis(prev => prev ? { ...prev, talent_insights: data as Record<string, unknown> } : null);
      } else if (forStep === 5) {
        await analysesApi.patchSignals(id, data);
        setLocalAnalysis(prev => prev ? { ...prev, investment_signals: data as Record<string, unknown> } : null);
      }
      setShowManualForm(false);
      if (forStep < 5) await retryStep(forStep + 1);
    } finally {
      setManualSubmitting(false);
    }
  }, [analysis, localAnalysis, companyName, retryStep]);

  const handleExportPDF = useCallback(async () => {
    if (!display) return;
    setExporting(true);
    try { await exportPDF(display); } finally { setExporting(false); }
  }, [display]);

  // ── Derived state (after all hooks) ─────────────────────────────────────────
  const isPipelineRunning = currentStep > 0 && currentStep < 6 && !errorStep && !error;

  // ── Early returns (after all hooks) ─────────────────────────────────────────

  // Manual entry mode — skip pipeline, show form immediately
  if (startManual && !localAnalysis) {
    return (
      <div className="min-h-screen bg-[#F8F6F1] flex flex-col">
        <nav className="sticky top-0 z-50 bg-[#1C3B2E] border-b border-[#2E6B4F]/40">
          <div className="max-w-screen-2xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Link to="/"><CactusLogo size="sm" inverted /></Link>
              <ChevronRight size={14} className="text-[#4A7C5F] shrink-0" />
              <span className="text-[#A8C4B0] text-sm font-medium truncate">{companyName}</span>
            </div>
            <button
              onClick={() => retryStep(1)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-[#A8C4B0] hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            >
              <RefreshCw size={12} /> Try AI instead
            </button>
          </div>
        </nav>
        <div className="flex-1 max-w-2xl mx-auto w-full px-4 py-8">
          <ManualCompanyForm
            companyName={companyName}
            onSubmit={d => handleManualSubmit(d, 1)}
            loading={manualSubmitting}
          />
        </div>
      </div>
    );
  }

  // While pipeline is actively running show progress screen
  if (loading || isPipelineRunning) {
    return (
      <PipelineProgress
        companyName={companyName}
        currentStep={Math.min(currentStep, 5)}
        errorStep={errorStep}
        error={error}
        onRetry={retryStep}
      />
    );
  }

  // Total failure — backend unreachable, no analysis record created yet
  if (error && !analysis) {
    return (
      <div className="min-h-screen bg-[#F8F6F1] flex flex-col">
        <nav className="sticky top-0 z-50 bg-[#1C3B2E] border-b border-[#2E6B4F]/40">
          <div className="max-w-screen-2xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Link to="/"><CactusLogo size="sm" inverted /></Link>
              <ChevronRight size={14} className="text-[#4A7C5F] shrink-0" />
              <span className="text-[#A8C4B0] text-sm font-medium truncate">{companyName}</span>
            </div>
            <button
              onClick={() => retryStep(1)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-[#A8C4B0] hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            >
              <RefreshCw size={12} /> Retry AI
            </button>
          </div>
        </nav>
        <div className="flex-1 max-w-2xl mx-auto w-full px-4 py-8">
          <div className="mb-5 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800 flex items-center gap-3">
            <PenLine size={15} className="shrink-0 text-amber-600" />
            <span>AI couldn't reach the server. Enter company details below to continue manually.</span>
          </div>
          <ManualCompanyForm
            companyName={companyName}
            onSubmit={d => handleManualSubmit(d, 1)}
            loading={manualSubmitting}
          />
        </div>
      </div>
    );
  }

  // Sync analysis into local state once
  if (analysis && !localAnalysis) setLocalAnalysis(analysis);

  const competitors = (display?.competitors?.competitors ?? []) as Array<{ name: string }>;
  const orgCharts = (display?.org_charts ?? {}) as Record<string, OrgChart>;

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'orgchart-target', label: `Org — ${companyName}` },
    ...competitors.map((c, i) => ({ id: `orgchart-${i}`, label: `Org — ${c.name}` })),
    { id: 'talent', label: 'Talent' },
    { id: 'signals', label: 'Signals' },
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
      return orgCharts[comp.name] ? <OrgChartTab orgChart={orgCharts[comp.name]} /> : <NoData />;
    }
    if (activeTab === 'talent') return <TalentInsightsTab analysis={display} onUpdate={handleUpdate} />;
    if (activeTab === 'signals') return <InvestmentSignalsTab analysis={display} onUpdate={handleUpdate} />;
    return null;
  };

  const activeStep = errorStep ?? 1;

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
            {errorStep && (
              <button
                onClick={() => setShowManualForm(v => !v)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg transition-colors ${
                  showManualForm
                    ? 'bg-white text-[#1C3B2E] font-medium'
                    : 'text-[#A8C4B0] hover:text-white hover:bg-white/10 border border-[#2E6B4F]'
                }`}
              >
                <PenLine size={12} /> {showManualForm ? 'Hide form' : 'Enter manually'}
              </button>
            )}
            {errorStep && (
              <button
                onClick={() => retryStep(errorStep)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-[#A8C4B0] hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              >
                <RefreshCw size={12} /> Retry step {errorStep}
              </button>
            )}
            <button
              onClick={handleExportPDF}
              disabled={exporting || !display}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-[#A8C4B0] hover:text-white border border-[#2E6B4F] hover:border-white/30 rounded-lg transition-colors disabled:opacity-40"
            >
              <Download size={12} /> PDF
            </button>
            <Link to="/" className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-[#A8C4B0] hover:text-white hover:bg-white/10 rounded-lg transition-colors">
              <Search size={12} /> New
            </Link>
          </div>
        </div>
      </nav>

      <div className="flex flex-1 max-w-screen-2xl w-full mx-auto">
        {/* Sidebar */}
        <aside className="hidden md:flex flex-col w-52 shrink-0 border-r border-[#E8EDE9] bg-white/60 py-4">
          <div className="px-3 mb-4">
            <div className="bg-[#1C3B2E]/6 border border-[#1C3B2E]/10 rounded-xl p-3">
              <p className="text-xs font-semibold text-[#0F1A14] truncate">{companyName}</p>
              {display?.company_profile && (
                <p className="text-xs text-[#2E6B4F] mt-0.5 truncate">
                  {String((display.company_profile as Record<string, unknown>)?.sector ?? '')}
                </p>
              )}
              {errorStep && (
                <div className="mt-2 pt-2 border-t border-[#E8EDE9]">
                  <button
                    onClick={() => setShowManualForm(v => !v)}
                    className="w-full flex items-center gap-1.5 text-xs text-[#1C3B2E] font-medium hover:text-[#2E6B4F] transition-colors"
                  >
                    <PenLine size={11} />
                    {showManualForm ? 'Hide form' : 'Enter step manually'}
                  </button>
                </div>
              )}
            </div>
          </div>
          <nav className="flex-1 px-2 overflow-y-auto">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); setShowManualForm(false); }}
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
            onChange={e => { setActiveTab(e.target.value); setShowManualForm(false); }}
            className="w-full px-3 py-2 border border-[#E8EDE9] rounded-lg text-sm bg-white text-[#0F1A14] outline-none"
          >
            {tabs.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
        </div>

        {/* Main content */}
        <main className="flex-1 min-w-0 p-4 md:p-6 overflow-y-auto">

          {/* Manual form panel — shown when errorStep exists and toggled */}
          {(showManualForm || (errorStep && !display)) && (
            <div className="mb-6">
              {activeStep === 1 && (
                <ManualCompanyForm companyName={companyName}
                  onSubmit={d => handleManualSubmit(d, 1)} loading={manualSubmitting} />
              )}
              {activeStep === 2 && (
                <ManualCompetitorsForm companyName={companyName}
                  onSubmit={d => handleManualSubmit(d, 2)} loading={manualSubmitting} />
              )}
              {activeStep === 3 && (
                <ManualOrgChartForm companyName={companyName}
                  onSubmit={d => handleManualSubmit(d, 3)} loading={manualSubmitting} />
              )}
              {activeStep === 4 && (
                <ManualTalentForm companyName={companyName}
                  onSubmit={d => handleManualSubmit(d, 4)} loading={manualSubmitting} />
              )}
              {activeStep === 5 && (
                <ManualSignalsForm companyName={companyName}
                  onSubmit={d => handleManualSubmit(d, 5)} loading={manualSubmitting} />
              )}
            </div>
          )}

          {!showManualForm && (display ? renderContent() : (
            <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
              <p className="text-sm text-[#4A5E52]">No analysis data yet.</p>
              {errorStep && (
                <button
                  onClick={() => setShowManualForm(true)}
                  className="flex items-center gap-2 px-4 py-2.5 bg-[#1C3B2E] text-white text-sm rounded-xl hover:bg-[#2E6B4F] transition-colors"
                >
                  <PenLine size={14} /> Enter Step {errorStep} data manually
                </button>
              )}
            </div>
          ))}
        </main>
      </div>
    </div>
  );
}

function NoData() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <p className="text-sm font-medium text-[#0F1A14] mb-1">Limited public data available</p>
      <p className="text-xs text-[#4A5E52] max-w-sm">We couldn't find enough public information for this section.</p>
    </div>
  );
}
