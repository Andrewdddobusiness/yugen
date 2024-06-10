"use client";
import { useState } from "react";
import Image from "next/image";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import NavLayout from "@/components/layouts/navLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

import { createClient } from "@/utils/supabase/client";

import { toast } from "@/components/ui/use-toast";

export default function UpdatePasswordPage() {
  const supabase = createClient();

  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handlePasswordUpdate = async () => {
    setLoading(true);
    try {
      const { auth } = supabase;
      const { data: user } = await auth.getUser();

      if (!user.user) {
        throw new Error("User not authenticated");
      }

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
    <NavLayout>
      <div className="flex flex-col w-full h-screen justify-center items-center relative">
        <div className="absolute inset-0 -z-50 blur-sm">
          <Image
            src="/map2.jpg"
            alt="Background Image"
            layout="fill"
            objectFit="cover"
          />
        </div>
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
    </NavLayout>
  );
}
