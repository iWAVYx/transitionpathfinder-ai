import { createClient } from '@supabase/supabase-js';
const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const { data, error } = await client
  .from('student_collaborators')
  .delete()
  .eq('user_id', '038f92be-916f-4dc9-84e4-b36f9645f5c2')
  .select('*');
if (error) {
  console.error('Delete failed:', error);
  process.exit(1);
}
console.log('Deleted rows:', data?.length ?? 0);
console.log(JSON.stringify(data, null, 2));
