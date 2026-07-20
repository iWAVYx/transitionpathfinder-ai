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
      access_code_redemptions: {
        Row: {
          code_id: string
          id: string
          redeemed_at: string
          user_id: string
        }
        Insert: {
          code_id: string
          id?: string
          redeemed_at?: string
          user_id: string
        }
        Update: {
          code_id?: string
          id?: string
          redeemed_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "access_code_redemptions_code_id_fkey"
            columns: ["code_id"]
            isOneToOne: false
            referencedRelation: "access_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      access_codes: {
        Row: {
          capacity: number | null
          code_hash: string
          created_at: string
          created_by: string
          expires_at: string | null
          id: string
          org_id: string | null
          revoked_at: string | null
          role: string
          scope: string
          single_use: boolean
          updated_at: string
          uses: number
        }
        Insert: {
          capacity?: number | null
          code_hash: string
          created_at?: string
          created_by: string
          expires_at?: string | null
          id?: string
          org_id?: string | null
          revoked_at?: string | null
          role: string
          scope?: string
          single_use?: boolean
          updated_at?: string
          uses?: number
        }
        Update: {
          capacity?: number | null
          code_hash?: string
          created_at?: string
          created_by?: string
          expires_at?: string | null
          id?: string
          org_id?: string | null
          revoked_at?: string | null
          role?: string
          scope?: string
          single_use?: boolean
          updated_at?: string
          uses?: number
        }
        Relationships: [
          {
            foreignKeyName: "access_codes_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      access_entitlements: {
        Row: {
          created_at: string
          ends_at: string | null
          grants_family_access: boolean
          grants_partner_access: boolean
          grants_student_access: boolean
          id: string
          max_schools: number | null
          max_staff: number | null
          max_students: number | null
          notes: string | null
          organization_id: string
          plan_type: string
          starts_at: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          ends_at?: string | null
          grants_family_access?: boolean
          grants_partner_access?: boolean
          grants_student_access?: boolean
          id?: string
          max_schools?: number | null
          max_staff?: number | null
          max_students?: number | null
          notes?: string | null
          organization_id: string
          plan_type: string
          starts_at?: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          ends_at?: string | null
          grants_family_access?: boolean
          grants_partner_access?: boolean
          grants_student_access?: boolean
          id?: string
          max_schools?: number | null
          max_staff?: number | null
          max_students?: number | null
          notes?: string | null
          organization_id?: string
          plan_type?: string
          starts_at?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "access_entitlements_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      action_items: {
        Row: {
          assigned_to_user_id: string | null
          category: string
          created_at: string
          created_by_user_id: string
          description: string | null
          due_date: string | null
          id: string
          is_demo: boolean
          pathway_report_id: string | null
          priority: string
          related_goal_area: string | null
          status: string
          student_id: string
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to_user_id?: string | null
          category?: string
          created_at?: string
          created_by_user_id: string
          description?: string | null
          due_date?: string | null
          id?: string
          is_demo?: boolean
          pathway_report_id?: string | null
          priority?: string
          related_goal_area?: string | null
          status?: string
          student_id: string
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to_user_id?: string | null
          category?: string
          created_at?: string
          created_by_user_id?: string
          description?: string | null
          due_date?: string | null
          id?: string
          is_demo?: boolean
          pathway_report_id?: string | null
          priority?: string
          related_goal_area?: string | null
          status?: string
          student_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "action_items_pathway_report_id_fkey"
            columns: ["pathway_report_id"]
            isOneToOne: false
            referencedRelation: "pathway_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "action_items_pathway_report_id_fkey"
            columns: ["pathway_report_id"]
            isOneToOne: false
            referencedRelation: "report_provenance_coverage_v1"
            referencedColumns: ["report_id"]
          },
          {
            foreignKeyName: "action_items_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_history: {
        Row: {
          actor_role: string | null
          actor_user_id: string | null
          event_type: string
          id: string
          metadata: Json
          occurred_at: string
          organization_id: string | null
          related_action_id: string | null
          related_document_id: string | null
          related_meeting_id: string | null
          related_opportunity_id: string | null
          related_report_id: string | null
          student_id: string | null
          subject_route: string | null
          subject_title: string
        }
        Insert: {
          actor_role?: string | null
          actor_user_id?: string | null
          event_type: string
          id?: string
          metadata?: Json
          occurred_at?: string
          organization_id?: string | null
          related_action_id?: string | null
          related_document_id?: string | null
          related_meeting_id?: string | null
          related_opportunity_id?: string | null
          related_report_id?: string | null
          student_id?: string | null
          subject_route?: string | null
          subject_title: string
        }
        Update: {
          actor_role?: string | null
          actor_user_id?: string | null
          event_type?: string
          id?: string
          metadata?: Json
          occurred_at?: string
          organization_id?: string | null
          related_action_id?: string | null
          related_document_id?: string | null
          related_meeting_id?: string | null
          related_opportunity_id?: string | null
          related_report_id?: string | null
          student_id?: string | null
          subject_route?: string | null
          subject_title?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_history_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_history_related_action_id_fkey"
            columns: ["related_action_id"]
            isOneToOne: false
            referencedRelation: "next_actions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_history_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_activity_logs: {
        Row: {
          action_type: string
          admin_user_id: string
          created_at: string
          details: Json
          id: string
          target_id: string | null
          target_type: string | null
        }
        Insert: {
          action_type: string
          admin_user_id: string
          created_at?: string
          details?: Json
          id?: string
          target_id?: string | null
          target_type?: string | null
        }
        Update: {
          action_type?: string
          admin_user_id?: string
          created_at?: string
          details?: Json
          id?: string
          target_id?: string | null
          target_type?: string | null
        }
        Relationships: []
      }
      admin_audit_reviews: {
        Row: {
          created_at: string
          id: string
          issues_fixed: string
          issues_found: string
          last_reviewed_at: string | null
          last_reviewed_by: string | null
          notes: string
          purpose: string
          readiness: string
          role_key: string
          role_label: string
          staged_items: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          issues_fixed?: string
          issues_found?: string
          last_reviewed_at?: string | null
          last_reviewed_by?: string | null
          notes?: string
          purpose?: string
          readiness?: string
          role_key: string
          role_label: string
          staged_items?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          issues_fixed?: string
          issues_found?: string
          last_reviewed_at?: string | null
          last_reviewed_by?: string | null
          notes?: string
          purpose?: string
          readiness?: string
          role_key?: string
          role_label?: string
          staged_items?: string
          updated_at?: string
        }
        Relationships: []
      }
      admin_doc_access_grants: {
        Row: {
          actor_id: string
          created_at: string
          document_id: string
          expires_at: string
          id: string
          reason: string
        }
        Insert: {
          actor_id: string
          created_at?: string
          document_id: string
          expires_at?: string
          id?: string
          reason: string
        }
        Update: {
          actor_id?: string
          created_at?: string
          document_id?: string
          expires_at?: string
          id?: string
          reason?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_doc_access_grants_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_invitations: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          email: string
          expires_at: string
          id: string
          invited_at: string
          invited_by: string
          revoked_at: string | null
          role: Database["public"]["Enums"]["admin_role"]
          token: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          email: string
          expires_at?: string
          id?: string
          invited_at?: string
          invited_by: string
          revoked_at?: string | null
          role: Database["public"]["Enums"]["admin_role"]
          token?: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          email?: string
          expires_at?: string
          id?: string
          invited_at?: string
          invited_by?: string
          revoked_at?: string | null
          role?: Database["public"]["Enums"]["admin_role"]
          token?: string
        }
        Relationships: []
      }
      admin_roles: {
        Row: {
          granted_at: string
          granted_by: string | null
          id: string
          role: Database["public"]["Enums"]["admin_role"]
          user_id: string
        }
        Insert: {
          granted_at?: string
          granted_by?: string | null
          id?: string
          role: Database["public"]["Enums"]["admin_role"]
          user_id: string
        }
        Update: {
          granted_at?: string
          granted_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["admin_role"]
          user_id?: string
        }
        Relationships: []
      }
      ai_jobs: {
        Row: {
          attempts: number
          created_at: string
          error_message: string | null
          id: string
          input_source: Json
          job_type: string
          locked_at: string | null
          result_id: string | null
          result_payload: Json | null
          status: string
          student_id: string | null
          triggered_by_user_id: string
          updated_at: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          error_message?: string | null
          id?: string
          input_source?: Json
          job_type: string
          locked_at?: string | null
          result_id?: string | null
          result_payload?: Json | null
          status?: string
          student_id?: string | null
          triggered_by_user_id: string
          updated_at?: string
        }
        Update: {
          attempts?: number
          created_at?: string
          error_message?: string | null
          id?: string
          input_source?: Json
          job_type?: string
          locked_at?: string | null
          result_id?: string | null
          result_payload?: Json | null
          status?: string
          student_id?: string | null
          triggered_by_user_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_jobs_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      announcement_dismissals: {
        Row: {
          announcement_id: string
          dismissed_at: string
          user_id: string
        }
        Insert: {
          announcement_id: string
          dismissed_at?: string
          user_id: string
        }
        Update: {
          announcement_id?: string
          dismissed_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcement_dismissals_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "announcements"
            referencedColumns: ["id"]
          },
        ]
      }
      announcement_events: {
        Row: {
          announcement_id: string
          created_at: string
          event_type: string
          id: string
          link_url: string | null
          role: string | null
          user_id: string
        }
        Insert: {
          announcement_id: string
          created_at?: string
          event_type: string
          id?: string
          link_url?: string | null
          role?: string | null
          user_id: string
        }
        Update: {
          announcement_id?: string
          created_at?: string
          event_type?: string
          id?: string
          link_url?: string | null
          role?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcement_events_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "announcements"
            referencedColumns: ["id"]
          },
        ]
      }
      announcements: {
        Row: {
          body: string
          created_at: string
          created_by: string
          expires_at: string | null
          id: string
          link_label: string | null
          link_url: string | null
          published: boolean
          severity: string
          target_roles: string[]
          title: string
          updated_at: string
        }
        Insert: {
          body: string
          created_at?: string
          created_by: string
          expires_at?: string | null
          id?: string
          link_label?: string | null
          link_url?: string | null
          published?: boolean
          severity?: string
          target_roles?: string[]
          title: string
          updated_at?: string
        }
        Update: {
          body?: string
          created_at?: string
          created_by?: string
          expires_at?: string | null
          id?: string
          link_label?: string | null
          link_url?: string | null
          published?: boolean
          severity?: string
          target_roles?: string[]
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
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
      beta_testers: {
        Row: {
          assigned_test_script: string | null
          created_at: string
          email: string
          first_name: string
          id: string
          invitation_status: string
          invited_by_user_id: string | null
          last_name: string | null
          notes: string | null
          organization: string | null
          role_type: string
          testing_status: string
          updated_at: string
        }
        Insert: {
          assigned_test_script?: string | null
          created_at?: string
          email: string
          first_name: string
          id?: string
          invitation_status?: string
          invited_by_user_id?: string | null
          last_name?: string | null
          notes?: string | null
          organization?: string | null
          role_type: string
          testing_status?: string
          updated_at?: string
        }
        Update: {
          assigned_test_script?: string | null
          created_at?: string
          email?: string
          first_name?: string
          id?: string
          invitation_status?: string
          invited_by_user_id?: string | null
          last_name?: string | null
          notes?: string | null
          organization?: string | null
          role_type?: string
          testing_status?: string
          updated_at?: string
        }
        Relationships: []
      }
      blog_posts: {
        Row: {
          author_id: string | null
          author_name: string | null
          body_markdown: string
          category: string | null
          cover_image_url: string | null
          created_at: string
          excerpt: string | null
          id: string
          published_at: string | null
          seo_description: string | null
          seo_title: string | null
          slug: string
          status: string
          tags: string[]
          title: string
          updated_at: string
        }
        Insert: {
          author_id?: string | null
          author_name?: string | null
          body_markdown?: string
          category?: string | null
          cover_image_url?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          published_at?: string | null
          seo_description?: string | null
          seo_title?: string | null
          slug: string
          status?: string
          tags?: string[]
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string | null
          author_name?: string | null
          body_markdown?: string
          category?: string | null
          cover_image_url?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          published_at?: string | null
          seo_description?: string | null
          seo_title?: string | null
          slug?: string
          status?: string
          tags?: string[]
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      bridgeforward_import_reviews: {
        Row: {
          action: string
          created_at: string
          id: string
          notes: string | null
          reviewer_id: string
          source_record_id: string
          target_school_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          notes?: string | null
          reviewer_id: string
          source_record_id: string
          target_school_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          notes?: string | null
          reviewer_id?: string
          source_record_id?: string
          target_school_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bridgeforward_import_reviews_source_record_id_fkey"
            columns: ["source_record_id"]
            isOneToOne: false
            referencedRelation: "bridgeforward_source_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bridgeforward_import_reviews_target_school_id_fkey"
            columns: ["target_school_id"]
            isOneToOne: false
            referencedRelation: "ct_high_schools"
            referencedColumns: ["id"]
          },
        ]
      }
      bridgeforward_profiles: {
        Row: {
          created_at: string
          created_by: string | null
          current_school: string | null
          current_supports: string | null
          district: string | null
          executive_functioning_needs: string | null
          extracurricular_interests: string | null
          family_concerns: string | null
          favorite_subjects: string | null
          grade: number | null
          high_school_options_considered: string | null
          id: string
          interests: string | null
          is_demo: boolean
          learning_challenges: string | null
          learning_strengths: string | null
          preferred_school_environment: string | null
          social_emotional_support_needs: string | null
          student_hopes_for_high_school: string | null
          student_id: string
          subjects_needing_support: string | null
          transportation_considerations: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          current_school?: string | null
          current_supports?: string | null
          district?: string | null
          executive_functioning_needs?: string | null
          extracurricular_interests?: string | null
          family_concerns?: string | null
          favorite_subjects?: string | null
          grade?: number | null
          high_school_options_considered?: string | null
          id?: string
          interests?: string | null
          is_demo?: boolean
          learning_challenges?: string | null
          learning_strengths?: string | null
          preferred_school_environment?: string | null
          social_emotional_support_needs?: string | null
          student_hopes_for_high_school?: string | null
          student_id: string
          subjects_needing_support?: string | null
          transportation_considerations?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          current_school?: string | null
          current_supports?: string | null
          district?: string | null
          executive_functioning_needs?: string | null
          extracurricular_interests?: string | null
          family_concerns?: string | null
          favorite_subjects?: string | null
          grade?: number | null
          high_school_options_considered?: string | null
          id?: string
          interests?: string | null
          is_demo?: boolean
          learning_challenges?: string | null
          learning_strengths?: string | null
          preferred_school_environment?: string | null
          social_emotional_support_needs?: string | null
          student_hopes_for_high_school?: string | null
          student_id?: string
          subjects_needing_support?: string | null
          transportation_considerations?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bridgeforward_profiles_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: true
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      bridgeforward_readiness_snapshots: {
        Row: {
          before_high_school_checklist: Json
          confidence_and_self_advocacy: string | null
          created_at: string
          created_by: string | null
          family_priorities: string | null
          generated_by_ai: boolean
          high_school_fit_considerations: string | null
          id: string
          is_demo: boolean
          learning_supports: string | null
          questions_for_school_team: string | null
          strengths_and_interests: string | null
          student_id: string
          student_snapshot: string | null
          suggested_next_steps: string | null
          thirty_day_plan: Json
          updated_at: string
          version: number
        }
        Insert: {
          before_high_school_checklist?: Json
          confidence_and_self_advocacy?: string | null
          created_at?: string
          created_by?: string | null
          family_priorities?: string | null
          generated_by_ai?: boolean
          high_school_fit_considerations?: string | null
          id?: string
          is_demo?: boolean
          learning_supports?: string | null
          questions_for_school_team?: string | null
          strengths_and_interests?: string | null
          student_id: string
          student_snapshot?: string | null
          suggested_next_steps?: string | null
          thirty_day_plan?: Json
          updated_at?: string
          version?: number
        }
        Update: {
          before_high_school_checklist?: Json
          confidence_and_self_advocacy?: string | null
          created_at?: string
          created_by?: string | null
          family_priorities?: string | null
          generated_by_ai?: boolean
          high_school_fit_considerations?: string | null
          id?: string
          is_demo?: boolean
          learning_supports?: string | null
          questions_for_school_team?: string | null
          strengths_and_interests?: string | null
          student_id?: string
          student_snapshot?: string | null
          suggested_next_steps?: string | null
          thirty_day_plan?: Json
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "bridgeforward_readiness_snapshots_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      bridgeforward_resources: {
        Row: {
          audience: string
          body: string | null
          created_at: string
          created_by: string | null
          external_url: string | null
          id: string
          last_verified_at: string | null
          source_name: string | null
          source_url: string | null
          status: string
          summary: string | null
          tags: string[]
          title: string
          updated_at: string
          verification_status: Database["public"]["Enums"]["bf_verification_status"]
        }
        Insert: {
          audience?: string
          body?: string | null
          created_at?: string
          created_by?: string | null
          external_url?: string | null
          id?: string
          last_verified_at?: string | null
          source_name?: string | null
          source_url?: string | null
          status?: string
          summary?: string | null
          tags?: string[]
          title: string
          updated_at?: string
          verification_status?: Database["public"]["Enums"]["bf_verification_status"]
        }
        Update: {
          audience?: string
          body?: string | null
          created_at?: string
          created_by?: string | null
          external_url?: string | null
          id?: string
          last_verified_at?: string | null
          source_name?: string | null
          source_url?: string | null
          status?: string
          summary?: string | null
          tags?: string[]
          title?: string
          updated_at?: string
          verification_status?: Database["public"]["Enums"]["bf_verification_status"]
        }
        Relationships: []
      }
      bridgeforward_school_matches: {
        Row: {
          created_at: string
          discuss_with_team: boolean
          id: string
          needs_review: string[]
          notes: string | null
          program_id: string | null
          questions_to_ask: string[]
          reasons: Json
          saved_by: string | null
          school_id: string
          score: number | null
          status: Database["public"]["Enums"]["bf_match_status"]
          student_factors: Json
          student_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          discuss_with_team?: boolean
          id?: string
          needs_review?: string[]
          notes?: string | null
          program_id?: string | null
          questions_to_ask?: string[]
          reasons?: Json
          saved_by?: string | null
          school_id: string
          score?: number | null
          status?: Database["public"]["Enums"]["bf_match_status"]
          student_factors?: Json
          student_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          discuss_with_team?: boolean
          id?: string
          needs_review?: string[]
          notes?: string | null
          program_id?: string | null
          questions_to_ask?: string[]
          reasons?: Json
          saved_by?: string | null
          school_id?: string
          score?: number | null
          status?: Database["public"]["Enums"]["bf_match_status"]
          student_factors?: Json
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bridgeforward_school_matches_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "ct_high_school_programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bridgeforward_school_matches_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "ct_high_schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bridgeforward_school_matches_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      bridgeforward_source_records: {
        Row: {
          created_at: string
          dedupe_key: string | null
          id: string
          import_status: Database["public"]["Enums"]["bf_import_status"]
          imported_at: string
          imported_by: string | null
          normalized: Json
          notes: string | null
          raw: Json
          source_name: string
          source_type: string | null
          source_url: string | null
          suggested_school_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          dedupe_key?: string | null
          id?: string
          import_status?: Database["public"]["Enums"]["bf_import_status"]
          imported_at?: string
          imported_by?: string | null
          normalized?: Json
          notes?: string | null
          raw?: Json
          source_name: string
          source_type?: string | null
          source_url?: string | null
          suggested_school_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          dedupe_key?: string | null
          id?: string
          import_status?: Database["public"]["Enums"]["bf_import_status"]
          imported_at?: string
          imported_by?: string | null
          normalized?: Json
          notes?: string | null
          raw?: Json
          source_name?: string
          source_type?: string | null
          source_url?: string | null
          suggested_school_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bridgeforward_source_records_suggested_school_id_fkey"
            columns: ["suggested_school_id"]
            isOneToOne: false
            referencedRelation: "ct_high_schools"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_events: {
        Row: {
          all_day: boolean
          audience_roles: string[]
          color_label: string | null
          created_at: string
          detail: string | null
          end_time: string | null
          event_date: string
          event_type: string
          id: string
          is_demo: boolean
          location: string | null
          meeting_link: string | null
          owner_user_id: string
          recurrence_rule: string | null
          related_action_item_id: string | null
          related_meeting_id: string | null
          related_organization_id: string | null
          related_partner_id: string | null
          related_pathway_report_id: string | null
          reminder_settings: Json
          source_type: string
          start_time: string | null
          status: string
          student_id: string | null
          timezone: string | null
          title: string
          updated_at: string
          visibility: string
        }
        Insert: {
          all_day?: boolean
          audience_roles?: string[]
          color_label?: string | null
          created_at?: string
          detail?: string | null
          end_time?: string | null
          event_date: string
          event_type?: string
          id?: string
          is_demo?: boolean
          location?: string | null
          meeting_link?: string | null
          owner_user_id: string
          recurrence_rule?: string | null
          related_action_item_id?: string | null
          related_meeting_id?: string | null
          related_organization_id?: string | null
          related_partner_id?: string | null
          related_pathway_report_id?: string | null
          reminder_settings?: Json
          source_type?: string
          start_time?: string | null
          status?: string
          student_id?: string | null
          timezone?: string | null
          title: string
          updated_at?: string
          visibility?: string
        }
        Update: {
          all_day?: boolean
          audience_roles?: string[]
          color_label?: string | null
          created_at?: string
          detail?: string | null
          end_time?: string | null
          event_date?: string
          event_type?: string
          id?: string
          is_demo?: boolean
          location?: string | null
          meeting_link?: string | null
          owner_user_id?: string
          recurrence_rule?: string | null
          related_action_item_id?: string | null
          related_meeting_id?: string | null
          related_organization_id?: string | null
          related_partner_id?: string | null
          related_pathway_report_id?: string | null
          reminder_settings?: Json
          source_type?: string
          start_time?: string | null
          status?: string
          student_id?: string | null
          timezone?: string | null
          title?: string
          updated_at?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_events_related_action_item_id_fkey"
            columns: ["related_action_item_id"]
            isOneToOne: false
            referencedRelation: "action_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_related_meeting_id_fkey"
            columns: ["related_meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_related_organization_id_fkey"
            columns: ["related_organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_related_partner_id_fkey"
            columns: ["related_partner_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_related_pathway_report_id_fkey"
            columns: ["related_pathway_report_id"]
            isOneToOne: false
            referencedRelation: "pathway_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_related_pathway_report_id_fkey"
            columns: ["related_pathway_report_id"]
            isOneToOne: false
            referencedRelation: "report_provenance_coverage_v1"
            referencedColumns: ["report_id"]
          },
          {
            foreignKeyName: "calendar_events_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      collaboration_notes: {
        Row: {
          content: string
          created_at: string
          created_by_user_id: string
          id: string
          note_type: string
          student_id: string
          updated_at: string
          visibility: string
        }
        Insert: {
          content: string
          created_at?: string
          created_by_user_id: string
          id?: string
          note_type?: string
          student_id: string
          updated_at?: string
          visibility?: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by_user_id?: string
          id?: string
          note_type?: string
          student_id?: string
          updated_at?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "collaboration_notes_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          content: string
          created_at: string
          created_by_user_id: string
          id: string
          parent_id: string
          parent_type: string
          student_id: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          created_by_user_id: string
          id?: string
          parent_id: string
          parent_type: string
          student_id: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by_user_id?: string
          id?: string
          parent_id?: string
          parent_type?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      consent_records: {
        Row: {
          consent_status: string
          consent_text_snapshot: string
          consent_type: string
          consenting_user_id: string
          expires_at: string | null
          granted_at: string
          id: string
          revoked_at: string | null
          student_id: string
        }
        Insert: {
          consent_status?: string
          consent_text_snapshot: string
          consent_type: string
          consenting_user_id: string
          expires_at?: string | null
          granted_at?: string
          id?: string
          revoked_at?: string | null
          student_id: string
        }
        Update: {
          consent_status?: string
          consent_text_snapshot?: string
          consent_type?: string
          consenting_user_id?: string
          expires_at?: string | null
          granted_at?: string
          id?: string
          revoked_at?: string | null
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "consent_records_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_submissions: {
        Row: {
          created_at: string
          email: string
          first_name: string
          id: string
          inquiry_type: string
          internal_notes: string | null
          last_name: string | null
          message: string
          organization: string | null
          phone: string | null
          source_page: string | null
          status: string
          submitted_by_user_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          first_name: string
          id?: string
          inquiry_type?: string
          internal_notes?: string | null
          last_name?: string | null
          message: string
          organization?: string | null
          phone?: string | null
          source_page?: string | null
          status?: string
          submitted_by_user_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          first_name?: string
          id?: string
          inquiry_type?: string
          internal_notes?: string | null
          last_name?: string | null
          message?: string
          organization?: string | null
          phone?: string | null
          source_page?: string | null
          status?: string
          submitted_by_user_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      ct_high_school_programs: {
        Row: {
          application_requirements: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          last_verified_at: string | null
          program_category: Database["public"]["Enums"]["ct_program_category"]
          program_name: string
          school_id: string
          source_url: string | null
          student_fit_tags: string[]
          support_considerations: string | null
          updated_at: string
          verification_status: Database["public"]["Enums"]["bf_verification_status"]
        }
        Insert: {
          application_requirements?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          last_verified_at?: string | null
          program_category?: Database["public"]["Enums"]["ct_program_category"]
          program_name: string
          school_id: string
          source_url?: string | null
          student_fit_tags?: string[]
          support_considerations?: string | null
          updated_at?: string
          verification_status?: Database["public"]["Enums"]["bf_verification_status"]
        }
        Update: {
          application_requirements?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          last_verified_at?: string | null
          program_category?: Database["public"]["Enums"]["ct_program_category"]
          program_name?: string
          school_id?: string
          source_url?: string | null
          student_fit_tags?: string[]
          support_considerations?: string | null
          updated_at?: string
          verification_status?: Database["public"]["Enums"]["bf_verification_status"]
        }
        Relationships: [
          {
            foreignKeyName: "ct_high_school_programs_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "ct_high_schools"
            referencedColumns: ["id"]
          },
        ]
      }
      ct_high_schools: {
        Row: {
          admissions_url: string | null
          application_window: string | null
          city: string | null
          county: string | null
          created_at: string
          created_by: string | null
          district: string | null
          grades_served: string | null
          id: string
          last_verified_at: string | null
          name: string
          school_type: Database["public"]["Enums"]["ct_school_type"]
          source_name: string | null
          source_url: string | null
          transportation_notes: string | null
          updated_at: string
          verification_status: Database["public"]["Enums"]["bf_verification_status"]
          website_url: string | null
        }
        Insert: {
          admissions_url?: string | null
          application_window?: string | null
          city?: string | null
          county?: string | null
          created_at?: string
          created_by?: string | null
          district?: string | null
          grades_served?: string | null
          id?: string
          last_verified_at?: string | null
          name: string
          school_type?: Database["public"]["Enums"]["ct_school_type"]
          source_name?: string | null
          source_url?: string | null
          transportation_notes?: string | null
          updated_at?: string
          verification_status?: Database["public"]["Enums"]["bf_verification_status"]
          website_url?: string | null
        }
        Update: {
          admissions_url?: string | null
          application_window?: string | null
          city?: string | null
          county?: string | null
          created_at?: string
          created_by?: string | null
          district?: string | null
          grades_served?: string | null
          id?: string
          last_verified_at?: string | null
          name?: string
          school_type?: Database["public"]["Enums"]["ct_school_type"]
          source_name?: string | null
          source_url?: string | null
          transportation_notes?: string | null
          updated_at?: string
          verification_status?: Database["public"]["Enums"]["bf_verification_status"]
          website_url?: string | null
        }
        Relationships: []
      }
      demo_meeting_edits: {
        Row: {
          agenda: Json
          created_at: string
          id: string
          minutes: Json
          student_key: string
          updated_at: string
          user_id: string
        }
        Insert: {
          agenda?: Json
          created_at?: string
          id?: string
          minutes?: Json
          student_key: string
          updated_at?: string
          user_id: string
        }
        Update: {
          agenda?: Json
          created_at?: string
          id?: string
          minutes?: Json
          student_key?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      document_access_log: {
        Row: {
          action: string
          actor_id: string
          actor_role: string | null
          created_at: string
          document_id: string
          id: string
          metadata: Json | null
          reason: string | null
          student_id: string
        }
        Insert: {
          action: string
          actor_id: string
          actor_role?: string | null
          created_at?: string
          document_id: string
          id?: string
          metadata?: Json | null
          reason?: string | null
          student_id: string
        }
        Update: {
          action?: string
          actor_id?: string
          actor_role?: string | null
          created_at?: string
          document_id?: string
          id?: string
          metadata?: Json | null
          reason?: string | null
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_access_log_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_access_log_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      document_extractions: {
        Row: {
          created_at: string
          created_by: string | null
          doc_type: string | null
          document_id: string
          id: string
          missing_information: string[]
          raw_extract: Json
          review_notes: string | null
          reviewed_at: string | null
          reviewer_id: string | null
          sections: Json
          source_label: string | null
          status: Database["public"]["Enums"]["document_extraction_status"]
          student_id: string
          suggested_questions: string[]
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          doc_type?: string | null
          document_id: string
          id?: string
          missing_information?: string[]
          raw_extract?: Json
          review_notes?: string | null
          reviewed_at?: string | null
          reviewer_id?: string | null
          sections?: Json
          source_label?: string | null
          status?: Database["public"]["Enums"]["document_extraction_status"]
          student_id: string
          suggested_questions?: string[]
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          doc_type?: string | null
          document_id?: string
          id?: string
          missing_information?: string[]
          raw_extract?: Json
          review_notes?: string | null
          reviewed_at?: string | null
          reviewer_id?: string | null
          sections?: Json
          source_label?: string | null
          status?: Database["public"]["Enums"]["document_extraction_status"]
          student_id?: string
          suggested_questions?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_extractions_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: true
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_extractions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      document_permissions: {
        Row: {
          created_at: string
          document_id: string
          granted_by: string
          id: string
          notes: string | null
          permission_level: Database["public"]["Enums"]["document_permission_level"]
          role_type: string | null
          student_id: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          document_id: string
          granted_by: string
          id?: string
          notes?: string | null
          permission_level?: Database["public"]["Enums"]["document_permission_level"]
          role_type?: string | null
          student_id: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          document_id?: string
          granted_by?: string
          id?: string
          notes?: string | null
          permission_level?: Database["public"]["Enums"]["document_permission_level"]
          role_type?: string | null
          student_id?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "document_permissions_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_permissions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      document_pipeline_runs: {
        Row: {
          attempt: number
          correlation_id: string
          cost_cents: number | null
          created_at: string
          document_id: string
          engine_version: string | null
          error_code: string | null
          error_message: string | null
          finished_at: string | null
          id: string
          latency_ms: number | null
          model_version: string | null
          payload: Json
          prompt_version: string | null
          stage: string
          started_at: string | null
          status: string
          student_id: string | null
          updated_at: string
        }
        Insert: {
          attempt?: number
          correlation_id?: string
          cost_cents?: number | null
          created_at?: string
          document_id: string
          engine_version?: string | null
          error_code?: string | null
          error_message?: string | null
          finished_at?: string | null
          id?: string
          latency_ms?: number | null
          model_version?: string | null
          payload?: Json
          prompt_version?: string | null
          stage: string
          started_at?: string | null
          status: string
          student_id?: string | null
          updated_at?: string
        }
        Update: {
          attempt?: number
          correlation_id?: string
          cost_cents?: number | null
          created_at?: string
          document_id?: string
          engine_version?: string | null
          error_code?: string | null
          error_message?: string | null
          finished_at?: string | null
          id?: string
          latency_ms?: number | null
          model_version?: string | null
          payload?: Json
          prompt_version?: string | null
          stage?: string
          started_at?: string | null
          status?: string
          student_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_pipeline_runs_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_pipeline_runs_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      document_summaries: {
        Row: {
          ai_model_used: string | null
          created_at: string
          document_id: string
          goals_identified: Json
          human_review_status: string
          id: string
          important_dates: Json
          key_findings: Json
          missing_information: Json
          needs_identified: Json
          recommended_followups: Json
          strengths_identified: Json
          student_id: string
          summary: string | null
          updated_at: string
        }
        Insert: {
          ai_model_used?: string | null
          created_at?: string
          document_id: string
          goals_identified?: Json
          human_review_status?: string
          id?: string
          important_dates?: Json
          key_findings?: Json
          missing_information?: Json
          needs_identified?: Json
          recommended_followups?: Json
          strengths_identified?: Json
          student_id: string
          summary?: string | null
          updated_at?: string
        }
        Update: {
          ai_model_used?: string | null
          created_at?: string
          document_id?: string
          goals_identified?: Json
          human_review_status?: string
          id?: string
          important_dates?: Json
          key_findings?: Json
          missing_information?: Json
          needs_identified?: Json
          recommended_followups?: Json
          strengths_identified?: Json
          student_id?: string
          summary?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_summaries_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_summaries_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          annual_review_date: string | null
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          consent_acknowledged_at: string | null
          consent_required: boolean
          content_hash: string | null
          created_at: string
          delete_reason: string | null
          deleted_at: string | null
          deleted_by: string | null
          doc_type: string
          document_category: string
          effective_date: string | null
          file_name: string | null
          file_type: string | null
          file_url: string | null
          id: string
          meeting_date: string | null
          mime_type: string | null
          notes: string | null
          organization_id: string | null
          parsed_summary: Json | null
          reevaluation_date: string | null
          review_date: string | null
          review_status: string
          reviewed_at: string | null
          reviewed_by: string | null
          school_year: string | null
          size_bytes: number | null
          source: string | null
          status: string
          storage_path: string
          student_id: string
          title: string
          updated_at: string
          uploaded_by: string
          uploaded_by_role: string | null
          used_in_report_at: string | null
          visibility: string
        }
        Insert: {
          annual_review_date?: string | null
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          consent_acknowledged_at?: string | null
          consent_required?: boolean
          content_hash?: string | null
          created_at?: string
          delete_reason?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          doc_type?: string
          document_category?: string
          effective_date?: string | null
          file_name?: string | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          meeting_date?: string | null
          mime_type?: string | null
          notes?: string | null
          organization_id?: string | null
          parsed_summary?: Json | null
          reevaluation_date?: string | null
          review_date?: string | null
          review_status?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          school_year?: string | null
          size_bytes?: number | null
          source?: string | null
          status?: string
          storage_path: string
          student_id: string
          title: string
          updated_at?: string
          uploaded_by: string
          uploaded_by_role?: string | null
          used_in_report_at?: string | null
          visibility?: string
        }
        Update: {
          annual_review_date?: string | null
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          consent_acknowledged_at?: string | null
          consent_required?: boolean
          content_hash?: string | null
          created_at?: string
          delete_reason?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          doc_type?: string
          document_category?: string
          effective_date?: string | null
          file_name?: string | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          meeting_date?: string | null
          mime_type?: string | null
          notes?: string | null
          organization_id?: string | null
          parsed_summary?: Json | null
          reevaluation_date?: string | null
          review_date?: string | null
          review_status?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          school_year?: string | null
          size_bytes?: number | null
          source?: string | null
          status?: string
          storage_path?: string
          student_id?: string
          title?: string
          updated_at?: string
          uploaded_by?: string
          uploaded_by_role?: string | null
          used_in_report_at?: string | null
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      email_notifications: {
        Row: {
          body_preview: string | null
          created_at: string
          error_message: string | null
          id: string
          notification_type: string
          recipient_email: string
          recipient_user_id: string | null
          related_record_id: string | null
          related_record_type: string | null
          sent_at: string | null
          status: string
          subject: string
        }
        Insert: {
          body_preview?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          notification_type: string
          recipient_email: string
          recipient_user_id?: string | null
          related_record_id?: string | null
          related_record_type?: string | null
          sent_at?: string | null
          status?: string
          subject: string
        }
        Update: {
          body_preview?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          notification_type?: string
          recipient_email?: string
          recipient_user_id?: string | null
          related_record_id?: string | null
          related_record_type?: string | null
          sent_at?: string | null
          status?: string
          subject?: string
        }
        Relationships: []
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      evidence_edges: {
        Row: {
          created_at: string
          created_by: string | null
          from_id: string
          from_type: string
          id: string
          relation: string
          to_id: string
          to_type: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          from_id: string
          from_type: string
          id?: string
          relation: string
          to_id: string
          to_type: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          from_id?: string
          from_type?: string
          id?: string
          relation?: string
          to_id?: string
          to_type?: string
        }
        Relationships: []
      }
      evidence_items: {
        Row: {
          confidence: number | null
          contributor_id: string | null
          created_at: string
          extraction_id: string | null
          id: string
          kind: string
          occurred_at: string | null
          payload: Json
          permission_scope: string
          source_id: string | null
          source_kind: string
          student_id: string
          subject_id: string | null
          subject_type: string | null
          updated_at: string
          verification_state: string
        }
        Insert: {
          confidence?: number | null
          contributor_id?: string | null
          created_at?: string
          extraction_id?: string | null
          id?: string
          kind: string
          occurred_at?: string | null
          payload?: Json
          permission_scope?: string
          source_id?: string | null
          source_kind: string
          student_id: string
          subject_id?: string | null
          subject_type?: string | null
          updated_at?: string
          verification_state?: string
        }
        Update: {
          confidence?: number | null
          contributor_id?: string | null
          created_at?: string
          extraction_id?: string | null
          id?: string
          kind?: string
          occurred_at?: string | null
          payload?: Json
          permission_scope?: string
          source_id?: string | null
          source_kind?: string
          student_id?: string
          subject_id?: string | null
          subject_type?: string | null
          updated_at?: string
          verification_state?: string
        }
        Relationships: [
          {
            foreignKeyName: "evidence_items_extraction_id_fkey"
            columns: ["extraction_id"]
            isOneToOne: false
            referencedRelation: "document_extractions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidence_items_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      faqs: {
        Row: {
          answer: string
          category: string
          created_at: string
          id: string
          is_published: boolean
          position: number
          question: string
          updated_at: string
        }
        Insert: {
          answer: string
          category?: string
          created_at?: string
          id?: string
          is_published?: boolean
          position?: number
          question: string
          updated_at?: string
        }
        Update: {
          answer?: string
          category?: string
          created_at?: string
          id?: string
          is_published?: boolean
          position?: number
          question?: string
          updated_at?: string
        }
        Relationships: []
      }
      feed_events: {
        Row: {
          actor_id: string | null
          body: string | null
          created_at: string
          id: string
          kind: string
          payload: Json
          ref_id: string | null
          ref_table: string | null
          student_id: string
          title: string
        }
        Insert: {
          actor_id?: string | null
          body?: string | null
          created_at?: string
          id?: string
          kind: string
          payload?: Json
          ref_id?: string | null
          ref_table?: string | null
          student_id: string
          title: string
        }
        Update: {
          actor_id?: string | null
          body?: string | null
          created_at?: string
          id?: string
          kind?: string
          payload?: Json
          ref_id?: string | null
          ref_table?: string | null
          student_id?: string
          title?: string
        }
        Relationships: []
      }
      feedback_submissions: {
        Row: {
          admin_notes: string | null
          created_at: string
          description: string
          feedback_type: string
          id: string
          linked_issue_id: string | null
          priority_suggestion: string | null
          related_page: string | null
          screenshot_url: string | null
          status: string
          submitted_by_user_id: string | null
          title: string
          updated_at: string
          user_role: string | null
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          description: string
          feedback_type: string
          id?: string
          linked_issue_id?: string | null
          priority_suggestion?: string | null
          related_page?: string | null
          screenshot_url?: string | null
          status?: string
          submitted_by_user_id?: string | null
          title: string
          updated_at?: string
          user_role?: string | null
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          description?: string
          feedback_type?: string
          id?: string
          linked_issue_id?: string | null
          priority_suggestion?: string | null
          related_page?: string | null
          screenshot_url?: string | null
          status?: string
          submitted_by_user_id?: string | null
          title?: string
          updated_at?: string
          user_role?: string | null
        }
        Relationships: []
      }
      form_responses: {
        Row: {
          answers: Json
          completed_at: string | null
          created_at: string
          id: string
          respondent_id: string
          respondent_role: string
          status: string
          student_id: string
          template_slug: string
          updated_at: string
        }
        Insert: {
          answers?: Json
          completed_at?: string | null
          created_at?: string
          id?: string
          respondent_id: string
          respondent_role?: string
          status?: string
          student_id: string
          template_slug: string
          updated_at?: string
        }
        Update: {
          answers?: Json
          completed_at?: string | null
          created_at?: string
          id?: string
          respondent_id?: string
          respondent_role?: string
          status?: string
          student_id?: string
          template_slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "form_responses_template_slug_fkey"
            columns: ["template_slug"]
            isOneToOne: false
            referencedRelation: "form_templates"
            referencedColumns: ["slug"]
          },
        ]
      }
      form_templates: {
        Row: {
          audience: string
          category: string
          created_at: string
          description: string | null
          schema: Json
          slug: string
          title: string
          updated_at: string
        }
        Insert: {
          audience?: string
          category?: string
          created_at?: string
          description?: string | null
          schema: Json
          slug: string
          title: string
          updated_at?: string
        }
        Update: {
          audience?: string
          category?: string
          created_at?: string
          description?: string | null
          schema?: Json
          slug?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      goal_statuses: {
        Row: {
          created_at: string
          id: string
          item_id: string
          report_id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          item_id: string
          report_id: string
          status: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          item_id?: string
          report_id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "goal_statuses_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "pathway_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goal_statuses_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "report_provenance_coverage_v1"
            referencedColumns: ["report_id"]
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
          is_demo: boolean
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
          is_demo?: boolean
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
          is_demo?: boolean
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
      high_school_fit_reviews: {
        Row: {
          comparison_priorities: Json
          created_at: string
          created_by: string | null
          family_priorities: string | null
          id: string
          is_demo: boolean
          preferred_option_id: string | null
          questions_for_team: string | null
          student_id: string
          student_voice: string | null
          updated_at: string
        }
        Insert: {
          comparison_priorities?: Json
          created_at?: string
          created_by?: string | null
          family_priorities?: string | null
          id?: string
          is_demo?: boolean
          preferred_option_id?: string | null
          questions_for_team?: string | null
          student_id: string
          student_voice?: string | null
          updated_at?: string
        }
        Update: {
          comparison_priorities?: Json
          created_at?: string
          created_by?: string | null
          family_priorities?: string | null
          id?: string
          is_demo?: boolean
          preferred_option_id?: string | null
          questions_for_team?: string | null
          student_id?: string
          student_voice?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "high_school_fit_reviews_preferred_option_id_fkey"
            columns: ["preferred_option_id"]
            isOneToOne: false
            referencedRelation: "high_school_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "high_school_fit_reviews_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: true
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      high_school_options: {
        Row: {
          academic_fit_notes: string | null
          accessibility_notes: string | null
          career_technical_notes: string | null
          cons: string | null
          contact_info: string | null
          created_at: string
          created_by: string | null
          extracurricular_notes: string | null
          id: string
          is_demo: boolean
          notes: string | null
          option_type: string
          pros: string | null
          rank: number | null
          school_name: string
          school_size_environment: string | null
          student_id: string
          support_services_notes: string | null
          transportation_notes: string | null
          updated_at: string
        }
        Insert: {
          academic_fit_notes?: string | null
          accessibility_notes?: string | null
          career_technical_notes?: string | null
          cons?: string | null
          contact_info?: string | null
          created_at?: string
          created_by?: string | null
          extracurricular_notes?: string | null
          id?: string
          is_demo?: boolean
          notes?: string | null
          option_type: string
          pros?: string | null
          rank?: number | null
          school_name: string
          school_size_environment?: string | null
          student_id: string
          support_services_notes?: string | null
          transportation_notes?: string | null
          updated_at?: string
        }
        Update: {
          academic_fit_notes?: string | null
          accessibility_notes?: string | null
          career_technical_notes?: string | null
          cons?: string | null
          contact_info?: string | null
          created_at?: string
          created_by?: string | null
          extracurricular_notes?: string | null
          id?: string
          is_demo?: boolean
          notes?: string | null
          option_type?: string
          pros?: string | null
          rank?: number | null
          school_name?: string
          school_size_environment?: string | null
          student_id?: string
          support_services_notes?: string | null
          transportation_notes?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "high_school_options_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      high_school_program_tags: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          id: string
          label: string
          slug: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          label: string
          slug: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          label?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      iep_access_alerts: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          actor_email: string | null
          actor_id: string | null
          created_at: string
          document_id: string | null
          id: string
          metadata: Json | null
          reason: string
          student_id: string | null
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          actor_email?: string | null
          actor_id?: string | null
          created_at?: string
          document_id?: string | null
          id?: string
          metadata?: Json | null
          reason: string
          student_id?: string | null
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          actor_email?: string | null
          actor_id?: string | null
          created_at?: string
          document_id?: string | null
          id?: string
          metadata?: Json | null
          reason?: string
          student_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "iep_access_alerts_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      in_app_notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          kind: string
          link: string | null
          read_at: string | null
          student_id: string | null
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          kind: string
          link?: string | null
          read_at?: string | null
          student_id?: string | null
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          kind?: string
          link?: string | null
          read_at?: string | null
          student_id?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      invitations: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          capacity: number | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invitation_type: string
          invited_by_user_id: string
          invited_role: string
          message: string | null
          organization_id: string | null
          revoked_at: string | null
          single_use: boolean
          status: string
          student_profile_id: string | null
          token: string
          updated_at: string
          uses: number
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          capacity?: number | null
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invitation_type: string
          invited_by_user_id: string
          invited_role: string
          message?: string | null
          organization_id?: string | null
          revoked_at?: string | null
          single_use?: boolean
          status?: string
          student_profile_id?: string | null
          token?: string
          updated_at?: string
          uses?: number
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          capacity?: number | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invitation_type?: string
          invited_by_user_id?: string
          invited_role?: string
          message?: string | null
          organization_id?: string | null
          revoked_at?: string | null
          single_use?: boolean
          status?: string
          student_profile_id?: string | null
          token?: string
          updated_at?: string
          uses?: number
        }
        Relationships: [
          {
            foreignKeyName: "invitations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_student_profile_id_fkey"
            columns: ["student_profile_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      launch_checklist_items: {
        Row: {
          category: string
          created_at: string
          description: string | null
          id: string
          item_title: string
          notes: string | null
          owner: string | null
          priority: string | null
          sort_order: number
          status: string
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          description?: string | null
          id?: string
          item_title: string
          notes?: string | null
          owner?: string | null
          priority?: string | null
          sort_order?: number
          status?: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          item_title?: string
          notes?: string | null
          owner?: string | null
          priority?: string | null
          sort_order?: number
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      license_lifecycle_events: {
        Row: {
          actor_id: string | null
          event: string
          id: string
          license_id: string | null
          occurred_at: string
          org_id: string | null
          payload: Json
        }
        Insert: {
          actor_id?: string | null
          event: string
          id?: string
          license_id?: string | null
          occurred_at?: string
          org_id?: string | null
          payload?: Json
        }
        Update: {
          actor_id?: string | null
          event?: string
          id?: string
          license_id?: string | null
          occurred_at?: string
          org_id?: string | null
          payload?: Json
        }
        Relationships: [
          {
            foreignKeyName: "license_lifecycle_events_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      media_assets: {
        Row: {
          alt_text: string | null
          created_at: string
          file_size: number | null
          height: number | null
          id: string
          mime_type: string | null
          public_url: string
          storage_path: string
          tags: string[]
          title: string | null
          updated_at: string
          uploaded_by: string | null
          width: number | null
        }
        Insert: {
          alt_text?: string | null
          created_at?: string
          file_size?: number | null
          height?: number | null
          id?: string
          mime_type?: string | null
          public_url: string
          storage_path: string
          tags?: string[]
          title?: string | null
          updated_at?: string
          uploaded_by?: string | null
          width?: number | null
        }
        Update: {
          alt_text?: string | null
          created_at?: string
          file_size?: number | null
          height?: number | null
          id?: string
          mime_type?: string | null
          public_url?: string
          storage_path?: string
          tags?: string[]
          title?: string | null
          updated_at?: string
          uploaded_by?: string | null
          width?: number | null
        }
        Relationships: []
      }
      meeting_action_items: {
        Row: {
          assignee_id: string | null
          assignee_role: string | null
          created_at: string
          due_date: string | null
          id: string
          meeting_id: string
          promoted_action_item_id: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          assignee_id?: string | null
          assignee_role?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          meeting_id: string
          promoted_action_item_id?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          assignee_id?: string | null
          assignee_role?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          meeting_id?: string
          promoted_action_item_id?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_action_items_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_agenda_items: {
        Row: {
          completed: boolean
          created_at: string
          id: string
          linked_compliance_key: string | null
          linked_goal_id: string | null
          meeting_id: string
          notes: string | null
          position: number
          template_id: string | null
          title: string
        }
        Insert: {
          completed?: boolean
          created_at?: string
          id?: string
          linked_compliance_key?: string | null
          linked_goal_id?: string | null
          meeting_id: string
          notes?: string | null
          position?: number
          template_id?: string | null
          title: string
        }
        Update: {
          completed?: boolean
          created_at?: string
          id?: string
          linked_compliance_key?: string | null
          linked_goal_id?: string | null
          meeting_id?: string
          notes?: string | null
          position?: number
          template_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_agenda_items_linked_goal_id_fkey"
            columns: ["linked_goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_agenda_items_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_agenda_items_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "meeting_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_prep_items: {
        Row: {
          category: string
          completed: boolean
          content: string
          created_at: string
          id: string
          meeting_id: string
          student_id: string
          updated_at: string
        }
        Insert: {
          category: string
          completed?: boolean
          content: string
          created_at?: string
          id?: string
          meeting_id: string
          student_id: string
          updated_at?: string
        }
        Update: {
          category?: string
          completed?: boolean
          content?: string
          created_at?: string
          id?: string
          meeting_id?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_prep_items_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_prep_items_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_questions: {
        Row: {
          answer: string | null
          asker_id: string | null
          asker_role: string
          created_at: string
          id: string
          meeting_id: string
          question: string
        }
        Insert: {
          answer?: string | null
          asker_id?: string | null
          asker_role?: string
          created_at?: string
          id?: string
          meeting_id: string
          question: string
        }
        Update: {
          answer?: string | null
          asker_id?: string | null
          asker_role?: string
          created_at?: string
          id?: string
          meeting_id?: string
          question?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_questions_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_template_items: {
        Row: {
          compliance_key: string | null
          created_at: string
          id: string
          links_to: string
          notes: string | null
          position: number
          template_id: string
          title: string
        }
        Insert: {
          compliance_key?: string | null
          created_at?: string
          id?: string
          links_to?: string
          notes?: string | null
          position?: number
          template_id: string
          title: string
        }
        Update: {
          compliance_key?: string | null
          created_at?: string
          id?: string
          links_to?: string
          notes?: string | null
          position?: number
          template_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_template_items_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "meeting_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_templates: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          id: string
          is_shared: boolean
          kind: string
          name: string
          recommended_band: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          is_shared?: boolean
          kind?: string
          name: string
          recommended_band?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          is_shared?: boolean
          kind?: string
          name?: string
          recommended_band?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      meetings: {
        Row: {
          created_at: string
          created_by: string
          decisions: string | null
          documents_to_update: string | null
          family_concerns: string | null
          id: string
          kind: string
          location: string | null
          next_meeting_date: string | null
          scheduled_at: string | null
          status: string
          student_id: string
          student_voice: string | null
          summary: string | null
          teacher_notes: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          decisions?: string | null
          documents_to_update?: string | null
          family_concerns?: string | null
          id?: string
          kind?: string
          location?: string | null
          next_meeting_date?: string | null
          scheduled_at?: string | null
          status?: string
          student_id: string
          student_voice?: string | null
          summary?: string | null
          teacher_notes?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          decisions?: string | null
          documents_to_update?: string | null
          family_concerns?: string | null
          id?: string
          kind?: string
          location?: string | null
          next_meeting_date?: string | null
          scheduled_at?: string | null
          status?: string
          student_id?: string
          student_voice?: string | null
          summary?: string | null
          teacher_notes?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      message_threads: {
        Row: {
          category: string
          created_at: string
          created_by: string
          id: string
          last_message_at: string
          status: string
          student_id: string
          subject: string
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          created_by: string
          id?: string
          last_message_at?: string
          status?: string
          student_id: string
          subject: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string
          id?: string
          last_message_at?: string
          status?: string
          student_id?: string
          subject?: string
          updated_at?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          attachments: Json
          author_id: string
          body: string
          created_at: string
          id: string
          thread_id: string
          updated_at: string
        }
        Insert: {
          attachments?: Json
          author_id: string
          body: string
          created_at?: string
          id?: string
          thread_id: string
          updated_at?: string
        }
        Update: {
          attachments?: Json
          author_id?: string
          body?: string
          created_at?: string
          id?: string
          thread_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "message_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      next_actions: {
        Row: {
          audience: string | null
          blocked_reason: string | null
          completed_at: string | null
          completed_by: string | null
          completion_note: string | null
          created_at: string
          cta_label: string | null
          cta_route: string | null
          dedupe_key: string | null
          due_at: string | null
          id: string
          kind: string
          metadata: Json
          organization_id: string | null
          owner_role: string
          owner_user_id: string
          priority: number
          reason: string | null
          related_document_id: string | null
          related_meeting_id: string | null
          related_opportunity_id: string | null
          related_report_id: string | null
          secondary_label: string | null
          secondary_route: string | null
          status: string
          student_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          audience?: string | null
          blocked_reason?: string | null
          completed_at?: string | null
          completed_by?: string | null
          completion_note?: string | null
          created_at?: string
          cta_label?: string | null
          cta_route?: string | null
          dedupe_key?: string | null
          due_at?: string | null
          id?: string
          kind: string
          metadata?: Json
          organization_id?: string | null
          owner_role: string
          owner_user_id: string
          priority?: number
          reason?: string | null
          related_document_id?: string | null
          related_meeting_id?: string | null
          related_opportunity_id?: string | null
          related_report_id?: string | null
          secondary_label?: string | null
          secondary_route?: string | null
          status?: string
          student_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          audience?: string | null
          blocked_reason?: string | null
          completed_at?: string | null
          completed_by?: string | null
          completion_note?: string | null
          created_at?: string
          cta_label?: string | null
          cta_route?: string | null
          dedupe_key?: string | null
          due_at?: string | null
          id?: string
          kind?: string
          metadata?: Json
          organization_id?: string | null
          owner_role?: string
          owner_user_id?: string
          priority?: number
          reason?: string | null
          related_document_id?: string | null
          related_meeting_id?: string | null
          related_opportunity_id?: string | null
          related_report_id?: string | null
          secondary_label?: string | null
          secondary_route?: string | null
          status?: string
          student_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "next_actions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "next_actions_student_id_fkey"
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
          in_app_enabled: boolean
          notification_cadence: string
          sms_enabled: boolean
          sms_phone_e164: string | null
          sms_verified_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          email_collab_invites?: boolean
          email_goal_reminders?: boolean
          email_report_ready?: boolean
          email_weekly_digest?: boolean
          in_app_enabled?: boolean
          notification_cadence?: string
          sms_enabled?: boolean
          sms_phone_e164?: string | null
          sms_verified_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          email_collab_invites?: boolean
          email_goal_reminders?: boolean
          email_report_ready?: boolean
          email_weekly_digest?: boolean
          in_app_enabled?: boolean
          notification_cadence?: string
          sms_enabled?: boolean
          sms_phone_e164?: string | null
          sms_verified_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          message: string | null
          notification_type: string
          read_status: boolean
          related_record_id: string | null
          related_record_type: string | null
          related_student_id: string | null
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message?: string | null
          notification_type?: string
          read_status?: boolean
          related_record_id?: string | null
          related_record_type?: string | null
          related_student_id?: string | null
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string | null
          notification_type?: string
          read_status?: boolean
          related_record_id?: string | null
          related_record_type?: string | null
          related_student_id?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_related_student_id_fkey"
            columns: ["related_student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      org_access_audit: {
        Row: {
          action: string
          actor_id: string
          context: Json
          created_at: string
          decision: string
          id: string
          organization_id: string | null
          reason: string | null
          resource_id: string | null
          resource_type: string
        }
        Insert: {
          action: string
          actor_id: string
          context?: Json
          created_at?: string
          decision: string
          id?: string
          organization_id?: string | null
          reason?: string | null
          resource_id?: string | null
          resource_type: string
        }
        Update: {
          action?: string
          actor_id?: string
          context?: Json
          created_at?: string
          decision?: string
          id?: string
          organization_id?: string | null
          reason?: string | null
          resource_id?: string | null
          resource_type?: string
        }
        Relationships: []
      }
      org_license_requests: {
        Row: {
          approved_org_id: string | null
          contact_email: string
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          id: string
          notes: string | null
          org_name: string
          org_type: string
          requester_user_id: string
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          seat_count: number | null
          status: string
          updated_at: string
        }
        Insert: {
          approved_org_id?: string | null
          contact_email: string
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          org_name: string
          org_type: string
          requester_user_id: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          seat_count?: number | null
          status?: string
          updated_at?: string
        }
        Update: {
          approved_org_id?: string | null
          contact_email?: string
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          org_name?: string
          org_type?: string
          requester_user_id?: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          seat_count?: number | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_license_requests_approved_org_id_fkey"
            columns: ["approved_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_memberships: {
        Row: {
          created_at: string
          id: string
          invited_by: string | null
          membership_status: string
          organization_id: string
          role_within_org: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          invited_by?: string | null
          membership_status?: string
          organization_id: string
          role_within_org?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          invited_by?: string | null
          membership_status?: string
          organization_id?: string
          role_within_org?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_memberships_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          address: string | null
          billing_owner_user_id: string | null
          billing_plan: string | null
          city: string | null
          contact_email: string | null
          created_at: string
          id: string
          name: string
          parent_organization_id: string | null
          state: string | null
          status: string
          type: string
          updated_at: string
          verified_status: string
          website: string | null
        }
        Insert: {
          address?: string | null
          billing_owner_user_id?: string | null
          billing_plan?: string | null
          city?: string | null
          contact_email?: string | null
          created_at?: string
          id?: string
          name: string
          parent_organization_id?: string | null
          state?: string | null
          status?: string
          type?: string
          updated_at?: string
          verified_status?: string
          website?: string | null
        }
        Update: {
          address?: string | null
          billing_owner_user_id?: string | null
          billing_plan?: string | null
          city?: string | null
          contact_email?: string | null
          created_at?: string
          id?: string
          name?: string
          parent_organization_id?: string | null
          state?: string | null
          status?: string
          type?: string
          updated_at?: string
          verified_status?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organizations_parent_organization_id_fkey"
            columns: ["parent_organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      page_sections: {
        Row: {
          content: Json
          created_at: string
          id: string
          is_published: boolean
          page_key: string
          section_key: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          content?: Json
          created_at?: string
          id?: string
          is_published?: boolean
          page_key: string
          section_key: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          content?: Json
          created_at?: string
          id?: string
          is_published?: boolean
          page_key?: string
          section_key?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      partner_badges: {
        Row: {
          awarded_at: string
          awarded_by: string | null
          badge_kind: string
          created_at: string
          id: string
          is_active: boolean
          notes: string | null
          organization_id: string
          updated_at: string
        }
        Insert: {
          awarded_at?: string
          awarded_by?: string | null
          badge_kind: string
          created_at?: string
          id?: string
          is_active?: boolean
          notes?: string | null
          organization_id: string
          updated_at?: string
        }
        Update: {
          awarded_at?: string
          awarded_by?: string | null
          badge_kind?: string
          created_at?: string
          id?: string
          is_active?: boolean
          notes?: string | null
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_badges_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_impact_events: {
        Row: {
          created_at: string
          created_by: string | null
          event_kind: string
          id: string
          metadata: Json
          notes: string | null
          occurred_at: string
          organization_id: string
          participant_count: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          event_kind: string
          id?: string
          metadata?: Json
          notes?: string | null
          occurred_at?: string
          organization_id: string
          participant_count?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          event_kind?: string
          id?: string
          metadata?: Json
          notes?: string | null
          occurred_at?: string
          organization_id?: string
          participant_count?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_impact_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_incentive_resources: {
        Row: {
          agency: string | null
          category: string
          cautious_disclaimer: string
          created_at: string
          external_url: string | null
          id: string
          is_published: boolean
          long_description: string | null
          short_description: string
          slug: string
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          agency?: string | null
          category: string
          cautious_disclaimer?: string
          created_at?: string
          external_url?: string | null
          id?: string
          is_published?: boolean
          long_description?: string | null
          short_description: string
          slug: string
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          agency?: string | null
          category?: string
          cautious_disclaimer?: string
          created_at?: string
          external_url?: string | null
          id?: string
          is_published?: boolean
          long_description?: string | null
          short_description?: string
          slug?: string
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      partner_network_opportunities: {
        Row: {
          age_range: string | null
          application_url: string | null
          contact_email: string | null
          cost_or_funding_notes: string | null
          county: string | null
          created_at: string
          description: string | null
          eligibility: string | null
          id: string
          is_public: boolean
          location: string | null
          next_step: string | null
          opportunity_title: string
          opportunity_type: Database["public"]["Enums"]["partner_opportunity_type"]
          partner_id: string
          pathway_category: string | null
          schedule: string | null
          status: string
          support_level: string | null
          updated_at: string
        }
        Insert: {
          age_range?: string | null
          application_url?: string | null
          contact_email?: string | null
          cost_or_funding_notes?: string | null
          county?: string | null
          created_at?: string
          description?: string | null
          eligibility?: string | null
          id?: string
          is_public?: boolean
          location?: string | null
          next_step?: string | null
          opportunity_title: string
          opportunity_type?: Database["public"]["Enums"]["partner_opportunity_type"]
          partner_id: string
          pathway_category?: string | null
          schedule?: string | null
          status?: string
          support_level?: string | null
          updated_at?: string
        }
        Update: {
          age_range?: string | null
          application_url?: string | null
          contact_email?: string | null
          cost_or_funding_notes?: string | null
          county?: string | null
          created_at?: string
          description?: string | null
          eligibility?: string | null
          id?: string
          is_public?: boolean
          location?: string | null
          next_step?: string | null
          opportunity_title?: string
          opportunity_type?: Database["public"]["Enums"]["partner_opportunity_type"]
          partner_id?: string
          pathway_category?: string | null
          schedule?: string | null
          status?: string
          support_level?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_network_opportunities_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partner_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_opportunities: {
        Row: {
          age_range: string | null
          application_url: string | null
          capacity: number | null
          contact_email: string | null
          created_at: string
          description: string | null
          eligibility: string | null
          id: string
          location: string | null
          opportunity_type: string
          organization_id: string
          related_career_clusters: Json
          required_documents: Json
          status: string
          support_needs_accepted: Json
          support_needs_fit: Json
          title: string
          updated_at: string
        }
        Insert: {
          age_range?: string | null
          application_url?: string | null
          capacity?: number | null
          contact_email?: string | null
          created_at?: string
          description?: string | null
          eligibility?: string | null
          id?: string
          location?: string | null
          opportunity_type: string
          organization_id: string
          related_career_clusters?: Json
          required_documents?: Json
          status?: string
          support_needs_accepted?: Json
          support_needs_fit?: Json
          title: string
          updated_at?: string
        }
        Update: {
          age_range?: string | null
          application_url?: string | null
          capacity?: number | null
          contact_email?: string | null
          created_at?: string
          description?: string | null
          eligibility?: string | null
          id?: string
          location?: string | null
          opportunity_type?: string
          organization_id?: string
          related_career_clusters?: Json
          required_documents?: Json
          status?: string
          support_needs_accepted?: Json
          support_needs_fit?: Json
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_opportunities_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_organizations: {
        Row: {
          address: string | null
          admin_notes: string | null
          age_range: string | null
          audience_served: string[]
          city: string | null
          collection_tags: string[]
          contact_email: string | null
          county: string | null
          created_at: string
          created_by: string | null
          description: string | null
          disability_focus: string[]
          eligibility_notes: string | null
          id: string
          is_featured: boolean
          is_public: boolean
          last_reviewed_at: string | null
          next_follow_up_date: string | null
          next_review_due_at: string | null
          opportunity_types: string[]
          organization_name: string
          outreach_notes: string | null
          outreach_status: Database["public"]["Enums"]["partner_outreach_status"]
          partner_type: Database["public"]["Enums"]["partner_type"]
          partnership_status: string
          pathway_categories: string[]
          phone: string | null
          referral_process: string | null
          service_area: string | null
          services_offered: string[]
          source_url: string | null
          state: string
          tags: string[]
          transportation_notes: string | null
          updated_at: string
          verification_status: Database["public"]["Enums"]["partner_verification_status"]
          virtual_or_in_person: string | null
          website_url: string | null
        }
        Insert: {
          address?: string | null
          admin_notes?: string | null
          age_range?: string | null
          audience_served?: string[]
          city?: string | null
          collection_tags?: string[]
          contact_email?: string | null
          county?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          disability_focus?: string[]
          eligibility_notes?: string | null
          id?: string
          is_featured?: boolean
          is_public?: boolean
          last_reviewed_at?: string | null
          next_follow_up_date?: string | null
          next_review_due_at?: string | null
          opportunity_types?: string[]
          organization_name: string
          outreach_notes?: string | null
          outreach_status?: Database["public"]["Enums"]["partner_outreach_status"]
          partner_type?: Database["public"]["Enums"]["partner_type"]
          partnership_status?: string
          pathway_categories?: string[]
          phone?: string | null
          referral_process?: string | null
          service_area?: string | null
          services_offered?: string[]
          source_url?: string | null
          state?: string
          tags?: string[]
          transportation_notes?: string | null
          updated_at?: string
          verification_status?: Database["public"]["Enums"]["partner_verification_status"]
          virtual_or_in_person?: string | null
          website_url?: string | null
        }
        Update: {
          address?: string | null
          admin_notes?: string | null
          age_range?: string | null
          audience_served?: string[]
          city?: string | null
          collection_tags?: string[]
          contact_email?: string | null
          county?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          disability_focus?: string[]
          eligibility_notes?: string | null
          id?: string
          is_featured?: boolean
          is_public?: boolean
          last_reviewed_at?: string | null
          next_follow_up_date?: string | null
          next_review_due_at?: string | null
          opportunity_types?: string[]
          organization_name?: string
          outreach_notes?: string | null
          outreach_status?: Database["public"]["Enums"]["partner_outreach_status"]
          partner_type?: Database["public"]["Enums"]["partner_type"]
          partnership_status?: string
          pathway_categories?: string[]
          phone?: string | null
          referral_process?: string | null
          service_area?: string | null
          services_offered?: string[]
          source_url?: string | null
          state?: string
          tags?: string[]
          transportation_notes?: string | null
          updated_at?: string
          verification_status?: Database["public"]["Enums"]["partner_verification_status"]
          virtual_or_in_person?: string | null
          website_url?: string | null
        }
        Relationships: []
      }
      partner_outreach_log: {
        Row: {
          channel: string
          contact_person: string | null
          contacted_at: string
          created_at: string
          id: string
          logged_by: string | null
          next_follow_up_date: string | null
          outcome: string | null
          partner_id: string
          summary: string
          updated_at: string
        }
        Insert: {
          channel?: string
          contact_person?: string | null
          contacted_at?: string
          created_at?: string
          id?: string
          logged_by?: string | null
          next_follow_up_date?: string | null
          outcome?: string | null
          partner_id: string
          summary: string
          updated_at?: string
        }
        Update: {
          channel?: string
          contact_person?: string | null
          contacted_at?: string
          created_at?: string
          id?: string
          logged_by?: string | null
          next_follow_up_date?: string | null
          outcome?: string | null
          partner_id?: string
          summary?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_outreach_log_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partner_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_submissions: {
        Row: {
          admin_notes: string | null
          age_range: string | null
          audience_served: string | null
          consent_to_contact: boolean
          contact_email: string
          contact_name: string
          contact_phone: string | null
          created_at: string
          id: string
          message: string | null
          organization_name: string
          organization_type: string | null
          pathway_fit: string | null
          promoted_partner_id: string | null
          region: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          services_offered: string | null
          source: string | null
          status: string
          updated_at: string
          website_url: string | null
        }
        Insert: {
          admin_notes?: string | null
          age_range?: string | null
          audience_served?: string | null
          consent_to_contact?: boolean
          contact_email: string
          contact_name: string
          contact_phone?: string | null
          created_at?: string
          id?: string
          message?: string | null
          organization_name: string
          organization_type?: string | null
          pathway_fit?: string | null
          promoted_partner_id?: string | null
          region?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          services_offered?: string | null
          source?: string | null
          status?: string
          updated_at?: string
          website_url?: string | null
        }
        Update: {
          admin_notes?: string | null
          age_range?: string | null
          audience_served?: string | null
          consent_to_contact?: boolean
          contact_email?: string
          contact_name?: string
          contact_phone?: string | null
          created_at?: string
          id?: string
          message?: string | null
          organization_name?: string
          organization_type?: string | null
          pathway_fit?: string | null
          promoted_partner_id?: string | null
          region?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          services_offered?: string | null
          source?: string | null
          status?: string
          updated_at?: string
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "partner_submissions_promoted_partner_id_fkey"
            columns: ["promoted_partner_id"]
            isOneToOne: false
            referencedRelation: "partner_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      partnerforward_admin_reviews: {
        Row: {
          action: string
          created_at: string
          id: string
          notes: string | null
          resource_id: string
          reviewer_id: string
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          notes?: string | null
          resource_id: string
          reviewer_id: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          notes?: string | null
          resource_id?: string
          reviewer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "partnerforward_admin_reviews_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "partnerforward_resources"
            referencedColumns: ["id"]
          },
        ]
      }
      partnerforward_incentive_categories: {
        Row: {
          created_at: string
          description: string | null
          disclaimer_required: boolean
          id: string
          label: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          disclaimer_required?: boolean
          id?: string
          label: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          disclaimer_required?: boolean
          id?: string
          label?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      partnerforward_partner_saved_resources: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          partner_user_id: string
          resource_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          partner_user_id: string
          resource_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          partner_user_id?: string
          resource_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "partnerforward_partner_saved_resources_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "partnerforward_resources"
            referencedColumns: ["id"]
          },
        ]
      }
      partnerforward_resource_sources: {
        Row: {
          created_at: string
          id: string
          last_checked_at: string | null
          name: string
          notes: string | null
          source_type: Database["public"]["Enums"]["pf_source_type"]
          updated_at: string
          url: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          last_checked_at?: string | null
          name: string
          notes?: string | null
          source_type?: Database["public"]["Enums"]["pf_source_type"]
          updated_at?: string
          url?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          last_checked_at?: string | null
          name?: string
          notes?: string | null
          source_type?: Database["public"]["Enums"]["pf_source_type"]
          updated_at?: string
          url?: string | null
        }
        Relationships: []
      }
      partnerforward_resources: {
        Row: {
          action_steps: string | null
          category: Database["public"]["Enums"]["pf_category"]
          cautious_disclaimer: string | null
          created_at: string
          created_by: string | null
          eligibility_notes: string | null
          id: string
          last_verified_at: string | null
          legal_financial_disclaimer_required: boolean
          official_url: string | null
          partner_value: string | null
          source_id: string | null
          source_name: string | null
          source_type: Database["public"]["Enums"]["pf_source_type"] | null
          status: Database["public"]["Enums"]["pf_status"]
          summary: string | null
          title: string
          updated_at: string
        }
        Insert: {
          action_steps?: string | null
          category?: Database["public"]["Enums"]["pf_category"]
          cautious_disclaimer?: string | null
          created_at?: string
          created_by?: string | null
          eligibility_notes?: string | null
          id?: string
          last_verified_at?: string | null
          legal_financial_disclaimer_required?: boolean
          official_url?: string | null
          partner_value?: string | null
          source_id?: string | null
          source_name?: string | null
          source_type?: Database["public"]["Enums"]["pf_source_type"] | null
          status?: Database["public"]["Enums"]["pf_status"]
          summary?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          action_steps?: string | null
          category?: Database["public"]["Enums"]["pf_category"]
          cautious_disclaimer?: string | null
          created_at?: string
          created_by?: string | null
          eligibility_notes?: string | null
          id?: string
          last_verified_at?: string | null
          legal_financial_disclaimer_required?: boolean
          official_url?: string | null
          partner_value?: string | null
          source_id?: string | null
          source_name?: string | null
          source_type?: Database["public"]["Enums"]["pf_source_type"] | null
          status?: Database["public"]["Enums"]["pf_status"]
          summary?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "partnerforward_resources_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "partnerforward_resource_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      pathway_knowledge_sources: {
        Row: {
          checksum: string | null
          created_at: string
          created_by: string | null
          fetched_at: string | null
          id: string
          jurisdiction: string | null
          kind: string
          metadata: Json
          publisher: string | null
          retired_at: string | null
          slug: string
          source_url: string | null
          title: string
          updated_at: string
          version: string | null
        }
        Insert: {
          checksum?: string | null
          created_at?: string
          created_by?: string | null
          fetched_at?: string | null
          id?: string
          jurisdiction?: string | null
          kind?: string
          metadata?: Json
          publisher?: string | null
          retired_at?: string | null
          slug: string
          source_url?: string | null
          title: string
          updated_at?: string
          version?: string | null
        }
        Update: {
          checksum?: string | null
          created_at?: string
          created_by?: string | null
          fetched_at?: string | null
          id?: string
          jurisdiction?: string | null
          kind?: string
          metadata?: Json
          publisher?: string | null
          retired_at?: string | null
          slug?: string
          source_url?: string | null
          title?: string
          updated_at?: string
          version?: string | null
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
      pathway_recommendations: {
        Row: {
          action_steps_1_year: Json
          action_steps_30_days: Json
          action_steps_6_months: Json
          action_steps_90_days: Json
          career_clusters: Json
          community_based_experiences: Json
          created_at: string
          credentials_or_training: Json
          description: string | null
          id: string
          pathway_report_id: string
          pathway_type: string
          possible_barriers: Json
          related_strengths: Json
          school_based_experiences: Json
          student_id: string
          suggested_courses: Json
          suggested_programs: Json
          supports_needed: Json
          title: string
          why_it_fits: string | null
        }
        Insert: {
          action_steps_1_year?: Json
          action_steps_30_days?: Json
          action_steps_6_months?: Json
          action_steps_90_days?: Json
          career_clusters?: Json
          community_based_experiences?: Json
          created_at?: string
          credentials_or_training?: Json
          description?: string | null
          id?: string
          pathway_report_id: string
          pathway_type: string
          possible_barriers?: Json
          related_strengths?: Json
          school_based_experiences?: Json
          student_id: string
          suggested_courses?: Json
          suggested_programs?: Json
          supports_needed?: Json
          title: string
          why_it_fits?: string | null
        }
        Update: {
          action_steps_1_year?: Json
          action_steps_30_days?: Json
          action_steps_6_months?: Json
          action_steps_90_days?: Json
          career_clusters?: Json
          community_based_experiences?: Json
          created_at?: string
          credentials_or_training?: Json
          description?: string | null
          id?: string
          pathway_report_id?: string
          pathway_type?: string
          possible_barriers?: Json
          related_strengths?: Json
          school_based_experiences?: Json
          student_id?: string
          suggested_courses?: Json
          suggested_programs?: Json
          supports_needed?: Json
          title?: string
          why_it_fits?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pathway_recommendations_pathway_report_id_fkey"
            columns: ["pathway_report_id"]
            isOneToOne: false
            referencedRelation: "pathway_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pathway_recommendations_pathway_report_id_fkey"
            columns: ["pathway_report_id"]
            isOneToOne: false
            referencedRelation: "report_provenance_coverage_v1"
            referencedColumns: ["report_id"]
          },
          {
            foreignKeyName: "pathway_recommendations_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      pathway_report_versions: {
        Row: {
          change_summary: string | null
          content: Json
          created_at: string
          created_by: string | null
          id: string
          report_id: string
          version_number: number
        }
        Insert: {
          change_summary?: string | null
          content: Json
          created_at?: string
          created_by?: string | null
          id?: string
          report_id: string
          version_number: number
        }
        Update: {
          change_summary?: string | null
          content?: Json
          created_at?: string
          created_by?: string | null
          id?: string
          report_id?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "pathway_report_versions_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "pathway_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pathway_report_versions_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "report_provenance_coverage_v1"
            referencedColumns: ["report_id"]
          },
        ]
      }
      pathway_reports: {
        Row: {
          ai_confidence_level: string | null
          career_matches: Json | null
          content: Json
          created_at: string
          engine_channel: string | null
          executive_summary: string | null
          family_action_plan: Json | null
          human_review_status: string
          id: string
          iep_transition_translator: Json | null
          inputs_stale_at: string | null
          intake_id: string
          is_demo: boolean
          knowledge_snapshot: Json | null
          meeting_prep_summary: Json | null
          missing_information: Json | null
          model: string
          model_version: string | null
          opportunity_matches: Json | null
          postsecondary_goal_summary: string | null
          prompt_version: string | null
          readiness_scorecard_summary: Json | null
          recommended_pathways: Json | null
          report_status: string
          resource_recommendations: Json | null
          review_date: string | null
          rules_version: string | null
          strengths_needs_analysis: Json | null
          student_id: string | null
          student_snapshot: Json | null
          teacher_action_plan: Json | null
          user_id: string
          version_number: number
        }
        Insert: {
          ai_confidence_level?: string | null
          career_matches?: Json | null
          content: Json
          created_at?: string
          engine_channel?: string | null
          executive_summary?: string | null
          family_action_plan?: Json | null
          human_review_status?: string
          id?: string
          iep_transition_translator?: Json | null
          inputs_stale_at?: string | null
          intake_id: string
          is_demo?: boolean
          knowledge_snapshot?: Json | null
          meeting_prep_summary?: Json | null
          missing_information?: Json | null
          model: string
          model_version?: string | null
          opportunity_matches?: Json | null
          postsecondary_goal_summary?: string | null
          prompt_version?: string | null
          readiness_scorecard_summary?: Json | null
          recommended_pathways?: Json | null
          report_status?: string
          resource_recommendations?: Json | null
          review_date?: string | null
          rules_version?: string | null
          strengths_needs_analysis?: Json | null
          student_id?: string | null
          student_snapshot?: Json | null
          teacher_action_plan?: Json | null
          user_id: string
          version_number?: number
        }
        Update: {
          ai_confidence_level?: string | null
          career_matches?: Json | null
          content?: Json
          created_at?: string
          engine_channel?: string | null
          executive_summary?: string | null
          family_action_plan?: Json | null
          human_review_status?: string
          id?: string
          iep_transition_translator?: Json | null
          inputs_stale_at?: string | null
          intake_id?: string
          is_demo?: boolean
          knowledge_snapshot?: Json | null
          meeting_prep_summary?: Json | null
          missing_information?: Json | null
          model?: string
          model_version?: string | null
          opportunity_matches?: Json | null
          postsecondary_goal_summary?: string | null
          prompt_version?: string | null
          readiness_scorecard_summary?: Json | null
          recommended_pathways?: Json | null
          report_status?: string
          resource_recommendations?: Json | null
          review_date?: string | null
          rules_version?: string | null
          strengths_needs_analysis?: Json | null
          student_id?: string | null
          student_snapshot?: Json | null
          teacher_action_plan?: Json | null
          user_id?: string
          version_number?: number
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
      pathway_rules_versions: {
        Row: {
          checksum: string | null
          created_at: string
          created_by: string | null
          description: string | null
          effective_at: string
          engine_channel: string
          id: string
          retired_at: string | null
          ruleset: Json
          updated_at: string
          version: string
        }
        Insert: {
          checksum?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          effective_at?: string
          engine_channel?: string
          id?: string
          retired_at?: string | null
          ruleset?: Json
          updated_at?: string
          version: string
        }
        Update: {
          checksum?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          effective_at?: string
          engine_channel?: string
          id?: string
          retired_at?: string | null
          ruleset?: Json
          updated_at?: string
          version?: string
        }
        Relationships: []
      }
      pathway_shadow_run_log: {
        Row: {
          actor_id: string | null
          added_count: number
          changed_count: number
          channel: string
          created_at: string
          diff: Json
          id: string
          identical: boolean
          knowledge_added: string[]
          knowledge_removed: string[]
          model_version: string
          prompt_version: string
          provenance_changed: string[]
          removed_count: number
          report_id: string
          rules_version: string
          run_at: string
          unchanged_count: number
        }
        Insert: {
          actor_id?: string | null
          added_count?: number
          changed_count?: number
          channel: string
          created_at?: string
          diff: Json
          id?: string
          identical: boolean
          knowledge_added?: string[]
          knowledge_removed?: string[]
          model_version: string
          prompt_version: string
          provenance_changed?: string[]
          removed_count?: number
          report_id: string
          rules_version: string
          run_at?: string
          unchanged_count?: number
        }
        Update: {
          actor_id?: string | null
          added_count?: number
          changed_count?: number
          channel?: string
          created_at?: string
          diff?: Json
          id?: string
          identical?: boolean
          knowledge_added?: string[]
          knowledge_removed?: string[]
          model_version?: string
          prompt_version?: string
          provenance_changed?: string[]
          removed_count?: number
          report_id?: string
          rules_version?: string
          run_at?: string
          unchanged_count?: number
        }
        Relationships: []
      }
      pilot_outreach_contacts: {
        Row: {
          contact_name: string
          created_at: string
          email: string | null
          id: string
          last_contacted_at: string | null
          next_follow_up_at: string | null
          notes: string | null
          organization: string | null
          outreach_status: string
          phone: string | null
          relationship_notes: string | null
          role_type: string | null
          updated_at: string
        }
        Insert: {
          contact_name: string
          created_at?: string
          email?: string | null
          id?: string
          last_contacted_at?: string | null
          next_follow_up_at?: string | null
          notes?: string | null
          organization?: string | null
          outreach_status?: string
          phone?: string | null
          relationship_notes?: string | null
          role_type?: string | null
          updated_at?: string
        }
        Update: {
          contact_name?: string
          created_at?: string
          email?: string | null
          id?: string
          last_contacted_at?: string | null
          next_follow_up_at?: string | null
          notes?: string | null
          organization?: string | null
          outreach_status?: string
          phone?: string | null
          relationship_notes?: string | null
          role_type?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      pilot_packages: {
        Row: {
          audience: string | null
          created_at: string
          description: string | null
          id: string
          included_features: string | null
          notes: string | null
          package_name: string
          public_visible: boolean
          sort_order: number
          suggested_price_or_status: string | null
          updated_at: string
        }
        Insert: {
          audience?: string | null
          created_at?: string
          description?: string | null
          id?: string
          included_features?: string | null
          notes?: string | null
          package_name: string
          public_visible?: boolean
          sort_order?: number
          suggested_price_or_status?: string | null
          updated_at?: string
        }
        Update: {
          audience?: string | null
          created_at?: string
          description?: string | null
          id?: string
          included_features?: string | null
          notes?: string | null
          package_name?: string
          public_visible?: boolean
          sort_order?: number
          suggested_price_or_status?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      ppt_meeting_preps: {
        Row: {
          agenda: Json
          created_at: string
          desired_outcomes: string
          id: string
          meeting_date: string | null
          report_id: string | null
          student_id: string | null
          student_name: string
          title: string | null
          top_concerns: string
          updated_at: string
          user_id: string
        }
        Insert: {
          agenda: Json
          created_at?: string
          desired_outcomes?: string
          id?: string
          meeting_date?: string | null
          report_id?: string | null
          student_id?: string | null
          student_name?: string
          title?: string | null
          top_concerns?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          agenda?: Json
          created_at?: string
          desired_outcomes?: string
          id?: string
          meeting_date?: string | null
          report_id?: string | null
          student_id?: string | null
          student_name?: string
          title?: string | null
          top_concerns?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ppt_meeting_preps_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "pathway_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ppt_meeting_preps_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "report_provenance_coverage_v1"
            referencedColumns: ["report_id"]
          },
        ]
      }
      product_issues: {
        Row: {
          admin_notes: string | null
          affected_feature: string | null
          affected_role: string | null
          assigned_to: string | null
          created_at: string
          description: string | null
          id: string
          priority: string
          related_feedback_id: string | null
          reported_by_user_id: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          affected_feature?: string | null
          affected_role?: string | null
          assigned_to?: string | null
          created_at?: string
          description?: string | null
          id?: string
          priority?: string
          related_feedback_id?: string | null
          reported_by_user_id?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          affected_feature?: string | null
          affected_role?: string | null
          assigned_to?: string | null
          created_at?: string
          description?: string | null
          id?: string
          priority?: string
          related_feedback_id?: string | null
          reported_by_user_id?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_issues_related_feedback_id_fkey"
            columns: ["related_feedback_id"]
            isOneToOne: false
            referencedRelation: "feedback_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          account_status: string
          avatar_url: string | null
          created_at: string
          email: string | null
          first_name: string | null
          full_name: string | null
          id: string
          is_demo: boolean
          language: string
          last_name: string | null
          onboarding_answers: Json
          onboarding_completed: boolean
          organization_id: string | null
          phone: string | null
          primary_role: string | null
          professional_focus: string | null
          selected_plan: string | null
          updated_at: string
        }
        Insert: {
          account_status?: string
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          first_name?: string | null
          full_name?: string | null
          id: string
          is_demo?: boolean
          language?: string
          last_name?: string | null
          onboarding_answers?: Json
          onboarding_completed?: boolean
          organization_id?: string | null
          phone?: string | null
          primary_role?: string | null
          professional_focus?: string | null
          selected_plan?: string | null
          updated_at?: string
        }
        Update: {
          account_status?: string
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          first_name?: string | null
          full_name?: string | null
          id?: string
          is_demo?: boolean
          language?: string
          last_name?: string | null
          onboarding_answers?: Json
          onboarding_completed?: boolean
          organization_id?: string | null
          phone?: string | null
          primary_role?: string | null
          professional_focus?: string | null
          selected_plan?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      readiness_scores: {
        Row: {
          category: string
          created_at: string
          evidence: string | null
          id: string
          is_demo: boolean
          level_label: string | null
          recommendation: string | null
          score: number | null
          student_id: string
          updated_at: string
          updated_by_user_id: string | null
        }
        Insert: {
          category: string
          created_at?: string
          evidence?: string | null
          id?: string
          is_demo?: boolean
          level_label?: string | null
          recommendation?: string | null
          score?: number | null
          student_id: string
          updated_at?: string
          updated_by_user_id?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          evidence?: string | null
          id?: string
          is_demo?: boolean
          level_label?: string | null
          recommendation?: string | null
          score?: number | null
          student_id?: string
          updated_at?: string
          updated_by_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "readiness_scores_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      report_evidence_links: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          note: string | null
          report_section: string
          snippet_hash: string | null
          source_id: string | null
          source_kind: string
          source_label: string
          student_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          note?: string | null
          report_section: string
          snippet_hash?: string | null
          source_id?: string | null
          source_kind: string
          source_label: string
          student_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          note?: string | null
          report_section?: string
          snippet_hash?: string | null
          source_id?: string | null
          source_kind?: string
          source_label?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "report_evidence_links_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      resource_sources: {
        Row: {
          audience_focus: string[]
          created_at: string
          created_by_user_id: string | null
          description: string | null
          id: string
          last_reviewed_at: string | null
          location_scope: string
          next_review_due_at: string | null
          notes: string | null
          organization_name: string | null
          review_status: string
          source_name: string
          source_type: string
          source_url: string | null
          topic_focus: string[]
          update_frequency: string
          updated_at: string
        }
        Insert: {
          audience_focus?: string[]
          created_at?: string
          created_by_user_id?: string | null
          description?: string | null
          id?: string
          last_reviewed_at?: string | null
          location_scope?: string
          next_review_due_at?: string | null
          notes?: string | null
          organization_name?: string | null
          review_status?: string
          source_name: string
          source_type?: string
          source_url?: string | null
          topic_focus?: string[]
          update_frequency?: string
          updated_at?: string
        }
        Update: {
          audience_focus?: string[]
          created_at?: string
          created_by_user_id?: string | null
          description?: string | null
          id?: string
          last_reviewed_at?: string | null
          location_scope?: string
          next_review_due_at?: string | null
          notes?: string | null
          organization_name?: string | null
          review_status?: string
          source_name?: string
          source_type?: string
          source_url?: string | null
          topic_focus?: string[]
          update_frequency?: string
          updated_at?: string
        }
        Relationships: []
      }
      resource_tags: {
        Row: {
          id: string
          resource_id: string
          tag: string
        }
        Insert: {
          id?: string
          resource_id: string
          tag: string
        }
        Update: {
          id?: string
          resource_id?: string
          tag?: string
        }
        Relationships: [
          {
            foreignKeyName: "resource_tags_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "resources"
            referencedColumns: ["id"]
          },
        ]
      }
      resources: {
        Row: {
          accessibility_notes: string | null
          age_appropriateness: string | null
          age_range: string | null
          audience: string
          copyright_notes: string | null
          created_at: string
          created_by_user_id: string | null
          description: string | null
          estimated_time: string | null
          featured: boolean
          format: string | null
          grade_range: string | null
          id: string
          image_url: string | null
          last_reviewed_at: string | null
          link_checked_at: string | null
          link_status: string
          location_scope: string
          original_resource_url: string | null
          pathway_relevance: string[]
          published_status: string
          reading_level: string | null
          resource_type: string
          review_notes: string | null
          review_status: string
          reviewed_at: string | null
          reviewed_by_user_id: string | null
          role_relevance: string[]
          source_id: string | null
          source_name: string | null
          title: string
          topic: string | null
          updated_at: string
          url: string | null
          verified_status: string
        }
        Insert: {
          accessibility_notes?: string | null
          age_appropriateness?: string | null
          age_range?: string | null
          audience?: string
          copyright_notes?: string | null
          created_at?: string
          created_by_user_id?: string | null
          description?: string | null
          estimated_time?: string | null
          featured?: boolean
          format?: string | null
          grade_range?: string | null
          id?: string
          image_url?: string | null
          last_reviewed_at?: string | null
          link_checked_at?: string | null
          link_status?: string
          location_scope?: string
          original_resource_url?: string | null
          pathway_relevance?: string[]
          published_status?: string
          reading_level?: string | null
          resource_type: string
          review_notes?: string | null
          review_status?: string
          reviewed_at?: string | null
          reviewed_by_user_id?: string | null
          role_relevance?: string[]
          source_id?: string | null
          source_name?: string | null
          title: string
          topic?: string | null
          updated_at?: string
          url?: string | null
          verified_status?: string
        }
        Update: {
          accessibility_notes?: string | null
          age_appropriateness?: string | null
          age_range?: string | null
          audience?: string
          copyright_notes?: string | null
          created_at?: string
          created_by_user_id?: string | null
          description?: string | null
          estimated_time?: string | null
          featured?: boolean
          format?: string | null
          grade_range?: string | null
          id?: string
          image_url?: string | null
          last_reviewed_at?: string | null
          link_checked_at?: string | null
          link_status?: string
          location_scope?: string
          original_resource_url?: string | null
          pathway_relevance?: string[]
          published_status?: string
          reading_level?: string | null
          resource_type?: string
          review_notes?: string | null
          review_status?: string
          reviewed_at?: string | null
          reviewed_by_user_id?: string | null
          role_relevance?: string[]
          source_id?: string | null
          source_name?: string | null
          title?: string
          topic?: string | null
          updated_at?: string
          url?: string | null
          verified_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "resources_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "resource_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      rights_transfer_status: {
        Row: {
          created_at: string
          current_status: string
          decision_making_notes: string | null
          id: string
          legal_representative_notes: string | null
          reviewed_by_user_id: string | null
          student_authorized_parent_access: boolean
          student_id: string
          transfer_notice_date: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_status: string
          decision_making_notes?: string | null
          id?: string
          legal_representative_notes?: string | null
          reviewed_by_user_id?: string | null
          student_authorized_parent_access?: boolean
          student_id: string
          transfer_notice_date?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_status?: string
          decision_making_notes?: string | null
          id?: string
          legal_representative_notes?: string | null
          reviewed_by_user_id?: string | null
          student_authorized_parent_access?: boolean
          student_id?: string
          transfer_notice_date?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rights_transfer_status_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_resources: {
        Row: {
          collection_name: string | null
          created_at: string
          follow_up_date: string | null
          id: string
          notes: string | null
          resource_id: string
          user_id: string
        }
        Insert: {
          collection_name?: string | null
          created_at?: string
          follow_up_date?: string | null
          id?: string
          notes?: string | null
          resource_id: string
          user_id: string
        }
        Update: {
          collection_name?: string | null
          created_at?: string
          follow_up_date?: string | null
          id?: string
          notes?: string | null
          resource_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_resources_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "resources"
            referencedColumns: ["id"]
          },
        ]
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
          {
            foreignKeyName: "share_tokens_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "report_provenance_coverage_v1"
            referencedColumns: ["report_id"]
          },
        ]
      }
      sharing_permissions: {
        Row: {
          access_level: string
          created_at: string
          expiration_date: string | null
          id: string
          shared_by_user_id: string
          shared_items: Json
          shared_with_organization_id: string | null
          shared_with_user_id: string | null
          student_id: string
          updated_at: string
        }
        Insert: {
          access_level?: string
          created_at?: string
          expiration_date?: string | null
          id?: string
          shared_by_user_id: string
          shared_items?: Json
          shared_with_organization_id?: string | null
          shared_with_user_id?: string | null
          student_id: string
          updated_at?: string
        }
        Update: {
          access_level?: string
          created_at?: string
          expiration_date?: string | null
          id?: string
          shared_by_user_id?: string
          shared_items?: Json
          shared_with_organization_id?: string | null
          shared_with_user_id?: string | null
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sharing_permissions_shared_with_organization_id_fkey"
            columns: ["shared_with_organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sharing_permissions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      site_settings: {
        Row: {
          created_at: string
          id: string
          is_public: boolean
          setting_key: string
          setting_value: Json
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_public?: boolean
          setting_key: string
          setting_value?: Json
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_public?: boolean
          setting_key?: string
          setting_value?: Json
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      student_collaborators: {
        Row: {
          created_at: string
          id: string
          invited_by: string
          invited_email: string
          is_demo: boolean
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
          is_demo?: boolean
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
          is_demo?: boolean
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
      student_guardians: {
        Row: {
          created_at: string
          guardian_email: string
          guardian_user_id: string | null
          id: string
          is_primary: boolean
          relationship: string | null
          student_id: string
          updated_at: string
          verified: boolean
        }
        Insert: {
          created_at?: string
          guardian_email: string
          guardian_user_id?: string | null
          id?: string
          is_primary?: boolean
          relationship?: string | null
          student_id: string
          updated_at?: string
          verified?: boolean
        }
        Update: {
          created_at?: string
          guardian_email?: string
          guardian_user_id?: string | null
          id?: string
          is_primary?: boolean
          relationship?: string | null
          student_id?: string
          updated_at?: string
          verified?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "student_guardians_student_id_fkey"
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
          communication_prefs: string | null
          created_at: string
          current_goals: string | null
          desired_postsecondary_outcomes: string | null
          educator_input: string | null
          family_concerns: string | null
          family_concerns_extended: string | null
          family_priorities: string | null
          family_voice: string | null
          grade_band: string | null
          id: string
          interests: string | null
          needs: string | null
          services_received: string | null
          strengths: string | null
          student_first_name: string
          student_id: string | null
          student_voice: string | null
          student_worries: string | null
          submitter_role: string
          supports: string | null
          transportation: string | null
          transportation_needs: string | null
          upcoming_meetings: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          communication?: string | null
          communication_prefs?: string | null
          created_at?: string
          current_goals?: string | null
          desired_postsecondary_outcomes?: string | null
          educator_input?: string | null
          family_concerns?: string | null
          family_concerns_extended?: string | null
          family_priorities?: string | null
          family_voice?: string | null
          grade_band?: string | null
          id?: string
          interests?: string | null
          needs?: string | null
          services_received?: string | null
          strengths?: string | null
          student_first_name: string
          student_id?: string | null
          student_voice?: string | null
          student_worries?: string | null
          submitter_role?: string
          supports?: string | null
          transportation?: string | null
          transportation_needs?: string | null
          upcoming_meetings?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          communication?: string | null
          communication_prefs?: string | null
          created_at?: string
          current_goals?: string | null
          desired_postsecondary_outcomes?: string | null
          educator_input?: string | null
          family_concerns?: string | null
          family_concerns_extended?: string | null
          family_priorities?: string | null
          family_voice?: string | null
          grade_band?: string | null
          id?: string
          interests?: string | null
          needs?: string | null
          services_received?: string | null
          strengths?: string | null
          student_first_name?: string
          student_id?: string | null
          student_voice?: string | null
          student_worries?: string | null
          submitter_role?: string
          supports?: string | null
          transportation?: string | null
          transportation_needs?: string | null
          upcoming_meetings?: string | null
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
      student_opportunity_matches: {
        Row: {
          created_at: string
          id: string
          match_reason: string | null
          opportunity_id: string
          pathway_report_id: string | null
          readiness_level: string | null
          recommended_next_step: string | null
          status: string
          student_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          match_reason?: string | null
          opportunity_id: string
          pathway_report_id?: string | null
          readiness_level?: string | null
          recommended_next_step?: string | null
          status?: string
          student_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          match_reason?: string | null
          opportunity_id?: string
          pathway_report_id?: string | null
          readiness_level?: string | null
          recommended_next_step?: string | null
          status?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_opportunity_matches_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "partner_opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_opportunity_matches_pathway_report_id_fkey"
            columns: ["pathway_report_id"]
            isOneToOne: false
            referencedRelation: "pathway_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_opportunity_matches_pathway_report_id_fkey"
            columns: ["pathway_report_id"]
            isOneToOne: false
            referencedRelation: "report_provenance_coverage_v1"
            referencedColumns: ["report_id"]
          },
          {
            foreignKeyName: "student_opportunity_matches_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_partner_connections: {
        Row: {
          connection_type: string
          created_at: string
          id: string
          partner_organization_id: string
          shared_summary: string | null
          status: string
          student_id: string
          updated_at: string
        }
        Insert: {
          connection_type?: string
          created_at?: string
          id?: string
          partner_organization_id: string
          shared_summary?: string | null
          status?: string
          student_id: string
          updated_at?: string
        }
        Update: {
          connection_type?: string
          created_at?: string
          id?: string
          partner_organization_id?: string
          shared_summary?: string | null
          status?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_partner_connections_partner_organization_id_fkey"
            columns: ["partner_organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_partner_connections_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_relationships: {
        Row: {
          consent_status: string
          created_at: string
          id: string
          permission_level: string
          related_user_id: string
          relationship_type: string
          student_id: string
          updated_at: string
        }
        Insert: {
          consent_status?: string
          created_at?: string
          id?: string
          permission_level?: string
          related_user_id: string
          relationship_type: string
          student_id: string
          updated_at?: string
        }
        Update: {
          consent_status?: string
          created_at?: string
          id?: string
          permission_level?: string
          related_user_id?: string
          relationship_type?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_relationships_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_resource_recommendations: {
        Row: {
          created_at: string
          id: string
          is_demo: boolean
          pathway_report_id: string | null
          priority_level: string
          reason_recommended: string | null
          related_goal_area: string | null
          resource_id: string
          status: string
          student_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_demo?: boolean
          pathway_report_id?: string | null
          priority_level?: string
          reason_recommended?: string | null
          related_goal_area?: string | null
          resource_id: string
          status?: string
          student_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_demo?: boolean
          pathway_report_id?: string | null
          priority_level?: string
          reason_recommended?: string | null
          related_goal_area?: string | null
          resource_id?: string
          status?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_resource_recommendations_pathway_report_id_fkey"
            columns: ["pathway_report_id"]
            isOneToOne: false
            referencedRelation: "pathway_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_resource_recommendations_pathway_report_id_fkey"
            columns: ["pathway_report_id"]
            isOneToOne: false
            referencedRelation: "report_provenance_coverage_v1"
            referencedColumns: ["report_id"]
          },
          {
            foreignKeyName: "student_resource_recommendations_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "resources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_resource_recommendations_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_saved_partners: {
        Row: {
          created_at: string
          id: string
          is_demo: boolean
          notes: string | null
          opportunity_id: string | null
          partner_id: string | null
          pinned: boolean
          saved_by_user_id: string
          student_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_demo?: boolean
          notes?: string | null
          opportunity_id?: string | null
          partner_id?: string | null
          pinned?: boolean
          saved_by_user_id: string
          student_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_demo?: boolean
          notes?: string | null
          opportunity_id?: string | null
          partner_id?: string | null
          pinned?: boolean
          saved_by_user_id?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_saved_partners_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "partner_network_opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_saved_partners_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partner_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      student_strengths_needs: {
        Row: {
          category: string
          created_at: string
          description: string | null
          evidence_source: string | null
          id: string
          impact_on_transition: string | null
          student_id: string
          title: string
        }
        Insert: {
          category: string
          created_at?: string
          description?: string | null
          evidence_source?: string | null
          id?: string
          impact_on_transition?: string | null
          student_id: string
          title: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          evidence_source?: string | null
          id?: string
          impact_on_transition?: string | null
          student_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_strengths_needs_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_team_members: {
        Row: {
          created_at: string
          id: string
          member_email: string
          member_user_id: string | null
          organization_id: string | null
          role_on_team: string
          status: string
          student_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          member_email: string
          member_user_id?: string | null
          organization_id?: string | null
          role_on_team?: string
          status?: string
          student_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          member_email?: string
          member_user_id?: string | null
          organization_id?: string | null
          role_on_team?: string
          status?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_team_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_team_members_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_voice_responses: {
        Row: {
          age_band: string | null
          created_at: string
          created_by: string
          grade_band: string | null
          id: string
          is_demo: boolean
          prompt_key: string
          response_text: string
          student_id: string
          updated_at: string
        }
        Insert: {
          age_band?: string | null
          created_at?: string
          created_by: string
          grade_band?: string | null
          id?: string
          is_demo?: boolean
          prompt_key: string
          response_text?: string
          student_id: string
          updated_at?: string
        }
        Update: {
          age_band?: string | null
          created_at?: string
          created_by?: string
          grade_band?: string | null
          id?: string
          is_demo?: boolean
          prompt_key?: string
          response_text?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      students: {
        Row: {
          age: number | null
          created_at: string
          current_transition_status: string | null
          date_of_birth: string | null
          expected_graduation_year: number | null
          family_priorities: string | null
          first_name: string
          grade_band: string | null
          graduation_target_date: string | null
          id: string
          iep_annual_review_date: string | null
          iep_reevaluation_date: string | null
          interests_summary: string | null
          is_demo: boolean
          last_name: string | null
          notes: string | null
          organization_id: string | null
          owner_id: string
          photo_url: string | null
          preferred_name: string | null
          primary_disability_category: string | null
          program_track: string
          readiness_level: string | null
          rights_status: string
          school: string | null
          strengths_summary: string | null
          student_user_id: string | null
          student_voice_statement: string | null
          support_needs_summary: string | null
          transfer_notice_acknowledged_at: string | null
          updated_at: string
        }
        Insert: {
          age?: number | null
          created_at?: string
          current_transition_status?: string | null
          date_of_birth?: string | null
          expected_graduation_year?: number | null
          family_priorities?: string | null
          first_name: string
          grade_band?: string | null
          graduation_target_date?: string | null
          id?: string
          iep_annual_review_date?: string | null
          iep_reevaluation_date?: string | null
          interests_summary?: string | null
          is_demo?: boolean
          last_name?: string | null
          notes?: string | null
          organization_id?: string | null
          owner_id: string
          photo_url?: string | null
          preferred_name?: string | null
          primary_disability_category?: string | null
          program_track?: string
          readiness_level?: string | null
          rights_status?: string
          school?: string | null
          strengths_summary?: string | null
          student_user_id?: string | null
          student_voice_statement?: string | null
          support_needs_summary?: string | null
          transfer_notice_acknowledged_at?: string | null
          updated_at?: string
        }
        Update: {
          age?: number | null
          created_at?: string
          current_transition_status?: string | null
          date_of_birth?: string | null
          expected_graduation_year?: number | null
          family_priorities?: string | null
          first_name?: string
          grade_band?: string | null
          graduation_target_date?: string | null
          id?: string
          iep_annual_review_date?: string | null
          iep_reevaluation_date?: string | null
          interests_summary?: string | null
          is_demo?: boolean
          last_name?: string | null
          notes?: string | null
          organization_id?: string | null
          owner_id?: string
          photo_url?: string | null
          preferred_name?: string | null
          primary_disability_category?: string | null
          program_track?: string
          readiness_level?: string | null
          rights_status?: string
          school?: string | null
          strengths_summary?: string | null
          student_user_id?: string | null
          student_voice_statement?: string | null
          support_needs_summary?: string | null
          transfer_notice_acknowledged_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "students_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      support_requests: {
        Row: {
          assigned_to_admin_id: string | null
          category: string
          created_at: string
          id: string
          message: string
          status: string
          subject: string
          submitted_by_user_id: string
          updated_at: string
        }
        Insert: {
          assigned_to_admin_id?: string | null
          category?: string
          created_at?: string
          id?: string
          message: string
          status?: string
          subject: string
          submitted_by_user_id: string
          updated_at?: string
        }
        Update: {
          assigned_to_admin_id?: string | null
          category?: string
          created_at?: string
          id?: string
          message?: string
          status?: string
          subject?: string
          submitted_by_user_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      system_health_checks: {
        Row: {
          action_needed: string | null
          backend_table: string | null
          category: string
          created_at: string
          fail_criteria: string | null
          id: string
          key: string
          label: string
          last_checked_at: string | null
          last_checked_by: string | null
          notes: string | null
          pass_criteria: string | null
          priority: string
          reference: string | null
          route: string | null
          sort_order: number
          status: string
          updated_at: string
        }
        Insert: {
          action_needed?: string | null
          backend_table?: string | null
          category?: string
          created_at?: string
          fail_criteria?: string | null
          id?: string
          key: string
          label: string
          last_checked_at?: string | null
          last_checked_by?: string | null
          notes?: string | null
          pass_criteria?: string | null
          priority?: string
          reference?: string | null
          route?: string | null
          sort_order?: number
          status?: string
          updated_at?: string
        }
        Update: {
          action_needed?: string | null
          backend_table?: string | null
          category?: string
          created_at?: string
          fail_criteria?: string | null
          id?: string
          key?: string
          label?: string
          last_checked_at?: string | null
          last_checked_by?: string | null
          notes?: string | null
          pass_criteria?: string | null
          priority?: string
          reference?: string | null
          route?: string | null
          sort_order?: number
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      testimonials: {
        Row: {
          author_name: string
          avatar_url: string | null
          created_at: string
          id: string
          is_featured: boolean
          is_published: boolean
          organization: string | null
          position: number
          quote: string
          rating: number | null
          role: string | null
          updated_at: string
        }
        Insert: {
          author_name: string
          avatar_url?: string | null
          created_at?: string
          id?: string
          is_featured?: boolean
          is_published?: boolean
          organization?: string | null
          position?: number
          quote: string
          rating?: number | null
          role?: string | null
          updated_at?: string
        }
        Update: {
          author_name?: string
          avatar_url?: string | null
          created_at?: string
          id?: string
          is_featured?: boolean
          is_published?: boolean
          organization?: string | null
          position?: number
          quote?: string
          rating?: number | null
          role?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      testing_script_runs: {
        Row: {
          assigned_follow_up: string | null
          completed: boolean
          created_at: string
          id: string
          issue_found: string | null
          notes: string | null
          passed: boolean | null
          priority: string | null
          run_by: string | null
          script_key: string
          step_key: string
          updated_at: string
        }
        Insert: {
          assigned_follow_up?: string | null
          completed?: boolean
          created_at?: string
          id?: string
          issue_found?: string | null
          notes?: string | null
          passed?: boolean | null
          priority?: string | null
          run_by?: string | null
          script_key: string
          step_key: string
          updated_at?: string
        }
        Update: {
          assigned_follow_up?: string | null
          completed?: boolean
          created_at?: string
          id?: string
          issue_found?: string | null
          notes?: string | null
          passed?: boolean | null
          priority?: string | null
          run_by?: string | null
          script_key?: string
          step_key?: string
          updated_at?: string
        }
        Relationships: []
      }
      testing_scripts: {
        Row: {
          active: boolean
          checklist: Json
          created_at: string
          description: string | null
          id: string
          role_type: string
          script_key: string
          title: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          checklist?: Json
          created_at?: string
          description?: string | null
          id?: string
          role_type: string
          script_key: string
          title: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          checklist?: Json
          created_at?: string
          description?: string | null
          id?: string
          role_type?: string
          script_key?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      transition_profiles: {
        Row: {
          community_participation_goal: string | null
          created_at: string
          current_barriers: string | null
          current_services_summary: string | null
          daily_living_goal: string | null
          education_training_goal: string | null
          employment_goal: string | null
          financial_literacy_goal: string | null
          id: string
          independent_living_goal: string | null
          priority_needs: string | null
          self_advocacy_goal: string | null
          student_id: string
          technology_skills_goal: string | null
          transportation_goal: string | null
          updated_at: string
        }
        Insert: {
          community_participation_goal?: string | null
          created_at?: string
          current_barriers?: string | null
          current_services_summary?: string | null
          daily_living_goal?: string | null
          education_training_goal?: string | null
          employment_goal?: string | null
          financial_literacy_goal?: string | null
          id?: string
          independent_living_goal?: string | null
          priority_needs?: string | null
          self_advocacy_goal?: string | null
          student_id: string
          technology_skills_goal?: string | null
          transportation_goal?: string | null
          updated_at?: string
        }
        Update: {
          community_participation_goal?: string | null
          created_at?: string
          current_barriers?: string | null
          current_services_summary?: string | null
          daily_living_goal?: string | null
          education_training_goal?: string | null
          employment_goal?: string | null
          financial_literacy_goal?: string | null
          id?: string
          independent_living_goal?: string | null
          priority_needs?: string | null
          self_advocacy_goal?: string | null
          student_id?: string
          technology_skills_goal?: string | null
          transportation_goal?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "transition_profiles_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: true
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      usage_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          metadata: Json | null
          page: string | null
          related_record_id: string | null
          related_record_type: string | null
          user_id: string | null
          user_role: string | null
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          metadata?: Json | null
          page?: string | null
          related_record_id?: string | null
          related_record_type?: string | null
          user_id?: string | null
          user_role?: string | null
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          metadata?: Json | null
          page?: string | null
          related_record_id?: string | null
          related_record_type?: string | null
          user_id?: string | null
          user_role?: string | null
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
      user_ui_prefs: {
        Row: {
          accessibility: Json
          created_at: string
          onboarding: Json
          report_viewer: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          accessibility?: Json
          created_at?: string
          onboarding?: Json
          report_viewer?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          accessibility?: Json
          created_at?: string
          onboarding?: Json
          report_viewer?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      waitlist: {
        Row: {
          admin_notes: string | null
          assigned_admin_id: string | null
          caseload_size: number | null
          city: string | null
          connected_to_student: boolean | null
          consent_to_contact: boolean
          converted_invitation_id: string | null
          converted_to_user_id: string | null
          created_at: string
          district_name: string | null
          email: string
          estimated_school_count: number | null
          estimated_student_count: number | null
          first_name: string | null
          full_name: string
          id: string
          intended_use: string | null
          interest_area: string | null
          interest_type: string | null
          last_name: string | null
          organization: string | null
          organization_name: string | null
          organization_type: string | null
          populations_supported: string | null
          reason: string | null
          referral_source: string | null
          requested_role: string | null
          role: string
          routing_category: string | null
          school_name: string | null
          service_area: string | null
          services_offered: string | null
          source: string | null
          source_page: string | null
          state: string | null
          status: string
          student_connection_interest: string | null
          student_grade_band: string | null
          timeline: string | null
          updated_at: string
          urgency: string | null
          wants_demo: boolean
        }
        Insert: {
          admin_notes?: string | null
          assigned_admin_id?: string | null
          caseload_size?: number | null
          city?: string | null
          connected_to_student?: boolean | null
          consent_to_contact?: boolean
          converted_invitation_id?: string | null
          converted_to_user_id?: string | null
          created_at?: string
          district_name?: string | null
          email: string
          estimated_school_count?: number | null
          estimated_student_count?: number | null
          first_name?: string | null
          full_name: string
          id?: string
          intended_use?: string | null
          interest_area?: string | null
          interest_type?: string | null
          last_name?: string | null
          organization?: string | null
          organization_name?: string | null
          organization_type?: string | null
          populations_supported?: string | null
          reason?: string | null
          referral_source?: string | null
          requested_role?: string | null
          role: string
          routing_category?: string | null
          school_name?: string | null
          service_area?: string | null
          services_offered?: string | null
          source?: string | null
          source_page?: string | null
          state?: string | null
          status?: string
          student_connection_interest?: string | null
          student_grade_band?: string | null
          timeline?: string | null
          updated_at?: string
          urgency?: string | null
          wants_demo?: boolean
        }
        Update: {
          admin_notes?: string | null
          assigned_admin_id?: string | null
          caseload_size?: number | null
          city?: string | null
          connected_to_student?: boolean | null
          consent_to_contact?: boolean
          converted_invitation_id?: string | null
          converted_to_user_id?: string | null
          created_at?: string
          district_name?: string | null
          email?: string
          estimated_school_count?: number | null
          estimated_student_count?: number | null
          first_name?: string | null
          full_name?: string
          id?: string
          intended_use?: string | null
          interest_area?: string | null
          interest_type?: string | null
          last_name?: string | null
          organization?: string | null
          organization_name?: string | null
          organization_type?: string | null
          populations_supported?: string | null
          reason?: string | null
          referral_source?: string | null
          requested_role?: string | null
          role?: string
          routing_category?: string | null
          school_name?: string | null
          service_area?: string | null
          services_offered?: string | null
          source?: string | null
          source_page?: string | null
          state?: string | null
          status?: string
          student_connection_interest?: string | null
          student_grade_band?: string | null
          timeline?: string | null
          updated_at?: string
          urgency?: string | null
          wants_demo?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "waitlist_converted_invitation_id_fkey"
            columns: ["converted_invitation_id"]
            isOneToOne: false
            referencedRelation: "invitations"
            referencedColumns: ["id"]
          },
        ]
      }
      waitlist_admin_notes: {
        Row: {
          admin_user_id: string
          created_at: string
          id: string
          note: string
          waitlist_entry_id: string
        }
        Insert: {
          admin_user_id: string
          created_at?: string
          id?: string
          note: string
          waitlist_entry_id: string
        }
        Update: {
          admin_user_id?: string
          created_at?: string
          id?: string
          note?: string
          waitlist_entry_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "waitlist_admin_notes_waitlist_entry_id_fkey"
            columns: ["waitlist_entry_id"]
            isOneToOne: false
            referencedRelation: "waitlist"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      recommendation_provenance_v1: {
        Row: {
          confidence: number | null
          edge_created_at: string | null
          edge_created_by: string | null
          edge_id: string | null
          evidence_id: string | null
          evidence_kind: string | null
          evidence_payload: Json | null
          occurred_at: string | null
          recommendation_id: string | null
          relation: string | null
          source_id: string | null
          source_kind: string | null
          student_id: string | null
          verification_state: string | null
        }
        Relationships: [
          {
            foreignKeyName: "evidence_items_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      report_provenance_coverage_v1: {
        Row: {
          evidence_edge_count: number | null
          has_coverage: boolean | null
          report_id: string | null
          student_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pathway_reports_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_evidence_v1: {
        Row: {
          confidence: number | null
          contributor_id: string | null
          created_at: string | null
          edge_count: number | null
          evidence_id: string | null
          extraction_id: string | null
          kind: string | null
          occurred_at: string | null
          payload: Json | null
          permission_scope: string | null
          relations: string[] | null
          source_id: string | null
          source_kind: string | null
          student_id: string | null
          subject_id: string | null
          subject_type: string | null
          updated_at: string | null
          verification_state: string | null
        }
        Relationships: [
          {
            foreignKeyName: "evidence_items_extraction_id_fkey"
            columns: ["extraction_id"]
            isOneToOne: false
            referencedRelation: "document_extractions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidence_items_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      accept_invitation_by_token: {
        Args: { _token: string }
        Returns: {
          invitation_type: string
        }[]
      }
      audience_for_role: { Args: { _role: string }; Returns: string }
      authorize: {
        Args: {
          _action: string
          _resource_id?: string
          _resource_type: string
          _user_id: string
        }
        Returns: boolean
      }
      can_access_student: {
        Args: { _student_id: string; _user_id: string }
        Returns: boolean
      }
      can_edit_student: {
        Args: { _student_id: string; _user_id: string }
        Returns: boolean
      }
      can_view_document: {
        Args: { _document_id: string; _user_id: string }
        Returns: boolean
      }
      claim_admin_if_unclaimed: { Args: never; Returns: boolean }
      collaborator_role_for: { Args: { _collab_id: string }; Returns: string }
      collaborator_student_for: {
        Args: { _collab_id: string }
        Returns: string
      }
      consume_unsubscribe_token: {
        Args: { _token: string }
        Returns: {
          already_used: boolean
          email: string
        }[]
      }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      effective_entitlement_for_user: {
        Args: { _user_id: string }
        Returns: {
          ends_at: string
          grants_family_access: boolean
          grants_partner_access: boolean
          grants_student_access: boolean
          organization_id: string
          plan_type: string
          status: string
          via_district: boolean
        }[]
      }
      effective_org_access: {
        Args: { _user_id: string }
        Returns: {
          organization_id: string
          role_within_org: string
          via: string
        }[]
      }
      email_queue_dispatch: { Args: never; Returns: undefined }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      get_invitation_share_token: {
        Args: { _invitation_id: string }
        Returns: string
      }
      get_partner_network_opportunity_contact_email: {
        Args: { _opportunity_id: string }
        Returns: string
      }
      get_peer_profile: {
        Args: { _peer_id: string }
        Returns: {
          avatar_url: string
          full_name: string
          id: string
        }[]
      }
      has_active_entitlement: {
        Args: { _org_id: string; _plan_kind?: string }
        Returns: boolean
      }
      has_admin_role: {
        Args: {
          _role: Database["public"]["Enums"]["admin_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_audience: {
        Args: { _audience: string; _user_id: string }
        Returns: boolean
      }
      has_recent_admin_doc_access: {
        Args: { _document_id: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin_hub_member: { Args: { _user_id: string }; Returns: boolean }
      is_org_admin: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
      is_org_member: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
      is_partner_only: { Args: { _user_id: string }; Returns: boolean }
      is_platform_admin: { Args: { _user_id: string }; Returns: boolean }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      partner_tier_allows: {
        Args: { _capability: string; _user_id: string }
        Returns: boolean
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      resolve_admin_invitation: {
        Args: { _token: string }
        Returns: {
          accepted_at: string
          email: string
          expires_at: string
          id: string
          revoked_at: string
          role: Database["public"]["Enums"]["admin_role"]
        }[]
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
      storage_can_read_student_doc: {
        Args: { _path: string; _user_id: string }
        Returns: boolean
      }
      track_share_view: { Args: { _token: string }; Returns: undefined }
      user_has_feature: {
        Args: { _feature: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      admin_role:
        | "platform_owner"
        | "platform_admin"
        | "content_manager"
        | "support_admin"
      app_role:
        | "parent"
        | "educator"
        | "admin"
        | "case_manager"
        | "student"
        | "guardian"
        | "teacher"
        | "school_admin"
        | "partner"
        | "district_admin"
      bf_import_status:
        | "pending"
        | "approved"
        | "rejected"
        | "merged"
        | "needs_changes"
      bf_match_status: "suggested" | "saved" | "discussed" | "dismissed"
      bf_verification_status:
        | "imported"
        | "needs_review"
        | "verified"
        | "outdated"
        | "archived"
      ct_program_category:
        | "stem"
        | "arts"
        | "health_sciences"
        | "trades"
        | "manufacturing"
        | "culinary"
        | "agriculture"
        | "aquaculture"
        | "aviation"
        | "digital_media"
        | "business"
        | "public_service"
        | "college_credit"
        | "career_technical"
        | "special_program"
        | "other"
      ct_school_type:
        | "comprehensive_public"
        | "technical_ctecs"
        | "magnet"
        | "charter"
        | "agricultural_aste"
        | "open_choice"
        | "specialized_program"
        | "alternative_program"
        | "private_or_out_of_district"
        | "other"
      document_extraction_status:
        | "pending"
        | "needs_review"
        | "in_review"
        | "complete"
      document_permission_level:
        | "none"
        | "view_summary"
        | "view_student_friendly_summary"
        | "view_document"
        | "edit_metadata"
        | "manage"
        | "download_document"
        | "request_summary"
        | "review_document"
      partner_opportunity_type:
        | "internship"
        | "job_shadowing"
        | "volunteer_experience"
        | "supported_employment"
        | "day_program"
        | "employment_exploration"
        | "employment_enrichment"
        | "certificate_program"
        | "college_program"
        | "technical_training"
        | "mentorship"
        | "independent_living_support"
        | "transportation_support"
        | "family_support"
        | "agency_connection"
      partner_outreach_status:
        | "not_contacted"
        | "researching"
        | "outreach_needed"
        | "contacted"
        | "in_conversation"
        | "approved"
        | "declined"
        | "follow_up"
        | "archived"
      partner_type:
        | "state_agency"
        | "disability_service_provider"
        | "employment_provider"
        | "supported_employment"
        | "day_program"
        | "residential_support"
        | "independent_living"
        | "transition_program"
        | "college_postsecondary"
        | "technical_training"
        | "certificate_program"
        | "employer"
        | "inclusive_employer_lead"
        | "social_enterprise"
        | "nonprofit"
        | "for_profit_business"
        | "advocacy_family_support"
        | "transportation_support"
        | "community_resource"
        | "workforce_development"
        | "youth_young_adult_program"
        | "state_provider_directory"
        | "state_provider_list"
        | "vocational_rehabilitation"
        | "student_transition_program"
        | "transition_internship_program"
      partner_verification_status:
        | "verified"
        | "potential"
        | "needs_review"
        | "pending_approval"
        | "featured"
        | "archived"
        | "community_resource"
        | "outdated"
      pf_category:
        | "tax_credit"
        | "tax_deduction"
        | "grant"
        | "workforce_program"
        | "accessibility_support"
        | "inclusive_hiring"
        | "disability_awareness_training"
        | "vocational_rehabilitation"
        | "sponsorship"
        | "technical_assistance"
        | "funding_opportunity"
        | "employer_support"
        | "other"
      pf_source_type:
        | "federal"
        | "state_ct"
        | "local"
        | "nonprofit"
        | "workforce_board"
        | "foundation"
        | "internal"
      pf_status:
        | "draft"
        | "needs_review"
        | "verified"
        | "published"
        | "archived"
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
      admin_role: [
        "platform_owner",
        "platform_admin",
        "content_manager",
        "support_admin",
      ],
      app_role: [
        "parent",
        "educator",
        "admin",
        "case_manager",
        "student",
        "guardian",
        "teacher",
        "school_admin",
        "partner",
        "district_admin",
      ],
      bf_import_status: [
        "pending",
        "approved",
        "rejected",
        "merged",
        "needs_changes",
      ],
      bf_match_status: ["suggested", "saved", "discussed", "dismissed"],
      bf_verification_status: [
        "imported",
        "needs_review",
        "verified",
        "outdated",
        "archived",
      ],
      ct_program_category: [
        "stem",
        "arts",
        "health_sciences",
        "trades",
        "manufacturing",
        "culinary",
        "agriculture",
        "aquaculture",
        "aviation",
        "digital_media",
        "business",
        "public_service",
        "college_credit",
        "career_technical",
        "special_program",
        "other",
      ],
      ct_school_type: [
        "comprehensive_public",
        "technical_ctecs",
        "magnet",
        "charter",
        "agricultural_aste",
        "open_choice",
        "specialized_program",
        "alternative_program",
        "private_or_out_of_district",
        "other",
      ],
      document_extraction_status: [
        "pending",
        "needs_review",
        "in_review",
        "complete",
      ],
      document_permission_level: [
        "none",
        "view_summary",
        "view_student_friendly_summary",
        "view_document",
        "edit_metadata",
        "manage",
        "download_document",
        "request_summary",
        "review_document",
      ],
      partner_opportunity_type: [
        "internship",
        "job_shadowing",
        "volunteer_experience",
        "supported_employment",
        "day_program",
        "employment_exploration",
        "employment_enrichment",
        "certificate_program",
        "college_program",
        "technical_training",
        "mentorship",
        "independent_living_support",
        "transportation_support",
        "family_support",
        "agency_connection",
      ],
      partner_outreach_status: [
        "not_contacted",
        "researching",
        "outreach_needed",
        "contacted",
        "in_conversation",
        "approved",
        "declined",
        "follow_up",
        "archived",
      ],
      partner_type: [
        "state_agency",
        "disability_service_provider",
        "employment_provider",
        "supported_employment",
        "day_program",
        "residential_support",
        "independent_living",
        "transition_program",
        "college_postsecondary",
        "technical_training",
        "certificate_program",
        "employer",
        "inclusive_employer_lead",
        "social_enterprise",
        "nonprofit",
        "for_profit_business",
        "advocacy_family_support",
        "transportation_support",
        "community_resource",
        "workforce_development",
        "youth_young_adult_program",
        "state_provider_directory",
        "state_provider_list",
        "vocational_rehabilitation",
        "student_transition_program",
        "transition_internship_program",
      ],
      partner_verification_status: [
        "verified",
        "potential",
        "needs_review",
        "pending_approval",
        "featured",
        "archived",
        "community_resource",
        "outdated",
      ],
      pf_category: [
        "tax_credit",
        "tax_deduction",
        "grant",
        "workforce_program",
        "accessibility_support",
        "inclusive_hiring",
        "disability_awareness_training",
        "vocational_rehabilitation",
        "sponsorship",
        "technical_assistance",
        "funding_opportunity",
        "employer_support",
        "other",
      ],
      pf_source_type: [
        "federal",
        "state_ct",
        "local",
        "nonprofit",
        "workforce_board",
        "foundation",
        "internal",
      ],
      pf_status: ["draft", "needs_review", "verified", "published", "archived"],
    },
  },
} as const
