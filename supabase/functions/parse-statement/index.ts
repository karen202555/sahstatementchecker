import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_CSV_LINES = 10_000;
const MAX_CSV_LENGTH = 1_000_000; // 1MB text
const MAX_DESCRIPTION_LENGTH = 500;
const MAX_AMOUNT = 1_000_000_000;

// Simple in-memory rate limiter (per session, resets on cold start)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 20; // requests per window
const RATE_WINDOW_MS = 60 * 60 * 1000; // 1 hour

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
  // Prevent CSV formula injection
  let sanitized = desc.replace(/^[=+@\-]/, "'$&");
  // Limit length
  return sanitized.substring(0, MAX_DESCRIPTION_LENGTH);
}

function validateSessionId(sessionId: string): boolean {
  // Must be a valid UUID v4 format
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(sessionId);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const sessionId = formData.get('session_id') as string;

    if (!file || !sessionId) {
      return new Response(JSON.stringify({ error: 'File and session_id required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate session_id format
    if (!validateSessionId(sessionId)) {
      return new Response(JSON.stringify({ error: 'Invalid session_id format' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Rate limit per session
    if (!checkRateLimit(sessionId)) {
      return new Response(JSON.stringify({ error: 'Rate limit exceeded. Try again later.' }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // File size check
    if (file.size > MAX_FILE_SIZE) {
      return new Response(JSON.stringify({ error: 'File too large. Maximum 5MB.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const fileName = file.name;
    const fileExtension = fileName.split('.').pop()?.toLowerCase();

    // Validate file extension
    const allowedExtensions = ['csv', 'pdf', 'txt'];
    if (!fileExtension || !allowedExtensions.includes(fileExtension)) {
      return new Response(JSON.stringify({ error: 'Unsupported file type. Use CSV, PDF, or TXT.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let transactions: { date: string; description: string; amount: number }[] = [];

    if (fileExtension === 'csv') {
      const text = await file.text();
      transactions = parseCSV(text);
    } else if (fileExtension === 'pdf') {
      const buffer = await file.arrayBuffer();
      const base64 = arrayBufferToBase64(buffer);
      transactions = await parseWithAI(null, fileName, base64);
    } else {
      const text = await file.text();
      transactions = await parseWithAI(text, fileName, null);
    }

    // Sanitize all transaction descriptions
    transactions = transactions.map(t => ({
      ...t,
      description: sanitizeDescription(t.description || 'Unknown'),
      amount: Math.abs(t.amount) > MAX_AMOUNT ? 0 : t.amount,
    }));

    // Store transactions in database
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
      }));

      const { error } = await supabase.from('transactions').insert(rows);
      if (error) throw error;
    }

    return new Response(JSON.stringify({ transactions, count: transactions.length }), {
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

function parseCSV(text: string): { date: string; description: string; amount: number }[] {
  if (text.length > MAX_CSV_LENGTH) {
    throw new Error('CSV file too large');
  }

  const lines = text.trim().split('\n');
  if (lines.length < 2) return [];
  if (lines.length > MAX_CSV_LINES) {
    throw new Error('Too many lines in CSV');
  }

  const header = lines[0].toLowerCase();
  const hasHeader = header.includes('date') || header.includes('amount') || header.includes('description');
  const dataLines = hasHeader ? lines.slice(1) : lines;

  const transactions: { date: string; description: string; amount: number }[] = [];

  for (const line of dataLines) {
    const cols = line.split(',').map(c => c.trim().replace(/^"|"$/g, ''));
    if (cols.length < 3) continue;

    let date = '', description = '', amount = 0;

    for (const col of cols) {
      if (/\d{1,4}[-\/]\d{1,2}[-\/]\d{1,4}/.test(col)) {
        date = col;
      } else if (!isNaN(parseFloat(col.replace(/[$,]/g, ''))) && col.replace(/[$,\s]/g, '').match(/^-?\d+\.?\d*$/)) {
        amount = parseFloat(col.replace(/[$,]/g, ''));
      } else if (col.length > 2 && !description) {
        description = col;
      }
    }

    if (!description) description = cols[1] || 'Unknown';
    if (!date) date = cols[0] || 'Unknown';
    if (amount === 0) {
      const lastNum = parseFloat(cols[cols.length - 1]?.replace(/[$,]/g, '') || '0');
      if (!isNaN(lastNum)) amount = lastNum;
    }

    if (date && description) {
      transactions.push({ date, description, amount });
    }
  }

  return transactions;
}

async function parseWithAI(
  text: string | null,
  fileName: string,
  base64Pdf: string | null
): Promise<{ date: string; description: string; amount: number }[]> {
  const apiKey = Deno.env.get('LOVABLE_API_KEY');
  if (!apiKey) {
    console.error('No LOVABLE_API_KEY found');
    return [];
  }

  const systemPrompt = `You are a precise bank statement parser. Extract every individual transaction from the document.

Rules:
- Return ONLY a JSON array of objects with "date", "description", and "amount" fields.
- "amount" must be a number: negative for debits/expenses/withdrawals, positive for credits/income/deposits.
- Extract the EXACT amounts as shown on the statement. Do NOT round or estimate.
- Preserve the date format exactly as shown on the statement.
- Do NOT include summary rows like "Opening Balance", "Closing Balance", "Total", or "Balance Carried Forward".
- Do NOT include interest rate information, account numbers, or headers.
- No markdown, no explanation, just the JSON array.`;

  let userContent: any;

  if (base64Pdf) {
    userContent = [
      {
        type: 'text',
        text: `Parse all transactions from this bank statement file "${fileName}". Return only the JSON array.`,
      },
      {
        type: 'image_url',
        image_url: {
          url: `data:application/pdf;base64,${base64Pdf}`,
        },
      },
    ];
  } else {
    const truncated = (text || '').substring(0, 15000);
    userContent = `Parse transactions from this bank statement file "${fileName}":\n\n${truncated}`;
  }

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-pro',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent },
      ],
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
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return JSON.parse(content);
  } catch {
    console.error('Failed to parse AI response:', content);
    return [];
  }
}
