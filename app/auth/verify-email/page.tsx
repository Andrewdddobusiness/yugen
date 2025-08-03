"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { resendConfirmation } from "@/actions/auth/actions";
import { useAuth } from "@/components/auth/AuthProvider";
import { toast } from "sonner";
import { Mail, RefreshCw } from "lucide-react";
import Link from "next/link";

export default function VerifyEmailPage() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const [isResending, setIsResending] = useState(false);
  
  // Get email from query params or user object
  const email = searchParams.get('email') || user?.email;

  const handleResendConfirmation = async () => {
    if (!email) {
      toast.error("No email address found");
      return;
    }

    setIsResending(true);

    try {
      const result = await resendConfirmation(email);

      if (result.success) {
        toast.success("Confirmation email sent! Please check your inbox.");
      } else {
        toast.error(result.message || "Failed to resend confirmation email");
      }
    } catch (error) {
      console.error("Resend confirmation error:", error);
      toast.error("An unexpected error occurred");
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="container max-w-md mx-auto py-8">
      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
            <Mail className="h-6 w-6 text-blue-600" />
          </div>
          <CardTitle>Verify Your Email</CardTitle>
          <CardDescription>
            We've sent a confirmation email to <strong>{email}</strong>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center text-sm text-muted-foreground">
            <p>Please check your email and click the confirmation link to verify your account.</p>
            <p className="mt-2">Don't forget to check your spam folder!</p>
          </div>

          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-4">
              Didn't receive the email?
            </p>
            <Button
              onClick={handleResendConfirmation}
              disabled={isResending}
              variant="outline"
              className="w-full"
            >
              {isResending ? (
                <div className="flex items-center gap-2">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Sending...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <RefreshCw className="h-4 w-4" />
                  Resend Confirmation Email
                </div>
              )}
            </Button>
          </div>

          <div className="text-center text-xs text-muted-foreground">
            <p>
              Need help? Contact{" "}
              <a href="mailto:support@journey.com" className="text-primary hover:underline">
                support@journey.com
              </a>
            </p>
          </div>

          <div className="pt-4 border-t">
            <Link href="/login">
              <Button variant="ghost" className="w-full">
                Back to Login
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}