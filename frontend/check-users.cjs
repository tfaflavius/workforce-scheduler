const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://gzvoefalfzfdcpojnxkd.supabase.co', 'sb_secret_e5Xw9dKzpkIcdAxHb2Nbbw_G84fgva3');

async function checkUsers() {
  console.log('👥 VERIFICARE CONTURI ȘI PAROLE\n');
  
  // Get all users from DB
  const { data: dbUsers } = await supabase
    .from('users')
    .select('id, email, full_name, role, is_active')
    .order('role');
  
  // Get all auth users
  const { data: { users: authUsers } } = await supabase.auth.admin.listUsers();
  
  console.log('ADMIN:');
  const admins = dbUsers.filter(u => u.role === 'ADMIN');
  admins.forEach(u => {
    const authUser = authUsers.find(a => a.email === u.email);
    console.log('  ' + (authUser ? '✅' : '❌') + ' ' + u.full_name + ' (' + u.email + ') - Active: ' + u.is_active + (authUser ? '' : ' [NO AUTH]'));
  });
  
  console.log('\nMANAGER:');
  const managers = dbUsers.filter(u => u.role === 'MANAGER');
  managers.forEach(u => {
    const authUser = authUsers.find(a => a.email === u.email);
    console.log('  ' + (authUser ? '✅' : '❌') + ' ' + u.full_name + ' (' + u.email + ') - Active: ' + u.is_active + (authUser ? '' : ' [NO AUTH]'));
  });
  
  console.log('\nUSER:');
  const users = dbUsers.filter(u => u.role === 'USER');
  users.forEach(u => {
    const authUser = authUsers.find(a => a.email === u.email);
    console.log('  ' + (authUser ? '✅' : '❌') + ' ' + u.full_name + ' (' + u.email + ') - Active: ' + u.is_active + (authUser ? '' : ' [NO AUTH]'));
  });
  
  console.log('\n📊 SUMMARY:');
  console.log('  Total DB users: ' + dbUsers.length);
  console.log('  Total Auth users: ' + authUsers.length);
  console.log('  Active users: ' + dbUsers.filter(u => u.is_active).length);
  console.log('  Inactive users: ' + dbUsers.filter(u => !u.is_active).length);
  
  // Check for orphans
  const dbEmails = dbUsers.map(u => u.email);
  const authEmails = authUsers.map(u => u.email);
  const orphanAuth = authEmails.filter(e => !dbEmails.includes(e));
  const orphanDb = dbEmails.filter(e => !authEmails.includes(e));
  
  if (orphanAuth.length > 0) {
    console.log('\n⚠️ Users in Auth but NOT in DB:');
    orphanAuth.forEach(e => console.log('  - ' + e));
  }
  
  if (orphanDb.length > 0) {
    console.log('\n⚠️ Users in DB but NOT in Auth:');
    orphanDb.forEach(e => console.log('  - ' + e));
  }
}
checkUsers();
