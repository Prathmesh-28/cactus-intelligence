import { useEffect, useState } from 'react';
import { CheckCircle2, Loader2, AlertCircle, RefreshCw, WifiOff } from 'lucide-react';

const STEPS = [
  {
    label: 'Identifying company profile and sector',
    details: [
      'Normalizing company identity...',
      'Matching LinkedIn entity...',
      'Extracting funding & market data...',
      'Mapping founder background...',
      'Verifying business model...',
    ],
  },
  {
    label: 'Discovering top 5 competitors',
    details: [
      'Scanning Crunchbase & Tracxn...',
      'Scoring product similarity (35%)...',
      'Evaluating GTM overlap (20%)...',
      'Comparing funding stages (15%)...',
      'Ranking by geography & scale...',
    ],
  },
  {
    label: 'Researching leadership & org structure',
    details: [
      'Fetching Lusha verified contacts...',
      'Inferring reporting hierarchy...',
      'Building org tree for target company...',
      'Scoring org maturity per function...',
      'Detecting structural flags...',
      'Processing competitor org charts...',
    ],
  },
  {
    label: 'Analysing talent signals across companies',
    details: [
      'Detecting executive gaps...',
      'Scoring governance risks...',
      'Running competitor benchmark matrix...',
      'Identifying key-man dependencies...',
      'Finding talent prospects...',
      'Mapping hiring velocity trends...',
    ],
  },
  {
    label: 'Generating investment intelligence report',
    details: [
      'Computing scaling readiness score...',
      'Building future-state org blueprint...',
      'Scoring 6-dimension risk matrix...',
      'Drafting 12-month hiring plan...',
      'Mapping org migration roadmap...',
      'Finalising GO / HOLD / PASS signal...',
    ],
  },
];

const QUOTES = [
  'Resilience is built before conditions turn.',
  'The cactus blooms when others wilt.',
  'Intelligence precedes investment.',
  'Sharp analysis. Patient capital.',
  'In emerging markets, information is the edge.',
  'The best boards are built before they are needed.',
];

interface PipelineProgressProps {
  currentStep: number;
  errorStep?: number | null;
  error?: string | null;
  onRetry?: (step: number) => void;
  companyName: string;
}

