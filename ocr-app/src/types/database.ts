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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      agent_logs: {
        Row: {
          action: string
          agent_type: string
          created_at: string | null
          email_id: string | null
          error_message: string | null
          execution_time_ms: number | null
          id: string
          input_data: Json | null
          output_data: Json | null
          success: boolean | null
          user_id: string
        }
        Insert: {
          action: string
          agent_type: string
          created_at?: string | null
          email_id?: string | null
          error_message?: string | null
          execution_time_ms?: number | null
          id?: string
          input_data?: Json | null
          output_data?: Json | null
          success?: boolean | null
          user_id: string
        }
        Update: {
          action?: string
          agent_type?: string
          created_at?: string | null
          email_id?: string | null
          error_message?: string | null
          execution_time_ms?: number | null
          id?: string
          input_data?: Json | null
          output_data?: Json | null
          success?: boolean | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_logs_email_id_fkey"
            columns: ["email_id"]
            isOneToOne: false
            referencedRelation: "email_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          created_at: string | null
          email_id: string | null
          file_size_bytes: number | null
          file_type: string | null
          filename: string
          gcs_bucket: string | null
          gcs_path: string | null
          gcs_url: string | null
          id: string
          ocr_completed_at: string | null
          ocr_metadata: Json | null
          ocr_text: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          email_id?: string | null
          file_size_bytes?: number | null
          file_type?: string | null
          filename: string
          gcs_bucket?: string | null
          gcs_path?: string | null
          gcs_url?: string | null
          id?: string
          ocr_completed_at?: string | null
          ocr_metadata?: Json | null
          ocr_text?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          email_id?: string | null
          file_size_bytes?: number | null
          file_type?: string | null
          filename?: string
          gcs_bucket?: string | null
          gcs_path?: string | null
          gcs_url?: string | null
          id?: string
          ocr_completed_at?: string | null
          ocr_metadata?: Json | null
          ocr_text?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_email_id_fkey"
            columns: ["email_id"]
            isOneToOne: false
            referencedRelation: "email_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      email_classifications: {
        Row: {
          assigned_agents: string[] | null
          category: Database["public"]["Enums"]["email_category"] | null
          classified_at: string | null
          confidence_score: number | null
          email_id: string
          id: string
          priority: Database["public"]["Enums"]["priority_level"] | null
          sentiment: Database["public"]["Enums"]["sentiment_type"] | null
          tags: string[] | null
          user_feedback: string | null
        }
        Insert: {
          assigned_agents?: string[] | null
          category?: Database["public"]["Enums"]["email_category"] | null
          classified_at?: string | null
          confidence_score?: number | null
          email_id: string
          id?: string
          priority?: Database["public"]["Enums"]["priority_level"] | null
          sentiment?: Database["public"]["Enums"]["sentiment_type"] | null
          tags?: string[] | null
          user_feedback?: string | null
        }
        Update: {
          assigned_agents?: string[] | null
          category?: Database["public"]["Enums"]["email_category"] | null
          classified_at?: string | null
          confidence_score?: number | null
          email_id?: string
          id?: string
          priority?: Database["public"]["Enums"]["priority_level"] | null
          sentiment?: Database["public"]["Enums"]["sentiment_type"] | null
          tags?: string[] | null
          user_feedback?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_classifications_email_id_fkey"
            columns: ["email_id"]
            isOneToOne: true
            referencedRelation: "email_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      email_messages: {
        Row: {
          ai_summary: Json | null
          bcc_emails: string[] | null
          body_html: string | null
          body_plain: string | null
          cc_emails: string[] | null
          created_at: string | null
          from_email: string | null
          from_name: string | null
          gmail_id: string
          has_attachments: boolean | null
          id: string
          is_read: boolean | null
          is_starred: boolean | null
          labels: string[] | null
          received_at: string | null
          snippet: string | null
          subject: string | null
          thread_id: string | null
          to_email: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          ai_summary?: Json | null
          bcc_emails?: string[] | null
          body_html?: string | null
          body_plain?: string | null
          cc_emails?: string[] | null
          created_at?: string | null
          from_email?: string | null
          from_name?: string | null
          gmail_id: string
          has_attachments?: boolean | null
          id?: string
          is_read?: boolean | null
          is_starred?: boolean | null
          labels?: string[] | null
          received_at?: string | null
          snippet?: string | null
          subject?: string | null
          thread_id?: string | null
          to_email?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          ai_summary?: Json | null
          bcc_emails?: string[] | null
          body_html?: string | null
          body_plain?: string | null
          cc_emails?: string[] | null
          created_at?: string | null
          from_email?: string | null
          from_name?: string | null
          gmail_id?: string
          has_attachments?: boolean | null
          id?: string
          is_read?: boolean | null
          is_starred?: boolean | null
          labels?: string[] | null
          received_at?: string | null
          snippet?: string | null
          subject?: string | null
          thread_id?: string | null
          to_email?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      milestones: {
        Row: {
          id: string
          user_id: string
          project_id: string
          title: string
          description: string | null
          due_date: string
          status: Database["public"]["Enums"]["milestone_status"] | null
          completed_at: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          project_id: string
          title: string
          description?: string | null
          due_date: string
          status?: Database["public"]["Enums"]["milestone_status"] | null
          completed_at?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          project_id?: string
          title?: string
          description?: string | null
          due_date?: string
          status?: Database["public"]["Enums"]["milestone_status"] | null
          completed_at?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "milestones_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "milestones_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      email_sync_state: {
        Row: {
          error_message: string | null
          id: string
          last_history_id: string | null
          last_sync_at: string | null
          sync_status: Database["public"]["Enums"]["sync_status"] | null
          total_emails_synced: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          error_message?: string | null
          id?: string
          last_history_id?: string | null
          last_sync_at?: string | null
          sync_status?: Database["public"]["Enums"]["sync_status"] | null
          total_emails_synced?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          error_message?: string | null
          id?: string
          last_history_id?: string | null
          last_sync_at?: string | null
          sync_status?: Database["public"]["Enums"]["sync_status"] | null
          total_emails_synced?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_sync_state_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      gmail_watch_subscriptions: {
        Row: {
          id: string
          user_id: string
          watch_started_at: string
          watch_expires_at: string
          pubsub_topic: string
          is_active: boolean
          last_renewed_at: string | null
          renewal_attempt_count: number | null
          last_error: string | null
          last_notification_at: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          watch_started_at?: string
          watch_expires_at: string
          pubsub_topic: string
          is_active?: boolean
          last_renewed_at?: string | null
          renewal_attempt_count?: number | null
          last_error?: string | null
          last_notification_at?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          watch_started_at?: string
          watch_expires_at?: string
          pubsub_topic?: string
          is_active?: boolean
          last_renewed_at?: string | null
          renewal_attempt_count?: number | null
          last_error?: string | null
          last_notification_at?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gmail_watch_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_sync_preferences: {
        Row: {
          id: string
          user_id: string
          sync_strategy: Database["public"]["Enums"]["sync_strategy"]
          auto_sync_enabled: boolean
          polling_interval_minutes: number | null
          polling_enabled: boolean
          webhook_enabled: boolean
          client_id: string | null
          custom_config: Json
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          sync_strategy?: Database["public"]["Enums"]["sync_strategy"]
          auto_sync_enabled?: boolean
          polling_interval_minutes?: number | null
          polling_enabled?: boolean
          webhook_enabled?: boolean
          client_id?: string | null
          custom_config?: Json
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          sync_strategy?: Database["public"]["Enums"]["sync_strategy"]
          auto_sync_enabled?: boolean
          polling_interval_minutes?: number | null
          polling_enabled?: boolean
          webhook_enabled?: boolean
          client_id?: string | null
          custom_config?: Json
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_sync_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          budget: number | null
          budget_currency: string | null
          client_email: string | null
          client_name: string | null
          created_at: string | null
          description: string | null
          end_date: string | null
          google_doc_id: string | null
          google_folder_id: string | null
          google_sheet_id: string | null
          id: string
          metadata: Json | null
          name: string
          start_date: string | null
          status: Database["public"]["Enums"]["project_status"] | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          budget?: number | null
          budget_currency?: string | null
          client_email?: string | null
          client_name?: string | null
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          google_doc_id?: string | null
          google_folder_id?: string | null
          google_sheet_id?: string | null
          id?: string
          metadata?: Json | null
          name: string
          start_date?: string | null
          status?: Database["public"]["Enums"]["project_status"] | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          budget?: number | null
          budget_currency?: string | null
          client_email?: string | null
          client_name?: string | null
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          google_doc_id?: string | null
          google_folder_id?: string | null
          google_sheet_id?: string | null
          id?: string
          metadata?: Json | null
          name?: string
          start_date?: string | null
          status?: Database["public"]["Enums"]["project_status"] | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      scope_of_works: {
        Row: {
          approved_at: string | null
          content: string | null
          created_at: string | null
          email_id: string | null
          google_doc_id: string | null
          google_doc_url: string | null
          id: string
          project_id: string | null
          sent_at: string | null
          status: Database["public"]["Enums"]["sow_status"] | null
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          approved_at?: string | null
          content?: string | null
          created_at?: string | null
          email_id?: string | null
          google_doc_id?: string | null
          google_doc_url?: string | null
          id?: string
          project_id?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["sow_status"] | null
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          approved_at?: string | null
          content?: string | null
          created_at?: string | null
          email_id?: string | null
          google_doc_id?: string | null
          google_doc_url?: string | null
          id?: string
          project_id?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["sow_status"] | null
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scope_of_works_email_id_fkey"
            columns: ["email_id"]
            isOneToOne: false
            referencedRelation: "email_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scope_of_works_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scope_of_works_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assigned_to: string | null
          completed_at: string | null
          created_at: string | null
          description: string | null
          due_date: string | null
          email_id: string | null
          id: string
          priority: Database["public"]["Enums"]["priority_level"] | null
          project_id: string | null
          status: Database["public"]["Enums"]["task_status"] | null
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          email_id?: string | null
          id?: string
          priority?: Database["public"]["Enums"]["priority_level"] | null
          project_id?: string | null
          status?: Database["public"]["Enums"]["task_status"] | null
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          email_id?: string | null
          id?: string
          priority?: Database["public"]["Enums"]["priority_level"] | null
          project_id?: string | null
          status?: Database["public"]["Enums"]["task_status"] | null
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_email_id_fkey"
            columns: ["email_id"]
            isOneToOne: false
            referencedRelation: "email_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      templates: {
        Row: {
          id: string
          user_id: string
          name: string
          type: string
          description: string | null
          content: string
          variables: Json
          google_doc_template_id: string | null
          google_sheet_template_id: string | null
          is_default: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          type: string
          description?: string | null
          content: string
          variables?: Json
          google_doc_template_id?: string | null
          google_sheet_template_id?: string | null
          is_default?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          type?: string
          description?: string | null
          content?: string
          variables?: Json
          google_doc_template_id?: string | null
          google_sheet_template_id?: string | null
          is_default?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "templates_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string | null
          email: string
          google_access_token: string | null
          google_refresh_token: string | null
          google_user_id: string | null
          id: string
          name: string | null
          plan_tier: Database["public"]["Enums"]["plan_tier"] | null
          preferences: Json | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          google_access_token?: string | null
          google_refresh_token?: string | null
          google_user_id?: string | null
          id?: string
          name?: string | null
          plan_tier?: Database["public"]["Enums"]["plan_tier"] | null
          preferences?: Json | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          google_access_token?: string | null
          google_refresh_token?: string | null
          google_user_id?: string | null
          id?: string
          name?: string | null
          plan_tier?: Database["public"]["Enums"]["plan_tier"] | null
          preferences?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      seed_test_data_for_user: {
        Args: { target_user_id: string }
        Returns: undefined
      }
    }
    Enums: {
      email_category:
        | "client_request"
        | "invoice"
        | "contract"
        | "project_update"
        | "general"
        | "other"
      milestone_status: "pending" | "completed" | "cancelled"
      plan_tier: "free" | "pro" | "team" | "enterprise"
      priority_level: "urgent" | "high" | "medium" | "low"
      project_status: "active" | "paused" | "completed" | "archived"
      sentiment_type: "positive" | "neutral" | "negative" | "action_required"
      sow_status: "draft" | "pending_approval" | "approved" | "sent"
      sync_status: "active" | "paused" | "error"
      sync_strategy: "webhook" | "polling" | "hybrid"
      task_status: "pending" | "in_progress" | "completed" | "cancelled"
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
      email_category: [
        "client_request",
        "invoice",
        "contract",
        "project_update",
        "general",
        "other",
      ],
      milestone_status: ["pending", "completed", "cancelled"],
      plan_tier: ["free", "pro", "team", "enterprise"],
      priority_level: ["urgent", "high", "medium", "low"],
      project_status: ["active", "paused", "completed", "archived"],
      sentiment_type: ["positive", "neutral", "negative", "action_required"],
      sow_status: ["draft", "pending_approval", "approved", "sent"],
      sync_status: ["active", "paused", "error"],
      sync_strategy: ["webhook", "polling", "hybrid"],
      task_status: ["pending", "in_progress", "completed", "cancelled"],
    },
  },
} as const
