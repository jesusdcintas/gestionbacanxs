import type { APIRoute } from 'astro';
import { getSupabaseServerClient } from '../../lib/supabase';

export const POST: APIRoute = async ({ cookies, redirect }) => {
  const supabase = getSupabaseServerClient({ cookies });
  await supabase.auth.signOut();

  return redirect('/login');
};
