"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/utils/supabase/server";
import { handleUserSignup } from "../stripe/actions";

export async function login(formData: FormData, redirectTo?: string) {
  const supabase = createClient();

  const loginFormData = {
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  };

  const { data, error } = await supabase.auth.signInWithPassword(loginFormData);

  if (error) {
    console.log(error);
    // Check if the error is about email confirmation
    if (error.message?.includes("Email not confirmed") || error.message?.includes("email not verified")) {
      return { 
        success: false, 
        message: "Please verify your email before logging in", 
        error: { message: "Email not confirmed" } 
      };
    }
    return { success: false, message: error.message || "Invalid email or password", error };
  }

  // Check if user email is confirmed
  if (data.user && !data.user.email_confirmed_at) {
    // Sign out the user since they shouldn't be logged in without verification
    await supabase.auth.signOut();
    return { 
      success: false, 
      message: "Please verify your email before logging in", 
      error: { message: "Email not confirmed" } 
    };
  }
  
  revalidatePath("/", "layout");
  
  if (redirectTo) {
    redirect(redirectTo);
  }
  
  return { success: true, message: "Login successful" };
}

export async function logout() {
  const supabase = createClient();

  const { error } = await supabase.auth.signOut();

  if (error) {
    console.log(error);
    return { success: false, message: "Logout failed", error };
  }
  revalidatePath("/", "layout");
  return { success: true, message: "Logout successful" };
}

export async function signup(formData: FormData) {
  const supabase = createClient();

  const firstName = formData.get("first_name") as string;
  const lastName = formData.get("last_name") as string;
  const email = formData.get("email") as string;

  const signUpFormData = {
    email,
    password: formData.get("password") as string,
    options: {
      data: {
        first_name: firstName,
        last_name: lastName,
      },
    },
  };

  const { data, error } = await supabase.auth.signUp(signUpFormData);

  if (error) {
    console.log(error);
    return { success: false, message: "Error with sign up" };
  }

  if (data?.user) {
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Pass first and last name to handleUserSignup
      await handleUserSignup(data.user.id, signUpFormData.email, firstName, lastName);
    } catch (error) {
      console.error("Error in post-signup process:", error);
      return { success: false, message: "Error in post-signup process" };
    }
  }

  revalidatePath("/", "layout");
  return { success: true, message: "Signup successful", data };
}

export async function resetPassword(formData: FormData) {
  const supabase = createClient();
  const email = formData.get("email") as string;

  if (!email) {
    return { success: false, message: "Email is required" };
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/login/updatePassword`,
  });

  if (error) {
    console.log(error);
    return { success: false, message: "Error sending reset email", error };
  }

  return { success: true, message: "Password reset email sent" };
}

export async function updatePassword(formData: FormData) {
  const supabase = createClient();
  const password = formData.get("password") as string;

  if (!password) {
    return { success: false, message: "Password is required" };
  }

  const { error } = await supabase.auth.updateUser({
    password,
  });

  if (error) {
    console.log(error);
    return { success: false, message: "Error updating password", error };
  }

  revalidatePath("/", "layout");
  return { success: true, message: "Password updated successfully" };
}

export async function signInWithGoogle() {
  const supabase = createClient();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
    },
  });

  if (error) {
    console.log(error);
    return { success: false, message: "Error with Google sign in", error };
  }

  if (data.url) {
    redirect(data.url);
  }

  return { success: true, message: "Redirecting to Google..." };
}

export async function getUser() {
  const supabase = createClient();
  
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error) {
    console.log(error);
    return { user: null, error };
  }
  
  return { user, error: null };
}

export async function getSession() {
  const supabase = createClient();
  
  const { data: { session }, error } = await supabase.auth.getSession();
  
  if (error) {
    console.log(error);
    return { session: null, error };
  }
  
  return { session, error: null };
}

export async function updateProfile(formData: FormData) {
  const supabase = createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return { success: false, message: "User not authenticated" };
  }

  const updates = {
    display_name: formData.get("display_name") as string,
    avatar_url: formData.get("avatar_url") as string,
    timezone: formData.get("timezone") as string,
  };

  // Filter out empty values
  const filteredUpdates = Object.fromEntries(
    Object.entries(updates).filter(([_, value]) => value !== null && value !== "")
  );

  if (Object.keys(filteredUpdates).length === 0) {
    return { success: false, message: "No updates provided" };
  }

  const { error } = await supabase
    .from("profiles")
    .upsert({
      user_id: user.id,
      ...filteredUpdates,
      updated_at: new Date().toISOString(),
    });

  if (error) {
    console.log(error);
    return { success: false, message: "Error updating profile", error };
  }

  revalidatePath("/", "layout");
  return { success: true, message: "Profile updated successfully" };
}

export async function resendConfirmation(email: string) {
  const supabase = createClient();

  const { error } = await supabase.auth.resend({
    type: "signup",
    email,
  });

  if (error) {
    console.log(error);
    return { success: false, message: "Error resending confirmation", error };
  }

  return { success: true, message: "Confirmation email resent" };
}
