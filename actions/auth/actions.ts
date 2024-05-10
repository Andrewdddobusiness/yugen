"use server";
import { revalidatePath } from "next/cache";

import { createClient } from "@/utils/supabase/server";

export async function login(formData: FormData) {
  const supabase = createClient();

  const loginFormData = {
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  };

  const { error, data } = await supabase.auth.signInWithPassword(loginFormData);

  if (error) {
    console.log(error);
    return error;
  }
  revalidatePath("/", "layout");
  return data;
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

  const signUpFormData = {
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  };

  const { error, data } = await supabase.auth.signUp(signUpFormData);

  if (error) {
    console.log(error);
    return error;
  }
  revalidatePath("/", "layout");
  return data;
}
