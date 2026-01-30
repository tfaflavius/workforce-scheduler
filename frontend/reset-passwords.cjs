const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://gzvoefalfzfdcpojnxkd.supabase.co', 'sb_secret_e5Xw9dKzpkIcdAxHb2Nbbw_G84fgva3');

async function resetPasswords() {
  const { data: { users: authUsers } } = await supabase.auth.admin.listUsers();
  
  // Lista de useri pentru care resetăm parola la "parola123"
  const toReset = [
    'tfa.flavius@gmail.com',     // Admin
    'manager@workforce.com',     // Manager
    'angajat@workforce.com',     // User test
  ];
  
  console.log('🔐 RESETARE PAROLE LA "parola123"\n');
  
  for (const email of toReset) {
    const user = authUsers.find(u => u.email === email);
    if (user) {
      const { error } = await supabase.auth.admin.updateUserById(user.id, {
        password: 'parola123'
      });
      if (error) {
        console.log('❌ ' + email + ': ' + error.message);
      } else {
        console.log('✅ ' + email + ': parola resetată');
      }
    } else {
      console.log('⚠️ ' + email + ': user not found in auth');
    }
  }
}
resetPasswords();
