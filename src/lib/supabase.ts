import { createBrowserClient, createServerClient, type CookieOptions } from '@supabase/ssr';
import type { APIContext } from 'astro';
import type { Database } from '../types/database';

let browserClient: ReturnType<typeof createBrowserClient<Database>> | null = null;

interface CookieLike {
  getAll?: () => Array<{ name: string; value: string }>;
  set?: (name: string, value: string, options?: CookieOptions) => void;
}

interface SupabaseContext {
  cookies: CookieLike;
  request?: Request;
}

function getEnv() {
  const url = import.meta.env.PUBLIC_SUPABASE_URL;
  const anonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error('Faltan PUBLIC_SUPABASE_URL o PUBLIC_SUPABASE_ANON_KEY en variables de entorno.');
  }

  return { url, anonKey };
}

export function getSupabaseBrowserClient() {
  if (browserClient) {
    return browserClient;
  }

  const { url, anonKey } = getEnv();
  browserClient = createBrowserClient<Database>(url, anonKey);
  return browserClient;
}

function toAstroCookieOptions(options: CookieOptions) {
  return {
    domain: options.domain,
    expires: options.expires,
    httpOnly: options.httpOnly,
    maxAge: options.maxAge,
    path: options.path,
    sameSite: options.sameSite,
    secure: options.secure,
  };
}

function parseCookieHeader(header: string | null | undefined) {
  if (!header) {
    return [] as Array<{ name: string; value: string }>;
  }

  return header
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const index = part.indexOf('=');

      if (index === -1) {
        return null;
      }

      return {
        name: decodeURIComponent(part.slice(0, index).trim()),
        value: decodeURIComponent(part.slice(index + 1).trim()),
      };
    })
    .filter((cookie): cookie is { name: string; value: string } => cookie !== null);
}

export function getSupabaseServerClient(context: Pick<APIContext, 'cookies'> | SupabaseContext) {
  const { url, anonKey } = getEnv();

  return createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        if (typeof context.cookies.getAll === 'function') {
          return context.cookies.getAll();
        }

        return parseCookieHeader(context.request?.headers.get('cookie'));
      },
      setAll(cookiesToSet) {
        if (typeof context.cookies.set !== 'function') {
          return;
        }

        cookiesToSet.forEach(({ name, value, options }) => {
          context.cookies.set(name, value, toAstroCookieOptions(options));
        });
      },
    },
  });
}
