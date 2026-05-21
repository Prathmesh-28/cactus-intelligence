import { CheckCircle2, Loader2, AlertCircle, RefreshCw } from 'lucide-react';

const STEPS = [
  'Identifying company profile and sector...',
  'Discovering top 5 competitors...',
  'Researching leadership & org structure...',
  'Analysing talent signals across companies...',
  'Generating investment intelligence report...',
];

const QUOTES = [
  'Resilience is built before conditions turn.',
  'The cactus blooms when others wilt.',
  'Intelligence precedes investment.',
  'Sharp analysis. Patient capital.',
  'In emerging markets, information is the edge.',
];

interface PipelineProgressProps {
  currentStep: number;
  errorStep?: number | null;
  onRetry?: (step: number) => void;
  companyName: string;
}

export function PipelineProgress({ currentStep, errorStep, onRetry, companyName }: PipelineProgressProps) {
  const quoteIdx = currentStep % QUOTES.length;

  return (
    <div className="min-h-screen bg-[#F8F6F1] flex flex-col items-center justify-center px-6">
      {/* Animated cactus */}
      <div className="mb-8 relative">
        <svg
          width="64"
          height="80"
          viewBox="0 0 40 52"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="animate-bounce"
          style={{ animationDuration: '2s' }}
        >
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

      {/* Company name */}
      <h2
        className="text-2xl font-bold text-[#1C3B2E] mb-1 text-center"
        style={{ fontFamily: '"Playfair Display", serif' }}
      >
        Analysing {companyName}
      </h2>
      <p className="text-sm text-[#4A5E52] mb-8">This may take 30–60 seconds. Please wait.</p>

      {/* Steps */}
      <div className="w-full max-w-md space-y-3">
        {STEPS.map((label, i) => {
          const stepNum = i + 1;
          const isComplete = stepNum < currentStep;
          const isCurrent = stepNum === currentStep;
          const isError = errorStep === stepNum;
          const isPending = stepNum > currentStep;

          return (
            <div
              key={stepNum}
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
                {isError ? (
                  <AlertCircle size={18} className="text-[#C0392B]" />
                ) : isComplete ? (
                  <CheckCircle2 size={18} className="text-[#27AE60]" />
                ) : isCurrent ? (
                  <Loader2 size={18} className="text-[#2E6B4F] animate-spin" />
                ) : (
                  <span className="text-xs font-medium text-[#9BB0A1]">{stepNum}</span>
                )}
              </div>

              <span
                className={`flex-1 text-sm ${
                  isError ? 'text-[#C0392B]' : isCurrent ? 'text-[#0F1A14] font-medium' : isComplete ? 'text-[#4A5E52]' : 'text-[#9BB0A1]'
                }`}
              >
                Step {stepNum}: {label}
              </span>

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
              {isPending && !isError && (
                <span className="text-xs text-[#C5D9CB]">—</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Rotating quote */}
      <p className="mt-10 text-sm italic text-[#4A5E52] text-center max-w-sm">
        "{QUOTES[quoteIdx]}"
      </p>
      <p className="mt-2 text-xs text-[#9BB0A1]">Cactus Partners · cactusvp.com</p>
    </div>
  );
}
