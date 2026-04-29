import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://qqcjvyuylfscdswlckdg.supabase.co'
const supabaseKey = 'sb_publishable_st4fRfZr2RxpQ3xcgvLWMg_S-QPNXbT'

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false
  }
})