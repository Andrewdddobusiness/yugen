"use client";
import React, { Suspense, useEffect, useState } from "react";
import { useDropzone } from "react-dropzone";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
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

import LoadingSpinner from "@/components/loading/loadingSpinner";

// import { uploadToStorage } from "@/actions/file/actions";

import { createClient } from "@/utils/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { useUserStore } from "@/store/userStore";

export default function ProfileCards() {
  const supabase = createClient();

  const { profileUrl, isProfileUrlLoading } = useUserStore();

  const [user, setUser] = useState<any>(null);
  const [isEditingProfilePhoto, setIsEditingProfilePhoto] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [file, setFile] = useState(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");

  const [loadingProfile, setProfileLoading] = useState<any>(false);
  const [loadingName, setNameLoading] = useState<any>(false);
  const [loadingEmail, setEmailLoading] = useState<any>(false);

  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();

  const onDrop = (acceptedFiles: any) => {
    const uploadedFile = acceptedFiles[0];
    setFile(uploadedFile);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
  });

  const handleProfileSave = async () => {
    setProfileLoading(true);
    if (!file) return;

    try {
      const { auth } = supabase;
      const { data: user } = await auth.getUser();

      if (!user.user) {
        throw new Error("User not authenticated");
      }

      // FIX LATER
      // const response = await uploadToStorage(file);

      const { data, error } = await supabase.storage.from("avatars").upload(user.user.id + "/profile", file, {
        cacheControl: "3600",
        upsert: false,
      });

      if (data && !error) {
        toast({
          title: "Success",
          description: "Profile picture updated.",
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
      setProfileLoading(false);
      setIsEditingProfilePhoto(false);
      setFile(null);
    }
  };

  const handleNameSave = async () => {
    setNameLoading(true);

    try {
      // Update supabase auth user names
      const { data: nameAuth, error } = await supabase.auth.updateUser({
        data: { first_name: firstName, last_name: lastName },
      });

      if (nameAuth) {
        toast({
          title: "Success",
          description: "Name updated.",
        });
        setFirstName(firstName);
        setLastName(lastName);
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
      setNameLoading(false);
      setIsEditingName(false);
    }
  };

  const handleEmailSave = async () => {
    setEmailLoading(true);

    try {
      // Update supabase auth user email
      const { data: emailAuth, error } = await supabase.auth.updateUser({
        email: email,
      });

      if (emailAuth && !error) {
        toast({
          title: "Success",
          description: "Please check your email to verify your new email.",
        });
        setEmail(email);
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
      setEmailLoading(false);
      setIsEditingEmail(false);
    }
  };

  const toggleEditingProfilePhoto = () => {
    setIsEditingProfilePhoto((prevState) => !prevState);

    setFile(null);
  };

  const toggleEditingName = () => {
    setIsEditingName((prevState) => !prevState);
  };

  const toggleEditingEmail = () => {
    setIsEditingEmail((prevState) => !prevState);
  };

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const { auth } = supabase;
        const { data: user } = await auth.getUser();

        if (!user.user) {
          throw new Error("User not authenticated");
        }
        setUser(user.user);

        if (user?.user?.user_metadata?.first_name) {
          setFirstName(user.user.user_metadata.first_name);
        }

        if (user?.user?.user_metadata?.last_name) {
          setLastName(user.user.user_metadata.last_name);
        }

        if (user?.user?.user_metadata?.email) {
          setEmail(user.user.user_metadata.email);
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      }
    };

    fetchUserData();
  }, [supabase]);

  const handleDeleteAccount = async () => {
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

      if (error || !data.success) throw error || new Error("Failed to delete account");

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
      {/* Profile Photo Section */}
      <Card>
        <CardHeader>
          <CardTitle>Profile Photo</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-row justify-between min-h-[100px]">
          {!isEditingProfilePhoto ? (
            <div className="grid grid-cols-4 gap-4">
              <Avatar className="h-16 w-16 rounded-lg p-1 border border-gray-200">
                {isProfileUrlLoading ? (
                  <Skeleton className="h-full w-full" />
                ) : profileUrl ? (
                  <AvatarImage src={profileUrl} className="rounded-md" />
                ) : user ? (
                  <AvatarFallback className="rounded-md bg-muted">
                    {user.user_metadata.first_name?.[0]}
                    {user.user_metadata.last_name?.[0]}
                  </AvatarFallback>
                ) : (
                  <Skeleton className="h-full w-full" />
                )}
              </Avatar>
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-4">
              <div className="col-span-1">
                <Avatar className="h-16 w-16 rounded-lg p-1 border border-gray-200">
                  {isProfileUrlLoading ? (
                    <Skeleton className="h-full w-full" />
                  ) : profileUrl ? (
                    <AvatarImage src={profileUrl} className="rounded-md" />
                  ) : user ? (
                    <AvatarFallback className="rounded-md bg-muted">
                      {user.user_metadata.first_name?.[0]}
                      {user.user_metadata.last_name?.[0]}
                    </AvatarFallback>
                  ) : (
                    <Skeleton className="h-full w-full" />
                  )}
                </Avatar>
              </div>

              <div
                {...getRootProps()}
                className={`col-span-3 border-2 border-dashed rounded-lg p-4 flex items-center justify-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 active:bg-blue-100 ${
                  isDragActive ? "border-blue-500" : "border-gray-200"
                }`}
              >
                <Input {...getInputProps()} accept=".png, .jpg, .jpeg" />

                <div className="flex flex-col items-center justify-center text-center">
                  <p className="text-gray-400 text-sm px-2">
                    Drop your profile picture here, or click to select a file.
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
        <CardFooter className="border-t py-4">
          {!isEditingProfilePhoto ? (
            <Button onClick={() => toggleEditingProfilePhoto()}>Edit</Button>
          ) : (
            <>
              {loadingProfile ? (
                <LoadingSpinner />
              ) : (
                <>
                  <Button onClick={handleProfileSave}>Save</Button>
                  <Button onClick={() => toggleEditingProfilePhoto()} variant={"outline"} className="ml-4">
                    Back
                  </Button>
                </>
              )}
            </>
          )}
        </CardFooter>
      </Card>

      {/* Name Section */}
      <Card>
        <CardHeader>
          <CardTitle>Name</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-row justify-between min-h-[100px]">
          {!isEditingName ? (
            <>
              {user ? (
                <Input
                  disabled={!isEditingName}
                  placeholder="Enter your name"
                  value={user.user_metadata.first_name + " " + user.user_metadata.last_name}
                />
              ) : (
                <Skeleton className="h-10 w-full rounded-lg" />
              )}
            </>
          ) : (
            <>
              {user && (
                <div className="flex flex-row gap-4">
                  <Input
                    disabled={!isEditingName}
                    placeholder="Enter your first name"
                    value={!isEditingName ? user.user_metadata.first_name : firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                  />
                  <Input
                    disabled={!isEditingName}
                    placeholder="Enter your last name"
                    value={!isEditingName ? user.user_metadata.last_name : lastName}
                    onChange={(e) => setLastName(e.target.value)}
                  />
                </div>
              )}
            </>
          )}
        </CardContent>
        <CardFooter className="border-t py-4">
          {!isEditingName ? (
            <Button onClick={() => toggleEditingName()}>Edit</Button>
          ) : (
            <>
              {loadingName ? (
                <LoadingSpinner />
              ) : (
                <>
                  <Button onClick={handleNameSave}>Save</Button>
                  <Button onClick={() => toggleEditingName()} variant={"outline"} className="ml-4">
                    Back
                  </Button>
                </>
              )}
            </>
          )}
        </CardFooter>
      </Card>

      {/* Email Section */}
      <Card>
        <CardHeader>
          <CardTitle>Email</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-row justify-between min-h-[100px]">
          {user ? (
            <Input
              type="email"
              disabled={!isEditingEmail}
              placeholder="Enter your email"
              value={!isEditingEmail ? user.user_metadata.email : email}
              onChange={(e) => setEmail(e.target.value)}
            />
          ) : (
            <Skeleton className="h-10 w-full rounded-lg" />
          )}
        </CardContent>
        <CardFooter className="border-t py-4">
          {!isEditingEmail ? (
            <Button onClick={() => toggleEditingEmail()}>Edit</Button>
          ) : (
            <>
              {loadingEmail ? (
                <LoadingSpinner />
              ) : (
                <>
                  <Button onClick={handleEmailSave}>Save</Button>
                  <Button onClick={() => toggleEditingEmail()} variant={"outline"} className="ml-4">
                    Back
                  </Button>
                </>
              )}
            </>
          )}
        </CardFooter>
      </Card>

      {/* Password Section */}
      <Card>
        <CardHeader>
          <CardTitle>Password</CardTitle>
        </CardHeader>

        <CardContent className="flex flex-row justify-between min-h-[100px]">
          <Input disabled type="password" placeholder="************" />
        </CardContent>

        <CardFooter className="border-t py-4">
          <Link href="/login/reset">
            <Button>Reset Password</Button>
          </Link>
        </CardFooter>
      </Card>

      {/* Delete Account Section */}
      <Card>
        <CardHeader>
          <CardTitle>Delete Your Account</CardTitle>
          <CardDescription>Permanently delete your account and all associated data.</CardDescription>
        </CardHeader>

        <CardContent className="flex flex-row justify-between min-h-[70px]">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">Delete Account</Button>
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
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteAccount}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  disabled={isDeleting}
                >
                  {isDeleting ? "Deleting..." : "Delete Account"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
}
