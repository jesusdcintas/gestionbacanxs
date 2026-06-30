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

console.log('🔍 Verificando datos antes de la migración...\n');

// Contar registros en cada tabla
console.log('📊 RESUMEN DE REGISTROS:');
console.log('========================\n');

const { data: eventos } = await supabase.from('eventos').select('*', { count: 'exact', head: true });
const { data: ingresos } = await supabase.from('ingresos').select('*', { count: 'exact', head: true });
const { data: gastos } = await supabase.from('gastos').select('*', { count: 'exact', head: true });

console.log(`Eventos:  ${eventos?.length || 0} registros`);
console.log(`Ingresos: ${ingresos?.length || 0} registros`);
console.log(`Gastos:   ${gastos?.length || 0} registros\n`);

// Verificar ingresos sin evento (se perderán)
const { data: ingresosSinEvento, error: errorSinEvento } = await supabase
  .from('ingresos')
  .select('*')
  .is('evento_id', null);

console.log('⚠️  INGRESOS SIN EVENTO (se perderán en la migración):');
console.log('======================================================\n');

if (ingresosSinEvento && ingresosSinEvento.length > 0) {
  const totalSinEvento = ingresosSinEvento.reduce((sum, ing) => sum + parseFloat(ing.cantidad), 0);
  console.log(`❌ ${ingresosSinEvento.length} ingresos sin evento asociado`);
  console.log(`   Total: ${totalSinEvento.toFixed(2)}€\n`);
  console.log('Detalle:');
  ingresosSinEvento.forEach((ing) => {
    console.log(`  - ${ing.fecha} | ${ing.concepto} | ${ing.cantidad}€`);
  });
  console.log('');
} else {
  console.log('✅ No hay ingresos sin evento. Todos se migrarán correctamente.\n');
}

// Verificar ingresos con evento (se migrarán)
const { data: ingresosConEvento } = await supabase
  .from('ingresos')
  .select('*')
  .not('evento_id', 'is', null);

console.log('✅ INGRESOS CON EVENTO (se migrarán a pagos_evento):');
console.log('====================================================\n');

if (ingresosConEvento && ingresosConEvento.length > 0) {
  const totalConEvento = ingresosConEvento.reduce((sum, ing) => sum + parseFloat(ing.cantidad), 0);
  console.log(`✓ ${ingresosConEvento.length} ingresos ligados a eventos`);
  console.log(`  Total: ${totalConEvento.toFixed(2)}€\n`);
} else {
  console.log('No hay ingresos ligados a eventos.\n');
}

// Verificar eventos
const { data: eventosDetalle } = await supabase.from('eventos').select('*').order('fecha', { ascending: false });

console.log('📅 EVENTOS ACTUALES:');
console.log('===================\n');

if (eventosDetalle && eventosDetalle.length > 0) {
  console.log(`Total: ${eventosDetalle.length} eventos\n`);
  eventosDetalle.slice(0, 5).forEach((evt) => {
    const estado = evt.cobrado ? '✓ Cobrado' : '⏳ Pendiente';
    console.log(`  ${evt.fecha} | ${evt.nombre} | ${evt.precio}€ | ${estado}`);
  });
  if (eventosDetalle.length > 5) {
    console.log(`  ... y ${eventosDetalle.length - 5} eventos más`);
  }
  console.log('');
} else {
  console.log('No hay eventos.\n');
}

// Verificar gastos
const { data: gastosDetalle } = await supabase.from('gastos').select('*').order('fecha', { ascending: false });

console.log('💸 GASTOS ACTUALES:');
console.log('==================\n');

if (gastosDetalle && gastosDetalle.length > 0) {
  const totalGastos = gastosDetalle.reduce((sum, g) => sum + parseFloat(g.cantidad), 0);
  console.log(`Total: ${gastosDetalle.length} gastos (${totalGastos.toFixed(2)}€)\n`);
  
  const conEvento = gastosDetalle.filter(g => g.evento_id !== null).length;
  const sinEvento = gastosDetalle.filter(g => g.evento_id === null).length;
  
  console.log(`  Con evento:  ${conEvento} gastos`);
  console.log(`  Sin evento:  ${sinEvento} gastos (generales de empresa)\n`);
} else {
  console.log('No hay gastos.\n');
}

console.log('='.repeat(60));
console.log('\n✅ Verificación completada\n');

if (ingresosSinEvento && ingresosSinEvento.length > 0) {
  console.log('⚠️  ATENCIÓN: Hay ingresos sin evento que se perderán.');
  console.log('   Revisa el detalle arriba antes de continuar.\n');
} else {
  console.log('✅ Todos los datos se migrarán correctamente.\n');
}
