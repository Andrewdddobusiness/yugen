"use client";

import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/use-toast";
import { logout } from "@/actions/auth/actions";
import { ReactNode } from "react";

export default function LogoutButton({ children, className }: { children: ReactNode; className?: string }) {
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
        window.location.reload();
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
    <span className={`cursor-pointer w-full h-full ${className || ''}`} onClick={handleLogout}>
      {children}
    </span>
  );
}
