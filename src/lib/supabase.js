import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

// DBの snake_case → JS の camelCase
export const dbToGoal = (row) => ({
  id: row.id,
  title: row.title,
  reason: row.reason,
  deadline: row.deadline,
  risk: row.risk,
  reward: row.reward || '',
  isSigned: row.is_signed,
  voiceData: row.voice_data,
  logs: row.logs || [],
  failureLogs: row.failure_logs || [],
});

// JS の camelCase → DB の snake_case
export const goalToDb = (g) => ({
  id: g.id,
  title: g.title,
  reason: g.reason,
  deadline: g.deadline,
  risk: g.risk,
  reward: g.reward || '',
  is_signed: g.isSigned,
  voice_data: g.voiceData,
  logs: g.logs || [],
  failure_logs: g.failureLogs || [],
  updated_at: new Date().toISOString(),
});
