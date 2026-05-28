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
      action_items: {
        Row: {
          assigned_to_user_id: string | null
          category: string
          created_at: string
          created_by_user_id: string
          description: string | null
          due_date: string | null
          id: string
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
            foreignKeyName: "action_items_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
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
          student_id: string | null
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          created_by_user_id: string
          id?: string
          parent_id: string
          parent_type: string
          student_id?: string | null
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by_user_id?: string
          id?: string
          parent_id?: string
          parent_type?: string
          student_id?: string | null
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
          created_at: string
          doc_type: string
          document_category: string
          file_name: string | null
          file_type: string | null
          file_url: string | null
          id: string
          mime_type: string | null
          parsed_summary: Json | null
          size_bytes: number | null
          status: string
          storage_path: string
          student_id: string
          title: string
          updated_at: string
          uploaded_by: string
          visibility: string
        }
        Insert: {
          created_at?: string
          doc_type?: string
          document_category?: string
          file_name?: string | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          mime_type?: string | null
          parsed_summary?: Json | null
          size_bytes?: number | null
          status?: string
          storage_path: string
          student_id: string
          title: string
          updated_at?: string
          uploaded_by: string
          visibility?: string
        }
        Update: {
          created_at?: string
          doc_type?: string
          document_category?: string
          file_name?: string | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          mime_type?: string | null
          parsed_summary?: Json | null
          size_bytes?: number | null
          status?: string
          storage_path?: string
          student_id?: string
          title?: string
          updated_at?: string
          uploaded_by?: string
          visibility?: string
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
      meeting_action_items: {
        Row: {
          assignee_id: string | null
          assignee_role: string | null
          created_at: string
          due_date: string | null
          id: string
          meeting_id: string
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
          created_at: string
          id: string
          meeting_id: string
          notes: string | null
          position: number
          title: string
        }
        Insert: {
          created_at?: string
          id?: string
          meeting_id: string
          notes?: string | null
          position?: number
          title: string
        }
        Update: {
          created_at?: string
          id?: string
          meeting_id?: string
          notes?: string | null
          position?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_agenda_items_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
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
      meetings: {
        Row: {
          created_at: string
          created_by: string
          family_concerns: string | null
          id: string
          kind: string
          location: string | null
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
          family_concerns?: string | null
          id?: string
          kind?: string
          location?: string | null
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
          family_concerns?: string | null
          id?: string
          kind?: string
          location?: string | null
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
      organization_memberships: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          role_within_org: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          role_within_org?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
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
          city: string | null
          contact_email: string | null
          created_at: string
          id: string
          name: string
          state: string | null
          type: string
          updated_at: string
          verified_status: string
          website: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          contact_email?: string | null
          created_at?: string
          id?: string
          name: string
          state?: string | null
          type?: string
          updated_at?: string
          verified_status?: string
          website?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          contact_email?: string | null
          created_at?: string
          id?: string
          name?: string
          state?: string | null
          type?: string
          updated_at?: string
          verified_status?: string
          website?: string | null
        }
        Relationships: []
      }
      partner_opportunities: {
        Row: {
          age_range: string | null
          application_url: string | null
          contact_email: string | null
          created_at: string
          description: string | null
          eligibility: string | null
          id: string
          location: string | null
          opportunity_type: string
          organization_id: string
          related_career_clusters: Json
          status: string
          support_needs_fit: Json
          title: string
          updated_at: string
        }
        Insert: {
          age_range?: string | null
          application_url?: string | null
          contact_email?: string | null
          created_at?: string
          description?: string | null
          eligibility?: string | null
          id?: string
          location?: string | null
          opportunity_type: string
          organization_id: string
          related_career_clusters?: Json
          status?: string
          support_needs_fit?: Json
          title: string
          updated_at?: string
        }
        Update: {
          age_range?: string | null
          application_url?: string | null
          contact_email?: string | null
          created_at?: string
          description?: string | null
          eligibility?: string | null
          id?: string
          location?: string | null
          opportunity_type?: string
          organization_id?: string
          related_career_clusters?: Json
          status?: string
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
            foreignKeyName: "pathway_recommendations_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      pathway_reports: {
        Row: {
          ai_confidence_level: string | null
          career_matches: Json | null
          content: Json
          created_at: string
          executive_summary: string | null
          family_action_plan: Json | null
          human_review_status: string
          id: string
          iep_transition_translator: Json | null
          intake_id: string
          meeting_prep_summary: Json | null
          missing_information: Json | null
          model: string
          opportunity_matches: Json | null
          postsecondary_goal_summary: string | null
          readiness_scorecard_summary: Json | null
          recommended_pathways: Json | null
          report_status: string
          resource_recommendations: Json | null
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
          executive_summary?: string | null
          family_action_plan?: Json | null
          human_review_status?: string
          id?: string
          iep_transition_translator?: Json | null
          intake_id: string
          meeting_prep_summary?: Json | null
          missing_information?: Json | null
          model: string
          opportunity_matches?: Json | null
          postsecondary_goal_summary?: string | null
          readiness_scorecard_summary?: Json | null
          recommended_pathways?: Json | null
          report_status?: string
          resource_recommendations?: Json | null
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
          executive_summary?: string | null
          family_action_plan?: Json | null
          human_review_status?: string
          id?: string
          iep_transition_translator?: Json | null
          intake_id?: string
          meeting_prep_summary?: Json | null
          missing_information?: Json | null
          model?: string
          opportunity_matches?: Json | null
          postsecondary_goal_summary?: string | null
          readiness_scorecard_summary?: Json | null
          recommended_pathways?: Json | null
          report_status?: string
          resource_recommendations?: Json | null
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
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          first_name: string | null
          full_name: string | null
          id: string
          language: string
          last_name: string | null
          onboarding_completed: boolean
          organization_id: string | null
          phone: string | null
          primary_role: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          first_name?: string | null
          full_name?: string | null
          id: string
          language?: string
          last_name?: string | null
          onboarding_completed?: boolean
          organization_id?: string | null
          phone?: string | null
          primary_role?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          first_name?: string | null
          full_name?: string | null
          id?: string
          language?: string
          last_name?: string | null
          onboarding_completed?: boolean
          organization_id?: string | null
          phone?: string | null
          primary_role?: string | null
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
          age_range: string | null
          audience: string
          created_at: string
          created_by_user_id: string | null
          description: string | null
          estimated_time: string | null
          format: string | null
          grade_range: string | null
          id: string
          image_url: string | null
          location_scope: string
          reading_level: string | null
          resource_type: string
          source_name: string | null
          title: string
          topic: string | null
          updated_at: string
          url: string | null
          verified_status: string
        }
        Insert: {
          age_range?: string | null
          audience?: string
          created_at?: string
          created_by_user_id?: string | null
          description?: string | null
          estimated_time?: string | null
          format?: string | null
          grade_range?: string | null
          id?: string
          image_url?: string | null
          location_scope?: string
          reading_level?: string | null
          resource_type: string
          source_name?: string | null
          title: string
          topic?: string | null
          updated_at?: string
          url?: string | null
          verified_status?: string
        }
        Update: {
          age_range?: string | null
          audience?: string
          created_at?: string
          created_by_user_id?: string | null
          description?: string | null
          estimated_time?: string | null
          format?: string | null
          grade_range?: string | null
          id?: string
          image_url?: string | null
          location_scope?: string
          reading_level?: string | null
          resource_type?: string
          source_name?: string | null
          title?: string
          topic?: string | null
          updated_at?: string
          url?: string | null
          verified_status?: string
        }
        Relationships: []
      }
      saved_resources: {
        Row: {
          collection_name: string | null
          created_at: string
          id: string
          notes: string | null
          resource_id: string
          user_id: string
        }
        Insert: {
          collection_name?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          resource_id: string
          user_id: string
        }
        Update: {
          collection_name?: string | null
          created_at?: string
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
      student_resource_recommendations: {
        Row: {
          created_at: string
          id: string
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
          id: string
          interests_summary: string | null
          last_name: string | null
          notes: string | null
          organization_id: string | null
          owner_id: string
          photo_url: string | null
          preferred_name: string | null
          primary_disability_category: string | null
          readiness_level: string | null
          school: string | null
          strengths_summary: string | null
          student_user_id: string | null
          student_voice_statement: string | null
          support_needs_summary: string | null
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
          id?: string
          interests_summary?: string | null
          last_name?: string | null
          notes?: string | null
          organization_id?: string | null
          owner_id: string
          photo_url?: string | null
          preferred_name?: string | null
          primary_disability_category?: string | null
          readiness_level?: string | null
          school?: string | null
          strengths_summary?: string | null
          student_user_id?: string | null
          student_voice_statement?: string | null
          support_needs_summary?: string | null
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
          id?: string
          interests_summary?: string | null
          last_name?: string | null
          notes?: string | null
          organization_id?: string | null
          owner_id?: string
          photo_url?: string | null
          preferred_name?: string | null
          primary_disability_category?: string | null
          readiness_level?: string | null
          school?: string | null
          strengths_summary?: string | null
          student_user_id?: string | null
          student_voice_statement?: string | null
          support_needs_summary?: string | null
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
      is_org_admin: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
      is_org_member: {
        Args: { _org_id: string; _user_id: string }
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
      ],
    },
  },
} as const
