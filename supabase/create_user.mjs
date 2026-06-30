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

console.log('🔧 Creando usuario jesus.cintasmu@gmail.com...\n');

// Intentar crear el usuario
const { data, error } = await supabase.auth.admin.createUser({
  email: 'jesus.cintasmu@gmail.com',
  password: '12345678',
  email_confirm: true,
  user_metadata: {
    nombre: 'Jesus Cintas',
  },
});

if (error) {
  console.error('❌ Error creando usuario:', error.message);
  console.error('Detalles:', JSON.stringify(error, null, 2));
  process.exit(1);
}

console.log('✅ Usuario creado correctamente');
console.log('   ID:', data.user?.id);
console.log('   Email:', data.user?.email);
console.log('');

// Crear profile
if (data.user) {
  const { error: profileError } = await supabase.from('profiles').upsert({
    id: data.user.id,
    nombre: 'Jesus Cintas',
  });

  if (profileError) {
    console.error('⚠️  Error sincronizando profile:', profileError.message);
    console.log('   Puedes crearlo manualmente con este SQL:');
    console.log(`   insert into public.profiles (id, nombre) values ('${data.user.id}', 'Jesus Cintas');`);
  } else {
    console.log('✅ Profile sincronizado correctamente');
  }
}

console.log('\n🎉 Usuario listo para iniciar sesión en la app');
