"use client";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { useToast } from "@/components/ui/use-toast";

import LoadingSpinner from "@/components/loading/loadingSpinner";

import { signup, logout } from "@/actions/auth/actions";
import { signUpSchema } from "@/schemas/loginSchema";

export default function SignUpPage() {
  const [user, setUser] = useState<any>();
  const [loading, setLoading] = useState<any>(false);

  const { toast } = useToast();

  const form = useForm<z.infer<typeof signUpSchema>>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      first_name: "",
      last_name: "",
      email: "",
      password: "",
    },
  });

  const handleSignUp = async (values: z.infer<typeof signUpSchema>) => {
    setLoading(true);
    const formData = new FormData();
    formData.append("first_name", values.first_name);
    formData.append("last_name", values.last_name);
    formData.append("email", values.email);
    formData.append("password", values.password);

    try {
      const response = await signup(formData);
      if (response.success === true) {
        setUser(response.data);
        toast({
          title: "Welcome aboard!",
          description: "Please check your email to verify your account.",
        });
        await logout();
      } else if (response.success === false && response.message === "Email already exists") {
        toast({
          title: "Email has already been registered.",
          description: "Please login in or use a different email.",
        });
      }
      setLoading(false);
    } catch (error) {
      console.error(error);
      toast({
        title: "Oh no!",
        description: "Something went wrong! Please try again later.",
      });
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center w-full min-h-screen">
      <div className="absolute top-4 left-4">
        <Link href="/">
          <Button variant="outline" className="rounded-xl shadow-lg hover:scale-105 transition-all duration-300">
            Back
          </Button>
        </Link>
      </div>

      <div className="fixed inset-0 pointer-events-none z-0 opacity-50">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 1000 1000"
          preserveAspectRatio="xMidYMid slice"
          className="absolute w-full h-full opacity-[0.5] mix-blend-overlay"
        >
          <image href="/home/noise.svg" width="100%" height="100%" />
        </svg>
      </div>

      <div className="flex items-center justify-center z-50">
        {!user ? (
          <div className="mx-auto grid w-[350px] gap-6">
            <div className="grid gap-2 text-center">
              <h1 className="text-4xl font-bold text-[#3A86FF]">Sign Up</h1>
              <p className="text-muted-foreground text-lg">You're one step closer to planning your next trip!</p>
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSignUp)} className="space-y-8">
                <FormField
                  control={form.control}
                  name="first_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[#3A86FF]">First Name</FormLabel>
                      <FormControl>
                        <Input placeholder="John" type="first_name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="last_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[#3A86FF]">Last Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Smith" type="last_name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[#3A86FF]">Email</FormLabel>
                      <FormControl>
                        <Input placeholder="example@gmail.com" type="email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[#3A86FF]">Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="Enter your password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {loading ? (
                  <LoadingSpinner />
                ) : (
                  <Button
                    type="submit"
                    disabled={loading}
                    className="rounded-xl shadow-lg hover:scale-105 transition-all duration-300 bg-[#032bc0] text-white hover:bg-[#3A86FF]"
                  >
                    Sign Up
                  </Button>
                )}
              </form>
            </Form>

            <div className="mt-4 text-center text-sm text-gray-500">
              Already have an account?{" "}
              <Link href="/login" className="underline text-[#FF006E]">
                Login
              </Link>
            </div>
          </div>
        ) : (
          <div className="mx-auto grid w-[350px] gap-6">
            <div className="grid gap-2 text-center">
              <h1 className="text-3xl font-bold">Awesome!</h1>
              <p className="text-muted-foreground">Check your email to verify your account.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
