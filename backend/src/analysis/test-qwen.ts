import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

import OpenAI from 'openai';

async function main() {
  const client = new OpenAI({
    apiKey: process.env.DASHSCOPE_API_KEY,
    baseURL: process.env.DASHSCOPE_BASE_URL,
  });

  const completion = await client.chat.completions.create({
    model: process.env.QWEN_MODEL || 'qwen-plus',
    messages: [
      {
        role: 'system',
        content: [
          'You are a scam and phishing detection assistant.',
          'Analyze the input text and return strict JSON only.',
          'Do not return markdown.',
          'Do not explain outside JSON.'
        ].join(' ')
      },
      {
        role: 'user',
        content: `
Analyze this message:

"Your bank account will be suspended today. Click this link to verify immediately."

Return exactly this JSON shape:
{
  "label": "phishing" | "suspicious" | "benign",
  "confidence": 0.0,
  "signals": ["string", "string"],
  "reason": "short explanation"
}
        `.trim()
      }
    ],
  });

  const content = completion.choices[0]?.message?.content;
  console.log(content);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});