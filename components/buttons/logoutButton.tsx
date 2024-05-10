"use client";

import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { logout } from "@/actions/auth/actions";

export default function LogoutButton() {
  const router = useRouter();
  const { toast } = useToast();

  const handleLogout = async () => {
    try {
      const result = await logout();

      if (result.success) {
        toast({
          title: "Logged out",
          description: "You have been successfully logged out.",
        });

        router.push("/");
      } else {
        toast({
          title: "Logout failed",
          description: "There was an issue with logging out. Please try again.",
        });
      }
    } catch (error) {
      console.error("Logout error:", error);
      toast({
        title: "Logout error",
        description: "An unexpected error occurred during logout.",
      });
    }
  };

  return (
    <span className="cursor-pointer" onClick={handleLogout}>
      Logout
    </span>
  );
}
