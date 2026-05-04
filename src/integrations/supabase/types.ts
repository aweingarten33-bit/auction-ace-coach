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
      espn_credentials: {
        Row: {
          created_at: string
          espn_s2: string
          last_verified_at: string | null
          league_id: number | null
          season_id: number | null
          swid: string
          team_id: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          espn_s2: string
          last_verified_at?: string | null
          league_id?: number | null
          season_id?: number | null
          swid: string
          team_id?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          espn_s2?: string
          last_verified_at?: string | null
          league_id?: number | null
          season_id?: number | null
          swid?: string
          team_id?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      extension_tokens: {
        Row: {
          created_at: string
          last_used_at: string | null
          token: string
          user_id: string
        }
        Insert: {
          created_at?: string
          last_used_at?: string | null
          token: string
          user_id: string
        }
        Update: {
          created_at?: string
          last_used_at?: string | null
          token?: string
          user_id?: string
        }
        Relationships: []
      }
      live_draft_events: {
        Row: {
          created_at: string
          drafter_team_id: number | null
          drafter_team_name: string | null
          espn_player_id: number | null
          event_type: string
          id: string
          occurred_at: string
          player_name: string | null
          player_position: string | null
          player_team: string | null
          price: number | null
          raw: Json | null
          source: string
          user_id: string
        }
        Insert: {
          created_at?: string
          drafter_team_id?: number | null
          drafter_team_name?: string | null
          espn_player_id?: number | null
          event_type: string
          id?: string
          occurred_at?: string
          player_name?: string | null
          player_position?: string | null
          player_team?: string | null
          price?: number | null
          raw?: Json | null
          source: string
          user_id: string
        }
        Update: {
          created_at?: string
          drafter_team_id?: number | null
          drafter_team_name?: string | null
          espn_player_id?: number | null
          event_type?: string
          id?: string
          occurred_at?: string
          player_name?: string | null
          player_position?: string | null
          player_team?: string | null
          price?: number | null
          raw?: Json | null
          source?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      vetri_notes: {
        Row: {
          created_at: string
          error: string | null
          id: string
          positions: string[]
          published_at: string | null
          status: string
          summary: string | null
          takes: Json
          title: string
          transcript: string | null
          updated_at: string
          url: string
          video_id: string
        }
        Insert: {
          created_at?: string
          error?: string | null
          id?: string
          positions?: string[]
          published_at?: string | null
          status?: string
          summary?: string | null
          takes?: Json
          title: string
          transcript?: string | null
          updated_at?: string
          url: string
          video_id: string
        }
        Update: {
          created_at?: string
          error?: string | null
          id?: string
          positions?: string[]
          published_at?: string | null
          status?: string
          summary?: string | null
          takes?: Json
          title?: string
          transcript?: string | null
          updated_at?: string
          url?: string
          video_id?: string
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
