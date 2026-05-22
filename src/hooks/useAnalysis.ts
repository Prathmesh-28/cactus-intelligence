import { useState, useEffect, useCallback } from 'react';
import { analyses, pipeline, type ApiAnalysis, type PipelineAction } from '../lib/api';

const STEPS: PipelineAction[] = ['profile', 'competitors', 'orgcharts', 'talent', 'signals'];

export function useAnalysis(_companySlug: string, companyName: string) {
  const [analysis, setAnalysis] = useState<ApiAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState(0);
  const [errorStep, setErrorStep] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runPipeline = useCallback(async (id: string, name: string, fromStepIdx = 0) => {
    setErrorStep(null);
    setError(null);

    for (let i = fromStepIdx; i < STEPS.length; i++) {
      const action = STEPS[i];
      setCurrentStep(i + 1);

      try {
        const result = await pipeline.runStep(id, action, name);
        if (result.analysis) setAnalysis(result.analysis);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Pipeline step failed';
        setErrorStep(i + 1);
        setError(msg);
        return;
      }
    }

    setCurrentStep(6); // all done
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setCurrentStep(1); // show spinner on step 1 immediately while creating
    try {
      const { analysis: created, cached } = await analyses.create(companyName);
      setAnalysis(created);

      if (cached || created.status === 'complete') {
        setCurrentStep(6);
        setLoading(false);
        return;
      }

      setLoading(false);
      const resumeFrom = created.pipeline_step;
      await runPipeline(created.id, companyName, resumeFrom);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to reach server';
      setError(msg);
      setCurrentStep(0);
      setLoading(false);
    }
  }, [companyName, runPipeline]);

  useEffect(() => { load(); }, [load]);

  const retryStep = useCallback(async (stepNumber: number) => {
    if (!analysis) return;
    await runPipeline(analysis.id, companyName, stepNumber - 1);
  }, [analysis, companyName, runPipeline]);

  return { analysis, loading, currentStep, errorStep, error, retryStep };
}
