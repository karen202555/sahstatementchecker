export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      admin_users: {
        Row: {
          user_id: string
        }
        Insert: {
          user_id: string
        }
        Update: {
          user_id?: string
        }
        Relationships: []
      }
      app_meta: {
        Row: {
          key: string
          value: string
        }
        Insert: {
          key: string
          value: string
        }
        Update: {
          key?: string
          value?: string
        }
        Relationships: []
      }
      beta_feedback: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          rating: string
          session_id: string
          user_id: string | null
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          rating: string
          session_id: string
          user_id?: string | null
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          rating?: string
          session_id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      decision_memory: {
        Row: {
          category: string
          created_at: string
          id: string
          occurrence_count: number
          preferred_decision: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category: string
          created_at?: string
          id?: string
          occurrence_count?: number
          preferred_decision: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          occurrence_count?: number
          preferred_decision?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      features: {
        Row: {
          created_at: string
          description: string | null
          feature_name: string
          id: string
          sort_order: number
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          feature_name: string
          id?: string
          sort_order?: number
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          feature_name?: string
          id?: string
          sort_order?: number
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      feedback: {
        Row: {
          attachments: string[] | null
          created_at: string
          feedback_type: string
          id: string
          internal_notes: string | null
          message: string
          page_url: string | null
          priority: string | null
          reporter_email: string | null
          reporter_user_id: string
          status: string
          v1_go_live: boolean
          version: string | null
          wants_reply: boolean | null
        }
        Insert: {
          attachments?: string[] | null
          created_at?: string
          feedback_type: string
          id?: string
          internal_notes?: string | null
          message: string
          page_url?: string | null
          priority?: string | null
          reporter_email?: string | null
          reporter_user_id: string
          status?: string
          v1_go_live?: boolean
          version?: string | null
          wants_reply?: boolean | null
        }
        Update: {
          attachments?: string[] | null
          created_at?: string
          feedback_type?: string
          id?: string
          internal_notes?: string | null
          message?: string
          page_url?: string | null
          priority?: string | null
          reporter_email?: string | null
          reporter_user_id?: string
          status?: string
          v1_go_live?: boolean
          version?: string | null
          wants_reply?: boolean | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
          preferred_language: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id: string
          preferred_language?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
          preferred_language?: string
          updated_at?: string
        }
        Relationships: []
      }
      recent_changes: {
        Row: {
          created_at: string
          description: string
          id: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          sort_order?: number
        }
        Relationships: []
      }
      transaction_decisions: {
        Row: {
          created_at: string
          decision: string
          id: string
          note: string | null
          transaction_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          decision: string
          id?: string
          note?: string | null
          transaction_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          decision?: string
          id?: string
          note?: string | null
          transaction_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          client_contribution: number | null
          created_at: string
          date: string
          description: string
          file_name: string | null
          govt_contribution: number | null
          id: string
          rate_units: string | null
          session_id: string
          status: string
          unit_cost: number | null
          user_id: string | null
        }
        Insert: {
          amount: number
          client_contribution?: number | null
          created_at?: string
          date: string
          description: string
          file_name?: string | null
          govt_contribution?: number | null
          id?: string
          rate_units?: string | null
          session_id: string
          status?: string
          unit_cost?: number | null
          user_id?: string | null
        }
        Update: {
          amount?: number
          client_contribution?: number | null
          created_at?: string
          date?: string
          description?: string
          file_name?: string | null
          govt_contribution?: number | null
          id?: string
          rate_units?: string | null
          session_id?: string
          status?: string
          unit_cost?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
