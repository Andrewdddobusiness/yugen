"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "./AuthProvider";

interface ProtectedRouteProps {
  children: React.ReactNode;
  redirectTo?: string;
  requireEmailVerified?: boolean;
}

export function ProtectedRoute({ 
  children, 
  redirectTo = "/login",
  requireEmailVerified = false 
}: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push(redirectTo);
        return;
      }

      if (requireEmailVerified && !user.email_confirmed_at) {
        router.push("/auth/verify-email");
        return;
      }
    }
  }, [user, loading, router, redirectTo, requireEmailVerified]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          <span>Loading...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // Router will handle redirect
  }

  if (requireEmailVerified && !user.email_confirmed_at) {
    return null; // Router will handle redirect
  }

  return <>{children}</>;
}

export function PublicRoute({ 
  children, 
  redirectTo = "/" 
}: { 
  children: React.ReactNode; 
  redirectTo?: string; 
}) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.push(redirectTo);
    }
  }, [user, loading, router, redirectTo]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          <span>Loading...</span>
        </div>
      </div>
    );
  }

  if (user) {
    return null; // Router will handle redirect
  }

  return <>{children}</>;
}