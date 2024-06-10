"use server";
import { revalidatePath } from "next/cache";

import { createClient } from "@/utils/supabase/server";

export async function login(formData: FormData) {
  const supabase = createClient();

  const loginFormData = {
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  };

  const { error } = await supabase.auth.signInWithPassword(loginFormData);

  if (error) {
    console.log(error);
    return { success: false, message: "Error with login", error };
  }
  revalidatePath("/", "layout");
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

  const signUpFormData = {
    email: formData.get("email") as string,
    password: formData.get("password") as string,
    options: {
      data: {
        first_name: formData.get("first_name") as string,
        last_name: formData.get("last_name") as string,
      },
    },
  };

  const { auth } = supabase;
  const { data: user } = await auth.getUser();

  if (formData.get("email") === user.user?.email) {
    console.log("Email already exists:", signUpFormData.email);
    return { success: false, message: "Email already exists" };
  }

  const { data, error } = await supabase.auth.signUp(signUpFormData);

  if (error) {
    console.log(error);
    return { success: false, message: "Error with sign up" };
  }
  revalidatePath("/", "layout");
  return { success: true, message: "Logout successful", data };
}
