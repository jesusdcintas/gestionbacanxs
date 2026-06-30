import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const envText = fs.readFileSync('.env', 'utf8');
const env = Object.fromEntries(
  envText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#') && line.includes('='))
    .map((line) => {
      const index = line.indexOf('=');
      return [line.slice(0, index), line.slice(index + 1)];
    }),
);

const supabase = createClient(env.PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

console.log('🔍 Verificando perfiles...\n');

// Listar usuarios de Auth
const { data: users, error: usersError } = await supabase.auth.admin.listUsers();

if (usersError) {
  console.error('❌ Error obteniendo usuarios:', usersError);
  process.exit(1);
}

console.log(`✓ Usuarios en Auth: ${users.users.length}\n`);

for (const user of users.users) {
  console.log(`Usuario: ${user.email} (${user.id})`);
  
  // Verificar si existe el profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (profileError) {
    if (profileError.code === 'PGRST116') {
      console.log('  ⚠️  Profile NO EXISTE - creando...');
      
      // Crear profile
      const { error: insertError } = await supabase
        .from('profiles')
        .insert({
          id: user.id,
          nombre: user.email?.split('@')[0] || 'Usuario',
        });

      if (insertError) {
        console.error('  ❌ Error creando profile:', insertError.message);
      } else {
        console.log('  ✅ Profile creado correctamente');
      }
    } else {
      console.error('  ❌ Error consultando profile:', profileError.message);
    }
  } else {
    console.log(`  ✓ Profile existe: ${profile.nombre}`);
  }
  console.log('');
}

console.log('✅ Verificación completada');
