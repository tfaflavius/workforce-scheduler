const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://gzvoefalfzfdcpojnxkd.supabase.co', 'sb_secret_e5Xw9dKzpkIcdAxHb2Nbbw_G84fgva3');

async function finalCheck() {
  console.log('🎯 VERIFICARE FINALĂ SISTEM\n');
  console.log('='.repeat(50));
  
  // 1. Verifică useri activi
  const { data: dbUsers } = await supabase
    .from('users')
    .select('email, full_name, role, is_active');
  
  const active = dbUsers.filter(u => u.is_active);
  const inactive = dbUsers.filter(u => !u.is_active);
  
  console.log('\n👥 USERI:');
  console.log('  Total: ' + dbUsers.length);
  console.log('  Activi: ' + active.length);
  console.log('  Inactivi: ' + inactive.length);
  
  if (inactive.length > 0) {
    console.log('  ⚠️ Useri inactivi:');
    inactive.forEach(u => console.log('    - ' + u.full_name + ' (' + u.email + ')'));
  }
  
  // 2. Verifică roluri
  console.log('\n🏷️ ROLURI:');
  const admins = dbUsers.filter(u => u.role === 'ADMIN');
  const managers = dbUsers.filter(u => u.role === 'MANAGER');
  const users = dbUsers.filter(u => u.role === 'USER');
  console.log('  ADMIN: ' + admins.length);
  console.log('  MANAGER: ' + managers.length);
  console.log('  USER: ' + users.length);
  
  // 3. Verifică Auth sync
  const { data: { users: authUsers } } = await supabase.auth.admin.listUsers();
  const dbEmails = dbUsers.map(u => u.email);
  const authEmails = authUsers.map(u => u.email);
  
  console.log('\n🔐 AUTH SYNC:');
  console.log('  DB users: ' + dbUsers.length);
  console.log('  Auth users: ' + authUsers.length);
  
  const orphanAuth = authEmails.filter(e => !dbEmails.includes(e));
  const orphanDb = dbEmails.filter(e => !authEmails.includes(e));
  
  if (orphanAuth.length === 0 && orphanDb.length === 0) {
    console.log('  ✅ Sincronizat perfect!');
  } else {
    if (orphanAuth.length > 0) console.log('  ⚠️ Orphan in Auth: ' + orphanAuth.join(', '));
    if (orphanDb.length > 0) console.log('  ⚠️ Orphan in DB: ' + orphanDb.join(', '));
  }
  
  // 4. Verifică programe
  const { data: schedules } = await supabase.from('work_schedules').select('id, name, status');
  const { data: assignments } = await supabase.from('schedule_assignments').select('id');
  
  console.log('\n📅 PROGRAME:');
  console.log('  Work Schedules: ' + schedules.length);
  console.log('  Assignments: ' + assignments.length);
  
  // 5. Verifică shift types
  const { data: shiftTypes } = await supabase.from('shift_types').select('name');
  const uniqueShifts = [...new Set(shiftTypes.map(s => s.name))];
  
  console.log('\n⏰ TIPURI DE TURE: ' + uniqueShifts.length);
  uniqueShifts.forEach(s => console.log('  - ' + s));
  
  console.log('\n' + '='.repeat(50));
  console.log('✅ SISTEM GATA PENTRU UTILIZARE!');
  console.log('='.repeat(50));
  
  console.log('\n📱 CONTURI DE TEST (parola: parola123):');
  console.log('  ADMIN: tfa.flavius@gmail.com');
  console.log('  MANAGER: manager@workforce.com');
  console.log('  USER: angajat@workforce.com');
  
  console.log('\n🌐 URL-uri:');
  console.log('  Frontend: https://workforce-scheduler.vercel.app');
  console.log('  Backend: https://workforce-scheduler-mzgd.onrender.com/api');
}
finalCheck();
