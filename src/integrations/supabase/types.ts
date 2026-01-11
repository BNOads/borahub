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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      acessos_logins: {
        Row: {
          ativo: boolean
          categoria: string
          created_at: string
          created_by: string
          id: string
          link_acesso: string | null
          login_usuario: string | null
          nome_acesso: string
          notas_adicionais: string | null
          senha_criptografada: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          categoria: string
          created_at?: string
          created_by: string
          id?: string
          link_acesso?: string | null
          login_usuario?: string | null
          nome_acesso: string
          notas_adicionais?: string | null
          senha_criptografada?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          categoria?: string
          created_at?: string
          created_by?: string
          id?: string
          link_acesso?: string | null
          login_usuario?: string | null
          nome_acesso?: string
          notas_adicionais?: string | null
          senha_criptografada?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      alerts: {
        Row: {
          created_at: string
          data: Json | null
          first_seen_at: string
          id: string
          lancamento_id: string | null
          last_seen_at: string
          message: string
          rule: string
          severity: Database["public"]["Enums"]["alert_severity"]
          status: Database["public"]["Enums"]["alert_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          data?: Json | null
          first_seen_at?: string
          id?: string
          lancamento_id?: string | null
          last_seen_at?: string
          message: string
          rule: string
          severity: Database["public"]["Enums"]["alert_severity"]
          status?: Database["public"]["Enums"]["alert_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          data?: Json | null
          first_seen_at?: string
          id?: string
          lancamento_id?: string | null
          last_seen_at?: string
          message?: string
          rule?: string
          severity?: Database["public"]["Enums"]["alert_severity"]
          status?: Database["public"]["Enums"]["alert_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "alerts_lancamento_id_fkey"
            columns: ["lancamento_id"]
            isOneToOne: false
            referencedRelation: "lancamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      avisos: {
        Row: {
          ativo: boolean
          created_at: string
          created_by: string | null
          id: string
          mensagem: string
          recipients: string[] | null
          titulo: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          created_by?: string | null
          id?: string
          mensagem: string
          recipients?: string[] | null
          titulo: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          created_by?: string | null
          id?: string
          mensagem?: string
          recipients?: string[] | null
          titulo?: string
        }
        Relationships: []
      }
      clientes: {
        Row: {
          ativo: boolean
          avatar_url: string | null
          created_at: string
          email: string | null
          id: string
          instagram: string | null
          nome: string
          telefone: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          id?: string
          instagram?: string | null
          nome: string
          telefone?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          id?: string
          instagram?: string | null
          nome?: string
          telefone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      colaboradores: {
        Row: {
          ativo: boolean
          cargo: string | null
          created_at: string
          data_nascimento: string | null
          email: string
          id: string
          nome: string
          telefone: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          ativo?: boolean
          cargo?: string | null
          created_at?: string
          data_nascimento?: string | null
          email: string
          id?: string
          nome: string
          telefone?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          ativo?: boolean
          cargo?: string | null
          created_at?: string
          data_nascimento?: string | null
          email?: string
          id?: string
          nome?: string
          telefone?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      creatives: {
        Row: {
          activated_at: string | null
          created_at: string
          custom_fields: Json | null
          description: string | null
          destination_page: string | null
          id: string
          is_active: boolean | null
          lancamento_id: string | null
          name: string
          nomenclatura: string | null
          status: string | null
          type: string | null
          updated_at: string
          url: string | null
        }
        Insert: {
          activated_at?: string | null
          created_at?: string
          custom_fields?: Json | null
          description?: string | null
          destination_page?: string | null
          id?: string
          is_active?: boolean | null
          lancamento_id?: string | null
          name: string
          nomenclatura?: string | null
          status?: string | null
          type?: string | null
          updated_at?: string
          url?: string | null
        }
        Update: {
          activated_at?: string | null
          created_at?: string
          custom_fields?: Json | null
          description?: string | null
          destination_page?: string | null
          id?: string
          is_active?: boolean | null
          lancamento_id?: string | null
          name?: string
          nomenclatura?: string | null
          status?: string | null
          type?: string | null
          updated_at?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "creatives_lancamento_id_fkey"
            columns: ["lancamento_id"]
            isOneToOne: false
            referencedRelation: "lancamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      documentos_reuniao: {
        Row: {
          agenda: string | null
          atuou_como: string | null
          client_id: string | null
          created_at: string
          created_by: string | null
          data_reuniao: string | null
          decisoes: string | null
          id: string
          notas: string | null
          participantes: string[] | null
          status: Database["public"]["Enums"]["status_documento_reuniao"]
          titulo: string
          updated_at: string
        }
        Insert: {
          agenda?: string | null
          atuou_como?: string | null
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          data_reuniao?: string | null
          decisoes?: string | null
          id?: string
          notas?: string | null
          participantes?: string[] | null
          status?: Database["public"]["Enums"]["status_documento_reuniao"]
          titulo: string
          updated_at?: string
        }
        Update: {
          agenda?: string | null
          atuou_como?: string | null
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          data_reuniao?: string | null
          decisoes?: string | null
          id?: string
          notas?: string | null
          participantes?: string[] | null
          status?: Database["public"]["Enums"]["status_documento_reuniao"]
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "documentos_reuniao_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      funnels: {
        Row: {
          briefing_link: string | null
          category: string | null
          created_at: string
          dashboard_link: string | null
          drive_link: string | null
          id: string
          is_active: boolean | null
          name: string
          predicted_investment: number | null
          product_name: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          briefing_link?: string | null
          category?: string | null
          created_at?: string
          dashboard_link?: string | null
          drive_link?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          predicted_investment?: number | null
          product_name?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          briefing_link?: string | null
          category?: string | null
          created_at?: string
          dashboard_link?: string | null
          drive_link?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          predicted_investment?: number | null
          product_name?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      lancamento_criativos: {
        Row: {
          created_at: string
          folder_name: string | null
          id: string
          lancamento_id: string | null
        }
        Insert: {
          created_at?: string
          folder_name?: string | null
          id?: string
          lancamento_id?: string | null
        }
        Update: {
          created_at?: string
          folder_name?: string | null
          id?: string
          lancamento_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lancamento_criativos_lancamento_id_fkey"
            columns: ["lancamento_id"]
            isOneToOne: false
            referencedRelation: "lancamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      lancamentos: {
        Row: {
          client_id: string | null
          created_at: string
          id: string
          nome: string
          status: Database["public"]["Enums"]["status_lancamento"] | null
          tipo: Database["public"]["Enums"]["tipo_lancamento"] | null
          updated_at: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          id?: string
          nome: string
          status?: Database["public"]["Enums"]["status_lancamento"] | null
          tipo?: Database["public"]["Enums"]["tipo_lancamento"] | null
          updated_at?: string
        }
        Update: {
          client_id?: string | null
          created_at?: string
          id?: string
          nome?: string
          status?: Database["public"]["Enums"]["status_lancamento"] | null
          tipo?: Database["public"]["Enums"]["tipo_lancamento"] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lancamentos_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          created_at: string
          id: string
          sender_id: string | null
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          sender_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          sender_id?: string | null
        }
        Relationships: []
      }
      orcamentos_funil: {
        Row: {
          category: string | null
          created_at: string
          explanation_category: string | null
          explanation_funnel: string | null
          id: string
          investment: number
          name: string
          status: Database["public"]["Enums"]["status_orcamento_enum"] | null
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          explanation_category?: string | null
          explanation_funnel?: string | null
          id?: string
          investment: number
          name: string
          status?: Database["public"]["Enums"]["status_orcamento_enum"] | null
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          explanation_category?: string | null
          explanation_funnel?: string | null
          id?: string
          investment?: number
          name?: string
          status?: Database["public"]["Enums"]["status_orcamento_enum"] | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          ativo: boolean
          created_at: string
          email: string
          id: string
          nivel_acesso: Database["public"]["Enums"]["nivel_acesso"]
          nome: string
          primeiro_login: boolean | null
          updated_at: string
          user_id: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          email: string
          id?: string
          nivel_acesso?: Database["public"]["Enums"]["nivel_acesso"]
          nome: string
          primeiro_login?: boolean | null
          updated_at?: string
          user_id: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          email?: string
          id?: string
          nivel_acesso?: Database["public"]["Enums"]["nivel_acesso"]
          nome?: string
          primeiro_login?: boolean | null
          updated_at?: string
          user_id?: string
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
      alert_severity: "info" | "warning" | "error" | "critical"
      alert_status: "new" | "ack" | "resolved"
      delivery_channel: "inapp" | "email" | "slack"
      estado_civil:
      | "solteiro"
      | "casado"
      | "divorciado"
      | "viuvo"
      | "uniao_estavel"
      etapa_funil_enum:
      | "captacao"
      | "cpl"
      | "vendas"
      | "remarketing"
      | "email_marketing"
      | "upsell"
      kickoff_status: "draft" | "active" | "archived"
      nivel_acesso:
      | "admin"
      | "gestor_trafego"
      | "cs"
      | "designer"
      | "webdesigner"
      | "editor_video"
      | "gestor_projetos"
      | "dono"
      prioridade_tarefa: "copa_mundo" | "libertadores" | "brasileirao"
      recorrencia_tarefa: "nenhuma" | "diaria" | "semanal" | "mensal"
      status_documento_reuniao:
      | "rascunho"
      | "pauta_criada"
      | "ata_concluida"
      | "arquivado"
      status_lancamento:
      | "em_captacao"
      | "cpl"
      | "remarketing"
      | "finalizado"
      | "pausado"
      | "cancelado"
      status_orcamento_enum: "ativo" | "pausado" | "concluido" | "cancelado"
      status_tarefa: "pendente" | "em_andamento" | "concluida" | "adiada"
      tipo_acesso_dados:
      | "leitura_propria"
      | "leitura_limitada"
      | "leitura_completa"
      | "administracao"
      tipo_bloco_reuniao:
      | "titulo"
      | "descricao"
      | "participantes"
      | "pauta"
      | "decisoes"
      | "acoes"
      tipo_lancamento:
      | "semente"
      | "interno"
      | "externo"
      | "perpetuo"
      | "flash"
      | "evento"
      | "outro"
      | "tradicional"
      | "captacao_simples"
      tipo_medicao_desafio:
      | "quantidade_acoes"
      | "pontuacao"
      | "check_in_diario"
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
      alert_severity: "alert_severity",
      alert_status: "alert_status",
      delivery_channel: "delivery_channel",
      estado_civil: "estado_civil",
      etapa_funil_enum: "etapa_funil_enum",
      kickoff_status: "kickoff_status",
      nivel_acesso: "nivel_acesso",
      prioridade_tarefa: "prioridade_tarefa",
      recorrencia_tarefa: "recorrencia_tarefa",
      status_documento_reuniao: "status_documento_reuniao",
      status_lancamento: "status_lancamento",
      status_orcamento_enum: "status_orcamento_enum",
      status_tarefa: "status_tarefa",
      tipo_acesso_dados: "tipo_acesso_dados",
      tipo_bloco_reuniao: "tipo_bloco_reuniao",
      tipo_lancamento: "tipo_lancamento",
      tipo_medicao_desafio: "tipo_medicao_desafio",
    },
  },
} as const
