"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { z } from "zod";

import { createClient } from "@/utils/supabase/server";
import { handleUserSignup } from "../stripe/actions";
import { rateLimit } from "@/lib/security/rateLimit";
import { safeRedirectPath } from "@/lib/security/safeRedirect";

const getClientIpFromHeaders = () => {
  const forwardedFor = headers().get("x-forwarded-for") ?? "";
  const first = forwardedFor.split(",")[0]?.trim();
  return first || headers().get("x-real-ip") || "unknown";
};

const getAppUrl = () => {
  const h = headers();
  const proto = h.get("x-forwarded-proto") ?? "http";
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (host) return `${proto}://${host}`.replace(/\/+$/, "");

  const originLike = h.get("origin") ?? h.get("referer");
  if (originLike) {
    try {
      return new URL(originLike).origin.replace(/\/+$/, "");
    } catch {
      // ignore
    }
  }

  const explicit = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit && explicit.trim().length > 0) return explicit.replace(/\/+$/, "");
  return null;
};

const EmailSchema = z.string().trim().toLowerCase().email().max(320);
const PasswordSchema = z.string().min(6).max(200);
const NameSchema = z
  .string()
  .trim()
  .min(1)
  .max(80)
  .regex(/^[\p{L}\p{M}' -]+$/u, "Invalid characters");

export async function login(formData: FormData, redirectTo?: string) {
  const supabase = createClient();
  const ip = getClientIpFromHeaders();

  const parsed = z
    .object({
      email: EmailSchema,
      password: PasswordSchema,
    })
    .safeParse({
      email: formData.get("email"),
      password: formData.get("password"),
    });

  if (!parsed.success) {
    return { success: false, message: "Invalid email or password." };
  }

  const limiter = rateLimit(`auth:login:${ip}:${parsed.data.email}`, { windowMs: 10 * 60_000, max: 15 });
  if (!limiter.allowed) {
    return { success: false, message: "Too many login attempts. Please try again later." };
  }

  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);

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
  
  const safeRedirect = safeRedirectPath(redirectTo, "");
  if (safeRedirect) {
    redirect(safeRedirect);
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
  const ip = getClientIpFromHeaders();

  const limiter = rateLimit(`auth:signup:${ip}`, { windowMs: 60 * 60_000, max: 10 });
  if (!limiter.allowed) {
    return { success: false, message: "Too many sign up attempts. Please try again later." };
  }

  const parsed = z
    .object({
      first_name: NameSchema,
      last_name: NameSchema,
      email: EmailSchema,
      password: PasswordSchema,
    })
    .safeParse({
      first_name: formData.get("first_name"),
      last_name: formData.get("last_name"),
      email: formData.get("email"),
      password: formData.get("password"),
    });

  if (!parsed.success) {
    return { success: false, message: "Invalid sign up details." };
  }

  const { first_name: firstName, last_name: lastName, email } = parsed.data;

  const signUpFormData = {
    email,
    password: parsed.data.password,
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
  const ip = getClientIpFromHeaders();

  const parsed = z.object({ email: EmailSchema }).safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return { success: false, message: "Email is required" };
  }

  const limiter = rateLimit(`auth:reset_password:${ip}:${parsed.data.email}`, { windowMs: 30 * 60_000, max: 5 });
  if (!limiter.allowed) {
    return { success: false, message: "Too many requests. Please try again later." };
  }

  const appUrl = getAppUrl();
  if (!appUrl) {
    return { success: false, message: "App URL is not configured" };
  }

  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${appUrl}/login/updatePassword`,
  });

  if (error) {
    console.log(error);
    return { success: false, message: "Error sending reset email", error };
  }

  return { success: true, message: "Password reset email sent" };
}

export async function updatePassword(formData: FormData) {
  const supabase = createClient();
  const parsed = z.object({ password: PasswordSchema }).safeParse({ password: formData.get("password") });
  if (!parsed.success) {
    return { success: false, message: "Password is required" };
  }

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });

  if (error) {
    console.log(error);
    return { success: false, message: "Error updating password", error };
  }

  revalidatePath("/", "layout");
  return { success: true, message: "Password updated successfully" };
}

export async function signInWithGoogle(next?: string) {
  const supabase = createClient();

  const safeNext = safeRedirectPath(next, "/");
  const appUrl = getAppUrl();
  if (!appUrl) {
    return { success: false, message: "App URL is not configured" };
  }

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${appUrl}/auth/callback?next=${encodeURIComponent(safeNext)}`,
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
    display_name: formData.get("display_name"),
    avatar_url: formData.get("avatar_url"),
    timezone: formData.get("timezone"),
  };

  // Filter out empty values
  const filteredUpdates = Object.fromEntries(
    Object.entries(updates).filter(([_, value]) => value !== null && value !== "")
  );

  if (Object.keys(filteredUpdates).length === 0) {
    return { success: false, message: "No updates provided" };
  }

  const UpdateProfileSchema = z.object({
    display_name: z.string().trim().min(1).max(80).optional(),
    avatar_url: z.string().trim().url().max(2048).optional(),
    timezone: z.string().trim().min(1).max(64).optional(),
  });
  const parsed = UpdateProfileSchema.safeParse(filteredUpdates);
  if (!parsed.success) {
    return { success: false, message: "Invalid updates provided" };
  }

  const { error } = await supabase
    .from("profiles")
    .upsert({
      user_id: user.id,
      ...parsed.data,
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

  const ip = getClientIpFromHeaders();
  const parsed = EmailSchema.safeParse(email);
  if (!parsed.success) {
    return { success: false, message: "Invalid email address" };
  }

  const limiter = rateLimit(`auth:resend_confirmation:${ip}:${parsed.data}`, { windowMs: 30 * 60_000, max: 5 });
  if (!limiter.allowed) {
    return { success: false, message: "Too many requests. Please try again later." };
  }

  const { error } = await supabase.auth.resend({
    type: "signup",
    email: parsed.data,
  });

  if (error) {
    console.log(error);
    return { success: false, message: "Error resending confirmation", error };
  }

  return { success: true, message: "Confirmation email resent" };
}
