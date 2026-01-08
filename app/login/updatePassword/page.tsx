"use client";
import { Suspense, useEffect, useMemo, useState } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

import { createClient } from "@/utils/supabase/client";

import { toast } from "@/components/ui/use-toast";
import Link from "next/link";

function UpdatePasswordContent() {
  const supabase = useMemo(() => createClient(), []);
  const searchParams = useSearchParams();

  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const code = searchParams.get("code");
    if (!code) return;
    supabase.auth.exchangeCodeForSession(code).catch((e) => {
      console.error("Failed to exchange code for session:", e);
    });
  }, [searchParams, supabase]);

  const handlePasswordUpdate = async () => {
    setLoading(true);
    try {
      if (!password) {
        toast({
          title: "Password required",
          description: "Please enter a new password.",
        });
        return;
      }

      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("User not authenticated");

      const { data, error } = await supabase.auth.updateUser({
        password: password,
      });

      if (data && !error) {
        toast({
          title: "Success",
          description: "Your password has been updated.",
        });
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
      setPassword("");
      setLoading(false);
    }
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
        <div className="text-2xl font-bold">
          Update your <br />
          password
        </div>
        <div className="text-sm text-muted-foreground">
          Enter a new secure password for your account.
        </div>
        <div className="relative">
          <Input
            type={showPassword ? "text" : "password"}
            disabled={loading}
            placeholder="Enter a new password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button
            type="button"
            className="absolute inset-y-0 right-0 flex items-center px-3"
            onClick={() => setShowPassword((prev) => !prev)}
          >
            {showPassword ? <EyeOff /> : <Eye />}
          </button>
        </div>
        <div>
          {loading ? (
            <Button disabled className="w-full">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Please wait
            </Button>
          ) : (
            <Button onClick={handlePasswordUpdate} className="w-full">
              Confirm
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function UpdatePasswordPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">Loading…</div>}>
      <UpdatePasswordContent />
    </Suspense>
  );
}
