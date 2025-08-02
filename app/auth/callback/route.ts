import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { handleUserSignup } from "@/actions/stripe/actions";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = createClient();
    
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data?.user) {
      // Check if this is a new user (first time OAuth login)
      const { data: profile } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("user_id", data.user.id)
        .single();

      // If no profile exists, this is a new user from OAuth
      if (!profile) {
        try {
          // Extract name from OAuth provider data
          const firstName = data.user.user_metadata?.first_name || 
                           data.user.user_metadata?.full_name?.split(" ")[0] || 
                           "";
          const lastName = data.user.user_metadata?.last_name || 
                          data.user.user_metadata?.full_name?.split(" ").slice(1).join(" ") || 
                          "";

          // Handle user signup for OAuth users
          await handleUserSignup(
            data.user.id, 
            data.user.email || "", 
            firstName, 
            lastName
          );
        } catch (error) {
          console.error("Error in OAuth post-signup process:", error);
          // Don't fail the login, just log the error
        }
      }

      const forwardedHost = request.headers.get("x-forwarded-host");
      const isLocalEnv = process.env.NODE_ENV === "development";
      
      if (forwardedHost && !isLocalEnv) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`);
      } else {
        return NextResponse.redirect(`${origin}${next}`);
      }
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/error?message=Authentication failed`);
}