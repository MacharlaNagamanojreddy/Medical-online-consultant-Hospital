import { createClient } from '@supabase/supabase-js';

const EXTERNAL_SUPABASE_URL = 'https://pcbvuvaznomffnguwiaw.supabase.co';
const EXTERNAL_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjYnZ1dmF6bm9tZmZuZ3V3aWF3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0MzQ0MTAsImV4cCI6MjA4ODAxMDQxMH0.uzLLUaccHcVcyUsXY1BvagMlsA04oAvuOov-lvrbsIU';

// Use this client to query the external Supabase project
// import { externalSupabase } from "@/integrations/external-supabase/client";
export const externalSupabase = createClient(EXTERNAL_SUPABASE_URL, EXTERNAL_SUPABASE_ANON_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
});
