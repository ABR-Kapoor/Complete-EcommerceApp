import axios from 'axios';

const SUPABASE_URL =
  process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://vokrukesufnllcmyqirj.supabase.co';
const SUPABASE_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZva3J1a2VzdWZubGxjbXlxaXJqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODA1MTcwOSwiZXhwIjoyMDkzNjI3NzA5fQ.Lv2PP9Ul1BDyF9CG6FwJeqlUiU6YVuB7TO1_THlv6Yo';

export const supabaseApi = axios.create({
  baseURL: `${SUPABASE_URL}/rest/v1`,
  headers: {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
    Prefer: 'return=representation',
  },
  timeout: 12000,
});

export { SUPABASE_URL, SUPABASE_KEY };