export function PipelineProgress({ currentStep, errorStep, error, onRetry, companyName }: PipelineProgressProps) {
  const [subIdx, setSubIdx] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [startTime] = useState(() => Date.now());

  // Cycle through substep descriptions for the active step
  useEffect(() => {
    if (!currentStep || currentStep > 5) return;
    setSubIdx(0);
    const t = setInterval(() => setSubIdx(i => i + 1), 3500);
    return () => clearInterval(t);
  }, [currentStep]);

  // Live elapsed timer
  useEffect(() => {
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - startTime) / 1000)), 1000);
    return () => clearInterval(t);
  }, [startTime]);

  const activeStep = STEPS[currentStep - 1];
  const subDetails = activeStep?.details ?? [];
  const currentDetail = subDetails[subIdx % subDetails.length] ?? '';
  const quoteIdx = (currentStep || 1) % QUOTES.length;

  const formatTime = (s: number) => s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`;

  const isNetworkError = error?.toLowerCase().includes('timeout') || error?.toLowerCase().includes('timed out') || error?.toLowerCase().includes('network') || error?.toLowerCase().includes('reach');

  return (
    <div className="min-h-screen bg-[#F8F6F1] flex flex-col items-center justify-center px-6">
      {/* Animated cactus */}
      <div className="mb-8 relative">
        <svg width="64" height="80" viewBox="0 0 40 52" fill="none" xmlns="http://www.w3.org/2000/svg"
          className="animate-bounce" style={{ animationDuration: '2s' }}>
          <rect x="17" y="18" width="6" height="30" rx="3" fill="#1C3B2E" />
          <rect x="17" y="4" width="6" height="18" rx="3" fill="#1C3B2E">
            <animate attributeName="height" values="4;18;4" dur="2s" repeatCount="indefinite" />
            <animate attributeName="y" values="18;4;18" dur="2s" repeatCount="indefinite" />
          </rect>
          <rect x="6" y="20" width="6" height="14" rx="3" fill="#2E6B4F">
            <animate attributeName="height" values="2;14;2" dur="2.5s" repeatCount="indefinite" />
          </rect>
          <rect x="6" y="16" width="14" height="6" rx="3" fill="#2E6B4F" />
          <rect x="28" y="24" width="6" height="12" rx="3" fill="#2E6B4F">
            <animate attributeName="height" values="2;12;2" dur="3s" repeatCount="indefinite" />
          </rect>
          <rect x="20" y="20" width="14" height="6" rx="3" fill="#2E6B4F" />
          <circle cx="14" cy="50" r="2" fill="#1C3B2E" opacity="0.35" />
          <circle cx="20" cy="51" r="2" fill="#1C3B2E" opacity="0.35" />
          <circle cx="26" cy="50" r="2" fill="#1C3B2E" opacity="0.35" />
        </svg>
      </div>

      <h2 className="text-2xl font-bold text-[#1C3B2E] mb-1 text-center"
        style={{ fontFamily: '"Playfair Display", serif' }}>
        Analysing {companyName}
      </h2>

      {/* Live substep + timer */}
      <div className="flex items-center gap-3 mb-8">
        {currentStep > 0 && currentStep <= 5 && !errorStep ? (
          <p className="text-sm text-[#4A5E52] transition-all duration-500">
            {currentDetail}
          </p>
        ) : errorStep ? null : (
          <p className="text-sm text-[#4A5E52]">Initialising pipeline...</p>
        )}
        <span className="text-xs font-mono text-[#9BB0A1] bg-white border border-[#E8EDE9] px-2 py-0.5 rounded-full">
          {formatTime(elapsed)}
        </span>
      </div>

      {/* Error banner */}
      {error && (
        <div className={`w-full max-w-md mb-6 rounded-xl border p-4 flex items-start gap-3 ${
          isNetworkError
            ? 'bg-[#E67E22]/8 border-[#E67E22]/25'
            : 'bg-[#C0392B]/8 border-[#C0392B]/20'
        }`}>
          {isNetworkError
            ? <WifiOff size={16} className="text-[#E67E22] shrink-0 mt-0.5" />
            : <AlertCircle size={16} className="text-[#C0392B] shrink-0 mt-0.5" />
          }
          <div>
            <p className={`text-sm font-medium ${isNetworkError ? 'text-[#E67E22]' : 'text-[#C0392B]'}`}>
              {isNetworkError ? 'Cannot reach server' : 'Analysis error'}
            </p>
            <p className="text-xs text-[#4A5E52] mt-0.5">{error}</p>
            {isNetworkError && (
              <p className="text-xs text-[#9BB0A1] mt-1.5">
                Check that the EC2 backend is running and port 80 is open in the security group.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Steps */}
      <div className="w-full max-w-md space-y-3">
        {STEPS.map((step, i) => {
          const stepNum = i + 1;
          const isComplete = stepNum < currentStep;
          const isCurrent = stepNum === currentStep && !errorStep;
          const isError = errorStep === stepNum;
          const isPending = stepNum > currentStep || (stepNum > currentStep && !errorStep);

          return (
            <div key={stepNum}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${
                isError
                  ? 'bg-[#C0392B]/6 border-[#C0392B]/25'
                  : isCurrent
                  ? 'bg-[#1C3B2E]/6 border-[#2E6B4F]/30'
                  : isComplete
                  ? 'bg-[#27AE60]/5 border-[#27AE60]/20'
                  : 'bg-white/60 border-[#E8EDE9]'
              }`}
            >
              <div className="shrink-0 w-6 h-6 flex items-center justify-center">
                {isError
                  ? <AlertCircle size={18} className="text-[#C0392B]" />
                  : isComplete
                  ? <CheckCircle2 size={18} className="text-[#27AE60]" />
                  : isCurrent
                  ? <Loader2 size={18} className="text-[#2E6B4F] animate-spin" />
                  : <span className="text-xs font-medium text-[#9BB0A1]">{stepNum}</span>
                }
              </div>

              <div className="flex-1 min-w-0">
                <span className={`text-sm ${
                  isError ? 'text-[#C0392B]'
                  : isCurrent ? 'text-[#0F1A14] font-medium'
                  : isComplete ? 'text-[#4A5E52]'
                  : 'text-[#9BB0A1]'
                }`}>
                  Step {stepNum}: {step.label}...
                </span>
                {/* Live substep text for active step */}
                {isCurrent && currentDetail && (
                  <p className="text-xs text-[#2E6B4F] mt-0.5 truncate animate-pulse">{currentDetail}</p>
                )}
              </div>

              <div className="shrink-0">
                {isComplete && <span className="text-xs text-[#27AE60] font-medium">✓</span>}
                {isError && onRetry && (
                  <button
                    onClick={() => onRetry(stepNum)}
                    className="flex items-center gap-1 text-xs text-[#C0392B] hover:text-[#9B2C2C] font-medium"
                  >
                    <RefreshCw size={12} />
                    Retry
                  </button>
                )}
                {isPending && !isError && <span className="text-xs text-[#C5D9CB]">—</span>}
              </div>
            </div>
          );
        })}
      </div>

      {/* Progress bar */}
      {currentStep > 0 && currentStep <= 5 && (
        <div className="w-full max-w-md mt-5">
          <div className="flex justify-between text-xs text-[#9BB0A1] mb-1.5">
            <span>Step {currentStep} of 5</span>
            <span>{Math.round((currentStep / 5) * 100)}% complete</span>
          </div>
          <div className="h-1.5 bg-[#E8EDE9] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#2E6B4F] rounded-full transition-all duration-700"
              style={{ width: `${(currentStep / 5) * 100}%` }}
            />
          </div>
        </div>
      )}

      <p className="mt-8 text-sm italic text-[#4A5E52] text-center max-w-sm">
        "{QUOTES[quoteIdx]}"
      </p>
      <p className="mt-2 text-xs text-[#9BB0A1]">Cactus Partners · cactusvp.com</p>
    </div>
  );
}
