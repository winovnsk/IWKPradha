import { createClient } from '@supabase/supabase-js';

let warnedMissingEnv = false;

function getSupabaseEnv() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    if (!warnedMissingEnv) {
      warnedMissingEnv = true;
      console.warn(
        '[Supabase] NEXT_PUBLIC_SUPABASE_URL atau SUPABASE_SERVICE_ROLE_KEY belum diatur. ' +
          'Fitur upload/storage tidak akan berfungsi sampai env dilengkapi.'
      );
    }

    throw new Error(
      'Konfigurasi Supabase belum lengkap. Pastikan NEXT_PUBLIC_SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY tersedia.'
    );
  }

  return { supabaseUrl, supabaseKey };
}

export function getSupabaseServerClient() {
  const { supabaseUrl, supabaseKey } = getSupabaseEnv();
  return createClient(supabaseUrl, supabaseKey);
}
