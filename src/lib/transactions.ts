import { supabase } from "@/integrations/supabase/client";

export interface Transaction {
  id: string;
  session_id: string;
  date: string;
  description: string;
  amount: number;
  file_name: string | null;
  created_at: string;
  user_id?: string | null;
}

export interface StatementFile {
  session_id: string;
  file_name: string;
  transaction_count: number;
  uploaded_at: string;
  date_range: string;
}

export interface ParseResult {
  transactions: Transaction[];
  lowConfidence: boolean;
}

export async function uploadAndParse(file: File, sessionId: string): Promise<ParseResult> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('session_id', sessionId);

  const { data, error } = await supabase.functions.invoke('parse-statement', {
    body: formData,
  });

  if (error) throw error;
  return {
    transactions: data.transactions || [],
    lowConfidence: data.low_confidence || false,
  };
}

export async function getTransactions(sessionId: string): Promise<Transaction[]> {
  // Try authenticated read first (RLS allows owner access)
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('session_id', sessionId)
      .order('date', { ascending: true });

    if (!error && data && data.length > 0) {
      return data as Transaction[];
    }
  }

  // Fall back to edge function for shared/public access (no direct DB access for anon)
  const res = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-shared-transactions?session_id=${encodeURIComponent(sessionId)}`,
    {
      headers: {
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      },
    }
  );

  if (!res.ok) throw new Error('Failed to load shared transactions');
  const json = await res.json();
  return (json.transactions as Transaction[]) || [];
}

export async function getUserStatementFiles(): Promise<StatementFile[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('transactions')
    .select('session_id, file_name, created_at, date')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) throw error;
  if (!data || data.length === 0) return [];

  // Group by (session_id, file_name)
  const map = new Map<string, { session_id: string; file_name: string; count: number; uploaded_at: string; dates: string[] }>();
  for (const row of data) {
    const key = `${row.session_id}::${row.file_name}`;
    if (!map.has(key)) {
      map.set(key, {
        session_id: row.session_id,
        file_name: row.file_name || 'Unknown file',
        count: 0,
        uploaded_at: row.created_at,
        dates: [],
      });
    }
    const entry = map.get(key)!;
    entry.count++;
    if (row.date) entry.dates.push(row.date);
  }

  return Array.from(map.values()).map((e) => {
    const sorted = [...e.dates].sort();
    const dateRange = sorted.length > 0
      ? sorted[0] === sorted[sorted.length - 1]
        ? sorted[0]
        : `${sorted[0]} – ${sorted[sorted.length - 1]}`
      : '';
    return {
      session_id: e.session_id,
      file_name: e.file_name,
      transaction_count: e.count,
      uploaded_at: e.uploaded_at,
      date_range: dateRange,
    };
  });
}

export async function deleteSession(sessionId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // We use service role via edge function to delete — for now delete client-side
  // RLS doesn't allow delete, so we'll add a delete policy for own records
  const { error } = await supabase
    .from('transactions')
    .delete()
    .eq('session_id', sessionId)
    .eq('user_id', user.id);

  if (error) throw error;
}

export async function deleteAllUserTransactions(): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('transactions')
    .delete()
    .eq('user_id', user.id);

  if (error) throw error;
}

export function generateSessionId(): string {
  return crypto.randomUUID();
}
