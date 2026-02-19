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
      accounts: {
        Row: {
          account_type: string
          active: boolean
          created_at: string
          household_id: string
          id: string
          name: string
          opening_balance: number
          opening_date: string
        }
        Insert: {
          account_type?: string
          active?: boolean
          created_at?: string
          household_id: string
          id?: string
          name: string
          opening_balance?: number
          opening_date?: string
        }
        Update: {
          account_type?: string
          active?: boolean
          created_at?: string
          household_id?: string
          id?: string
          name?: string
          opening_balance?: number
          opening_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounts_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      card_purchases: {
        Row: {
          account_id: string | null
          amount_total: number
          card_name: string
          category_id: string | null
          created_at: string
          description: string
          first_statement_month: string
          household_id: string
          id: string
          installments_count: number
          purchase_at: string
        }
        Insert: {
          account_id?: string | null
          amount_total: number
          card_name: string
          category_id?: string | null
          created_at?: string
          description: string
          first_statement_month: string
          household_id: string
          id?: string
          installments_count: number
          purchase_at: string
        }
        Update: {
          account_id?: string | null
          amount_total?: number
          card_name?: string
          category_id?: string | null
          created_at?: string
          description?: string
          first_statement_month?: string
          household_id?: string
          id?: string
          installments_count?: number
          purchase_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "card_purchases_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "card_purchases_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "card_purchases_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          household_id: string
          id: string
          is_default: boolean
          kind: Database["public"]["Enums"]["category_kind"]
          name: string
        }
        Insert: {
          created_at?: string
          household_id: string
          id?: string
          is_default?: boolean
          kind: Database["public"]["Enums"]["category_kind"]
          name: string
        }
        Update: {
          created_at?: string
          household_id?: string
          id?: string
          is_default?: boolean
          kind?: Database["public"]["Enums"]["category_kind"]
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      despesas_fixas: {
        Row: {
          account_id: string
          amount: number
          category_id: string | null
          created_at: string
          description: string
          due_at: string
          due_month: string
          household_id: string
          id: string
          paid_at: string | null
          status: Database["public"]["Enums"]["expense_status"]
          template_id: string | null
        }
        Insert: {
          account_id: string
          amount: number
          category_id?: string | null
          created_at?: string
          description: string
          due_at: string
          due_month: string
          household_id: string
          id?: string
          paid_at?: string | null
          status?: Database["public"]["Enums"]["expense_status"]
          template_id?: string | null
        }
        Update: {
          account_id?: string
          amount?: number
          category_id?: string | null
          created_at?: string
          description?: string
          due_at?: string
          due_month?: string
          household_id?: string
          id?: string
          paid_at?: string | null
          status?: Database["public"]["Enums"]["expense_status"]
          template_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "despesas_fixas_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "despesas_fixas_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "despesas_fixas_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "despesas_fixas_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "fixed_expense_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      despesas_variaveis: {
        Row: {
          account_id: string
          amount: number
          category_id: string | null
          created_at: string
          description: string
          household_id: string
          id: string
          paid_at: string | null
          payment_method: string | null
          planned_month: string | null
          type: Database["public"]["Enums"]["variable_expense_type"]
        }
        Insert: {
          account_id: string
          amount: number
          category_id?: string | null
          created_at?: string
          description: string
          household_id: string
          id?: string
          paid_at?: string | null
          payment_method?: string | null
          planned_month?: string | null
          type: Database["public"]["Enums"]["variable_expense_type"]
        }
        Update: {
          account_id?: string
          amount?: number
          category_id?: string | null
          created_at?: string
          description?: string
          household_id?: string
          id?: string
          paid_at?: string | null
          payment_method?: string | null
          planned_month?: string | null
          type?: Database["public"]["Enums"]["variable_expense_type"]
        }
        Relationships: [
          {
            foreignKeyName: "despesas_variaveis_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "despesas_variaveis_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "despesas_variaveis_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      fixed_expense_templates: {
        Row: {
          active: boolean
          amount: number
          category_id: string | null
          created_at: string
          description: string
          due_day: number
          end_month: string | null
          household_id: string
          id: string
          start_month: string
        }
        Insert: {
          active?: boolean
          amount: number
          category_id?: string | null
          created_at?: string
          description: string
          due_day: number
          end_month?: string | null
          household_id: string
          id?: string
          start_month: string
        }
        Update: {
          active?: boolean
          amount?: number
          category_id?: string | null
          created_at?: string
          description?: string
          due_day?: number
          end_month?: string | null
          household_id?: string
          id?: string
          start_month?: string
        }
        Relationships: [
          {
            foreignKeyName: "fixed_expense_templates_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fixed_expense_templates_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      household_invites: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          created_at: string
          created_by: string
          expires_at: string
          household_id: string
          id: string
          invited_email: string
          invited_role: Database["public"]["Enums"]["member_role"]
          status: Database["public"]["Enums"]["invite_status"]
          token: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          created_by: string
          expires_at?: string
          household_id: string
          id?: string
          invited_email: string
          invited_role?: Database["public"]["Enums"]["member_role"]
          status?: Database["public"]["Enums"]["invite_status"]
          token?: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          created_by?: string
          expires_at?: string
          household_id?: string
          id?: string
          invited_email?: string
          invited_role?: Database["public"]["Enums"]["member_role"]
          status?: Database["public"]["Enums"]["invite_status"]
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "household_invites_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      household_members: {
        Row: {
          created_at: string
          household_id: string
          id: string
          role: Database["public"]["Enums"]["member_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          household_id: string
          id?: string
          role?: Database["public"]["Enums"]["member_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          household_id?: string
          id?: string
          role?: Database["public"]["Enums"]["member_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "household_members_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      households: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      installments: {
        Row: {
          amount: number
          card_name: string
          created_at: string
          household_id: string
          id: string
          installment_number: number
          installments_count: number
          purchase_id: string
          statement_month: string
        }
        Insert: {
          amount: number
          card_name: string
          created_at?: string
          household_id: string
          id?: string
          installment_number: number
          installments_count: number
          purchase_id: string
          statement_month: string
        }
        Update: {
          amount?: number
          card_name?: string
          created_at?: string
          household_id?: string
          id?: string
          installment_number?: number
          installments_count?: number
          purchase_id?: string
          statement_month?: string
        }
        Relationships: [
          {
            foreignKeyName: "installments_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "installments_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "card_purchases"
            referencedColumns: ["id"]
          },
        ]
      }
      receitas: {
        Row: {
          account_id: string
          amount: number
          category_id: string | null
          created_at: string
          description: string
          household_id: string
          id: string
          paid_at: string
        }
        Insert: {
          account_id: string
          amount: number
          category_id?: string | null
          created_at?: string
          description: string
          household_id: string
          id?: string
          paid_at: string
        }
        Update: {
          account_id?: string
          amount?: number
          category_id?: string | null
          created_at?: string
          description?: string
          household_id?: string
          id?: string
          paid_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "receitas_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receitas_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receitas_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_household_invite: { Args: { _token: string }; Returns: Json }
      bootstrap_household: {
        Args: {
          _household_name: string
          _opening_balance: number
          _opening_date: string
        }
        Returns: Json
      }
      current_user_email: { Args: never; Returns: string }
      get_account_balance: {
        Args: { _account_id: string; _until_date: string }
        Returns: number
      }
      get_household_balance: {
        Args: { _household_id: string; _until_date: string }
        Returns: number
      }
      get_monthly_summary: {
        Args: { _account_id: string; _month: string }
        Returns: Json
      }
      get_user_household_id: { Args: never; Returns: string }
      is_household_admin: { Args: { _household_id: string }; Returns: boolean }
      is_household_member: { Args: { _household_id: string }; Returns: boolean }
      sync_fixed_expenses: {
        Args: {
          _default_account_id: string
          _household_id: string
          _month: string
        }
        Returns: number
      }
    }
    Enums: {
      category_kind: "receita" | "despesa" | "cartao"
      expense_status: "Pago" | "Pendente"
      invite_status: "pending" | "accepted" | "revoked" | "expired"
      member_role: "admin" | "member"
      variable_expense_type: "Pago" | "Planejado"
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
    Enums: {
      category_kind: ["receita", "despesa", "cartao"],
      expense_status: ["Pago", "Pendente"],
      invite_status: ["pending", "accepted", "revoked", "expired"],
      member_role: ["admin", "member"],
      variable_expense_type: ["Pago", "Planejado"],
    },
  },
} as const
