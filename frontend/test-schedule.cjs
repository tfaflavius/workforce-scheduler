const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://gzvoefalfzfdcpojnxkd.supabase.co', 'sb_secret_e5Xw9dKzpkIcdAxHb2Nbbw_G84fgva3');

async function testCreateSchedule() {
  // Get admin token via backend
  const loginRes = await fetch('https://workforce-scheduler-mzgd.onrender.com/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'flavius.tarta@gmail.com',
      password: 'parola123'
    })
  });
  
  if (loginRes.status !== 201) {
    console.log('❌ Login failed:', loginRes.status);
    return;
  }
  
  const { accessToken } = await loginRes.json();
  console.log('✅ Login OK');
  
  // Get a user ID și shift type ID pentru test
  const { data: users } = await supabase.from('users').select('id, full_name').limit(1);
  const { data: shiftTypes } = await supabase.from('shift_types').select('id, name').limit(1);
  
  console.log('   User for test:', users[0].full_name);
  console.log('   Shift type:', shiftTypes[0].name);
  
  // Creează program test prin API
  const response = await fetch('https://workforce-scheduler-mzgd.onrender.com/api/schedules', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + accessToken
    },
    body: JSON.stringify({
      name: 'Test Salvare Program',
      month: 7,
      year: 2026,
      assignments: [{
        userId: users[0].id,
        shiftDate: '2026-07-01',
        shiftTypeId: shiftTypes[0].id,
        notes: '07:00-19:00'
      }, {
        userId: users[0].id,
        shiftDate: '2026-07-02',
        shiftTypeId: shiftTypes[0].id,
        notes: '07:00-19:00'
      }]
    })
  });
  
  const result = await response.json();
  
  if (response.ok) {
    console.log('✅ Program creat cu succes!');
    console.log('   ID:', result.id);
    console.log('   Name:', result.name);
    console.log('   Status:', result.status);
    console.log('   Assignments:', result.assignments?.length || 0);
    
    // Verifică în DB
    const { data: saved } = await supabase
      .from('work_schedules')
      .select('id, name, status')
      .eq('id', result.id)
      .single();
    
    console.log('✅ Verificat în DB:', saved ? 'GĂSIT' : 'NU GĂSIT');
    
    // Verifică assignments în DB
    const { data: savedAssignments } = await supabase
      .from('schedule_assignments')
      .select('id, shift_date, notes')
      .eq('work_schedule_id', result.id);
    
    console.log('✅ Assignments salvate:', savedAssignments?.length || 0);
    savedAssignments.forEach(a => console.log('   - ' + a.shift_date + ': ' + a.notes));
    
    // Șterge programul de test
    await fetch('https://workforce-scheduler-mzgd.onrender.com/api/schedules/' + result.id, {
      method: 'DELETE',
      headers: { 'Authorization': 'Bearer ' + accessToken }
    });
    console.log('✅ Program de test șters');
    
  } else {
    console.log('❌ Eroare creare program:', result.message || JSON.stringify(result));
  }
}

testCreateSchedule();
