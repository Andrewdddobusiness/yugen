import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { createAdminClient } from "../_shared/supabaseAdmin.ts";

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createAdminClient();
    const { userId } = await req.json();
    const deletionDate = new Date();
    const scheduledDeletionDate = new Date(deletionDate.getTime() + 30 * 24 * 60 * 60 * 1000);

    // Update user metadata
    const { error: updateError } = await supabaseClient.auth.admin.updateUserById(userId, {
      user_metadata: {
        deleted_at: deletionDate.toISOString(),
        scheduled_deletion_date: scheduledDeletionDate.toISOString(),
      },
    });

    if (updateError) throw updateError;

    // Pass true directly as the second argument
    const { error: deleteError } = await supabaseClient.auth.admin.deleteUser(userId, true);

    if (deleteError) throw deleteError;

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in soft-delete-user:", error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
