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
      expense_splits: {
        Row: {
          created_at: string
          expense_id: string
          id: string
          member_name: string
          share_amount: number
          user_id: string | null
        }
        Insert: {
          created_at?: string
          expense_id: string
          id?: string
          member_name: string
          share_amount: number
          user_id?: string | null
        }
        Update: {
          created_at?: string
          expense_id?: string
          id?: string
          member_name?: string
          share_amount?: number
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expense_splits_expense_id_fkey"
            columns: ["expense_id"]
            isOneToOne: false
            referencedRelation: "expenses"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          created_at: string
          created_by: string
          date: string
          description: string
          group_id: string
          id: string
          is_settled: boolean
          paid_by_name: string
          paid_by_user_id: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          created_by: string
          date?: string
          description: string
          group_id: string
          id?: string
          is_settled?: boolean
          paid_by_name: string
          paid_by_user_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string
          date?: string
          description?: string
          group_id?: string
          id?: string
          is_settled?: boolean
          paid_by_name?: string
          paid_by_user_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      group_members: {
        Row: {
          avatar_color: string | null
          group_id: string
          id: string
          is_placeholder: boolean
          joined_at: string
          left_at: string | null
          name: string
          role: string
          status: string
          user_id: string | null
        }
        Insert: {
          avatar_color?: string | null
          group_id: string
          id?: string
          is_placeholder?: boolean
          joined_at?: string
          left_at?: string | null
          name: string
          role?: string
          status?: string
          user_id?: string | null
        }
        Update: {
          avatar_color?: string | null
          group_id?: string
          id?: string
          is_placeholder?: boolean
          joined_at?: string
          left_at?: string | null
          name?: string
          role?: string
          status?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      groups: {
        Row: {
          banner_gradient: string
          created_at: string
          created_by: string
          deleted_at: string | null
          emoji: string
          id: string
          invite_code: string
          name: string
          updated_at: string
        }
        Insert: {
          banner_gradient?: string
          created_at?: string
          created_by: string
          deleted_at?: string | null
          emoji?: string
          id?: string
          invite_code: string
          name: string
          updated_at?: string
        }
        Update: {
          banner_gradient?: string
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          emoji?: string
          id?: string
          invite_code?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      smart_match_dismissals: {
        Row: {
          dismissed_at: string
          dismissed_by: string
          expense_id_1: string
          expense_id_2: string
          group_id: string
          id: string
        }
        Insert: {
          dismissed_at?: string
          dismissed_by: string
          expense_id_1: string
          expense_id_2: string
          group_id: string
          id?: string
        }
        Update: {
          dismissed_at?: string
          dismissed_by?: string
          expense_id_1?: string
          expense_id_2?: string
          group_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "smart_match_dismissals_expense_id_1_fkey"
            columns: ["expense_id_1"]
            isOneToOne: false
            referencedRelation: "expenses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "smart_match_dismissals_expense_id_2_fkey"
            columns: ["expense_id_2"]
            isOneToOne: false
            referencedRelation: "expenses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "smart_match_dismissals_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      claim_placeholder: { Args: { p_placeholder_id: string }; Returns: string }
      create_expense_with_splits: {
        Args: {
          p_amount: number
          p_created_by: string
          p_description: string
          p_group_id: string
          p_paid_by_name: string
          p_paid_by_user_id: string
          p_splits: Json
        }
        Returns: Json
      }
      create_group_with_creator: {
        Args: {
          p_avatar_color: string
          p_display_name: string
          p_emoji: string
          p_invite_code: string
          p_name: string
        }
        Returns: Json
      }
      get_group_splits: {
        Args: { p_group_id: string }
        Returns: {
          created_at: string
          expense_id: string
          id: string
          member_name: string
          share_amount: number
          user_id: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "expense_splits"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      is_group_member: {
        Args: { p_group_id: string; p_user_id: string }
        Returns: boolean
      }
      lookup_group_by_invite: {
        Args: { p_invite_code: string }
        Returns: {
          banner_gradient: string
          emoji: string
          id: string
          name: string
        }[]
      }
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
