"use server";
import { revalidatePath } from "next/cache";

import { createClient } from "@/utils/supabase/server";
import { handleUserSignup } from "../stripe/actions";

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
