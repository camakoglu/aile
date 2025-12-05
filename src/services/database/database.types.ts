/**
 * TypeScript types for Supabase database schema
 * Generated from schema in MIGRATION_PLAN.md
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      members: {
        Row: {
          id: number;
          name: string;
          first_name: string | null;
          last_name: string | null;
          birth_date: string | null;
          death_date: string | null;
          birth_place: string | null;
          death_place: string | null;
          gender: 'E' | 'K' | 'U';
          gen: number | null;
          is_spouse: boolean;
          occupation: string | null;
          marriage: string | null;
          note: string | null;
          image_path: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: number;
          name: string;
          first_name?: string | null;
          last_name?: string | null;
          birth_date?: string | null;
          death_date?: string | null;
          birth_place?: string | null;
          death_place?: string | null;
          gender?: 'E' | 'K' | 'U';
          gen?: number | null;
          is_spouse?: boolean;
          occupation?: string | null;
          marriage?: string | null;
          note?: string | null;
          image_path?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: number;
          name?: string;
          first_name?: string | null;
          last_name?: string | null;
          birth_date?: string | null;
          death_date?: string | null;
          birth_place?: string | null;
          death_place?: string | null;
          gender?: 'E' | 'K' | 'U';
          gen?: number | null;
          is_spouse?: boolean;
          occupation?: string | null;
          marriage?: string | null;
          note?: string | null;
          image_path?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      relationships: {
        Row: {
          id: number;
          parent_id: number | null;
          child_id: number | null;
          relationship_type: string;
          created_at: string;
        };
        Insert: {
          id?: number;
          parent_id?: number | null;
          child_id?: number | null;
          relationship_type?: string;
          created_at?: string;
        };
        Update: {
          id?: number;
          parent_id?: number | null;
          child_id?: number | null;
          relationship_type?: string;
          created_at?: string;
        };
      };
      unions: {
        Row: {
          id: number;
          partner1_id: number | null;
          partner2_id: number | null;
          marriage_date: string | null;
          created_at: string;
        };
        Insert: {
          id?: number;
          partner1_id?: number | null;
          partner2_id?: number | null;
          marriage_date?: string | null;
          created_at?: string;
        };
        Update: {
          id?: number;
          partner1_id?: number | null;
          partner2_id?: number | null;
          marriage_date?: string | null;
          created_at?: string;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
