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
            foreignKeyName: "action_items_student_id_fkey"
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
          updated_at?: string
        }
        Relationships: []
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
          parent_organization_id: string | null
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
          parent_organization_id?: string | null
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
          parent_organization_id?: string | null
          state?: string | null
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
          is_demo: boolean
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
          is_demo?: boolean
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
          is_demo?: boolean
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
          updated_at: string
        }
        Insert: {
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
          updated_at?: string
        }
        Update: {
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
          link_checked_at: string | null
          link_status: string
          location_scope: string
          original_resource_url: string | null
          pathway_relevance: string[]
          published_status: string
          reading_level: string | null
          resource_type: string
          review_notes: string | null
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
          link_checked_at?: string | null
          link_status?: string
          location_scope?: string
          original_resource_url?: string | null
          pathway_relevance?: string[]
          published_status?: string
          reading_level?: string | null
          resource_type: string
          review_notes?: string | null
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
          link_checked_at?: string | null
          link_status?: string
          location_scope?: string
          original_resource_url?: string | null
          pathway_relevance?: string[]
          published_status?: string
          reading_level?: string | null
          resource_type?: string
          review_notes?: string | null
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
          id: string
          interests_summary: string | null
          is_demo: boolean
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
          is_demo?: boolean
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
          is_demo?: boolean
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
          id: string
          key: string
          label: string
          last_checked_at: string | null
          last_checked_by: string | null
          notes: string | null
          priority: string
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
          id?: string
          key: string
          label: string
          last_checked_at?: string | null
          last_checked_by?: string | null
          notes?: string | null
          priority?: string
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
          id?: string
          key?: string
          label?: string
          last_checked_at?: string | null
          last_checked_by?: string | null
          notes?: string | null
          priority?: string
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
          city: string | null
          consent_to_contact: boolean
          created_at: string
          email: string
          first_name: string | null
          full_name: string
          id: string
          interest_area: string | null
          last_name: string | null
          organization: string | null
          reason: string | null
          role: string
          source: string | null
          source_page: string | null
          state: string | null
          status: string
          student_grade_band: string | null
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          city?: string | null
          consent_to_contact?: boolean
          created_at?: string
          email: string
          first_name?: string | null
          full_name: string
          id?: string
          interest_area?: string | null
          last_name?: string | null
          organization?: string | null
          reason?: string | null
          role: string
          source?: string | null
          source_page?: string | null
          state?: string | null
          status?: string
          student_grade_band?: string | null
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          city?: string | null
          consent_to_contact?: boolean
          created_at?: string
          email?: string
          first_name?: string | null
          full_name?: string
          id?: string
          interest_area?: string | null
          last_name?: string | null
          organization?: string | null
          reason?: string | null
          role?: string
          source?: string | null
          source_page?: string | null
          state?: string | null
          status?: string
          student_grade_band?: string | null
          updated_at?: string
        }
        Relationships: []
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
      [_ in never]: never
    }
    Functions: {
      audience_for_role: { Args: { _role: string }; Returns: string }
      can_access_student: {
        Args: { _student_id: string; _user_id: string }
        Returns: boolean
      }
      can_edit_student: {
        Args: { _student_id: string; _user_id: string }
        Returns: boolean
      }
      claim_admin_if_unclaimed: { Args: never; Returns: boolean }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
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
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
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
      track_share_view: { Args: { _token: string }; Returns: undefined }
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
      ],
    },
  },
} as const
