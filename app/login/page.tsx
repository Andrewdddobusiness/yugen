"use client";
import Link from "next/link";
import { Suspense, useState } from "react";
import { useForm } from "react-hook-form";
import { useRouter, useSearchParams } from "next/navigation";

import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { useToast } from "@/components/ui/use-toast";

import LoadingSpinner from "@/components/loading/LoadingSpinner";
import LoadingOverlay from "@/components/loading/LoadingOverlay";
import { GoogleSignInButton } from "@/components/form/auth/GoogleSignInButton";

import { login } from "@/actions/auth/actions";
import { loginSchema } from "@/schemas/loginSchema";

function LoginContent() {
  const [loading, setLoading] = useState<any>(false);

  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextParam = searchParams.get("next");
  const safeNext = nextParam && nextParam.startsWith("/") ? nextParam : null;

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const handleLogin = async (values: z.infer<typeof loginSchema>) => {
    setLoading(true);
    const formData = new FormData();
    formData.append("email", values.email);
    formData.append("password", values.password);

    try {
      const response = await login(formData);
      if (response.success === true) {
        toast({
          title: "Logged in.",
          description: "Welcome back traveller!",
        });
        router.push(safeNext ?? "/itineraries");
      } else if (response.error?.message === "Email not confirmed") {
        toast({
          title: "Email not verified",
          description: "Please check your email and verify your account before logging in.",
        });
        const next = safeNext ? `&next=${encodeURIComponent(safeNext)}` : "";
        router.push(`/auth/verify-email?email=${encodeURIComponent(values.email)}${next}`);
      } else {
        toast({
          title: "Login failed",
          description: response.message || "Invalid email or password.",
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
    <div className="flex flex-col items-center justify-center w-full h-full min-h-screen">
      <div className="absolute top-4 left-4">
        <Link href="/">
          <Button variant="outline" className="rounded-xl shadow-lg hover:scale-105 transition-all duration-300">
            Back
          </Button>
        </Link>
      </div>

      {/* Noise texture overlay */}
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
        <div className="mx-auto grid w-[350px] gap-6">
          <div className="grid gap-2 text-center">
            <h1 className="text-4xl font-bold text-[#3F5FA3]">Login</h1>
            <p className="text-muted-foreground text-lg">Let&apos;s get back to planning your next trip!</p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleLogin)} className="space-y-8">
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

              <Button
                type="submit"
                disabled={loading}
                className="rounded-xl shadow-lg hover:scale-105 transition-all duration-300 bg-[#2A3B63] text-white hover:bg-[#3F5FA3]"
              >
                {loading ? <LoadingSpinner /> : "Login"}
              </Button>
            </form>
          </Form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
            </div>
          </div>

          <GoogleSignInButton next={safeNext} />

          <div className="mt-4 text-center text-sm text-gray-500">
            Don&apos;t have an account?{" "}
            <Link
              href={safeNext ? `/signUp?next=${encodeURIComponent(safeNext)}` : "/signUp"}
              className="underline text-[#FF006E]"
            >
              Sign up
            </Link>
          </div>
          
          <div className="text-center text-sm text-gray-500">
            <Link href="/login/reset" className="underline text-[#3F5FA3]">
              Forgot your password?
            </Link>
          </div>
        </div>
      </div>

      <LoadingOverlay show={loading} message="Signing you in..." />
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">Loading…</div>}>
      <LoginContent />
    </Suspense>
  );
}
