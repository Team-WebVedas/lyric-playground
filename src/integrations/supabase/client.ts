// This file is automatically generated. Do not edit it directly.
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://eubncwkrzwgyxxsgvwkk.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV1Ym5jd2tyendneXh4c2d2d2trIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzk2MjEyOTAsImV4cCI6MjA1NTE5NzI5MH0.-r9kXE3JVMMZ6q-eoT0vb3edQ5mmos4XKZlIvBab2_M";

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);