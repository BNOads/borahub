Initialising login role...
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
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      acessos_logins: {
        Row: {
          ativo: boolean | null
          categoria: string
          created_at: string | null
          created_by: string | null
          id: string
          link_acesso: string | null
          login_usuario: string
          nome_acesso: string
          notas_adicionais: string | null
          senha_criptografada: string
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          categoria: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          link_acesso?: string | null
          login_usuario: string
          nome_acesso: string
          notas_adicionais?: string | null
          senha_criptografada: string
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          categoria?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          link_acesso?: string | null
          login_usuario?: string
          nome_acesso?: string
          notas_adicionais?: string | null
          senha_criptografada?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      activity_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_address?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
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
          status_publicacao: string
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
          status_publicacao?: string
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
          status_publicacao?: string
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
      courses: {
        Row: {
          category: string | null
          created_at: string | null
          description: string | null
          id: string
          level: string | null
          thumbnail_url: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          level?: string | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          level?: string | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      departments: {
        Row: {
          color: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          manager_id: string | null
          name: string
          updated_at: string
        }
        Insert: {
          color?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          manager_id?: string | null
          name: string
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          manager_id?: string | null
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_departments_manager"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          author_id: string | null
          category: string | null
          content: string | null
          cover_url: string | null
          created_at: string | null
          icon: string | null
          id: string
          is_favorite: boolean | null
          is_public: boolean | null
          share_slug: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          author_id?: string | null
          category?: string | null
          content?: string | null
          cover_url?: string | null
          created_at?: string | null
          icon?: string | null
          id?: string
          is_favorite?: boolean | null
          is_public?: boolean | null
          share_slug?: string | null
          title?: string
          updated_at?: string | null
        }
        Update: {
          author_id?: string | null
          category?: string | null
          content?: string | null
          cover_url?: string | null
          created_at?: string | null
          icon?: string | null
          id?: string
          is_favorite?: boolean | null
          is_public?: boolean | null
          share_slug?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      editorial_lines: {
        Row: {
          created_at: string | null
          day_of_week: string
          id: string
          intention: string | null
          profile_id: string | null
          week_start_date: string
        }
        Insert: {
          created_at?: string | null
          day_of_week: string
          id?: string
          intention?: string | null
          profile_id?: string | null
          week_start_date: string
        }
        Update: {
          created_at?: string | null
          day_of_week?: string
          id?: string
          intention?: string | null
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
          created_at: string
          created_by: string | null
          description: string | null
          duration_minutes: number | null
          event_date: string
          event_time: string
          event_type: string | null
          id: string
          location: string | null
          meeting_link: string | null
          title: string
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          duration_minutes?: number | null
          event_date: string
          event_time: string
          event_type?: string | null
          id?: string
          location?: string | null
          meeting_link?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          duration_minutes?: number | null
          event_date?: string
          event_time?: string
          event_type?: string | null
          id?: string
          location?: string | null
          meeting_link?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      funnel_checklist: {
        Row: {
          created_at: string | null
          description: string | null
          funnel_id: string
          id: string
          is_completed: boolean | null
          order_index: number | null
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          funnel_id: string
          id?: string
          is_completed?: boolean | null
          order_index?: number | null
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          funnel_id?: string
          id?: string
          is_completed?: boolean | null
          order_index?: number | null
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
          author_name: string
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
      funnels: {
        Row: {
          aquecimento_end: string | null
          aquecimento_start: string | null
          briefing_link: string | null
          budget_aquecimento: number | null
          budget_aquecimento_percent: number | null
          budget_captacao: number | null
          budget_captacao_percent: number | null
          budget_evento: number | null
          budget_evento_percent: number | null
          budget_impulsionamento: number | null
          budget_impulsionamento_percent: number | null
          budget_lembrete: number | null
          budget_lembrete_percent: number | null
          budget_venda: number | null
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
          budget_aquecimento?: number | null
          budget_aquecimento_percent?: number | null
          budget_captacao?: number | null
          budget_captacao_percent?: number | null
          budget_evento?: number | null
          budget_evento_percent?: number | null
          budget_impulsionamento?: number | null
          budget_impulsionamento_percent?: number | null
          budget_lembrete?: number | null
          budget_lembrete_percent?: number | null
          budget_venda?: number | null
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
          budget_aquecimento?: number | null
          budget_aquecimento_percent?: number | null
          budget_captacao?: number | null
          budget_captacao_percent?: number | null
          budget_evento?: number | null
          budget_evento_percent?: number | null
          budget_impulsionamento?: number | null
          budget_impulsionamento_percent?: number | null
          budget_lembrete?: number | null
          budget_lembrete_percent?: number | null
          budget_venda?: number | null
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
      ia_agents: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
          prompt: string
          type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          prompt: string
          type?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          prompt?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      lessons: {
        Row: {
          course_id: string | null
          created_at: string | null
          description: string | null
          duration: string | null
          id: string
          order_index: number | null
          title: string
          updated_at: string | null
          video_url: string | null
        }
        Insert: {
          course_id?: string | null
          created_at?: string | null
          description?: string | null
          duration?: string | null
          id?: string
          order_index?: number | null
          title: string
          updated_at?: string | null
          video_url?: string | null
        }
        Update: {
          course_id?: string | null
          created_at?: string | null
          description?: string | null
          duration?: string | null
          id?: string
          order_index?: number | null
          title?: string
          updated_at?: string | null
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
          created_at: string | null
          description: string | null
          favicon: string | null
          id: string
          is_favorite: boolean | null
          name: string
          order_index: number | null
          updated_at: string | null
          url: string
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          favicon?: string | null
          id?: string
          is_favorite?: boolean | null
          name: string
          order_index?: number | null
          updated_at?: string | null
          url: string
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          favicon?: string | null
          id?: string
          is_favorite?: boolean | null
          name?: string
          order_index?: number | null
          updated_at?: string | null
          url?: string
        }
        Relationships: []
      }
      post_comments: {
        Row: {
          content: string
          created_at: string | null
          id: string
          is_adjustment: boolean | null
          post_id: string | null
          user_id: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          is_adjustment?: boolean | null
          post_id?: string | null
          user_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          is_adjustment?: boolean | null
          post_id?: string | null
          user_id?: string | null
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
          created_at: string | null
          field_changed: string | null
          id: string
          new_value: string | null
          old_value: string | null
          post_id: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          field_changed?: string | null
          id?: string
          new_value?: string | null
          old_value?: string | null
          post_id?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          field_changed?: string | null
          id?: string
          new_value?: string | null
          old_value?: string | null
          post_id?: string | null
          user_id?: string | null
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
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          birth_date: string | null
          created_at: string
          department: string | null
          display_name: string | null
          email: string
          favorite_tools: string[] | null
          full_name: string
          hire_date: string | null
          id: string
          is_active: boolean
          job_title: string | null
          last_login_at: string | null
          must_change_password: boolean
          notification_settings: Json | null
          phone: string | null
          role: string
          theme_preference: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          birth_date?: string | null
          created_at?: string
          department?: string | null
          display_name?: string | null
          email: string
          favorite_tools?: string[] | null
          full_name: string
          hire_date?: string | null
          id: string
          is_active?: boolean
          job_title?: string | null
          last_login_at?: string | null
          must_change_password?: boolean
          notification_settings?: Json | null
          phone?: string | null
          role?: string
          theme_preference?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          birth_date?: string | null
          created_at?: string
          department?: string | null
          display_name?: string | null
          email?: string
          favorite_tools?: string[] | null
          full_name?: string
          hire_date?: string | null
          id?: string
          is_active?: boolean
          job_title?: string | null
          last_login_at?: string | null
          must_change_password?: boolean
          notification_settings?: Json | null
          phone?: string | null
          role?: string
          theme_preference?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_department_fkey"
            columns: ["department"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      social_posts: {
        Row: {
          arquivos_link: string | null
          big_idea: string | null
          campos_extras: Json | null
          created_at: string | null
          current_assignee_id: string | null
          day_of_week: string | null
          deadline: string | null
          editorial_line_id: string | null
          id: string
          post_type: string | null
          profile_id: string | null
          roteiro: string | null
          scheduled_date: string | null
          start_date: string | null
          status: string
          theme: string | null
          updated_at: string | null
        }
        Insert: {
          arquivos_link?: string | null
          big_idea?: string | null
          campos_extras?: Json | null
          created_at?: string | null
          current_assignee_id?: string | null
          day_of_week?: string | null
          deadline?: string | null
          editorial_line_id?: string | null
          id?: string
          post_type?: string | null
          profile_id?: string | null
          roteiro?: string | null
          scheduled_date?: string | null
          start_date?: string | null
          status?: string
          theme?: string | null
          updated_at?: string | null
        }
        Update: {
          arquivos_link?: string | null
          big_idea?: string | null
          campos_extras?: Json | null
          created_at?: string | null
          current_assignee_id?: string | null
          day_of_week?: string | null
          deadline?: string | null
          editorial_line_id?: string | null
          id?: string
          post_type?: string | null
          profile_id?: string | null
          roteiro?: string | null
          scheduled_date?: string | null
          start_date?: string | null
          status?: string
          theme?: string | null
          updated_at?: string | null
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
          created_at: string | null
          icon: string | null
          id: string
          name: string
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          icon?: string | null
          id?: string
          name: string
        }
        Update: {
          color?: string | null
          created_at?: string | null
          icon?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      subtasks: {
        Row: {
          completed: boolean
          completed_at: string | null
          created_at: string
          id: string
          position: number | null
          task_id: string
          title: string
        }
        Insert: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          id?: string
          position?: number | null
          task_id: string
          title: string
        }
        Update: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          id?: string
          position?: number | null
          task_id?: string
          title?: string
        }
        Relationships: [
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
          due_date: string | null
          due_time: string | null
          id: string
          position: number | null
          priority: string
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
          due_date?: string | null
          due_time?: string | null
          id?: string
          position?: number | null
          priority?: string
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
          due_date?: string | null
          due_time?: string | null
          id?: string
          position?: number | null
          priority?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_assigned_to_id_fkey"
            columns: ["assigned_to_id"]
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
          last_watched_at: string | null
          lesson_id: string
          user_id: string
        }
        Insert: {
          completed?: boolean | null
          completed_at?: string | null
          last_watched_at?: string | null
          lesson_id: string
          user_id: string
        }
        Update: {
          completed?: boolean | null
          completed_at?: string | null
          last_watched_at?: string | null
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
      user_profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          role: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          role?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          role?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      utm_history: {
        Row: {
          batch_id: string | null
          created_at: string
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
          created_at?: string
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
          created_at?: string
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
      [_ in never]: never
    }
    Functions: {
      get_user_stats: { Args: { p_user_id: string }; Returns: Json }
      is_admin: { Args: never; Returns: boolean }
      log_activity: {
        Args: {
          p_action: string
          p_details?: Json
          p_entity_id?: string
          p_entity_type: string
        }
        Returns: string
      }
      reset_user_password: { Args: { p_user_id: string }; Returns: Json }
      update_password_force: { Args: { p_new_password: string }; Returns: Json }
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
A new version of Supabase CLI is available: v2.72.7 (currently installed v2.67.1)
We recommend updating regularly for new features and bug fixes: https://supabase.com/docs/guides/cli/getting-started#updating-the-supabase-cli
