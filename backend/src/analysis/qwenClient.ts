import dotenv from 'dotenv';
import OpenAI from 'openai';

dotenv.config({ path: '.env' });

const apiKey = process.env.DASHSCOPE_API_KEY;
const baseURL = process.env.DASHSCOPE_BASE_URL;

/** LLM client; null when API keys are not configured (server still starts, hybrid/llm modes fallback to rule-only) */
export const qwenClient: OpenAI | null =
  apiKey && baseURL
    ? new OpenAI({ apiKey, baseURL })
    : null;