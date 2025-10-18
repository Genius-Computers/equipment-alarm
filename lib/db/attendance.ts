import { getDb } from './connection';

export const logInAttendance = async (userId: string, employeeId?: string, displayName?: string) => {
  const sql = getDb();
  
  // Get today's date in Saudi timezone
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Riyadh' }); // YYYY-MM-DD
  
  // Check if already logged in today
  const existing = await sql`
    select id, log_in_time, log_out_time
    from attendance
    where user_id = ${userId} and date = ${today}
    limit 1
  `;
  
  if (existing && existing.length > 0) {
    // Already has a record for today, just update log_in_time if not already set
    const record = existing[0] as { id: string; log_in_time: string; log_out_time: string | null };
    if (!record.log_in_time) {
      const [updated] = await sql`
        update attendance
        set log_in_time = now(), updated_at = now()
        where id = ${record.id}
        returning *
      `;
      return updated;
    }
    return record;
  }
  
  // Create new attendance record
  const [newRecord] = await sql`
    insert into attendance (
      user_id, date, log_in_time, employee_id, display_name, created_at
    ) values (
      ${userId}, ${today}, now(), ${employeeId || null}, ${displayName || null}, now()
    ) returning *
  `;
  
  return newRecord;
};

export const logOutAttendance = async (userId: string) => {
  const sql = getDb();
  
  // Get today's date in Saudi timezone
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Riyadh' }); // YYYY-MM-DD
  
  const [updated] = await sql`
    update attendance
    set log_out_time = now(), updated_at = now()
    where user_id = ${userId} and date = ${today}
    returning *
  `;
  
  return updated;
};

export const getTodayAttendance = async (userId: string) => {
  const sql = getDb();
  
  // Get today's date in Saudi timezone
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Riyadh' }); // YYYY-MM-DD
  
  const result = await sql`
    select * from attendance
    where user_id = ${userId} and date = ${today}
    limit 1
  `;
  
  return result && result.length > 0 ? result[0] : null;
};

export const getAttendanceForDate = async (date: string) => {
  const sql = getDb();
  
  const result = await sql`
    select * from attendance
    where date = ${date}
    order by log_in_time asc
  `;
  
  return result;
};
