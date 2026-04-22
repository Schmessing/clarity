import OpenAI from 'openai';
import type { ParsedReceipt, Category, Transaction } from '../types/finance';

const OPENAI_API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY ?? '';

function getClient() {
  if (!OPENAI_API_KEY) throw new Error('Add EXPO_PUBLIC_OPENAI_API_KEY to your .env file.');
  return new OpenAI({ apiKey: OPENAI_API_KEY, dangerouslyAllowBrowser: true });
}

// ─── Receipt Parsing ──────────────────────────────────────────────────────────

const RECEIPT_PROMPT = `You are a financial document parser. Analyze this image and return ONLY valid JSON, no markdown.

First determine if this is a RECEIPT (a purchase/expense) or a CHECK (a payment made to someone).

If it is a RECEIPT, return:
{
  "documentType": "receipt",
  "merchant": "store or business name",
  "date": "YYYY-MM-DD",
  "total": number,
  "currency": "USD",
  "category": one of: "Food & Dining"|"Groceries"|"Shopping"|"Transport"|"Entertainment"|"Health"|"Utilities"|"Housing"|"Other",
  "items": [{"name": string, "price": number}],
  "memo": null
}

If it is a CHECK, return:
{
  "documentType": "check",
  "merchant": "name of person or company who wrote the check (payer)",
  "date": "YYYY-MM-DD",
  "total": number (the check amount),
  "currency": "USD",
  "category": "Income",
  "items": [],
  "memo": "memo line text if present, otherwise null"
}

If unreadable or neither, return: {"error": "Unreadable document"}`;

export async function parseReceipt(base64: string): Promise<ParsedReceipt> {
  const client = getClient();
  const response = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: RECEIPT_PROMPT },
          { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64}` } },
        ],
      },
    ],
    max_tokens: 1000,
  });

  const text = response.choices[0]?.message?.content?.trim() ?? '';
  let parsed: any;
  try {
    parsed = JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('Could not parse AI response');
    parsed = JSON.parse(match[0]);
  }
  if (parsed.error) throw new Error(parsed.error);
  return {
    documentType: parsed.documentType === 'check' ? 'check' : 'receipt',
    merchant: parsed.merchant ?? 'Unknown',
    date: parsed.date ?? new Date().toISOString().split('T')[0],
    total: Number(parsed.total) || 0,
    currency: parsed.currency ?? 'USD',
    category: (parsed.category as Category) ?? 'Other',
    items: Array.isArray(parsed.items) ? parsed.items : [],
    memo: parsed.memo ?? undefined,
  };
}

// ─── Monthly AI Insights ──────────────────────────────────────────────────────

export interface Insight {
  title: string;
  body: string;
  type: 'positive' | 'warning' | 'neutral';
}

export async function generateInsights(
  transactions: Transaction[],
  month: string
): Promise<Insight[]> {
  const client = getClient();

  const totalExpenses = transactions.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const totalIncome = transactions.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);

  const summary = transactions.map((t) => ({
    merchant: t.merchant,
    amount: t.amount,
    type: t.type,
    category: t.category,
    date: t.date,
    isRecurring: t.isRecurring === 1,
  }));

  const prompt = `You are a personal finance advisor analyzing spending for ${month}.

Total income: $${totalIncome.toFixed(2)}
Total expenses: $${totalExpenses.toFixed(2)}
Net: $${(totalIncome - totalExpenses).toFixed(2)}

Transactions:
${JSON.stringify(summary, null, 2)}

Generate exactly 4 insights as a JSON array. Each insight:
- "title": short headline (5-8 words)
- "body": 1-2 sentence explanation with specific numbers
- "type": "positive" | "warning" | "neutral"

Focus on: biggest spending category, recurring charges detected, savings rate, one actionable recommendation.
Return ONLY valid JSON array, no markdown.`;

  const response = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 800,
  });

  const text = response.choices[0]?.message?.content?.trim() ?? '';
  let parsed: any;
  try {
    parsed = JSON.parse(text);
  } catch {
    const match = text.match(/\[[\s\S]*\]/);
    if (!match) throw new Error('Could not parse AI response');
    parsed = JSON.parse(match[0]);
  }
  return Array.isArray(parsed) ? parsed : [];
}
