const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://gzvoefalfzfdcpojnxkd.supabase.co', 'sb_secret_e5Xw9dKzpkIcdAxHb2Nbbw_G84fgva3');

async function cleanup() {
  const { data: { users: authUsers } } = await supabase.auth.admin.listUsers();
  
  const orphans = ['symone20811@yahoo.com', 'symone20811@gmail.com'];
  
  for (const email of orphans) {
    const user = authUsers.find(u => u.email === email);
    if (user) {
      const { error } = await supabase.auth.admin.deleteUser(user.id);
      if (error) {
        console.log('❌ Error deleting ' + email + ': ' + error.message);
      } else {
        console.log('✅ Deleted orphan auth user: ' + email);
      }
    }
  }
}
cleanup();
