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
      acessos_logins: {
        Row: {
          ativo: boolean | null
          categoria: string
          created_at: string
          created_by: string | null
          id: string
          link_acesso: string | null
          login_usuario: string
          nome_acesso: string
          notas_adicionais: string | null
          senha_criptografada: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean | null
          categoria: string
          created_at?: string
          created_by?: string | null
          id?: string
          link_acesso?: string | null
          login_usuario: string
          nome_acesso: string
          notas_adicionais?: string | null
          senha_criptografada: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean | null
          categoria?: string
          created_at?: string
          created_by?: string | null
          id?: string
          link_acesso?: string | null
          login_usuario?: string
          nome_acesso?: string
          notas_adicionais?: string | null
          senha_criptografada?: string
          updated_at?: string
        }
        Relationships: []
      }
      activity_logs: {
        Row: {
          action: string
          created_at: string | null
          details: Json | null
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          details?: Json | null
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_address?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          details?: Json | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      bora_news: {
        Row: {
          autor_id: string | null
          autor_nome: string
          conteudo: string
          created_at: string | null
          data_publicacao: string | null
          destaque: boolean | null
          id: string
          resumo: string | null
          status_publicacao: string | null
          titulo: string
          updated_at: string | null
        }
        Insert: {
          autor_id?: string | null
          autor_nome?: string
          conteudo: string
          created_at?: string | null
          data_publicacao?: string | null
          destaque?: boolean | null
          id?: string
          resumo?: string | null
          status_publicacao?: string | null
          titulo: string
          updated_at?: string | null
        }
        Update: {
          autor_id?: string | null
          autor_nome?: string
          conteudo?: string
          created_at?: string | null
          data_publicacao?: string | null
          destaque?: boolean | null
          id?: string
          resumo?: string | null
          status_publicacao?: string | null
          titulo?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      bora_news_leitura: {
        Row: {
          bora_news_id: string
          created_at: string | null
          data_leitura: string | null
          id: string
          lido: boolean | null
          user_id: string
        }
        Insert: {
          bora_news_id: string
          created_at?: string | null
          data_leitura?: string | null
          id?: string
          lido?: boolean | null
          user_id: string
        }
        Update: {
          bora_news_id?: string
          created_at?: string | null
          data_leitura?: string | null
          id?: string
          lido?: boolean | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bora_news_leitura_bora_news_id_fkey"
            columns: ["bora_news_id"]
            isOneToOne: false
            referencedRelation: "bora_news"
            referencedColumns: ["id"]
          },
        ]
      }
      commissions: {
        Row: {
          commission_percent: number
          commission_value: number
          competence_month: string
          created_at: string | null
          id: string
          installment_id: string
          installment_value: number
          released_at: string | null
          seller_id: string
          status: string
          updated_at: string | null
        }
        Insert: {
          commission_percent: number
          commission_value: number
          competence_month: string
          created_at?: string | null
          id?: string
          installment_id: string
          installment_value: number
          released_at?: string | null
          seller_id: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          commission_percent?: number
          commission_value?: number
          competence_month?: string
          created_at?: string | null
          id?: string
          installment_id?: string
          installment_value?: number
          released_at?: string | null
          seller_id?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "commissions_installment_id_fkey"
            columns: ["installment_id"]
            isOneToOne: true
            referencedRelation: "installments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commissions_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      content_settings: {
        Row: {
          created_at: string | null
          id: string
          key: string
          updated_at: string | null
          value: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          key: string
          updated_at?: string | null
          value: string
        }
        Update: {
          created_at?: string | null
          id?: string
          key?: string
          updated_at?: string | null
          value?: string
        }
        Relationships: []
      }
      copy_bank: {
        Row: {
          author_id: string | null
          author_name: string
          channel: string
          content: string
          created_at: string
          funnel_id: string | null
          funnel_name: string | null
          funnel_stage: string | null
          id: string
          name: string
          product_name: string | null
          scheduled_for: string | null
          tags: string[] | null
          updated_at: string
        }
        Insert: {
          author_id?: string | null
          author_name: string
          channel: string
          content: string
          created_at?: string
          funnel_id?: string | null
          funnel_name?: string | null
          funnel_stage?: string | null
          id?: string
          name: string
          product_name?: string | null
          scheduled_for?: string | null
          tags?: string[] | null
          updated_at?: string
        }
        Update: {
          author_id?: string | null
          author_name?: string
          channel?: string
          content?: string
          created_at?: string
          funnel_id?: string | null
          funnel_name?: string | null
          funnel_stage?: string | null
          id?: string
          name?: string
          product_name?: string | null
          scheduled_for?: string | null
          tags?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "copy_bank_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "copy_bank_funnel_id_fkey"
            columns: ["funnel_id"]
            isOneToOne: false
            referencedRelation: "funnels"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          id: string
          level: string | null
          thumbnail_url: string | null
          title: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          level?: string | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          level?: string | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      csv_column_mappings: {
        Row: {
          created_at: string | null
          id: string
          mapping: Json
          platform: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          mapping: Json
          platform: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          mapping?: Json
          platform?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "csv_column_mappings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      csv_imports: {
        Row: {
          created_at: string | null
          error_log: Json | null
          filename: string
          id: string
          imported_by: string
          platform: string
          records_created: number | null
          records_failed: number | null
          records_processed: number | null
          records_updated: number | null
        }
        Insert: {
          created_at?: string | null
          error_log?: Json | null
          filename: string
          id?: string
          imported_by: string
          platform: string
          records_created?: number | null
          records_failed?: number | null
          records_processed?: number | null
          records_updated?: number | null
        }
        Update: {
          created_at?: string | null
          error_log?: Json | null
          filename?: string
          id?: string
          imported_by?: string
          platform?: string
          records_created?: number | null
          records_failed?: number | null
          records_processed?: number | null
          records_updated?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "csv_imports_imported_by_fkey"
            columns: ["imported_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      departments: {
        Row: {
          color: string | null
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      documents: {
        Row: {
          category: string | null
          content: string | null
          created_at: string
          google_docs_url: string | null
          icon: string | null
          id: string
          is_favorite: boolean | null
          is_public: boolean | null
          slug: string | null
          title: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          content?: string | null
          created_at?: string
          google_docs_url?: string | null
          icon?: string | null
          id?: string
          is_favorite?: boolean | null
          is_public?: boolean | null
          slug?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          content?: string | null
          created_at?: string
          google_docs_url?: string | null
          icon?: string | null
          id?: string
          is_favorite?: boolean | null
          is_public?: boolean | null
          slug?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      editorial_lines: {
        Row: {
          created_at: string
          day_of_week: string
          id: string
          intention: string
          profile_id: string | null
          week_start_date: string
        }
        Insert: {
          created_at?: string
          day_of_week: string
          id?: string
          intention: string
          profile_id?: string | null
          week_start_date: string
        }
        Update: {
          created_at?: string
          day_of_week?: string
          id?: string
          intention?: string
          profile_id?: string | null
          week_start_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "editorial_lines_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "social_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          color: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          duration_minutes: number | null
          event_date: string
          event_time: string
          event_type: string | null
          id: string
          is_recurring_instance: boolean | null
          location: string | null
          meeting_link: string | null
          parent_event_id: string | null
          recurrence: Database["public"]["Enums"]["recurrence_type"] | null
          recurrence_end_date: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          duration_minutes?: number | null
          event_date: string
          event_time: string
          event_type?: string | null
          id?: string
          is_recurring_instance?: boolean | null
          location?: string | null
          meeting_link?: string | null
          parent_event_id?: string | null
          recurrence?: Database["public"]["Enums"]["recurrence_type"] | null
          recurrence_end_date?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          duration_minutes?: number | null
          event_date?: string
          event_time?: string
          event_type?: string | null
          id?: string
          is_recurring_instance?: boolean | null
          location?: string | null
          meeting_link?: string | null
          parent_event_id?: string | null
          recurrence?: Database["public"]["Enums"]["recurrence_type"] | null
          recurrence_end_date?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_parent_event_id_fkey"
            columns: ["parent_event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      funnel_checklist: {
        Row: {
          assigned_to: string | null
          created_at: string | null
          description: string | null
          funnel_id: string
          id: string
          is_completed: boolean | null
          linked_task_id: string | null
          order_index: number | null
          task_due_date: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string | null
          description?: string | null
          funnel_id: string
          id?: string
          is_completed?: boolean | null
          linked_task_id?: string | null
          order_index?: number | null
          task_due_date?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          created_at?: string | null
          description?: string | null
          funnel_id?: string
          id?: string
          is_completed?: boolean | null
          linked_task_id?: string | null
          order_index?: number | null
          task_due_date?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "funnel_checklist_funnel_id_fkey"
            columns: ["funnel_id"]
            isOneToOne: false
            referencedRelation: "funnels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "funnel_checklist_linked_task_id_fkey"
            columns: ["linked_task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      funnel_diary: {
        Row: {
          author_id: string | null
          author_name: string
          content: string
          created_at: string | null
          funnel_id: string
          id: string
        }
        Insert: {
          author_id?: string | null
          author_name?: string
          content: string
          created_at?: string | null
          funnel_id: string
          id?: string
        }
        Update: {
          author_id?: string | null
          author_name?: string
          content?: string
          created_at?: string | null
          funnel_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "funnel_diary_funnel_id_fkey"
            columns: ["funnel_id"]
            isOneToOne: false
            referencedRelation: "funnels"
            referencedColumns: ["id"]
          },
        ]
      }
      funnel_events: {
        Row: {
          created_at: string
          event_id: string
          funnel_id: string
          id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          funnel_id: string
          id?: string
        }
        Update: {
          created_at?: string
          event_id?: string
          funnel_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "funnel_events_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "funnel_events_funnel_id_fkey"
            columns: ["funnel_id"]
            isOneToOne: false
            referencedRelation: "funnels"
            referencedColumns: ["id"]
          },
        ]
      }
      funnel_links: {
        Row: {
          created_at: string | null
          funnel_id: string
          id: string
          link_type: string
          name: string
          updated_at: string | null
          url: string | null
        }
        Insert: {
          created_at?: string | null
          funnel_id: string
          id?: string
          link_type: string
          name: string
          updated_at?: string | null
          url?: string | null
        }
        Update: {
          created_at?: string | null
          funnel_id?: string
          id?: string
          link_type?: string
          name?: string
          updated_at?: string | null
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "funnel_links_funnel_id_fkey"
            columns: ["funnel_id"]
            isOneToOne: false
            referencedRelation: "funnels"
            referencedColumns: ["id"]
          },
        ]
      }
      funnel_products: {
        Row: {
          created_at: string | null
          funnel_id: string
          id: string
          product_id: string
        }
        Insert: {
          created_at?: string | null
          funnel_id: string
          id?: string
          product_id: string
        }
        Update: {
          created_at?: string | null
          funnel_id?: string
          id?: string
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "funnel_products_funnel_id_fkey"
            columns: ["funnel_id"]
            isOneToOne: false
            referencedRelation: "funnels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "funnel_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      funnel_sales_products: {
        Row: {
          created_at: string | null
          funnel_id: string
          id: string
          product_name: string
        }
        Insert: {
          created_at?: string | null
          funnel_id: string
          id?: string
          product_name: string
        }
        Update: {
          created_at?: string | null
          funnel_id?: string
          id?: string
          product_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "funnel_sales_products_funnel_id_fkey"
            columns: ["funnel_id"]
            isOneToOne: false
            referencedRelation: "funnels"
            referencedColumns: ["id"]
          },
        ]
      }
      funnels: {
        Row: {
          aquecimento_end: string | null
          aquecimento_start: string | null
          briefing_link: string | null
          budget_aquecimento_percent: number | null
          budget_captacao_percent: number | null
          budget_evento_percent: number | null
          budget_impulsionamento_percent: number | null
          budget_lembrete_percent: number | null
          budget_venda_percent: number | null
          captacao_end: string | null
          captacao_start: string | null
          carrinho_start: string | null
          category: string | null
          client: string | null
          code: string | null
          cpl_end: string | null
          cpl_goal: number | null
          cpl_start: string | null
          created_at: string
          dashboard_link: string | null
          drive_link: string | null
          fechamento_date: string | null
          funnel_type: string | null
          id: string
          is_active: boolean | null
          launch_type: string | null
          leads_goal: number | null
          lembrete_start: string | null
          lesson_type: string | null
          manager: string | null
          name: string
          predicted_investment: number | null
          product_name: string | null
          status: string | null
          ticket_medio: number | null
          updated_at: string
          visibility: string | null
        }
        Insert: {
          aquecimento_end?: string | null
          aquecimento_start?: string | null
          briefing_link?: string | null
          budget_aquecimento_percent?: number | null
          budget_captacao_percent?: number | null
          budget_evento_percent?: number | null
          budget_impulsionamento_percent?: number | null
          budget_lembrete_percent?: number | null
          budget_venda_percent?: number | null
          captacao_end?: string | null
          captacao_start?: string | null
          carrinho_start?: string | null
          category?: string | null
          client?: string | null
          code?: string | null
          cpl_end?: string | null
          cpl_goal?: number | null
          cpl_start?: string | null
          created_at?: string
          dashboard_link?: string | null
          drive_link?: string | null
          fechamento_date?: string | null
          funnel_type?: string | null
          id?: string
          is_active?: boolean | null
          launch_type?: string | null
          leads_goal?: number | null
          lembrete_start?: string | null
          lesson_type?: string | null
          manager?: string | null
          name: string
          predicted_investment?: number | null
          product_name?: string | null
          status?: string | null
          ticket_medio?: number | null
          updated_at?: string
          visibility?: string | null
        }
        Update: {
          aquecimento_end?: string | null
          aquecimento_start?: string | null
          briefing_link?: string | null
          budget_aquecimento_percent?: number | null
          budget_captacao_percent?: number | null
          budget_evento_percent?: number | null
          budget_impulsionamento_percent?: number | null
          budget_lembrete_percent?: number | null
          budget_venda_percent?: number | null
          captacao_end?: string | null
          captacao_start?: string | null
          carrinho_start?: string | null
          category?: string | null
          client?: string | null
          code?: string | null
          cpl_end?: string | null
          cpl_goal?: number | null
          cpl_start?: string | null
          created_at?: string
          dashboard_link?: string | null
          drive_link?: string | null
          fechamento_date?: string | null
          funnel_type?: string | null
          id?: string
          is_active?: boolean | null
          launch_type?: string | null
          leads_goal?: number | null
          lembrete_start?: string | null
          lesson_type?: string | null
          manager?: string | null
          name?: string
          predicted_investment?: number | null
          product_name?: string | null
          status?: string | null
          ticket_medio?: number | null
          updated_at?: string
          visibility?: string | null
        }
        Relationships: []
      }
      hotmart_sync_logs: {
        Row: {
          completed_at: string | null
          created_at: string
          created_records: number | null
          details: Json | null
          error_message: string | null
          failed_records: number | null
          id: string
          started_at: string
          status: string
          sync_type: string
          total_records: number | null
          updated_records: number | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          created_records?: number | null
          details?: Json | null
          error_message?: string | null
          failed_records?: number | null
          id?: string
          started_at?: string
          status?: string
          sync_type: string
          total_records?: number | null
          updated_records?: number | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          created_records?: number | null
          details?: Json | null
          error_message?: string | null
          failed_records?: number | null
          id?: string
          started_at?: string
          status?: string
          sync_type?: string
          total_records?: number | null
          updated_records?: number | null
        }
        Relationships: []
      }
      ia_agents: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
          prompt: string
          type: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          prompt: string
          type?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          prompt?: string
          type?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      installments: {
        Row: {
          created_at: string | null
          due_date: string
          external_installment_id: string | null
          id: string
          installment_number: number
          payment_date: string | null
          sale_id: string
          status: string
          total_installments: number
          updated_at: string | null
          value: number
        }
        Insert: {
          created_at?: string | null
          due_date: string
          external_installment_id?: string | null
          id?: string
          installment_number: number
          payment_date?: string | null
          sale_id: string
          status?: string
          total_installments: number
          updated_at?: string | null
          value: number
        }
        Update: {
          created_at?: string | null
          due_date?: string
          external_installment_id?: string | null
          id?: string
          installment_number?: number
          payment_date?: string | null
          sale_id?: string
          status?: string
          total_installments?: number
          updated_at?: string | null
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "installments_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      lessons: {
        Row: {
          course_id: string
          created_at: string
          description: string | null
          duration: number | null
          id: string
          position: number | null
          title: string
          updated_at: string
          video_url: string | null
        }
        Insert: {
          course_id: string
          created_at?: string
          description?: string | null
          duration?: number | null
          id?: string
          position?: number | null
          title: string
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          course_id?: string
          created_at?: string
          description?: string | null
          duration?: number | null
          id?: string
          position?: number | null
          title?: string
          updated_at?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lessons_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      links: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          favicon: string | null
          id: string
          is_favorite: boolean | null
          name: string
          order_index: number | null
          updated_at: string
          url: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          favicon?: string | null
          id?: string
          is_favorite?: boolean | null
          name: string
          order_index?: number | null
          updated_at?: string
          url: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          favicon?: string | null
          id?: string
          is_favorite?: boolean | null
          name?: string
          order_index?: number | null
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
      meeting_blocks: {
        Row: {
          content: string
          created_at: string
          id: string
          linked_task_id: string | null
          meeting_id: string
          order_index: number
          updated_at: string
        }
        Insert: {
          content?: string
          created_at?: string
          id?: string
          linked_task_id?: string | null
          meeting_id: string
          order_index?: number
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          linked_task_id?: string | null
          meeting_id?: string
          order_index?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_blocks_linked_task_id_fkey"
            columns: ["linked_task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_blocks_meeting_id_fkey"
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
          created_by: string | null
          id: string
          meeting_date: string
          meeting_time: string | null
          participants: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          meeting_date?: string
          meeting_time?: string | null
          participants?: string[] | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          meeting_date?: string
          meeting_time?: string | null
          participants?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meetings_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          message: string
          read: boolean | null
          read_at: string | null
          recipient_id: string | null
          sender_id: string | null
          title: string
          type: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          message: string
          read?: boolean | null
          read_at?: string | null
          recipient_id?: string | null
          sender_id?: string | null
          title: string
          type?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          message?: string
          read?: boolean | null
          read_at?: string | null
          recipient_id?: string | null
          sender_id?: string | null
          title?: string
          type?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pdi_acessos: {
        Row: {
          categoria: string | null
          created_at: string
          id: string
          link: string | null
          nome: string
          pdi_id: string
        }
        Insert: {
          categoria?: string | null
          created_at?: string
          id?: string
          link?: string | null
          nome: string
          pdi_id: string
        }
        Update: {
          categoria?: string | null
          created_at?: string
          id?: string
          link?: string | null
          nome?: string
          pdi_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pdi_acessos_pdi_id_fkey"
            columns: ["pdi_id"]
            isOneToOne: false
            referencedRelation: "pdis"
            referencedColumns: ["id"]
          },
        ]
      }
      pdi_aulas: {
        Row: {
          concluida_em: string | null
          created_at: string
          curso_origem: string | null
          duracao_minutos: number | null
          id: string
          lesson_id: string | null
          link_externo: string | null
          ordem: number
          origem: string
          pdi_id: string
          status: string
          titulo: string
        }
        Insert: {
          concluida_em?: string | null
          created_at?: string
          curso_origem?: string | null
          duracao_minutos?: number | null
          id?: string
          lesson_id?: string | null
          link_externo?: string | null
          ordem?: number
          origem?: string
          pdi_id: string
          status?: string
          titulo: string
        }
        Update: {
          concluida_em?: string | null
          created_at?: string
          curso_origem?: string | null
          duracao_minutos?: number | null
          id?: string
          lesson_id?: string | null
          link_externo?: string | null
          ordem?: number
          origem?: string
          pdi_id?: string
          status?: string
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "pdi_aulas_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pdi_aulas_pdi_id_fkey"
            columns: ["pdi_id"]
            isOneToOne: false
            referencedRelation: "pdis"
            referencedColumns: ["id"]
          },
        ]
      }
      pdis: {
        Row: {
          colaborador_id: string
          criado_em: string
          criado_por: string | null
          data_limite: string
          descricao: string | null
          finalizado_em: string | null
          id: string
          status: string
          titulo: string
          updated_at: string
        }
        Insert: {
          colaborador_id: string
          criado_em?: string
          criado_por?: string | null
          data_limite: string
          descricao?: string | null
          finalizado_em?: string | null
          id?: string
          status?: string
          titulo: string
          updated_at?: string
        }
        Update: {
          colaborador_id?: string
          criado_em?: string
          criado_por?: string | null
          data_limite?: string
          descricao?: string | null
          finalizado_em?: string | null
          id?: string
          status?: string
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pdis_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pdis_criado_por_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      post_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          is_adjustment: boolean | null
          post_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_adjustment?: boolean | null
          post_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_adjustment?: boolean | null
          post_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "social_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_history: {
        Row: {
          action: string
          created_at: string
          field_changed: string | null
          id: string
          new_value: string | null
          old_value: string | null
          post_id: string
        }
        Insert: {
          action: string
          created_at?: string
          field_changed?: string | null
          id?: string
          new_value?: string | null
          old_value?: string | null
          post_id: string
        }
        Update: {
          action?: string
          created_at?: string
          field_changed?: string | null
          id?: string
          new_value?: string | null
          old_value?: string | null
          post_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_history_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "social_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          created_at: string | null
          default_commission_percent: number
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          price: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          default_commission_percent?: number
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          price?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          default_commission_percent?: number
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          price?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          birth_date: string | null
          created_at: string | null
          department_id: string | null
          display_name: string | null
          email: string
          favorite_tools: string[] | null
          full_name: string
          hire_date: string | null
          id: string
          is_active: boolean | null
          job_title: string | null
          last_login_at: string | null
          must_change_password: boolean | null
          notification_settings: Json | null
          phone: string | null
          theme_preference: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          birth_date?: string | null
          created_at?: string | null
          department_id?: string | null
          display_name?: string | null
          email: string
          favorite_tools?: string[] | null
          full_name: string
          hire_date?: string | null
          id: string
          is_active?: boolean | null
          job_title?: string | null
          last_login_at?: string | null
          must_change_password?: boolean | null
          notification_settings?: Json | null
          phone?: string | null
          theme_preference?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          birth_date?: string | null
          created_at?: string | null
          department_id?: string | null
          display_name?: string | null
          email?: string
          favorite_tools?: string[] | null
          full_name?: string
          hire_date?: string | null
          id?: string
          is_active?: boolean | null
          job_title?: string | null
          last_login_at?: string | null
          must_change_password?: boolean | null
          notification_settings?: Json | null
          phone?: string | null
          theme_preference?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_diagnoses: {
        Row: {
          action_plan: string | null
          color: string | null
          created_at: string | null
          description: string | null
          icon: string | null
          id: string
          insights: Json | null
          max_score: number | null
          min_score: number | null
          priority: number | null
          quiz_id: string
          required_tags: Json | null
          scoring_axis: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          action_plan?: string | null
          color?: string | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          insights?: Json | null
          max_score?: number | null
          min_score?: number | null
          priority?: number | null
          quiz_id: string
          required_tags?: Json | null
          scoring_axis?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          action_plan?: string | null
          color?: string | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          insights?: Json | null
          max_score?: number | null
          min_score?: number | null
          priority?: number | null
          quiz_id?: string
          required_tags?: Json | null
          scoring_axis?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quiz_diagnoses_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_leads: {
        Row: {
          city: string | null
          company: string | null
          consent_timestamp: string | null
          created_at: string | null
          custom_fields: Json | null
          email: string | null
          id: string
          lgpd_consent: boolean | null
          name: string | null
          quiz_id: string
          session_id: string
          state: string | null
          whatsapp: string | null
        }
        Insert: {
          city?: string | null
          company?: string | null
          consent_timestamp?: string | null
          created_at?: string | null
          custom_fields?: Json | null
          email?: string | null
          id?: string
          lgpd_consent?: boolean | null
          name?: string | null
          quiz_id: string
          session_id: string
          state?: string | null
          whatsapp?: string | null
        }
        Update: {
          city?: string | null
          company?: string | null
          consent_timestamp?: string | null
          created_at?: string | null
          custom_fields?: Json | null
          email?: string | null
          id?: string
          lgpd_consent?: boolean | null
          name?: string | null
          quiz_id?: string
          session_id?: string
          state?: string | null
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quiz_leads_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_leads_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "quiz_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_options: {
        Row: {
          created_at: string | null
          id: string
          image_url: string | null
          jump_to_diagnosis_id: string | null
          jump_to_question_id: string | null
          option_text: string
          points: number | null
          position: number
          question_id: string
          scoring_values: Json | null
          tags: Json | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          image_url?: string | null
          jump_to_diagnosis_id?: string | null
          jump_to_question_id?: string | null
          option_text: string
          points?: number | null
          position?: number
          question_id: string
          scoring_values?: Json | null
          tags?: Json | null
        }
        Update: {
          created_at?: string | null
          id?: string
          image_url?: string | null
          jump_to_diagnosis_id?: string | null
          jump_to_question_id?: string | null
          option_text?: string
          points?: number | null
          position?: number
          question_id?: string
          scoring_values?: Json | null
          tags?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "quiz_options_jump_to_diagnosis_id_fkey"
            columns: ["jump_to_diagnosis_id"]
            isOneToOne: false
            referencedRelation: "quiz_diagnoses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_options_jump_to_question_id_fkey"
            columns: ["jump_to_question_id"]
            isOneToOne: false
            referencedRelation: "quiz_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_options_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "quiz_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_questions: {
        Row: {
          content_author_image: string | null
          content_author_name: string | null
          content_author_role: string | null
          content_body: string | null
          content_title: string | null
          created_at: string | null
          helper_text: string | null
          id: string
          image_url: string | null
          is_required: boolean | null
          position: number
          question_text: string
          question_type: string
          quiz_id: string
          scale_max: number | null
          scale_max_label: string | null
          scale_min: number | null
          scale_min_label: string | null
          scoring_axis: string | null
          updated_at: string | null
          video_url: string | null
        }
        Insert: {
          content_author_image?: string | null
          content_author_name?: string | null
          content_author_role?: string | null
          content_body?: string | null
          content_title?: string | null
          created_at?: string | null
          helper_text?: string | null
          id?: string
          image_url?: string | null
          is_required?: boolean | null
          position?: number
          question_text: string
          question_type?: string
          quiz_id: string
          scale_max?: number | null
          scale_max_label?: string | null
          scale_min?: number | null
          scale_min_label?: string | null
          scoring_axis?: string | null
          updated_at?: string | null
          video_url?: string | null
        }
        Update: {
          content_author_image?: string | null
          content_author_name?: string | null
          content_author_role?: string | null
          content_body?: string | null
          content_title?: string | null
          created_at?: string | null
          helper_text?: string | null
          id?: string
          image_url?: string | null
          is_required?: boolean | null
          position?: number
          question_text?: string
          question_type?: string
          quiz_id?: string
          scale_max?: number | null
          scale_max_label?: string | null
          scale_min?: number | null
          scale_min_label?: string | null
          scoring_axis?: string | null
          updated_at?: string | null
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quiz_questions_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_responses: {
        Row: {
          answered_at: string | null
          id: string
          number_response: number | null
          points_earned: number | null
          question_id: string
          scale_response: number | null
          selected_option_ids: Json | null
          session_id: string
          tags_collected: Json | null
          text_response: string | null
          time_spent_seconds: number | null
        }
        Insert: {
          answered_at?: string | null
          id?: string
          number_response?: number | null
          points_earned?: number | null
          question_id: string
          scale_response?: number | null
          selected_option_ids?: Json | null
          session_id: string
          tags_collected?: Json | null
          text_response?: string | null
          time_spent_seconds?: number | null
        }
        Update: {
          answered_at?: string | null
          id?: string
          number_response?: number | null
          points_earned?: number | null
          question_id?: string
          scale_response?: number | null
          selected_option_ids?: Json | null
          session_id?: string
          tags_collected?: Json | null
          text_response?: string | null
          time_spent_seconds?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "quiz_responses_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "quiz_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_responses_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "quiz_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_sessions: {
        Row: {
          ai_generated_diagnosis: string | null
          collected_tags: Json | null
          completed_at: string | null
          created_at: string | null
          device_type: string | null
          diagnosis_id: string | null
          id: string
          ip_address: string | null
          quiz_id: string
          referrer: string | null
          scores_by_axis: Json | null
          started_at: string | null
          status: string
          total_score: number | null
          user_agent: string | null
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
        }
        Insert: {
          ai_generated_diagnosis?: string | null
          collected_tags?: Json | null
          completed_at?: string | null
          created_at?: string | null
          device_type?: string | null
          diagnosis_id?: string | null
          id?: string
          ip_address?: string | null
          quiz_id: string
          referrer?: string | null
          scores_by_axis?: Json | null
          started_at?: string | null
          status?: string
          total_score?: number | null
          user_agent?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Update: {
          ai_generated_diagnosis?: string | null
          collected_tags?: Json | null
          completed_at?: string | null
          created_at?: string | null
          device_type?: string | null
          diagnosis_id?: string | null
          id?: string
          ip_address?: string | null
          quiz_id?: string
          referrer?: string | null
          scores_by_axis?: Json | null
          started_at?: string | null
          status?: string
          total_score?: number | null
          user_agent?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quiz_sessions_diagnosis_id_fkey"
            columns: ["diagnosis_id"]
            isOneToOne: false
            referencedRelation: "quiz_diagnoses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_sessions_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      quizzes: {
        Row: {
          ai_prompt_template: string | null
          background_color: string | null
          completions_count: number | null
          created_at: string | null
          created_by: string | null
          description: string | null
          diagnosis_type: string | null
          final_cta_text: string | null
          final_cta_url: string | null
          final_cta_whatsapp: string | null
          id: string
          intro_cta_text: string | null
          intro_image_url: string | null
          intro_subtitle: string | null
          intro_text: string | null
          intro_title: string | null
          intro_video_url: string | null
          lead_capture_enabled: boolean | null
          lead_capture_position: string | null
          lead_fields: Json | null
          lead_required_fields: Json | null
          leads_count: number | null
          lgpd_consent_text: string | null
          primary_color: string | null
          privacy_text: string | null
          result_image_url: string | null
          result_layout: string | null
          result_subtitle: string | null
          result_title: string | null
          result_video_url: string | null
          show_progress_bar: boolean | null
          slug: string
          starts_count: number | null
          status: string
          title: string
          updated_at: string | null
          views_count: number | null
        }
        Insert: {
          ai_prompt_template?: string | null
          background_color?: string | null
          completions_count?: number | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          diagnosis_type?: string | null
          final_cta_text?: string | null
          final_cta_url?: string | null
          final_cta_whatsapp?: string | null
          id?: string
          intro_cta_text?: string | null
          intro_image_url?: string | null
          intro_subtitle?: string | null
          intro_text?: string | null
          intro_title?: string | null
          intro_video_url?: string | null
          lead_capture_enabled?: boolean | null
          lead_capture_position?: string | null
          lead_fields?: Json | null
          lead_required_fields?: Json | null
          leads_count?: number | null
          lgpd_consent_text?: string | null
          primary_color?: string | null
          privacy_text?: string | null
          result_image_url?: string | null
          result_layout?: string | null
          result_subtitle?: string | null
          result_title?: string | null
          result_video_url?: string | null
          show_progress_bar?: boolean | null
          slug: string
          starts_count?: number | null
          status?: string
          title: string
          updated_at?: string | null
          views_count?: number | null
        }
        Update: {
          ai_prompt_template?: string | null
          background_color?: string | null
          completions_count?: number | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          diagnosis_type?: string | null
          final_cta_text?: string | null
          final_cta_url?: string | null
          final_cta_whatsapp?: string | null
          id?: string
          intro_cta_text?: string | null
          intro_image_url?: string | null
          intro_subtitle?: string | null
          intro_text?: string | null
          intro_title?: string | null
          intro_video_url?: string | null
          lead_capture_enabled?: boolean | null
          lead_capture_position?: string | null
          lead_fields?: Json | null
          lead_required_fields?: Json | null
          leads_count?: number | null
          lgpd_consent_text?: string | null
          primary_color?: string | null
          privacy_text?: string | null
          result_image_url?: string | null
          result_layout?: string | null
          result_subtitle?: string | null
          result_title?: string | null
          result_video_url?: string | null
          show_progress_bar?: boolean | null
          slug?: string
          starts_count?: number | null
          status?: string
          title?: string
          updated_at?: string | null
          views_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "quizzes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      report_attachments: {
        Row: {
          created_at: string
          file_name: string
          file_path: string
          file_size: number | null
          id: string
          mime_type: string | null
          report_id: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          file_name: string
          file_path: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          report_id: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          file_name?: string
          file_path?: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          report_id?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "report_attachments_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
        ]
      }
      report_folders: {
        Row: {
          color: string | null
          created_at: string
          created_by: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      reports: {
        Row: {
          ai_suggestions: Json | null
          content_html: string | null
          content_markdown: string | null
          created_at: string
          filters: Json | null
          folder_id: string | null
          generated_at: string | null
          generated_by: string | null
          id: string
          pdf_path: string | null
          period_end: string
          period_start: string
          report_type: string
          scope: Json
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          ai_suggestions?: Json | null
          content_html?: string | null
          content_markdown?: string | null
          created_at?: string
          filters?: Json | null
          folder_id?: string | null
          generated_at?: string | null
          generated_by?: string | null
          id?: string
          pdf_path?: string | null
          period_end: string
          period_start: string
          report_type?: string
          scope?: Json
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          ai_suggestions?: Json | null
          content_html?: string | null
          content_markdown?: string | null
          created_at?: string
          filters?: Json | null
          folder_id?: string | null
          generated_at?: string | null
          generated_by?: string | null
          id?: string
          pdf_path?: string | null
          period_end?: string
          period_start?: string
          report_type?: string
          scope?: Json
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "report_folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_generated_by_fkey"
            columns: ["generated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          client_email: string | null
          client_name: string
          client_phone: string | null
          commission_percent: number
          created_at: string | null
          created_by: string | null
          external_id: string
          funnel_source: string | null
          id: string
          installments_count: number
          payment_type: string | null
          platform: string
          product_id: string | null
          product_name: string
          proof_link: string | null
          sale_date: string
          seller_id: string | null
          status: string
          total_value: number
          tracking_external_code: string | null
          tracking_source: string | null
          tracking_source_sck: string | null
          updated_at: string | null
        }
        Insert: {
          client_email?: string | null
          client_name: string
          client_phone?: string | null
          commission_percent: number
          created_at?: string | null
          created_by?: string | null
          external_id: string
          funnel_source?: string | null
          id?: string
          installments_count?: number
          payment_type?: string | null
          platform: string
          product_id?: string | null
          product_name: string
          proof_link?: string | null
          sale_date: string
          seller_id?: string | null
          status?: string
          total_value: number
          tracking_external_code?: string | null
          tracking_source?: string | null
          tracking_source_sck?: string | null
          updated_at?: string | null
        }
        Update: {
          client_email?: string | null
          client_name?: string
          client_phone?: string | null
          commission_percent?: number
          created_at?: string | null
          created_by?: string | null
          external_id?: string
          funnel_source?: string | null
          id?: string
          installments_count?: number
          payment_type?: string | null
          platform?: string
          product_id?: string | null
          product_name?: string
          proof_link?: string | null
          sale_date?: string
          seller_id?: string | null
          status?: string
          total_value?: number
          tracking_external_code?: string | null
          tracking_source?: string | null
          tracking_source_sck?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      sdr_assignments: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          commission_percent: number
          created_at: string | null
          created_by: string | null
          id: string
          proof_link: string
          rejection_reason: string | null
          sale_id: string
          sdr_id: string
          status: string
          updated_at: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          commission_percent?: number
          created_at?: string | null
          created_by?: string | null
          id?: string
          proof_link: string
          rejection_reason?: string | null
          sale_id: string
          sdr_id: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          commission_percent?: number
          created_at?: string | null
          created_by?: string | null
          id?: string
          proof_link?: string
          rejection_reason?: string | null
          sale_id?: string
          sdr_id?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sdr_assignments_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sdr_assignments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sdr_assignments_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: true
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sdr_assignments_sdr_id_fkey"
            columns: ["sdr_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      sdr_commissions: {
        Row: {
          commission_percent: number
          commission_value: number
          competence_month: string
          created_at: string | null
          id: string
          installment_id: string
          installment_value: number
          released_at: string | null
          sdr_assignment_id: string
          sdr_id: string
          status: string
          updated_at: string | null
        }
        Insert: {
          commission_percent?: number
          commission_value: number
          competence_month: string
          created_at?: string | null
          id?: string
          installment_id: string
          installment_value: number
          released_at?: string | null
          sdr_assignment_id: string
          sdr_id: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          commission_percent?: number
          commission_value?: number
          competence_month?: string
          created_at?: string | null
          id?: string
          installment_id?: string
          installment_value?: number
          released_at?: string | null
          sdr_assignment_id?: string
          sdr_id?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sdr_commissions_installment_id_fkey"
            columns: ["installment_id"]
            isOneToOne: true
            referencedRelation: "installments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sdr_commissions_sdr_assignment_id_fkey"
            columns: ["sdr_assignment_id"]
            isOneToOne: false
            referencedRelation: "sdr_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sdr_commissions_sdr_id_fkey"
            columns: ["sdr_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      social_posts: {
        Row: {
          arquivos_link: string | null
          big_idea: string | null
          campos_extras: Json | null
          created_at: string
          current_assignee_id: string | null
          day_of_week: string | null
          deadline: string | null
          editorial_line_id: string | null
          id: string
          post_type: string
          profile_id: string | null
          roteiro: string | null
          scheduled_date: string
          start_date: string | null
          status: string
          theme: string | null
          updated_at: string
          video_url: string | null
        }
        Insert: {
          arquivos_link?: string | null
          big_idea?: string | null
          campos_extras?: Json | null
          created_at?: string
          current_assignee_id?: string | null
          day_of_week?: string | null
          deadline?: string | null
          editorial_line_id?: string | null
          id?: string
          post_type?: string
          profile_id?: string | null
          roteiro?: string | null
          scheduled_date: string
          start_date?: string | null
          status?: string
          theme?: string | null
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          arquivos_link?: string | null
          big_idea?: string | null
          campos_extras?: Json | null
          created_at?: string
          current_assignee_id?: string | null
          day_of_week?: string | null
          deadline?: string | null
          editorial_line_id?: string | null
          id?: string
          post_type?: string
          profile_id?: string | null
          roteiro?: string | null
          scheduled_date?: string
          start_date?: string | null
          status?: string
          theme?: string | null
          updated_at?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "social_posts_editorial_line_id_fkey"
            columns: ["editorial_line_id"]
            isOneToOne: false
            referencedRelation: "editorial_lines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_posts_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "social_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      social_profiles: {
        Row: {
          color: string | null
          created_at: string
          icon: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      sponsor_event_links: {
        Row: {
          created_at: string | null
          event_id: string
          id: string
          sponsor_id: string
        }
        Insert: {
          created_at?: string | null
          event_id: string
          id?: string
          sponsor_id: string
        }
        Update: {
          created_at?: string | null
          event_id?: string
          id?: string
          sponsor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sponsor_event_links_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "sponsor_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sponsor_event_links_sponsor_id_fkey"
            columns: ["sponsor_id"]
            isOneToOne: false
            referencedRelation: "sponsors"
            referencedColumns: ["id"]
          },
        ]
      }
      sponsor_events: {
        Row: {
          color: string | null
          created_at: string | null
          description: string | null
          end_date: string | null
          id: string
          is_active: boolean | null
          name: string
          start_date: string | null
          updated_at: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          start_date?: string | null
          updated_at?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          start_date?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      sponsor_stage_history: {
        Row: {
          changed_at: string | null
          changed_by: string | null
          changed_by_name: string | null
          id: string
          new_stage: string
          previous_stage: string | null
          sponsor_id: string
        }
        Insert: {
          changed_at?: string | null
          changed_by?: string | null
          changed_by_name?: string | null
          id?: string
          new_stage: string
          previous_stage?: string | null
          sponsor_id: string
        }
        Update: {
          changed_at?: string | null
          changed_by?: string | null
          changed_by_name?: string | null
          id?: string
          new_stage?: string
          previous_stage?: string | null
          sponsor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sponsor_stage_history_sponsor_id_fkey"
            columns: ["sponsor_id"]
            isOneToOne: false
            referencedRelation: "sponsors"
            referencedColumns: ["id"]
          },
        ]
      }
      sponsors: {
        Row: {
          additional_info: string | null
          city: string
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string | null
          created_by: string | null
          id: string
          last_contact_date: string | null
          last_contact_notes: string | null
          name: string
          next_action: string | null
          next_followup_date: string | null
          segment: string
          stage: string
          state: string
          updated_at: string | null
        }
        Insert: {
          additional_info?: string | null
          city: string
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          last_contact_date?: string | null
          last_contact_notes?: string | null
          name: string
          next_action?: string | null
          next_followup_date?: string | null
          segment: string
          stage?: string
          state: string
          updated_at?: string | null
        }
        Update: {
          additional_info?: string | null
          city?: string
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          last_contact_date?: string | null
          last_contact_notes?: string | null
          name?: string
          next_action?: string | null
          next_followup_date?: string | null
          segment?: string
          stage?: string
          state?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      subtasks: {
        Row: {
          completed: boolean
          completed_at: string | null
          created_at: string
          id: string
          parent_subtask_id: string | null
          position: number | null
          task_id: string
          title: string
        }
        Insert: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          id?: string
          parent_subtask_id?: string | null
          position?: number | null
          task_id: string
          title: string
        }
        Update: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          id?: string
          parent_subtask_id?: string | null
          position?: number | null
          task_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "subtasks_parent_subtask_id_fkey"
            columns: ["parent_subtask_id"]
            isOneToOne: false
            referencedRelation: "subtasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subtasks_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_comments: {
        Row: {
          author_name: string
          content: string
          created_at: string
          id: string
          task_id: string
        }
        Insert: {
          author_name: string
          content: string
          created_at?: string
          id?: string
          task_id: string
        }
        Update: {
          author_name?: string
          content?: string
          created_at?: string
          id?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_comments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_history: {
        Row: {
          action: string
          changed_by: string | null
          created_at: string
          field_changed: string | null
          id: string
          new_value: string | null
          old_value: string | null
          task_id: string
        }
        Insert: {
          action: string
          changed_by?: string | null
          created_at?: string
          field_changed?: string | null
          id?: string
          new_value?: string | null
          old_value?: string | null
          task_id: string
        }
        Update: {
          action?: string
          changed_by?: string | null
          created_at?: string
          field_changed?: string | null
          id?: string
          new_value?: string | null
          old_value?: string | null
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_history_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assigned_to_id: string | null
          assignee: string | null
          category: string | null
          completed: boolean
          completed_at: string | null
          created_at: string
          description: string | null
          doing_since: string | null
          due_date: string | null
          due_time: string | null
          id: string
          is_recurring_instance: boolean | null
          parent_task_id: string | null
          position: number | null
          priority: string
          recurrence: string | null
          recurrence_end_date: string | null
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to_id?: string | null
          assignee?: string | null
          category?: string | null
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          description?: string | null
          doing_since?: string | null
          due_date?: string | null
          due_time?: string | null
          id?: string
          is_recurring_instance?: boolean | null
          parent_task_id?: string | null
          position?: number | null
          priority?: string
          recurrence?: string | null
          recurrence_end_date?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to_id?: string | null
          assignee?: string | null
          category?: string | null
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          description?: string | null
          doing_since?: string | null
          due_date?: string | null
          due_time?: string | null
          id?: string
          is_recurring_instance?: boolean | null
          parent_task_id?: string | null
          position?: number | null
          priority?: string
          recurrence?: string | null
          recurrence_end_date?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_parent_task_id_fkey"
            columns: ["parent_task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      transcriptions: {
        Row: {
          completed_at: string | null
          created_at: string
          duration_seconds: number | null
          error_message: string | null
          id: string
          language: string | null
          original_file_name: string | null
          original_file_path: string | null
          source_id: string | null
          source_type: string
          speakers_count: number | null
          status: string | null
          title: string
          transcript_segments: Json | null
          transcript_text: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          duration_seconds?: number | null
          error_message?: string | null
          id?: string
          language?: string | null
          original_file_name?: string | null
          original_file_path?: string | null
          source_id?: string | null
          source_type: string
          speakers_count?: number | null
          status?: string | null
          title: string
          transcript_segments?: Json | null
          transcript_text?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          duration_seconds?: number | null
          error_message?: string | null
          id?: string
          language?: string | null
          original_file_name?: string | null
          original_file_path?: string | null
          source_id?: string | null
          source_type?: string
          speakers_count?: number | null
          status?: string | null
          title?: string
          transcript_segments?: Json | null
          transcript_text?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transcriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_lesson_progress: {
        Row: {
          completed: boolean | null
          completed_at: string | null
          created_at: string
          id: string
          lesson_id: string
          user_id: string
        }
        Insert: {
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string
          id?: string
          lesson_id: string
          user_id: string
        }
        Update: {
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string
          id?: string
          lesson_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_lesson_progress_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      user_notes: {
        Row: {
          content: string
          created_at: string | null
          id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          content?: string
          created_at?: string | null
          id?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_notes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      utm_history: {
        Row: {
          batch_id: string | null
          created_at: string | null
          created_by: string | null
          full_url: string
          generation_type: string | null
          id: string
          utm_campaign: string
          utm_content: string | null
          utm_medium: string
          utm_source: string
          utm_term: string | null
          website_url: string
        }
        Insert: {
          batch_id?: string | null
          created_at?: string | null
          created_by?: string | null
          full_url: string
          generation_type?: string | null
          id?: string
          utm_campaign: string
          utm_content?: string | null
          utm_medium: string
          utm_source: string
          utm_term?: string | null
          website_url: string
        }
        Update: {
          batch_id?: string | null
          created_at?: string | null
          created_by?: string | null
          full_url?: string
          generation_type?: string | null
          id?: string
          utm_campaign?: string
          utm_content?: string | null
          utm_medium?: string
          utm_source?: string
          utm_term?: string | null
          website_url?: string
        }
        Relationships: []
      }
    }
    Views: {
      quiz_responses_with_questions: {
        Row: {
          answered_at: string | null
          completed_at: string | null
          id: string | null
          number_response: number | null
          points_earned: number | null
          question_id: string | null
          question_text: string | null
          question_type: string | null
          quiz_id: string | null
          scale_response: number | null
          selected_option_ids: Json | null
          session_id: string | null
          tags_collected: Json | null
          text_response: string | null
          time_spent_seconds: number | null
          total_score: number | null
        }
        Relationships: [
          {
            foreignKeyName: "quiz_responses_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "quiz_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_responses_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "quiz_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_sessions_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_finance_department: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "collaborator" | "manager"
      recurrence_type:
        | "none"
        | "daily"
        | "weekly"
        | "biweekly"
        | "monthly"
        | "semiannual"
        | "yearly"
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
      app_role: ["admin", "collaborator", "manager"],
      recurrence_type: [
        "none",
        "daily",
        "weekly",
        "biweekly",
        "monthly",
        "semiannual",
        "yearly",
      ],
    },
  },
} as const
