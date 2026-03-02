export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      accounts: {
        Row: {
          id: string
          household_id: string
          user_id: string | null
          name: string
          bank: string | null
          account_type: string
          opening_balance: number
          opening_date: string
          active: boolean
          is_shared: boolean
          exclude_from_totals: boolean
          created_at: string
        }
        Insert: {
          id?: string
          household_id: string
          user_id?: string | null
          name: string
          bank?: string | null
          account_type: string
          opening_balance?: number
          opening_date?: string
          active?: boolean
          is_shared?: boolean
          exclude_from_totals?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          household_id?: string
          user_id?: string | null
          name?: string
          bank?: string | null
          account_type?: string
          opening_balance?: number
          opening_date?: string
          active?: boolean
          is_shared?: boolean
          exclude_from_totals?: boolean
          created_at?: string
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
          household_id: string | null
          id: string
          is_default: boolean
          kind: Database["public"]["Enums"]["category_kind"]
          name: string
          icon: string | null
          color: string | null
        }
        Insert: {
          created_at?: string
          household_id?: string | null
          id?: string
          is_default?: boolean
          kind: Database["public"]["Enums"]["category_kind"]
          name: string
          icon?: string | null
          color?: string | null
        }
        Update: {
          created_at?: string
          household_id?: string | null
          id?: string
          is_default?: boolean
          kind?: Database["public"]["Enums"]["category_kind"]
          name?: string
          icon?: string | null
          color?: string | null
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
      transactions: {
        Row: {
          id: string
          user_id: string
          account_id: string | null
          card_id: string | null
          category_id: string | null
          amount: number
          description: string
          type: string
          status: string
          purchase_date: string
          effective_date: string
          effective_month: string
          mes_fatura: string | null
          installment_number: number | null
          total_installments: number | null
          installment_group_id: string | null
          is_recurring: boolean
          is_paid: boolean
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          account_id?: string | null
          card_id?: string | null
          category_id?: string | null
          amount: number
          description: string
          type: string
          status?: string
          purchase_date?: string
          effective_date?: string
          effective_month?: string
          mes_fatura?: string | null
          installment_number?: number | null
          total_installments?: number | null
          installment_group_id?: string | null
          is_recurring?: boolean
          is_paid?: boolean
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          account_id?: string | null
          card_id?: string | null
          category_id?: string | null
          amount?: number
          description?: string
          type?: string
          status?: string
          purchase_date?: string
          effective_date?: string
          effective_month?: string
          mes_fatura?: string | null
          installment_number?: number | null
          total_installments?: number | null
          installment_group_id?: string | null
          is_recurring?: boolean
          is_paid?: boolean
          notes?: string | null
          created_at?: string
        }
        Relationships: []
      }
      cards: {
        Row: {
          id: string
          user_id: string
          household_id: string
          name: string
          last_digits: string | null
          brand: string | null
          limit: number
          closing_day: number
          due_day: number
          color: string
          responsible_user_id: string | null
          default_account_id: string | null
          is_archived: boolean
          is_shared: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          household_id: string
          name: string
          last_digits?: string | null
          brand?: string | null
          limit?: number
          closing_day?: number
          due_day?: number
          color?: string
          responsible_user_id?: string | null
          default_account_id?: string | null
          is_archived?: boolean
          is_shared?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          household_id?: string
          name?: string
          last_digits?: string | null
          brand?: string | null
          limit?: number
          closing_day?: number
          due_day?: number
          color?: string
          responsible_user_id?: string | null
          default_account_id?: string | null
          is_archived?: boolean
          is_shared?: boolean
          created_at?: string
        }
        Relationships: []
      }
      debts: {
        Row: {
          id: string
          user_id: string | null
          household_id: string
          name: string
          total_amount: number
          paid_amount: number
          interest_rate: number
          start_date: string
          due_date: string
          monthly_payment: number
          installments_count: number | null
          frequency: string | null
          is_active: boolean
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          household_id: string
          name: string
          total_amount: number
          paid_amount?: number
          interest_rate?: number
          start_date: string
          due_date: string
          monthly_payment: number
          installments_count?: number | null
          frequency?: string | null
          is_active?: boolean
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          household_id?: string
          name?: string
          total_amount?: number
          paid_amount?: number
          interest_rate?: number
          start_date?: string
          due_date?: string
          monthly_payment?: number
          installments_count?: number | null
          frequency?: string | null
          is_active?: boolean
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (Database["public"]["Tables"] & Database["public"]["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (Database["public"]["Tables"] &
        Database["public"]["Views"])
    ? (Database["public"]["Tables"] &
        Database["public"]["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof Database["public"]["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof Database["public"]["Tables"]
    ? Database["public"]["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof Database["public"]["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof Database["public"]["Tables"]
    ? Database["public"]["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof Database["public"]["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof Database["public"]["Enums"]
    ? Database["public"]["Enums"][PublicEnumNameOrOptions]
    : never