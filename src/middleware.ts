import type { MiddlewareHandler } from 'astro';
import { getSupabaseServerClient } from './lib/supabase';

const PUBLIC_ROUTES = new Set(['/login']);

function isPublicAsset(pathname: string) {
  return (
    pathname.startsWith('/_astro/') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/robots.txt') ||
    pathname.startsWith('/sitemap') ||
    /\.[a-zA-Z0-9]+$/.test(pathname)
  );
}

export const onRequest: MiddlewareHandler = async (context, next) => {
  const { pathname } = context.url;

  if (isPublicAsset(pathname)) {
    return next();
  }

  const supabase = getSupabaseServerClient(context);
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session && !PUBLIC_ROUTES.has(pathname)) {
    return context.redirect('/login');
  }

  if (session && pathname === '/login') {
    return context.redirect('/dashboard');
  }

  return next();
};
