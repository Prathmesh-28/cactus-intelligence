import { createClient } from '@supabase/supabase-js';
import type { Analysis } from '../types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Database = {
  public: {
    Tables: {
      analyses: {
        Row: Analysis;
        Insert: Omit<Analysis, 'id' | 'created_at'>;
        Update: Partial<Omit<Analysis, 'id' | 'created_at'>>;
      };
      due_diligence_checks: {
        Row: {
          id: string;
          analysis_id: string;
          item_text: string;
          completed: boolean;
          completed_at: string | null;
        };
        Insert: Omit<{ id: string; analysis_id: string; item_text: string; completed: boolean; completed_at: string | null }, 'id'>;
        Update: Partial<{ completed: boolean; completed_at: string | null }>;
      };
    };
  };
};
