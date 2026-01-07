"use client";
import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { createClient } from "@/utils/supabase/client";
import { useUserStore } from "@/store/userStore";

export default function SecurityCards() {
  const supabase = createClient();
  const router = useRouter();
  const { user, isUserLoading } = useUserStore();

  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteAccount = async () => {
    if (!user?.id) {
      toast({
        title: "Error",
        description: "You must be signed in to delete your account.",
        variant: "destructive",
      });
      return;
    }

    setIsDeleting(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const { data, error } = await supabase.functions.invoke("soft-delete-user", {
        body: { userId: user.id },
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      });

      if (error || !data?.success) throw error || new Error("Failed to delete account");

      await supabase.auth.signOut();
      router.push("/");
      toast({
        title: "Account Scheduled for Deletion",
        description: "Your account will be permanently deleted in 30 days. Sign in again to cancel deletion.",
      });
    } catch (error) {
      console.error("Error deleting account:", error);
      toast({
        title: "Error",
        description: "Failed to delete account. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 3xl:grid-cols-4 5xl:grid-cols-5 gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-gray-800">Password</CardTitle>
        </CardHeader>

        <CardContent className="flex flex-row justify-between min-h-[100px]">
          {isUserLoading ? (
            <Skeleton className="h-10 w-full rounded-lg" />
          ) : (
            <Input disabled type="password" placeholder="************" />
          )}
        </CardContent>

        <CardFooter className="border-t py-4">
          <Link href="/login/reset">
            <Button className="bg-[#3F5FA3] rounded-xl shadow-lg text-white hover:bg-[#3F5FA3]/90 active:scale-95 transition-all duration-300">
              Reset Password
            </Button>
          </Link>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-gray-800">Delete Your Account</CardTitle>
          <CardDescription>Permanently delete your account and all associated data.</CardDescription>
        </CardHeader>

        <CardContent className="flex flex-row justify-between min-h-[70px]" />

        <CardFooter className="border-t py-4">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="rounded-xl shadow-xl" disabled={isUserLoading}>
                Delete Account
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete your account and remove all of your data
                  from our servers.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="rounded-xl shadow-xl">Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteAccount}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl shadow-xl"
                  disabled={isDeleting}
                >
                  {isDeleting ? "Deleting..." : "Delete Account"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardFooter>
      </Card>
    </div>
  );
}
