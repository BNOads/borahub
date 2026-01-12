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
      documents: {
        Row: {
          category: string | null
          content: string | null
          created_at: string
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
      social_posts: {
        Row: {
          created_at: string
          current_assignee_id: string | null
          day_of_week: string | null
          deadline: string | null
          editorial_line_id: string | null
          id: string
          post_type: string
          profile_id: string | null
          scheduled_date: string
          start_date: string | null
          status: string
          theme: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_assignee_id?: string | null
          day_of_week?: string | null
          deadline?: string | null
          editorial_line_id?: string | null
          id?: string
          post_type?: string
          profile_id?: string | null
          scheduled_date: string
          start_date?: string | null
          status?: string
          theme?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_assignee_id?: string | null
          day_of_week?: string | null
          deadline?: string | null
          editorial_line_id?: string | null
          id?: string
          post_type?: string
          profile_id?: string | null
          scheduled_date?: string
          start_date?: string | null
          status?: string
          theme?: string | null
          updated_at?: string
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
