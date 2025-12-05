import { createClient } from '@supabase/supabase-js';

// ⚠️ BORRA LO QUE ESTÁ ENTRE COMILLAS Y PEGA TUS DATOS DE SUPABASE
const supabaseUrl = 'https://lybzvkuvjnxbfbaddnfc.supabase.co';
const supabaseKey = 'sb_publishable_E9oPLgg2ZNx-ovOTTtM81A_s4tKPG3f';

export const supabase = createClient(supabaseUrl, supabaseKey);
