"use client";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";

import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { useToast } from "@/components/ui/use-toast";

import LoadingSpinner from "@/components/loading/loadingSpinner";

import { login } from "@/actions/auth/actions";
import { loginSchema } from "@/schemas/loginSchema";

export default function LoginPage() {
  const [loading, setLoading] = useState<any>(false);

  const { toast } = useToast();
  const router = useRouter();

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
        router.push("/itineraries");
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
            <h1 className="text-4xl font-bold text-[#3A86FF]">Login</h1>
            <p className="text-muted-foreground text-lg">Let's get back to planning your next trip!</p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleLogin)} className="space-y-8">
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
                  Login
                </Button>
              )}
            </form>
          </Form>

          <div className="mt-4 text-center text-sm text-gray-500">
            Don&apos;t have an account?{" "}
            <Link href="/signUp" className="underline text-[#FF006E]">
              Sign up
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
