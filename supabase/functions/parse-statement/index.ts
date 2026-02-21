import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MAX_CSV_LINES = 10_000;
const MAX_CSV_LENGTH = 1_000_000;
const MAX_DESCRIPTION_LENGTH = 500;
const MAX_AMOUNT = 1_000_000_000;

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 20;
const RATE_WINDOW_MS = 60 * 60 * 1000;

function checkRateLimit(key: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(key);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }
  entry.count++;
  return entry.count <= RATE_LIMIT;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function sanitizeDescription(desc: string): string {
  let sanitized = desc.replace(/^[=+@\-]/, "'$&");
  return sanitized.substring(0, MAX_DESCRIPTION_LENGTH);
}

function validateSessionId(sessionId: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(sessionId);
}

async function getUserIdFromJwt(authHeader: string | null): Promise<string | null> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const anonClient = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await anonClient.auth.getUser();
    return user?.id ?? null;
  } catch {
    return null;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('authorization');
    const userId = await getUserIdFromJwt(authHeader);

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const sessionId = formData.get('session_id') as string;

    if (!file || !sessionId) {
      return new Response(JSON.stringify({ error: 'File and session_id required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!validateSessionId(sessionId)) {
      return new Response(JSON.stringify({ error: 'Invalid session_id format' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!checkRateLimit(sessionId)) {
      return new Response(JSON.stringify({ error: 'Rate limit exceeded. Try again later.' }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (file.size > MAX_FILE_SIZE) {
      return new Response(JSON.stringify({ error: 'File too large. Maximum 5MB.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const fileName = file.name;
    const fileExtension = fileName.split('.').pop()?.toLowerCase();

    const allowedExtensions = ['csv', 'pdf', 'txt'];
    if (!fileExtension || !allowedExtensions.includes(fileExtension)) {
      return new Response(JSON.stringify({ error: 'Unsupported file type. Use CSV, PDF, or TXT.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let transactions: { date: string; description: string; amount: number }[] = [];
    let lowConfidence = false;

    if (fileExtension === 'csv') {
      const text = await file.text();
      transactions = parseCSV(text);
      transactions = normalizeCsvDates(transactions);
      // Check CSV confidence
      if (transactions.length === 0 && text.trim().length > 50) {
        lowConfidence = true;
      }
    } else if (fileExtension === 'pdf') {
      const buffer = await file.arrayBuffer();
      const base64 = arrayBufferToBase64(buffer);
      transactions = await parseWithAI(null, fileName, base64);
    } else {
      const text = await file.text();
      transactions = await parseWithAI(text, fileName, null);
    }

    // Validate parsed transactions for confidence
    const validTx = transactions.filter(t => t.date && t.description && typeof t.amount === 'number');
    if (transactions.length > 0 && validTx.length < transactions.length * 0.5) {
      lowConfidence = true;
    }
    if (transactions.length === 0) {
      lowConfidence = true;
    }

    transactions = validTx.map(t => ({
      ...t,
      description: sanitizeDescription(t.description || 'Unknown'),
      amount: Math.abs(t.amount) > MAX_AMOUNT ? 0 : t.amount,
    }));

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    if (transactions.length > 0) {
      const rows = transactions.map(t => ({
        session_id: sessionId,
        date: t.date,
        description: t.description,
        amount: t.amount,
        file_name: fileName,
        user_id: userId ?? null,
      }));

      const { error } = await supabase.from('transactions').insert(rows);
      if (error) throw error;
    }

    return new Response(JSON.stringify({
      transactions,
      count: transactions.length,
      low_confidence: lowConfidence,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Parse error:', error);
    return new Response(JSON.stringify({ error: 'An error occurred while processing your file.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function normalizeDateStr(dateStr: string, useDDMM: boolean): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;

  // Clean up common formatting issues
  const cleaned = dateStr.trim().replace(/\s+/g, '');

  const sep = cleaned.includes('/') ? '/' : cleaned.includes('-') ? '-' : '.';
  const parts = cleaned.split(sep);
  if (parts.length !== 3) return dateStr;

  let day: number, month: number, year: number;
  if (parts[0].length === 4) {
    year = parseInt(parts[0]); month = parseInt(parts[1]); day = parseInt(parts[2]);
  } else if (useDDMM) {
    day = parseInt(parts[0]); month = parseInt(parts[1]); year = parseInt(parts[2]);
  } else {
    month = parseInt(parts[0]); day = parseInt(parts[1]); year = parseInt(parts[2]);
  }
  if (year < 100) year += 2000;

  // Validate
  if (month < 1 || month > 12 || day < 1 || day > 31 || year < 1900 || year > 2100) return dateStr;

  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function detectDateFormat(transactions: { date: string }[]): boolean {
  let needsDDMM = false;
  let needsMMDD = false;
  for (const tx of transactions) {
    const cleaned = tx.date.trim().replace(/\s+/g, '');
    const sep = cleaned.includes('/') ? '/' : cleaned.includes('-') ? '-' : '.';
    const parts = cleaned.split(sep);
    if (parts.length !== 3 || parts[0].length === 4) continue;
    const a = parseInt(parts[0]);
    const b = parseInt(parts[1]);
    if (a > 12 && b <= 12) needsDDMM = true;
    if (b > 12 && a <= 12) needsMMDD = true;
  }
  if (needsDDMM && !needsMMDD) return true;
  if (needsMMDD && !needsDDMM) return false;
  return true; // default to DD/MM (Australian)
}

function normalizeCsvDates(
  transactions: { date: string; description: string; amount: number }[]
): { date: string; description: string; amount: number }[] {
  const useDDMM = detectDateFormat(transactions);
  return transactions.map(tx => ({ ...tx, date: normalizeDateStr(tx.date, useDDMM) }));
}

function parseAmount(raw: string): number | null {
  // Handle currency symbols, commas, parentheses for negatives
  let cleaned = raw.trim();
  const isNegative = cleaned.startsWith('(') && cleaned.endsWith(')') || cleaned.startsWith('-');
  cleaned = cleaned.replace(/[()$€£¥,\s]/g, '');
  if (cleaned.startsWith('-')) cleaned = cleaned.slice(1);
  const num = parseFloat(cleaned);
  if (isNaN(num)) return null;
  return isNegative ? -num : num;
}

function parseCSV(text: string): { date: string; description: string; amount: number }[] {
  if (text.length > MAX_CSV_LENGTH) throw new Error('CSV file too large');
  const lines = text.trim().split('\n');
  if (lines.length < 2) return [];
  if (lines.length > MAX_CSV_LINES) throw new Error('Too many lines in CSV');

  // Try to detect header - more flexible matching
  const header = lines[0].toLowerCase();
  const hasHeader = /date|amount|description|narration|particular|debit|credit|transaction/i.test(header);
  const dataLines = hasHeader ? lines.slice(1) : lines;

  const transactions: { date: string; description: string; amount: number }[] = [];
  for (const line of dataLines) {
    if (!line.trim()) continue;
    const cols = line.split(',').map(c => c.trim().replace(/^"|"$/g, ''));
    if (cols.length < 2) continue;

    let date = '', description = '', amount = 0;
    for (const col of cols) {
      if (/\d{1,4}[-\/\.]\d{1,2}[-\/\.]\d{1,4}/.test(col) && !date) {
        date = col;
      } else {
        const parsed = parseAmount(col);
        if (parsed !== null && col.replace(/[$€£¥,\s()]/g, '').match(/^-?\d+\.?\d*$/)) {
          if (amount === 0) amount = parsed;
        } else if (col.length > 2 && !description) {
          description = col;
        }
      }
    }
    if (!description) description = cols[1] || 'Unknown';
    if (!date) date = cols[0] || 'Unknown';
    if (amount === 0) {
      const lastParsed = parseAmount(cols[cols.length - 1] || '0');
      if (lastParsed !== null) amount = lastParsed;
    }
    if (date && description) transactions.push({ date, description, amount });
  }
  return transactions;
}

async function parseWithAI(
  text: string | null,
  fileName: string,
  base64Pdf: string | null
): Promise<{ date: string; description: string; amount: number }[]> {
  const apiKey = Deno.env.get('LOVABLE_API_KEY');
  if (!apiKey) { console.error('No LOVABLE_API_KEY found'); return []; }

  const systemPrompt = `You are a precise bank/provider statement parser. Extract every individual transaction from the document.

Rules:
- Return ONLY a JSON array of objects with "date", "description", and "amount" fields.
- "amount" must be a number: negative for debits/expenses/withdrawals, positive for credits/income/deposits.
- Extract the EXACT amounts as shown on the statement. Do NOT round or estimate.
- IMPORTANT: Look at the statement header, title, or period line to determine what month/year this statement covers.
- Use that context to correctly interpret ambiguous date formats (dd/MM vs MM/dd).
- If the statement says "October 2025" but a date reads "01/10/25", that means 1 October 2025, NOT 10 January.
- Default to dd/MM/yy (day/month/year, Australian format) when no context is available.
- Return ALL dates in yyyy-MM-dd format (e.g., 2025-10-01). Do NOT preserve the original date format.
- Do NOT include summary rows like "Opening Balance", "Closing Balance", "Total", or "Balance Carried Forward".
- Do NOT include interest rate information, account numbers, or headers.
- Handle varied column layouts: some statements use separate Debit/Credit columns, some use a single Amount column.
- Handle currency symbols ($, AUD, etc.) by stripping them from amounts.
- If amounts are shown in parentheses like (50.00), treat them as negative.
- No markdown, no explanation, just the JSON array.`;

  let userContent: any;
  if (base64Pdf) {
    userContent = [
      { type: 'text', text: `Parse all transactions from this bank statement file "${fileName}". Return only the JSON array.` },
      { type: 'image_url', image_url: { url: `data:application/pdf;base64,${base64Pdf}` } },
    ];
  } else {
    const truncated = (text || '').substring(0, 15000);
    userContent = `Parse transactions from this bank statement file "${fileName}":\n\n${truncated}`;
  }

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userContent }],
      temperature: 0.1,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error('AI gateway error:', response.status, errText);
    return [];
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || '[]';
  try {
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]);
    return JSON.parse(content);
  } catch {
    console.error('Failed to parse AI response:', content);
    return [];
  }
}
