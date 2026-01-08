"use client";
import { useEffect, useMemo, useState } from "react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

import { createClient } from "@/utils/supabase/client";

import { toast } from "@/components/ui/use-toast";
import { Separator } from "@/components/ui/separator";
import { Loader2 } from "lucide-react";
import Link from "next/link";

export default function ResetPage() {
  const supabase = useMemo(() => createClient(), []);
  const [success, setSuccess] = useState(false);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Best-effort prefill when the user is already signed in.
    supabase.auth
      .getUser()
      .then(({ data }) => {
        if (!email && data?.user?.email) setEmail(data.user.email);
      })
      .catch(() => {});
  }, [email, supabase]);

  const handleEmailReset = async () => {
    setLoading(true);
    try {
      if (!email) {
        toast({
          title: "Email required",
          description: "Please enter your email to reset your password.",
        });
        return;
      }

      const redirectTo = `${window.location.origin}/login/updatePassword`;
      const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo,
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
      setLoading(false);
    }
  };

  const handleTryAgain = () => {
    setEmail("");
    setLoading(false);
    setSuccess(false);
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-white px-4">
      <div className="absolute left-4 top-4">
        <Link href="/login">
          <Button variant="outline" className="rounded-xl shadow-lg hover:scale-105 transition-all duration-300">
            Back
          </Button>
        </Link>
      </div>

      <div className="flex w-full max-w-md flex-col gap-3 rounded-2xl bg-white p-8 shadow-md">
        {success ? (
          <>
            <div className="text-2xl font-bold">You&apos;re on your way!</div>
            <div className="text-sm text-muted-foreground">Please check your email to reset your password.</div>
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
            <div className="text-sm text-muted-foreground">
              Please enter the email linked to your account. We&apos;ll send you a reset link.
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
                <Button disabled className="w-full">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Please wait
                </Button>
              ) : (
                <Button onClick={handleEmailReset} className="w-full">
                  Confirm
                </Button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
