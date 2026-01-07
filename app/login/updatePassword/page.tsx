"use client";
import { useEffect, useMemo, useState } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useSearchParams } from "next/navigation";
import HomeLayout from "@/components/layout/HomeLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

import { createClient } from "@/utils/supabase/client";

import { toast } from "@/components/ui/use-toast";

export default function UpdatePasswordPage() {
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
    <HomeLayout>
      <div className="flex flex-col w-full h-screen justify-center items-center bg-white">
        <div className="flex flex-col justify-start p-8 bg-white rounded-md shadow-md gap-2">
          <div className="text-2xl font-bold">
            Forgotten your <br />
            password?
          </div>
          <div className="text-sm">
            Last step! Please enter a newly secure password.
          </div>
          <div className="relative">
            <Input
              type={showPassword ? "text" : "password"}
              disabled={loading}
              placeholder="Enter as new password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              className="absolute inset-y-0 right-0 flex items-center px-3"
              onClick={() => setShowPassword((prev) => !prev)}
            >
              {showPassword ? <EyeOff /> : <Eye />}
            </button>
          </div>
          <div>
            {loading ? (
              <Button disabled>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Please wait
              </Button>
            ) : (
              <Button onClick={handlePasswordUpdate}>Confirm</Button>
            )}
          </div>
        </div>
      </div>
    </HomeLayout>
  );
}
