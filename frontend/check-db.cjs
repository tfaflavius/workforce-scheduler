const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://gzvoefalfzfdcpojnxkd.supabase.co', 'sb_secret_e5Xw9dKzpkIcdAxHb2Nbbw_G84fgva3');

async function checkSchedules() {
  console.log('📅 VERIFICARE PROGRAME ÎN BAZA DE DATE\n');
  
  // Verifică work_schedules
  const { data: schedules } = await supabase
    .from('work_schedules')
    .select('id, name, month, year, status, created_at')
    .order('created_at', { ascending: false });
  
  console.log('Work Schedules (' + schedules.length + '):');
  schedules.forEach(s => {
    console.log('  ✅ ' + s.name + ' (' + s.month + '/' + s.year + ') - Status: ' + s.status);
  });
  
  // Verifică assignments
  const { data: assignments } = await supabase
    .from('schedule_assignments')
    .select('id, shift_date, notes, user_id, work_schedule_id');
  
  console.log('\nSchedule Assignments (' + assignments.length + '):');
  
  // Group by schedule
  const bySchedule = {};
  assignments.forEach(a => {
    if (!bySchedule[a.work_schedule_id]) bySchedule[a.work_schedule_id] = [];
    bySchedule[a.work_schedule_id].push(a);
  });
  
  for (const schedId in bySchedule) {
    const sched = schedules.find(s => s.id === schedId);
    console.log('  📋 ' + (sched?.name || schedId) + ': ' + bySchedule[schedId].length + ' assignments');
  }
  
  // Verifică shift types
  const { data: shiftTypes } = await supabase
    .from('shift_types')
    .select('name, start_time, end_time')
    .order('display_order');
  
  console.log('\nShift Types disponibile:');
  const unique = [...new Set(shiftTypes.map(s => s.name))];
  unique.forEach(name => console.log('  - ' + name));
}
checkSchedules();
