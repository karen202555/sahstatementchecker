import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { categorizeTransaction } from "@/lib/categorize";
import type { Transaction } from "@/lib/transactions";

export type DecisionType = "approve" | "dispute" | "not-sure";

export interface TransactionDecision {
  transaction_id: string;
  decision: DecisionType;
  note: string | null;
}

export interface MemorySuggestion {
  category: string;
  preferred_decision: DecisionType;
  occurrence_count: number;
}

export function useDecisions(transactions: Transaction[]) {
  const [decisions, setDecisions] = useState<Map<string, TransactionDecision>>(new Map());
  const [memory, setMemory] = useState<Map<string, MemorySuggestion>>(new Map());
  const [userId, setUserId] = useState<string | null>(null);

  // Load user + existing decisions + memory
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      const txIds = transactions.map((t) => t.id);
      if (txIds.length === 0) return;

      // Load decisions
      const { data: decData } = await supabase
        .from("transaction_decisions")
        .select("transaction_id, decision, note")
        .in("transaction_id", txIds);

      if (decData) {
        const map = new Map<string, TransactionDecision>();
        for (const d of decData) {
          map.set(d.transaction_id, d as TransactionDecision);
        }
        setDecisions(map);
      }

      // Load memory
      const { data: memData } = await supabase
        .from("decision_memory")
        .select("category, preferred_decision, occurrence_count");

      if (memData) {
        const map = new Map<string, MemorySuggestion>();
        for (const m of memData) {
          map.set(m.category, m as MemorySuggestion);
        }
        setMemory(map);
      }
    })();
  }, [transactions]);

  const setDecision = useCallback(
    async (tx: Transaction, decision: DecisionType, note?: string) => {
      if (!userId) return;

      // Upsert decision
      const { error } = await supabase
        .from("transaction_decisions")
        .upsert(
          {
            transaction_id: tx.id,
            user_id: userId,
            decision,
            note: note || null,
          },
          { onConflict: "transaction_id,user_id" }
        );

      if (error) {
        console.error("Failed to save decision", error);
        return;
      }

      setDecisions((prev) => {
        const next = new Map(prev);
        next.set(tx.id, { transaction_id: tx.id, decision, note: note || null });
        return next;
      });

      // Update memory for this category
      const { category } = categorizeTransaction(tx.description);
      const existing = memory.get(category);
      const newCount = (existing?.occurrence_count || 0) + 1;

      await supabase
        .from("decision_memory")
        .upsert(
          {
            user_id: userId,
            category,
            preferred_decision: decision,
            occurrence_count: newCount,
          },
          { onConflict: "user_id,category" }
        );

      setMemory((prev) => {
        const next = new Map(prev);
        next.set(category, { category, preferred_decision: decision, occurrence_count: newCount });
        return next;
      });
    },
    [userId, memory]
  );

  const clearMemory = useCallback(async () => {
    if (!userId) return;
    await supabase.from("decision_memory").delete().eq("user_id", userId);
    setMemory(new Map());
  }, [userId]);

  const getSuggestion = useCallback(
    (tx: Transaction): MemorySuggestion | null => {
      const { category } = categorizeTransaction(tx.description);
      const mem = memory.get(category);
      if (mem && mem.occurrence_count >= 2) return mem;
      return null;
    },
    [memory]
  );

  return { decisions, setDecision, getSuggestion, clearMemory, isAuthenticated: !!userId };
}
