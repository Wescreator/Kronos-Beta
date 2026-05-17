import { createClient } from '@supabase/supabase-js'

// Cliente com permissão total — usado apenas em API routes no servidor
// NUNCA importe esse arquivo em componentes do cliente
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)