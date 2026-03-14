import dotenv from 'dotenv';
import OpenAI from 'openai';

dotenv.config({ path: '.env' });

const apiKey = process.env.DASHSCOPE_API_KEY;
const baseURL = process.env.DASHSCOPE_BASE_URL;

if (!apiKey) {
  throw new Error('Missing DASHSCOPE_API_KEY in environment variables.');
}

if (!baseURL) {
  throw new Error('Missing DASHSCOPE_BASE_URL in environment variables.');
}

export const qwenClient = new OpenAI({
  apiKey,
  baseURL,
});