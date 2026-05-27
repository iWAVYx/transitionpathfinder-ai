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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      audit_log: {
        Row: {
          action: string
          actor_email: string | null
          actor_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          metadata: Json | null
          student_id: string | null
        }
        Insert: {
          action: string
          actor_email?: string | null
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          metadata?: Json | null
          student_id?: string | null
        }
        Update: {
          action?: string
          actor_email?: string | null
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          metadata?: Json | null
          student_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          created_at: string
          doc_type: string
          id: string
          mime_type: string | null
          parsed_summary: Json | null
          size_bytes: number | null
          storage_path: string
          student_id: string
          title: string
          updated_at: string
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          doc_type?: string
          id?: string
          mime_type?: string | null
          parsed_summary?: Json | null
          size_bytes?: number | null
          storage_path: string
          student_id: string
          title: string
          updated_at?: string
          uploaded_by: string
        }
        Update: {
          created_at?: string
          doc_type?: string
          id?: string
          mime_type?: string | null
          parsed_summary?: Json | null
          size_bytes?: number | null
          storage_path?: string
          student_id?: string
          title?: string
          updated_at?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      goals: {
        Row: {
          category: string
          created_at: string
          created_by: string
          description: string | null
          id: string
          measurable_criteria: string | null
          position: number
          status: string
          student_id: string
          target_date: string | null
          title: string
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          measurable_criteria?: string | null
          position?: number
          status?: string
          student_id: string
          target_date?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          measurable_criteria?: string | null
          position?: number
          status?: string
          student_id?: string
          target_date?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "goals_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_prefs: {
        Row: {
          email_collab_invites: boolean
          email_goal_reminders: boolean
          email_report_ready: boolean
          email_weekly_digest: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          email_collab_invites?: boolean
          email_goal_reminders?: boolean
          email_report_ready?: boolean
          email_weekly_digest?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          email_collab_invites?: boolean
          email_goal_reminders?: boolean
          email_report_ready?: boolean
          email_weekly_digest?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      pathway_progress: {
        Row: {
          completed: boolean
          created_at: string
          id: string
          note: string | null
          pathway_id: string
          step_index: number
          student_id: string
          updated_at: string
          updated_by: string
        }
        Insert: {
          completed?: boolean
          created_at?: string
          id?: string
          note?: string | null
          pathway_id: string
          step_index: number
          student_id: string
          updated_at?: string
          updated_by: string
        }
        Update: {
          completed?: boolean
          created_at?: string
          id?: string
          note?: string | null
          pathway_id?: string
          step_index?: number
          student_id?: string
          updated_at?: string
          updated_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "pathway_progress_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      pathway_reports: {
        Row: {
          content: Json
          created_at: string
          id: string
          intake_id: string
          model: string
          student_id: string | null
          user_id: string
        }
        Insert: {
          content: Json
          created_at?: string
          id?: string
          intake_id: string
          model: string
          student_id?: string | null
          user_id: string
        }
        Update: {
          content?: Json
          created_at?: string
          id?: string
          intake_id?: string
          model?: string
          student_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pathway_reports_intake_id_fkey"
            columns: ["intake_id"]
            isOneToOne: false
            referencedRelation: "student_intakes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pathway_reports_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      share_tokens: {
        Row: {
          audience: string
          created_at: string
          created_by: string
          expires_at: string | null
          id: string
          last_viewed_at: string | null
          report_id: string
          revoked: boolean
          token: string
          view_count: number
        }
        Insert: {
          audience?: string
          created_at?: string
          created_by: string
          expires_at?: string | null
          id?: string
          last_viewed_at?: string | null
          report_id: string
          revoked?: boolean
          token: string
          view_count?: number
        }
        Update: {
          audience?: string
          created_at?: string
          created_by?: string
          expires_at?: string | null
          id?: string
          last_viewed_at?: string | null
          report_id?: string
          revoked?: boolean
          token?: string
          view_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "share_tokens_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "pathway_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      student_collaborators: {
        Row: {
          created_at: string
          id: string
          invited_by: string
          invited_email: string
          role: string
          status: string
          student_id: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          invited_by: string
          invited_email: string
          role?: string
          status?: string
          student_id: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          invited_by?: string
          invited_email?: string
          role?: string
          status?: string
          student_id?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_collaborators_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_intakes: {
        Row: {
          communication: string | null
          created_at: string
          current_goals: string | null
          educator_input: string | null
          family_concerns: string | null
          family_voice: string | null
          grade_band: string | null
          id: string
          interests: string | null
          needs: string | null
          strengths: string | null
          student_first_name: string
          student_id: string | null
          student_voice: string | null
          submitter_role: string
          supports: string | null
          transportation: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          communication?: string | null
          created_at?: string
          current_goals?: string | null
          educator_input?: string | null
          family_concerns?: string | null
          family_voice?: string | null
          grade_band?: string | null
          id?: string
          interests?: string | null
          needs?: string | null
          strengths?: string | null
          student_first_name: string
          student_id?: string | null
          student_voice?: string | null
          submitter_role?: string
          supports?: string | null
          transportation?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          communication?: string | null
          created_at?: string
          current_goals?: string | null
          educator_input?: string | null
          family_concerns?: string | null
          family_voice?: string | null
          grade_band?: string | null
          id?: string
          interests?: string | null
          needs?: string | null
          strengths?: string | null
          student_first_name?: string
          student_id?: string | null
          student_voice?: string | null
          submitter_role?: string
          supports?: string | null
          transportation?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_intakes_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          created_at: string
          date_of_birth: string | null
          first_name: string
          grade_band: string | null
          id: string
          last_name: string | null
          notes: string | null
          owner_id: string
          photo_url: string | null
          school: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          date_of_birth?: string | null
          first_name: string
          grade_band?: string | null
          id?: string
          last_name?: string | null
          notes?: string | null
          owner_id: string
          photo_url?: string | null
          school?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          date_of_birth?: string | null
          first_name?: string
          grade_band?: string | null
          id?: string
          last_name?: string | null
          notes?: string | null
          owner_id?: string
          photo_url?: string | null
          school?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      waitlist: {
        Row: {
          created_at: string
          email: string
          full_name: string
          id: string
          reason: string | null
          role: string
          source: string | null
          state: string | null
          student_grade_band: string | null
        }
        Insert: {
          created_at?: string
          email: string
          full_name: string
          id?: string
          reason?: string | null
          role: string
          source?: string | null
          state?: string | null
          student_grade_band?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          reason?: string | null
          role?: string
          source?: string | null
          state?: string | null
          student_grade_band?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_access_student: {
        Args: { _student_id: string; _user_id: string }
        Returns: boolean
      }
      can_edit_student: {
        Args: { _student_id: string; _user_id: string }
        Returns: boolean
      }
      claim_admin_if_unclaimed: { Args: never; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      resolve_share_token: {
        Args: { _token: string }
        Returns: {
          audience: string
          content: Json
          created_at: string
          report_id: string
        }[]
      }
      track_share_view: { Args: { _token: string }; Returns: undefined }
    }
    Enums: {
      app_role: "parent" | "educator" | "admin" | "case_manager"
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
      app_role: ["parent", "educator", "admin", "case_manager"],
    },
  },
} as const
