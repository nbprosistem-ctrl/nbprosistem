const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.warn('⚠️  Supabase URL ou Service Key não configurados. Uploads podem falhar.');
}

const supabase = createClient(supabaseUrl || 'https://dummy.supabase.co', supabaseServiceKey || 'dummy');

module.exports = supabase;
