import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY
export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,        // ← обязательно! сохраняет сессию в localStorage
    autoRefreshToken: true,      // ← автоматически обновляет токен
    detectSessionInUrl: true,    // ← важно для OAuth и magic li
    storageKey: 'supabase.auth.token', // можно оставить по умолчанию
  },
})
