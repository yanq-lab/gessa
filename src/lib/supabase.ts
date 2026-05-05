import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://khqngwvvcoosqgtpmdan.supabase.co";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtocW5nd3Z2Y29vc3FndHBtZGFuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU4MjI4MDAsImV4cCI6MjA2MTM5ODgwMH0.DummyKey";

export const supabase = createClient(supabaseUrl, supabaseKey);

export async function getSession() {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export async function getUser() {
  const { data } = await supabase.auth.getUser();
  return data.user;
}
