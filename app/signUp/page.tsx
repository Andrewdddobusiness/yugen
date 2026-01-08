"use client";
import Image from "next/image";
import Link from "next/link";
import { Suspense, useState } from "react";
import { useForm } from "react-hook-form";
import { useSearchParams } from "next/navigation";

import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { useToast } from "@/components/ui/use-toast";

import LoadingSpinner from "@/components/loading/LoadingSpinner";
import { GoogleSignInButton } from "@/components/form/auth/GoogleSignInButton";

import { signup, logout, resendConfirmation } from "@/actions/auth/actions";
import { signUpSchema } from "@/schemas/loginSchema";

function SignUpContent() {
  const [user, setUser] = useState<any>();
  const [loading, setLoading] = useState<any>(false);

  const { toast } = useToast();
  const searchParams = useSearchParams();
  const nextParam = searchParams.get("next");
  const safeNext = nextParam && nextParam.startsWith("/") ? nextParam : null;

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
              <h1 className="text-4xl font-bold text-[#3F5FA3]">Sign Up</h1>
              <p className="text-muted-foreground text-lg">You&apos;re one step closer to planning your next trip!</p>
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSignUp)} className="space-y-8">
                <FormField
                  control={form.control}
                  name="first_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[#3F5FA3]">First Name</FormLabel>
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
                      <FormLabel className="text-[#3F5FA3]">Last Name</FormLabel>
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
                      <FormLabel className="text-[#3F5FA3]">Email</FormLabel>
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
                      <FormLabel className="text-[#3F5FA3]">Password</FormLabel>
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
                    className="rounded-xl shadow-lg hover:scale-105 transition-all duration-300 bg-[#2A3B63] text-white hover:bg-[#3F5FA3]"
                  >
                    Sign Up
                  </Button>
                )}
              </form>
            </Form>

            <div className="mt-6 space-y-4">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
                </div>
              </div>
              
              <GoogleSignInButton 
                text="Sign up with Google"
                className="rounded-xl shadow-lg hover:scale-105 transition-all duration-300"
                next={safeNext}
              />
            </div>

            <div className="mt-4 text-center text-sm text-gray-500">
              Already have an account?{" "}
              <Link
                href={safeNext ? `/login?next=${encodeURIComponent(safeNext)}` : "/login"}
                className="underline text-[#FF006E]"
              >
                Login
              </Link>
            </div>
          </div>
        ) : (
          <div className="mx-auto grid w-[450px] gap-6">
            <div className="grid gap-4 text-center">
              <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
                <svg className="h-8 w-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h1 className="text-3xl font-bold text-[#3F5FA3]">Welcome aboard!</h1>
              <div className="space-y-2">
                <p className="text-lg text-muted-foreground">
                  We&apos;ve sent a verification email to:
                </p>
                <p className="font-semibold text-lg">{user.user?.email}</p>
              </div>
              <div className="bg-blue-50 rounded-lg p-4 text-sm text-blue-800">
                <p className="font-semibold mb-1">Please verify your email before logging in</p>
                <p>Check your inbox and click the verification link to activate your account.</p>
              </div>
              <div className="pt-4 space-y-3">
                <Link href={safeNext ? `/login?next=${encodeURIComponent(safeNext)}` : "/login"}>
                  <Button className="w-full rounded-xl shadow-lg hover:scale-105 transition-all duration-300 bg-[#2A3B63] text-white hover:bg-[#3F5FA3]">
                    Go to Login
                  </Button>
                </Link>
                <p className="text-sm text-muted-foreground">
                  Didn&apos;t receive the email? Check your spam folder or{" "}
                  <button
                    onClick={async () => {
                      if (user.user?.email) {
                        const result = await resendConfirmation(user.user.email);
                        if (result.success) {
                          toast({
                            title: "Email sent!",
                            description: "Please check your inbox.",
                          });
                        } else {
                          toast({
                            title: "Error",
                            description: result.message,
                          });
                        }
                      }
                    }}
                    className="text-[#3F5FA3] underline hover:no-underline"
                  >
                    resend verification email
                  </button>
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function SignUpPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">Loading…</div>}>
      <SignUpContent />
    </Suspense>
  );
}
