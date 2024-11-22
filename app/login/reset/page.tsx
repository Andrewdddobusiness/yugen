"use client";
import { useState } from "react";
import Image from "next/image";

import HomeLayout from "@/components/layouts/homeLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

import { createClient } from "@/utils/supabase/client";

import { toast } from "@/components/ui/use-toast";
import { Separator } from "@/components/ui/separator";
import { Loader2 } from "lucide-react";

export default function ResetPage() {
  const supabase = createClient();
  const [success, setSuccess] = useState(false);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleEmailReset = async () => {
    setLoading(true);
    try {
      const { auth } = supabase;
      const { data: user } = await auth.getUser();

      if (!user.user) {
        throw new Error("User not authenticated");
      }

      const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/login/updatePassword`,
      });

      if (data && !error) {
        toast({
          title: "Success",
          description: "Please check your email to continue resetting your password.",
        });
        setSuccess(true);
      } else {
        throw error;
      }
    } catch (error) {
      console.error(error);
      toast({
        title: "Oh no!",
        description: "Something went wrong! Please try again later.",
      });
    } finally {
      setEmail("");
      setLoading(false);
    }
  };

  const handleTryAgain = () => {
    setEmail("");
    setLoading(false);
    setSuccess(false);
  };

  return (
    <HomeLayout>
      <div className="flex flex-col w-full h-screen justify-center items-center relative">
        <div className="absolute inset-0 -z-50 blur-sm">
          <Image src="/map.jpg" alt="Background Image" layout="fill" objectFit="cover" />
        </div>
        <div className="flex flex-col justify-start p-8 bg-white rounded-md shadow-md gap-2">
          {success ? (
            <>
              <div className="text-2xl font-bold">You&apos;re on your way!</div>
              <div className="text-sm mb-2">Please check your email to reset your password.</div>
              <Separator />
              <div className="flex flex-row items-center text-zinc-500">
                <div className="text-sm">Didn&apos;t get an email?</div>
                <Button variant={"link"} className={"underline"} onClick={handleTryAgain}>
                  Try again.
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="text-2xl font-bold">
                Forgotten your <br />
                password?
              </div>
              <div className="text-sm">
                Please enter your current email linked to your account. <br /> Don’t worry, we’ll send you a message to
                help you <br /> reset your password.
              </div>
              <div>
                <Input
                  type="email"
                  disabled={loading}
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div>
                {loading ? (
                  <Button disabled>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Please wait
                  </Button>
                ) : (
                  <Button onClick={handleEmailReset}>Confirm</Button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </HomeLayout>
  );
}
