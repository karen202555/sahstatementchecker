import { supabase } from "@/integrations/supabase/client";

export interface Transaction {
  id: string;
  session_id: string;
  date: string;
  description: string;
  amount: number;
  file_name: string | null;
  created_at: string;
}

export async function uploadAndParse(file: File, sessionId: string): Promise<Transaction[]> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('session_id', sessionId);

  const { data, error } = await supabase.functions.invoke('parse-statement', {
    body: formData,
  });

  if (error) throw error;
  return data.transactions || [];
}

export async function getTransactions(sessionId: string): Promise<Transaction[]> {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('session_id', sessionId)
    .order('date', { ascending: true });

  if (error) throw error;
  return (data as Transaction[]) || [];
}

export function generateSessionId(): string {
  return crypto.randomUUID();
}
