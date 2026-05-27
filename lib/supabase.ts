import { createBrowserClient } from '@supabase/ssr'

const URL  = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Client padrão — anon key, gerencia sessão de auth via cookie
export function createClient() {
  return createBrowserClient(URL, ANON)
}

// No browser, createAdminClient usa a mesma sessão autenticada.
// O service role key real só pode ser usado server-side.
// As políticas RLS para 'authenticated' garantem o acesso.
export function createAdminClient() {
  return createBrowserClient(URL, ANON)
}
