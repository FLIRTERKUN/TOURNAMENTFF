import { createClient } from '@supabase/supabase-js';
import { config } from '../config/index.js';

let supabaseClient = null;

export function getSupabaseClient() {
  if (!supabaseClient) {
    if (!config.supabaseUrl || !config.supabaseKey) {
      // In tests or offline environments without env vars, warn and return null
      return null;
    }
    supabaseClient = createClient(config.supabaseUrl, config.supabaseKey, {
      auth: { persistSession: false },
    });
  }
  return supabaseClient;
}

export function setSupabaseClient(client) {
  supabaseClient = client;
}
