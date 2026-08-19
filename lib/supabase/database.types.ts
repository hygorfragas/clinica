export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

/**
 * Tipos do PostgREST para este projeto.
 * - `public`: tabelas legadas no mesmo projeto Supabase (finanças). O app da clínica não deve usá-las.
 * - `clinic`: domínio multitenant (ver migração em `supabase/migrations/`).
 */
export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.1";
  };
  public: {
    Tables: {
      budgets: {
        Row: {
          amount: number;
          category_id: string | null;
          created_at: string | null;
          id: string;
          period: string;
          start_date: string;
          updated_at: string | null;
          user_id: string;
        };
        Insert: {
          amount: number;
          category_id?: string | null;
          created_at?: string | null;
          id?: string;
          period: string;
          start_date: string;
          updated_at?: string | null;
          user_id: string;
        };
        Update: {
          amount?: number;
          category_id?: string | null;
          created_at?: string | null;
          id?: string;
          period?: string;
          start_date?: string;
          updated_at?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "budgets_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
        ];
      };
      categories: {
        Row: {
          color: string | null;
          created_at: string | null;
          icon: string | null;
          id: string;
          name: string;
          type: string;
          user_id: string;
        };
        Insert: {
          color?: string | null;
          created_at?: string | null;
          icon?: string | null;
          id?: string;
          name: string;
          type: string;
          user_id: string;
        };
        Update: {
          color?: string | null;
          created_at?: string | null;
          icon?: string | null;
          id?: string;
          name?: string;
          type?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          created_at: string | null;
          full_name: string | null;
          id: string;
          updated_at: string | null;
        };
        Insert: {
          created_at?: string | null;
          full_name?: string | null;
          id: string;
          updated_at?: string | null;
        };
        Update: {
          created_at?: string | null;
          full_name?: string | null;
          id?: string;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      transactions: {
        Row: {
          amount: number;
          category_id: string | null;
          created_at: string | null;
          date: string;
          description: string | null;
          id: string;
          type: string;
          updated_at: string | null;
          user_id: string;
        };
        Insert: {
          amount: number;
          category_id?: string | null;
          created_at?: string | null;
          date?: string;
          description?: string | null;
          id?: string;
          type: string;
          updated_at?: string | null;
          user_id: string;
        };
        Update: {
          amount?: number;
          category_id?: string | null;
          created_at?: string | null;
          date?: string;
          description?: string | null;
          id?: string;
          type?: string;
          updated_at?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "transactions_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
        ];
      };
      dashboard_phrases: {
        Row: {
          id: string;
          category: "motivational" | "hopeful" | "joyful" | "warm";
          text: string;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          category: "motivational" | "hopeful" | "joyful" | "warm";
          text: string;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          category?: "motivational" | "hopeful" | "joyful" | "warm";
          text?: string;
          is_active?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      clinic_bootstrap_status: {
        Args: Record<string, never>;
        Returns: Json;
      };
      create_default_categories: {
        Args: { p_user_id: string };
        Returns: undefined;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  clinic: {
    Tables: {
      tenants: {
        Row: {
          id: string;
          name: string;
          slug: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          tenant_id: string | null;
          full_name: string;
          phone: string | null;
          professional_registration: string | null;
          cpf: string | null;
          address: string | null;
          signature_storage_key: string | null;
          stamp_storage_key: string | null;
          role: string;
          theme_accent_preset: string | null;
          theme_mode: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          tenant_id?: string | null;
          full_name?: string;
          phone?: string | null;
          professional_registration?: string | null;
          cpf?: string | null;
          address?: string | null;
          signature_storage_key?: string | null;
          stamp_storage_key?: string | null;
          role?: string;
          theme_accent_preset?: string | null;
          theme_mode?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string | null;
          full_name?: string;
          phone?: string | null;
          professional_registration?: string | null;
          cpf?: string | null;
          address?: string | null;
          signature_storage_key?: string | null;
          stamp_storage_key?: string | null;
          role?: string;
          theme_accent_preset?: string | null;
          theme_mode?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
        ];
      };
      clinic_theme_settings: {
        Row: {
          tenant_id: string;
          default_accent_preset: string;
          default_mode: string;
          updated_at: string;
          updated_by_profile_id: string | null;
        };
        Insert: {
          tenant_id: string;
          default_accent_preset?: string;
          default_mode?: string;
          updated_at?: string;
          updated_by_profile_id?: string | null;
        };
        Update: {
          tenant_id?: string;
          default_accent_preset?: string;
          default_mode?: string;
          updated_at?: string;
          updated_by_profile_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "clinic_theme_settings_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: true;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
        ];
      };
      clients: {
        Row: {
          id: string;
          tenant_id: string;
          full_name: string;
          email: string | null;
          phone: string | null;
          cpf: string | null;
          address: string | null;
          birth_date: string | null;
          notes: string | null;
          hidden_from_ui_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          full_name: string;
          email?: string | null;
          phone?: string | null;
          cpf?: string | null;
          address?: string | null;
          birth_date?: string | null;
          notes?: string | null;
          hidden_from_ui_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          full_name?: string;
          email?: string | null;
          phone?: string | null;
          cpf?: string | null;
          address?: string | null;
          birth_date?: string | null;
          notes?: string | null;
          hidden_from_ui_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "clients_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
        ];
      };
      client_procedure_purchases: {
        Row: {
          id: string;
          tenant_id: string;
          client_id: string;
          title: string;
          procedure_id: string | null;
          budget_id: string | null;
          total_cents: number;
          currency: string;
          purchased_at: string;
          contract_document_id: string | null;
          responsible_profile_id: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          client_id: string;
          title: string;
          procedure_id?: string | null;
          budget_id?: string | null;
          total_cents: number;
          currency?: string;
          purchased_at?: string;
          contract_document_id?: string | null;
          responsible_profile_id?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          client_id?: string;
          title?: string;
          procedure_id?: string | null;
          budget_id?: string | null;
          total_cents?: number;
          currency?: string;
          purchased_at?: string;
          contract_document_id?: string | null;
          responsible_profile_id?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "client_procedure_purchases_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "client_procedure_purchases_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "client_procedure_purchases_procedure_id_fkey";
            columns: ["procedure_id"];
            isOneToOne: false;
            referencedRelation: "procedures";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "client_procedure_purchases_budget_id_fkey";
            columns: ["budget_id"];
            isOneToOne: false;
            referencedRelation: "budgets";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "client_procedure_purchases_contract_document_id_fkey";
            columns: ["contract_document_id"];
            isOneToOne: false;
            referencedRelation: "documents";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "client_procedure_purchases_responsible_profile_id_fkey";
            columns: ["responsible_profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      appointments: {
        Row: {
          id: string;
          tenant_id: string;
          client_id: string;
          starts_at: string;
          ends_at: string;
          status: string;
          notes: string | null;
          title: string | null;
          color: string | null;
          location: string | null;
          source: string;
          procedure_id: string | null;
          google_event_id: string | null;
          google_calendar_id: string | null;
          google_etag: string | null;
          google_sync_status: string;
          google_synced_at: string | null;
          created_by_profile_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          client_id: string;
          starts_at: string;
          ends_at: string;
          status?: string;
          notes?: string | null;
          title?: string | null;
          color?: string | null;
          location?: string | null;
          source?: string;
          procedure_id?: string | null;
          google_event_id?: string | null;
          google_calendar_id?: string | null;
          google_etag?: string | null;
          google_sync_status?: string;
          google_synced_at?: string | null;
          created_by_profile_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          client_id?: string;
          starts_at?: string;
          ends_at?: string;
          status?: string;
          notes?: string | null;
          title?: string | null;
          color?: string | null;
          location?: string | null;
          source?: string;
          procedure_id?: string | null;
          google_event_id?: string | null;
          google_calendar_id?: string | null;
          google_etag?: string | null;
          google_sync_status?: string;
          google_synced_at?: string | null;
          created_by_profile_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "appointments_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "appointments_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "appointments_procedure_id_fkey";
            columns: ["procedure_id"];
            isOneToOne: false;
            referencedRelation: "procedures";
            referencedColumns: ["id"];
          },
        ];
      };
      calendar_settings: {
        Row: {
          tenant_id: string;
          google_sync_mode: string;
          pull_interval_minutes: number;
          default_calendar_id: string | null;
          default_slot_minutes: number;
          business_hours: Json;
          timezone: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          tenant_id: string;
          google_sync_mode?: string;
          pull_interval_minutes?: number;
          default_calendar_id?: string | null;
          default_slot_minutes?: number;
          business_hours?: Json;
          timezone?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          tenant_id?: string;
          google_sync_mode?: string;
          pull_interval_minutes?: number;
          default_calendar_id?: string | null;
          default_slot_minutes?: number;
          business_hours?: Json;
          timezone?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      google_calendar_sync_state: {
        Row: {
          id: string;
          tenant_id: string;
          connection_id: string;
          calendar_id: string;
          sync_token: string | null;
          last_synced_at: string | null;
          last_error: string | null;
          webhook_channel_id: string | null;
          webhook_resource_id: string | null;
          webhook_expires_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          connection_id: string;
          calendar_id: string;
          sync_token?: string | null;
          last_synced_at?: string | null;
          last_error?: string | null;
          webhook_channel_id?: string | null;
          webhook_resource_id?: string | null;
          webhook_expires_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          connection_id?: string;
          calendar_id?: string;
          sync_token?: string | null;
          last_synced_at?: string | null;
          last_error?: string | null;
          webhook_channel_id?: string | null;
          webhook_resource_id?: string | null;
          webhook_expires_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      google_calendar_outbox: {
        Row: {
          id: string;
          tenant_id: string;
          appointment_id: string;
          operation: string;
          payload: Json;
          attempts: number;
          last_error: string | null;
          processed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          appointment_id: string;
          operation: string;
          payload?: Json;
          attempts?: number;
          last_error?: string | null;
          processed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          appointment_id?: string;
          operation?: string;
          payload?: Json;
          attempts?: number;
          last_error?: string | null;
          processed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      anamnesis_forms: {
        Row: {
          id: string;
          tenant_id: string;
          client_id: string;
          payload: Json;
          schema_version: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          client_id: string;
          payload?: Json;
          schema_version?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          client_id?: string;
          payload?: Json;
          schema_version?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "anamnesis_forms_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "anamnesis_forms_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
        ];
      };
      anamnesis_templates: {
        Row: {
          id: string;
          tenant_id: string;
          name: string;
          description: string | null;
          pdf_storage_path: string;
          page_count: number;
          form_schema: Json;
          ink_regions: Json;
          is_default: boolean;
          is_archived: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          name: string;
          description?: string | null;
          pdf_storage_path: string;
          page_count?: number;
          form_schema?: Json;
          ink_regions?: Json;
          is_default?: boolean;
          is_archived?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          name?: string;
          description?: string | null;
          pdf_storage_path?: string;
          page_count?: number;
          form_schema?: Json;
          ink_regions?: Json;
          is_default?: boolean;
          is_archived?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "anamnesis_templates_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
        ];
      };
      anamnesis_submissions: {
        Row: {
          id: string;
          tenant_id: string;
          client_id: string;
          template_id: string | null;
          mode: "interactive" | "desktop";
          status: "draft" | "submitted" | "signed";
          form_values: Json;
          ink_strokes: Json;
          flattened_pdf_path: string | null;
          signer_name: string | null;
          signed_at: string | null;
          submitted_at: string | null;
          created_by_profile_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          client_id: string;
          template_id?: string | null;
          mode?: "interactive" | "desktop";
          status?: "draft" | "submitted" | "signed";
          form_values?: Json;
          ink_strokes?: Json;
          flattened_pdf_path?: string | null;
          signer_name?: string | null;
          signed_at?: string | null;
          submitted_at?: string | null;
          created_by_profile_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          client_id?: string;
          template_id?: string | null;
          mode?: "interactive" | "desktop";
          status?: "draft" | "submitted" | "signed";
          form_values?: Json;
          ink_strokes?: Json;
          flattened_pdf_path?: string | null;
          signer_name?: string | null;
          signed_at?: string | null;
          submitted_at?: string | null;
          created_by_profile_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "anamnesis_submissions_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "anamnesis_submissions_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "anamnesis_submissions_template_id_fkey";
            columns: ["template_id"];
            isOneToOne: false;
            referencedRelation: "anamnesis_templates";
            referencedColumns: ["id"];
          },
        ];
      };
      evolution_templates: {
        Row: {
          id: string;
          tenant_id: string;
          name: string;
          description: string | null;
          pdf_storage_path: string;
          page_count: number;
          form_schema: Json;
          ink_regions: Json;
          is_default: boolean;
          is_archived: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          name: string;
          description?: string | null;
          pdf_storage_path: string;
          page_count?: number;
          form_schema?: Json;
          ink_regions?: Json;
          is_default?: boolean;
          is_archived?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          name?: string;
          description?: string | null;
          pdf_storage_path?: string;
          page_count?: number;
          form_schema?: Json;
          ink_regions?: Json;
          is_default?: boolean;
          is_archived?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      evolution_submissions: {
        Row: {
          id: string;
          tenant_id: string;
          client_id: string;
          template_id: string | null;
          mode: "interactive" | "desktop";
          status: "draft" | "submitted" | "signed";
          form_values: Json;
          ink_strokes: Json;
          flattened_pdf_path: string | null;
          signer_name: string | null;
          signed_at: string | null;
          submitted_at: string | null;
          created_by_profile_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          client_id: string;
          template_id?: string | null;
          mode?: "interactive" | "desktop";
          status?: "draft" | "submitted" | "signed";
          form_values?: Json;
          ink_strokes?: Json;
          flattened_pdf_path?: string | null;
          signer_name?: string | null;
          signed_at?: string | null;
          submitted_at?: string | null;
          created_by_profile_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          client_id?: string;
          template_id?: string | null;
          mode?: "interactive" | "desktop";
          status?: "draft" | "submitted" | "signed";
          form_values?: Json;
          ink_strokes?: Json;
          flattened_pdf_path?: string | null;
          signer_name?: string | null;
          signed_at?: string | null;
          submitted_at?: string | null;
          created_by_profile_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      evolutions: {
        Row: {
          id: string;
          tenant_id: string;
          client_id: string;
          appointment_id: string | null;
          body: string;
          procedure_id: string | null;
          purchase_id: string | null;
          session_number: number | null;
          created_by_profile_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          client_id: string;
          appointment_id?: string | null;
          body: string;
          procedure_id?: string | null;
          purchase_id?: string | null;
          session_number?: number | null;
          created_by_profile_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          client_id?: string;
          appointment_id?: string | null;
          body?: string;
          procedure_id?: string | null;
          purchase_id?: string | null;
          session_number?: number | null;
          created_by_profile_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "evolutions_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "evolutions_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "evolutions_appointment_id_fkey";
            columns: ["appointment_id"];
            isOneToOne: false;
            referencedRelation: "appointments";
            referencedColumns: ["id"];
          },
        ];
      };
      procedures: {
        Row: {
          id: string;
          tenant_id: string;
          name: string;
          description: string | null;
          default_price_cents: number | null;
          duration_minutes: number | null;
          cost_cents: number;
          profit_margin_percent: number;
          price_cents: number;
          contract_template_id: string | null;
          requires_signed_contract: boolean;
          is_archived: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          name: string;
          description?: string | null;
          default_price_cents?: number | null;
          duration_minutes?: number | null;
          cost_cents?: number;
          profit_margin_percent?: number;
          price_cents?: number;
          contract_template_id?: string | null;
          requires_signed_contract?: boolean;
          is_archived?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          name?: string;
          description?: string | null;
          default_price_cents?: number | null;
          duration_minutes?: number | null;
          cost_cents?: number;
          profit_margin_percent?: number;
          price_cents?: number;
          contract_template_id?: string | null;
          requires_signed_contract?: boolean;
          is_archived?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "procedures_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "procedures_contract_template_id_fkey";
            columns: ["contract_template_id"];
            isOneToOne: false;
            referencedRelation: "contract_templates";
            referencedColumns: ["id"];
          },
        ];
      };
      products: {
        Row: {
          id: string;
          tenant_id: string;
          name: string;
          sku: string | null;
          description: string | null;
          unit: string;
          stock_quantity: number;
          low_stock_threshold: number;
          cost_cents: number;
          price_cents: number;
          is_archived: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          name: string;
          sku?: string | null;
          description?: string | null;
          unit?: string;
          stock_quantity?: number;
          low_stock_threshold?: number;
          cost_cents?: number;
          price_cents?: number;
          is_archived?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          name?: string;
          sku?: string | null;
          description?: string | null;
          unit?: string;
          stock_quantity?: number;
          low_stock_threshold?: number;
          cost_cents?: number;
          price_cents?: number;
          is_archived?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      procedure_bom_items: {
        Row: {
          id: string;
          tenant_id: string;
          procedure_id: string;
          product_id: string;
          quantity: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          procedure_id: string;
          product_id: string;
          quantity: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          procedure_id?: string;
          product_id?: string;
          quantity?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "procedure_bom_items_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "procedure_bom_items_procedure_id_fkey";
            columns: ["procedure_id"];
            isOneToOne: false;
            referencedRelation: "procedures";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "procedure_bom_items_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      inventory_movements: {
        Row: {
          id: string;
          tenant_id: string;
          product_id: string;
          delta: number;
          reason: Database["clinic"]["Enums"]["inventory_movement_reason"];
          note: string | null;
          ref_table: string | null;
          ref_id: string | null;
          created_by_profile_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          product_id: string;
          delta: number;
          reason?: Database["clinic"]["Enums"]["inventory_movement_reason"];
          note?: string | null;
          ref_table?: string | null;
          ref_id?: string | null;
          created_by_profile_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          product_id?: string;
          delta?: number;
          reason?: Database["clinic"]["Enums"]["inventory_movement_reason"];
          note?: string | null;
          ref_table?: string | null;
          ref_id?: string | null;
          created_by_profile_id?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "inventory_movements_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      budgets: {
        Row: {
          id: string;
          tenant_id: string;
          client_id: string;
          title: string | null;
          status: string;
          currency: string;
          subtotal_cents: number | null;
          discount_cents: number;
          total_cents: number | null;
          valid_until: string | null;
          cancelled_at: string | null;
          cancellation_reason: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          client_id: string;
          title?: string | null;
          status?: string;
          currency?: string;
          subtotal_cents?: number | null;
          discount_cents?: number;
          total_cents?: number | null;
          valid_until?: string | null;
          cancelled_at?: string | null;
          cancellation_reason?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          client_id?: string;
          title?: string | null;
          status?: string;
          currency?: string;
          subtotal_cents?: number | null;
          discount_cents?: number;
          total_cents?: number | null;
          valid_until?: string | null;
          cancelled_at?: string | null;
          cancellation_reason?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "budgets_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "budgets_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
        ];
      };
      budget_items: {
        Row: {
          id: string;
          tenant_id: string;
          budget_id: string;
          procedure_id: string | null;
          description: string;
          quantity: number;
          unit_price_cents: number;
          line_total_cents: number | null;
          display_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          budget_id: string;
          procedure_id?: string | null;
          description: string;
          quantity?: number;
          unit_price_cents: number;
          line_total_cents?: number | null;
          display_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          budget_id?: string;
          procedure_id?: string | null;
          description?: string;
          quantity?: number;
          unit_price_cents?: number;
          line_total_cents?: number | null;
          display_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "budget_items_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "budget_items_budget_id_fkey";
            columns: ["budget_id"];
            isOneToOne: false;
            referencedRelation: "budgets";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "budget_items_procedure_id_fkey";
            columns: ["procedure_id"];
            isOneToOne: false;
            referencedRelation: "procedures";
            referencedColumns: ["id"];
          },
        ];
      };
      sessions: {
        Row: {
          id: string;
          tenant_id: string;
          client_id: string;
          budget_id: string | null;
          appointment_id: string | null;
          started_at: string | null;
          ended_at: string | null;
          status: string;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          client_id: string;
          budget_id?: string | null;
          appointment_id?: string | null;
          started_at?: string | null;
          ended_at?: string | null;
          status?: string;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          client_id?: string;
          budget_id?: string | null;
          appointment_id?: string | null;
          started_at?: string | null;
          ended_at?: string | null;
          status?: string;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "sessions_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "sessions_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "sessions_budget_id_fkey";
            columns: ["budget_id"];
            isOneToOne: false;
            referencedRelation: "budgets";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "sessions_appointment_id_fkey";
            columns: ["appointment_id"];
            isOneToOne: false;
            referencedRelation: "appointments";
            referencedColumns: ["id"];
          },
        ];
      };
      stock_items: {
        Row: {
          id: string;
          tenant_id: string;
          name: string;
          sku: string | null;
          unit: string;
          quantity_numeric: number;
          min_quantity: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          name: string;
          sku?: string | null;
          unit?: string;
          quantity_numeric?: number;
          min_quantity?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          name?: string;
          sku?: string | null;
          unit?: string;
          quantity_numeric?: number;
          min_quantity?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "stock_items_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
        ];
      };
      stock_movements: {
        Row: {
          id: string;
          tenant_id: string;
          stock_item_id: string;
          quantity_delta: number;
          reason: string | null;
          ref_type: string | null;
          ref_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          stock_item_id: string;
          quantity_delta: number;
          reason?: string | null;
          ref_type?: string | null;
          ref_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          stock_item_id?: string;
          quantity_delta?: number;
          reason?: string | null;
          ref_type?: string | null;
          ref_id?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "stock_movements_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "stock_movements_stock_item_id_fkey";
            columns: ["stock_item_id"];
            isOneToOne: false;
            referencedRelation: "stock_items";
            referencedColumns: ["id"];
          },
        ];
      };
      contract_templates: {
        Row: {
          id: string;
          tenant_id: string;
          title: string;
          body_html: string | null;
          storage_key: string | null;
          mime_type: string | null;
          is_default: boolean;
          form_schema: Json;
          page_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          title: string;
          body_html?: string | null;
          storage_key?: string | null;
          mime_type?: string | null;
          is_default?: boolean;
          form_schema?: Json;
          page_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          title?: string;
          body_html?: string | null;
          storage_key?: string | null;
          mime_type?: string | null;
          is_default?: boolean;
          form_schema?: Json;
          page_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "contract_templates_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
        ];
      };
      contract_submissions: {
        Row: {
          id: string;
          tenant_id: string;
          client_id: string;
          template_id: string | null;
          mode: "interactive" | "desktop";
          status: "draft" | "submitted" | "signed";
          form_values: Json;
          ink_strokes: Json;
          flattened_pdf_path: string | null;
          signer_name: string | null;
          signed_at: string | null;
          submitted_at: string | null;
          created_by_profile_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          client_id: string;
          template_id?: string | null;
          mode?: "interactive" | "desktop";
          status?: "draft" | "submitted" | "signed";
          form_values?: Json;
          ink_strokes?: Json;
          flattened_pdf_path?: string | null;
          signer_name?: string | null;
          signed_at?: string | null;
          submitted_at?: string | null;
          created_by_profile_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          client_id?: string;
          template_id?: string | null;
          mode?: "interactive" | "desktop";
          status?: "draft" | "submitted" | "signed";
          form_values?: Json;
          ink_strokes?: Json;
          flattened_pdf_path?: string | null;
          signer_name?: string | null;
          signed_at?: string | null;
          submitted_at?: string | null;
          created_by_profile_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      documents: {
        Row: {
          id: string;
          tenant_id: string;
          client_id: string;
          kind: string;
          title: string | null;
          storage_key: string | null;
          mime_type: string | null;
          body_html: string | null;
          source_template_id: string | null;
          responsible_profile_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          client_id: string;
          kind: string;
          title?: string | null;
          storage_key?: string | null;
          mime_type?: string | null;
          body_html?: string | null;
          source_template_id?: string | null;
          responsible_profile_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          client_id?: string;
          kind?: string;
          title?: string | null;
          storage_key?: string | null;
          mime_type?: string | null;
          body_html?: string | null;
          source_template_id?: string | null;
          responsible_profile_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "documents_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "documents_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "documents_responsible_profile_id_fkey";
            columns: ["responsible_profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "documents_source_template_id_fkey";
            columns: ["source_template_id"];
            isOneToOne: false;
            referencedRelation: "contract_templates";
            referencedColumns: ["id"];
          },
        ];
      };
      photos: {
        Row: {
          id: string;
          tenant_id: string;
          client_id: string;
          storage_key: string;
          caption: string | null;
          taken_at: string | null;
          body_region: string;
          capture_angle: string | null;
          purchase_id: string | null;
          comparison_role: string | null;
          evolution_id: string | null;
          evolution_submission_id: string | null;
          phase: string | null;
          captured_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          client_id: string;
          storage_key: string;
          caption?: string | null;
          taken_at?: string | null;
          body_region?: string;
          capture_angle?: string | null;
          purchase_id?: string | null;
          comparison_role?: string | null;
          evolution_id?: string | null;
          evolution_submission_id?: string | null;
          phase?: string | null;
          captured_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          client_id?: string;
          storage_key?: string;
          caption?: string | null;
          taken_at?: string | null;
          body_region?: string;
          capture_angle?: string | null;
          purchase_id?: string | null;
          comparison_role?: string | null;
          evolution_id?: string | null;
          evolution_submission_id?: string | null;
          phase?: string | null;
          captured_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "photos_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "photos_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "photos_purchase_id_fkey";
            columns: ["purchase_id"];
            isOneToOne: false;
            referencedRelation: "client_procedure_purchases";
            referencedColumns: ["id"];
          },
        ];
      };
      signatures: {
        Row: {
          id: string;
          tenant_id: string;
          client_id: string;
          document_id: string | null;
          image_storage_key: string;
          signed_at: string;
          signer_name: string | null;
          signer_role: string | null;
          client_metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          client_id: string;
          document_id?: string | null;
          image_storage_key: string;
          signed_at?: string;
          signer_name?: string | null;
          signer_role?: string | null;
          client_metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          client_id?: string;
          document_id?: string | null;
          image_storage_key?: string;
          signed_at?: string;
          signer_name?: string | null;
          signer_role?: string | null;
          client_metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "signatures_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "signatures_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "signatures_document_id_fkey";
            columns: ["document_id"];
            isOneToOne: false;
            referencedRelation: "documents";
            referencedColumns: ["id"];
          },
        ];
      };
      google_calendar_connections: {
        Row: {
          id: string;
          tenant_id: string;
          profile_id: string;
          google_account_email: string | null;
          calendar_id: string | null;
          refresh_token_ciphertext: string | null;
          access_token_ciphertext: string | null;
          token_expires_at: string | null;
          scopes: string[];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          profile_id: string;
          google_account_email?: string | null;
          calendar_id?: string | null;
          refresh_token_ciphertext?: string | null;
          access_token_ciphertext?: string | null;
          token_expires_at?: string | null;
          scopes?: string[];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          profile_id?: string;
          google_account_email?: string | null;
          calendar_id?: string | null;
          refresh_token_ciphertext?: string | null;
          access_token_ciphertext?: string | null;
          token_expires_at?: string | null;
          scopes?: string[];
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "google_calendar_connections_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "google_calendar_connections_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      branding_assets: {
        Row: {
          id: string;
          tenant_id: string;
          kind: "header" | "footer" | "logo";
          label: string | null;
          storage_key: string;
          mime_type: string;
          width_px: number | null;
          height_px: number | null;
          file_size: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          kind: "header" | "footer" | "logo";
          label?: string | null;
          storage_key: string;
          mime_type: string;
          width_px?: number | null;
          height_px?: number | null;
          file_size?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          kind?: "header" | "footer" | "logo";
          label?: string | null;
          storage_key?: string;
          mime_type?: string;
          width_px?: number | null;
          height_px?: number | null;
          file_size?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "branding_assets_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
        ];
      };
      document_branding_profiles: {
        Row: {
          id: string;
          tenant_id: string;
          name: string;
          is_default: boolean;
          show_header: boolean;
          show_footer: boolean;
          show_logo: boolean;
          header_asset_id: string | null;
          footer_asset_id: string | null;
          logo_asset_id: string | null;
          logo_position:
            | "top-left"
            | "top-center"
            | "top-right"
            | "below-header-left"
            | "below-header-center";
          logo_scale_pct: number;
          header_height_mm: number;
          footer_height_mm: number;
          margin_top_mm: number;
          margin_right_mm: number;
          margin_bottom_mm: number;
          margin_left_mm: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          name: string;
          is_default?: boolean;
          show_header?: boolean;
          show_footer?: boolean;
          show_logo?: boolean;
          header_asset_id?: string | null;
          footer_asset_id?: string | null;
          logo_asset_id?: string | null;
          logo_position?:
            | "top-left"
            | "top-center"
            | "top-right"
            | "below-header-left"
            | "below-header-center";
          logo_scale_pct?: number;
          header_height_mm?: number;
          footer_height_mm?: number;
          margin_top_mm?: number;
          margin_right_mm?: number;
          margin_bottom_mm?: number;
          margin_left_mm?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          name?: string;
          is_default?: boolean;
          show_header?: boolean;
          show_footer?: boolean;
          show_logo?: boolean;
          header_asset_id?: string | null;
          footer_asset_id?: string | null;
          logo_asset_id?: string | null;
          logo_position?:
            | "top-left"
            | "top-center"
            | "top-right"
            | "below-header-left"
            | "below-header-center";
          logo_scale_pct?: number;
          header_height_mm?: number;
          footer_height_mm?: number;
          margin_top_mm?: number;
          margin_right_mm?: number;
          margin_bottom_mm?: number;
          margin_left_mm?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "document_branding_profiles_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "document_branding_profiles_header_asset_id_fkey";
            columns: ["header_asset_id"];
            isOneToOne: false;
            referencedRelation: "branding_assets";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "document_branding_profiles_footer_asset_id_fkey";
            columns: ["footer_asset_id"];
            isOneToOne: false;
            referencedRelation: "branding_assets";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "document_branding_profiles_logo_asset_id_fkey";
            columns: ["logo_asset_id"];
            isOneToOne: false;
            referencedRelation: "branding_assets";
            referencedColumns: ["id"];
          },
        ];
      };
      financial_accounts: {
        Row: {
          id: string;
          tenant_id: string;
          name: string;
          kind: "cash" | "bank" | "wallet" | "other";
          opening_balance_cents: number;
          currency: string;
          is_archived: boolean;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          name: string;
          kind?: "cash" | "bank" | "wallet" | "other";
          opening_balance_cents?: number;
          currency?: string;
          is_archived?: boolean;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          name?: string;
          kind?: "cash" | "bank" | "wallet" | "other";
          opening_balance_cents?: number;
          currency?: string;
          is_archived?: boolean;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      financial_categories: {
        Row: {
          id: string;
          tenant_id: string;
          name: string;
          kind: "income" | "expense";
          parent_id: string | null;
          is_archived: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          name: string;
          kind: "income" | "expense";
          parent_id?: string | null;
          is_archived?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          name?: string;
          kind?: "income" | "expense";
          parent_id?: string | null;
          is_archived?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      financial_payment_methods: {
        Row: {
          id: string;
          tenant_id: string;
          name: string;
          kind:
            | "cash"
            | "pix"
            | "debit_card"
            | "credit_card"
            | "bank_transfer"
            | "other";
          default_account_id: string | null;
          is_archived: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          name: string;
          kind?:
            | "cash"
            | "pix"
            | "debit_card"
            | "credit_card"
            | "bank_transfer"
            | "other";
          default_account_id?: string | null;
          is_archived?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          name?: string;
          kind?:
            | "cash"
            | "pix"
            | "debit_card"
            | "credit_card"
            | "bank_transfer"
            | "other";
          default_account_id?: string | null;
          is_archived?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      financial_transactions: {
        Row: {
          id: string;
          tenant_id: string;
          kind: "income" | "expense";
          status: "pending" | "paid" | "cancelled";
          amount_cents: number;
          description: string | null;
          notes: string | null;
          occurred_on: string;
          due_date: string | null;
          paid_at: string | null;
          account_id: string | null;
          category_id: string | null;
          payment_method_id: string | null;
          client_id: string | null;
          responsible_profile_id: string | null;
          source_kind:
            | "manual"
            | "sale"
            | "budget"
            | "budget_installment"
            | "procedure_purchase"
            | "reversal"
            | null;
          source_id: string | null;
          reverses_transaction_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          kind: "income" | "expense";
          status?: "pending" | "paid" | "cancelled";
          amount_cents: number;
          description?: string | null;
          notes?: string | null;
          occurred_on?: string;
          due_date?: string | null;
          paid_at?: string | null;
          account_id?: string | null;
          category_id?: string | null;
          payment_method_id?: string | null;
          client_id?: string | null;
          responsible_profile_id?: string | null;
          source_kind?:
            | "manual"
            | "sale"
            | "budget"
            | "budget_installment"
            | "procedure_purchase"
            | "reversal"
            | null;
          source_id?: string | null;
          reverses_transaction_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          kind?: "income" | "expense";
          status?: "pending" | "paid" | "cancelled";
          amount_cents?: number;
          description?: string | null;
          notes?: string | null;
          occurred_on?: string;
          due_date?: string | null;
          paid_at?: string | null;
          account_id?: string | null;
          category_id?: string | null;
          payment_method_id?: string | null;
          client_id?: string | null;
          responsible_profile_id?: string | null;
          source_kind?:
            | "manual"
            | "sale"
            | "budget"
            | "budget_installment"
            | "procedure_purchase"
            | "reversal"
            | null;
          source_id?: string | null;
          reverses_transaction_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      user_tenant_id: {
        Args: Record<PropertyKey, never>;
        Returns: string | null;
      };
      appointment_conflict: {
        Args: {
          p_tenant_id: string;
          p_starts_at: string;
          p_ends_at: string;
          p_ignore_id?: string | null;
        };
        Returns: Array<{
          id: string;
          client_id: string;
          starts_at: string;
          ends_at: string;
          title: string | null;
          client_name: string | null;
        }>;
      };
      apply_inventory_movement: {
        Args: {
          p_tenant_id: string;
          p_product_id: string;
          p_delta: number;
          p_reason: Database["clinic"]["Enums"]["inventory_movement_reason"];
          p_note: string | null;
          p_ref_table: string | null;
          p_ref_id: string | null;
          p_profile_id: string | null;
        };
        Returns: Database["clinic"]["Tables"]["inventory_movements"]["Row"];
      };
      consume_appointment_stock: {
        Args: {
          p_tenant_id: string;
          p_appointment_id: string;
          p_items: Json;
          p_profile_id: string | null;
        };
        Returns: undefined;
      };
      update_budget: {
        Args: {
          p_tenant_id: string;
          p_budget_id: string;
          p_title: string;
          p_valid_until: string | null;
          p_discount_cents: number;
          p_items: Json;
        };
        Returns: undefined;
      };
    };
    Enums: {
      inventory_movement_reason:
        | "purchase"
        | "manual_adjustment"
        | "consumption"
        | "sale"
        | "loss"
        | "return";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
  clinic: {
    Enums: {},
  },
} as const;
