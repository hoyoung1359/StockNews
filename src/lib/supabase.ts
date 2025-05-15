import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface StockNewsSummary {
  id: string;
  stock_code: string;
  stock_name: string;
  summary_date: string;
  summary_content: string;
  news_count: number;
  created_at: string;
  updated_at: string;
} 