import serverlessHttp from 'serverless-http';
import type { Handler } from 'aws-lambda';
import app from './app';
import { runStep } from './services/pipeline';
import { query } from './db/client';

// Standard API routes via API Gateway
export const handler = serverlessHttp(app) as Handler;

// Pipeline handler via Lambda Function URL (no 29s timeout)
export const pipelineHandler: Handler = async (event) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': process.env.FRONTEND_URL ?? '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'POST,OPTIONS',
  };

  if (event.requestContext?.http?.method === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders, body: '' };
  }

  try {
    const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    const { analysisId, action, companyName } = body ?? {};

    if (!analysisId || !action || !companyName) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'analysisId, action, companyName required' }),
      };
    }

    await runStep(action, analysisId, companyName);

    return {
      statusCode: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: true, action }),
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Pipeline failed';
    if (event.body) {
      try {
        const { analysisId } = JSON.parse(event.body);
        if (analysisId) {
          await query(
            `UPDATE analyses SET status = 'error', error_message = $1 WHERE id = $2`,
            [message, analysisId]
          );
        }
      } catch {}
    }
    return {
      statusCode: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: message }),
    };
  }
};
