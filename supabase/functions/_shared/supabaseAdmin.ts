import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export const createAdminClient = () => {
  return createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SECRET_KEY") ?? "");
};
