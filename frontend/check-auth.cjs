const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://gzvoefalfzfdcpojnxkd.supabase.co', 'sb_secret_e5Xw9dKzpkIcdAxHb2Nbbw_G84fgva3');

async function check() {
  const { data, error } = await supabase.auth.admin.listUsers();
  console.log('Error:', error);
  console.log('Users count:', data?.users?.length || 0);
  if (data?.users?.length > 0) {
    data.users.slice(0, 3).forEach(u => console.log('  - ' + u.email));
  }
}
check();
