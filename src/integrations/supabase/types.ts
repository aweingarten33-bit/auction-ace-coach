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
      app_settings: {
        Row: {
          id: boolean
          locked: boolean
          updated_at: string
        }
        Insert: {
          id?: boolean
          locked?: boolean
          updated_at?: string
        }
        Update: {
          id?: boolean
          locked?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      draftsharks_sf_values: {
        Row: {
          fetched_at: string
          id: string
          overall_rank: number | null
          player_name: string
          player_name_norm: string
          position: string
          position_rank: number | null
          team: string | null
          updated_at: string
          value_200: number
        }
        Insert: {
          fetched_at?: string
          id?: string
          overall_rank?: number | null
          player_name: string
          player_name_norm: string
          position: string
          position_rank?: number | null
          team?: string | null
          updated_at?: string
          value_200: number
        }
        Update: {
          fetched_at?: string
          id?: string
          overall_rank?: number | null
          player_name?: string
          player_name_norm?: string
          position?: string
          position_rank?: number | null
          team?: string | null
          updated_at?: string
          value_200?: number
        }
        Relationships: []
      }
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
      espn_player_ranks: {
        Row: {
          auction_value: number | null
          espn_player_id: number
          id: string
          injury_note: string | null
          injury_source: string | null
          injury_status: string | null
          injury_updated_at: string | null
          overall_rank: number | null
          player_name: string
          player_name_norm: string
          pos_rank: number | null
          position: string | null
          prior_ppg: number | null
          prior_season: number | null
          projected_points: number | null
          projected_stats: Json | null
          season: number
          updated_at: string
        }
        Insert: {
          auction_value?: number | null
          espn_player_id: number
          id?: string
          injury_note?: string | null
          injury_source?: string | null
          injury_status?: string | null
          injury_updated_at?: string | null
          overall_rank?: number | null
          player_name: string
          player_name_norm: string
          pos_rank?: number | null
          position?: string | null
          prior_ppg?: number | null
          prior_season?: number | null
          projected_points?: number | null
          projected_stats?: Json | null
          season: number
          updated_at?: string
        }
        Update: {
          auction_value?: number | null
          espn_player_id?: number
          id?: string
          injury_note?: string | null
          injury_source?: string | null
          injury_status?: string | null
          injury_updated_at?: string | null
          overall_rank?: number | null
          player_name?: string
          player_name_norm?: string
          pos_rank?: number | null
          position?: string | null
          prior_ppg?: number | null
          prior_season?: number | null
          projected_points?: number | null
          projected_stats?: Json | null
          season?: number
          updated_at?: string
        }
        Relationships: []
      }
      espn_preseason_ranks: {
        Row: {
          created_at: string
          espn_player_id: number
          id: string
          overall_rank: number | null
          player_name: string
          player_name_norm: string
          pos_rank: number | null
          position: string | null
          projected_auction_value: number | null
          projected_points: number | null
          season: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          espn_player_id: number
          id?: string
          overall_rank?: number | null
          player_name: string
          player_name_norm: string
          pos_rank?: number | null
          position?: string | null
          projected_auction_value?: number | null
          projected_points?: number | null
          season: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          espn_player_id?: number
          id?: string
          overall_rank?: number | null
          player_name?: string
          player_name_norm?: string
          pos_rank?: number | null
          position?: string | null
          projected_auction_value?: number | null
          projected_points?: number | null
          season?: number
          updated_at?: string
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
      league_auction_history: {
        Row: {
          bid_amount: number
          created_at: string
          espn_player_id: number | null
          id: string
          league_id: number
          pick_overall: number | null
          player_name: string
          position: string | null
          raw: Json | null
          season: number
          team_id: number | null
          user_id: string
          was_my_pick: boolean
        }
        Insert: {
          bid_amount: number
          created_at?: string
          espn_player_id?: number | null
          id?: string
          league_id: number
          pick_overall?: number | null
          player_name: string
          position?: string | null
          raw?: Json | null
          season: number
          team_id?: number | null
          user_id: string
          was_my_pick?: boolean
        }
        Update: {
          bid_amount?: number
          created_at?: string
          espn_player_id?: number | null
          id?: string
          league_id?: number
          pick_overall?: number | null
          player_name?: string
          position?: string | null
          raw?: Json | null
          season?: number
          team_id?: number | null
          user_id?: string
          was_my_pick?: boolean
        }
        Relationships: []
      }
      league_invites: {
        Row: {
          created_at: string
          email: string
          id: string
          league_id: number
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          league_id: number
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          league_id?: number
        }
        Relationships: []
      }
      league_snapshots: {
        Row: {
          auction_budget: number | null
          created_at: string
          importer_user_id: string | null
          keeper_summary: Json | null
          league_id: number
          league_name: string | null
          num_teams: number | null
          roster_slots: Json | null
          scoring: string | null
          season_id: number
          synced_at: string
          teams: Json | null
        }
        Insert: {
          auction_budget?: number | null
          created_at?: string
          importer_user_id?: string | null
          keeper_summary?: Json | null
          league_id: number
          league_name?: string | null
          num_teams?: number | null
          roster_slots?: Json | null
          scoring?: string | null
          season_id: number
          synced_at?: string
          teams?: Json | null
        }
        Update: {
          auction_budget?: number | null
          created_at?: string
          importer_user_id?: string | null
          keeper_summary?: Json | null
          league_id?: number
          league_name?: string | null
          num_teams?: number | null
          roster_slots?: Json | null
          scoring?: string | null
          season_id?: number
          synced_at?: string
          teams?: Json | null
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
          espn_team_id: number | null
          espn_team_name: string | null
          first_seen_at: string | null
          id: string
          last_seen_at: string | null
          league_id: number | null
          strategy_custom: string | null
          strategy_preset: string | null
          updated_at: string
          user_id: string
          visit_count: number
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          espn_team_id?: number | null
          espn_team_name?: string | null
          first_seen_at?: string | null
          id?: string
          last_seen_at?: string | null
          league_id?: number | null
          strategy_custom?: string | null
          strategy_preset?: string | null
          updated_at?: string
          user_id: string
          visit_count?: number
        }
        Update: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          espn_team_id?: number | null
          espn_team_name?: string | null
          first_seen_at?: string | null
          id?: string
          last_seen_at?: string | null
          league_id?: number | null
          strategy_custom?: string | null
          strategy_preset?: string | null
          updated_at?: string
          user_id?: string
          visit_count?: number
        }
        Relationships: []
      }
      sleeper_players: {
        Row: {
          age: number | null
          created_at: string
          depth_chart_order: number | null
          id: string
          injury_notes: string | null
          injury_status: string | null
          is_rookie: boolean
          player_name: string
          player_name_norm: string
          pos_rank: number | null
          position: string | null
          projected_auction_value: number | null
          search_rank: number | null
          sleeper_player_id: string
          status: string | null
          team: string | null
          updated_at: string
          years_exp: number | null
        }
        Insert: {
          age?: number | null
          created_at?: string
          depth_chart_order?: number | null
          id?: string
          injury_notes?: string | null
          injury_status?: string | null
          is_rookie?: boolean
          player_name: string
          player_name_norm: string
          pos_rank?: number | null
          position?: string | null
          projected_auction_value?: number | null
          search_rank?: number | null
          sleeper_player_id: string
          status?: string | null
          team?: string | null
          updated_at?: string
          years_exp?: number | null
        }
        Update: {
          age?: number | null
          created_at?: string
          depth_chart_order?: number | null
          id?: string
          injury_notes?: string | null
          injury_status?: string | null
          is_rookie?: boolean
          player_name?: string
          player_name_norm?: string
          pos_rank?: number | null
          position?: string | null
          projected_auction_value?: number | null
          search_rank?: number | null
          sleeper_player_id?: string
          status?: string | null
          team?: string | null
          updated_at?: string
          years_exp?: number | null
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
      current_user_league_id: { Args: never; Returns: number }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      touch_last_seen: { Args: never; Returns: undefined }
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const
