import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    const text = await file.text();
    const fileName = file.name;
    const fileExtension = fileName.split('.').pop()?.toLowerCase();

    let transactions: { date: string; description: string; amount: number }[] = [];

    if (fileExtension === 'csv') {
      transactions = parseCSV(text);
    } else {
      // For PDF and other formats, use AI to extract transactions
      transactions = await parseWithAI(text, fileName);
    }

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
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function parseCSV(text: string): { date: string; description: string; amount: number }[] {
  const lines = text.trim().split('\n');
  if (lines.length < 2) return [];

  const header = lines[0].toLowerCase();
  const hasHeader = header.includes('date') || header.includes('amount') || header.includes('description');
  const dataLines = hasHeader ? lines.slice(1) : lines;

  const transactions: { date: string; description: string; amount: number }[] = [];

  for (const line of dataLines) {
    const cols = line.split(',').map(c => c.trim().replace(/^"|"$/g, ''));
    if (cols.length < 3) continue;

    // Try to detect date, description, amount columns
    let date = '', description = '', amount = 0;

    for (const col of cols) {
      const numVal = parseFloat(col.replace(/[$,]/g, ''));
      if (!isNaN(numVal) && !date) {
        // skip, might be date-like number
      }
      if (/\d{1,4}[-\/]\d{1,2}[-\/]\d{1,4}/.test(col)) {
        date = col;
      } else if (!isNaN(parseFloat(col.replace(/[$,]/g, ''))) && col.replace(/[$,\s]/g, '').match(/^-?\d+\.?\d*$/)) {
        amount = parseFloat(col.replace(/[$,]/g, ''));
      } else if (col.length > 2 && !date) {
        description = description ? description : col;
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

async function parseWithAI(text: string, fileName: string): Promise<{ date: string; description: string; amount: number }[]> {
  const apiKey = Deno.env.get('LOVABLE_API_KEY');
  if (!apiKey) {
    console.error('No LOVABLE_API_KEY found');
    return [];
  }

  // Truncate text if too long
  const truncated = text.substring(0, 15000);

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-3-flash-preview',
      messages: [
        {
          role: 'system',
          content: 'You are a bank statement parser. Extract transactions from the text. Return ONLY a JSON array of objects with "date", "description", and "amount" (number, negative for debits). No markdown, no explanation, just the JSON array.',
        },
        {
          role: 'user',
          content: `Parse transactions from this bank statement file "${fileName}":\n\n${truncated}`,
        },
      ],
      temperature: 0.1,
    }),
  });

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || '[]';

  try {
    // Extract JSON from response
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
