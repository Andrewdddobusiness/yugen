"use client";
import React, { useEffect, useState } from "react";
import { useDropzone } from "react-dropzone";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

import LoadingSpinner from "@/components/loading/LoadingSpinner";

// import { uploadToStorage } from "@/actions/file/actions";

import { createClient } from "@/utils/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { useUserStore } from "@/store/userStore";

export default function ProfileCards() {
  const supabase = createClient();

  const { user, isUserLoading, profileUrl, isProfileUrlLoading } = useUserStore();

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

  const onDrop = (acceptedFiles: any) => {
    const uploadedFile = acceptedFiles[0];
    setFile(uploadedFile);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
  });

  const handleProfileSave = async () => {
    if (!file) return;
    setProfileLoading(true);

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
        upsert: true,
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
    setIsEditingName((prevState) => {
      const next = !prevState;
      if (next && user) {
        setFirstName(user.user_metadata?.first_name ?? "");
        setLastName(user.user_metadata?.last_name ?? "");
      }
      return next;
    });
  };

  const toggleEditingEmail = () => {
    setIsEditingEmail((prevState) => {
      const next = !prevState;
      if (next && user) {
        setEmail(user.email ?? "");
      }
      return next;
    });
  };

  useEffect(() => {
    if (!user) return;

    if (!isEditingName) {
      setFirstName(user.user_metadata?.first_name ?? "");
      setLastName(user.user_metadata?.last_name ?? "");
    }

    if (!isEditingEmail) {
      setEmail(user.email ?? "");
    }
  }, [user, isEditingEmail, isEditingName]);

  const userDisplayName = user?.user_metadata?.first_name
    ? `${user.user_metadata.first_name} ${user.user_metadata.last_name || ""}`.trim()
    : user?.email?.split("@")[0] || "User";

  const effectiveDisplayName = `${firstName} ${lastName}`.trim() || userDisplayName;

  const userInitials = effectiveDisplayName
    .split(" ")
    .filter(Boolean)
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 3xl:grid-cols-4 5xl:grid-cols-5 gap-4">
      {/* Profile Photo Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-gray-800">Profile Photo</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-row justify-between min-h-[100px]">
          {!isEditingProfilePhoto ? (
            <div className="grid grid-cols-4 gap-4">
              <Avatar className="h-16 w-16 rounded-lg p-1 border border-gray-200">
                {isUserLoading || isProfileUrlLoading ? (
                  <Skeleton className="h-full w-full" />
                ) : profileUrl ? (
                  <AvatarImage src={profileUrl} className="rounded-md" />
                ) : (
                  <AvatarFallback className="rounded-md bg-muted">{userInitials}</AvatarFallback>
                )}
              </Avatar>
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-4">
              <div className="col-span-1">
                <Avatar className="h-16 w-16 rounded-lg p-1 border border-gray-200">
                  {isUserLoading || isProfileUrlLoading ? (
                    <Skeleton className="h-full w-full" />
                  ) : profileUrl ? (
                    <AvatarImage src={profileUrl} className="rounded-md" />
                  ) : (
                    <AvatarFallback className="rounded-md bg-muted">{userInitials}</AvatarFallback>
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
            <Button
              onClick={() => toggleEditingProfilePhoto()}
              className="bg-[#3F5FA3] rounded-xl shadow-lg text-white hover:bg-[#3F5FA3]/90 active:scale-95 transition-all duration-300"
            >
              Edit
            </Button>
          ) : (
            <>
              {loadingProfile ? (
                <LoadingSpinner />
              ) : (
                <>
                  <Button
                    onClick={handleProfileSave}
                    className="bg-[#3F5FA3] rounded-xl shadow-lg text-white hover:bg-[#3F5FA3]/90 active:scale-95 transition-all duration-300"
                  >
                    Save
                  </Button>
                  <Button
                    onClick={() => toggleEditingProfilePhoto()}
                    variant={"outline"}
                    className="ml-4 rounded-xl shadow-lg"
                  >
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
          <CardTitle className="text-gray-800">Name</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-row justify-between min-h-[100px]">
          {!isEditingName ? (
            <>
              {isUserLoading ? (
                <Skeleton className="h-10 w-full rounded-lg" />
              ) : user ? (
                <Input
                  disabled={!isEditingName}
                  placeholder="Enter your name"
                  value={effectiveDisplayName}
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
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                  />
                  <Input
                    disabled={!isEditingName}
                    placeholder="Enter your last name"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                  />
                </div>
              )}
            </>
          )}
        </CardContent>
        <CardFooter className="border-t py-4">
          {!isEditingName ? (
            <Button
              onClick={() => toggleEditingName()}
              className="bg-[#3F5FA3] rounded-xl shadow-lg text-white hover:bg-[#3F5FA3]/90 active:scale-95 transition-all duration-300"
            >
              Edit
            </Button>
          ) : (
            <>
              {loadingName ? (
                <LoadingSpinner />
              ) : (
                <>
                  <Button
                    onClick={handleNameSave}
                    className="bg-[#3F5FA3] rounded-xl shadow-lg text-white hover:bg-[#3F5FA3]/90 active:scale-95 transition-all duration-300"
                  >
                    Save
                  </Button>
                  <Button onClick={() => toggleEditingName()} variant={"outline"} className="ml-4 rounded-xl shadow-lg">
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
          <CardTitle className="text-gray-800">Email</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-row justify-between min-h-[100px]">
          {isUserLoading ? (
            <Skeleton className="h-10 w-full rounded-lg" />
          ) : user ? (
            <Input
              type="email"
              disabled={!isEditingEmail}
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          ) : (
            <Skeleton className="h-10 w-full rounded-lg" />
          )}
        </CardContent>
        <CardFooter className="border-t py-4">
          {!isEditingEmail ? (
            <Button
              onClick={() => toggleEditingEmail()}
              className="bg-[#3F5FA3] rounded-xl shadow-lg text-white hover:bg-[#3F5FA3]/90 active:scale-95 transition-all duration-300"
            >
              Edit
            </Button>
          ) : (
            <>
              {loadingEmail ? (
                <LoadingSpinner />
              ) : (
                <>
                  <Button
                    onClick={handleEmailSave}
                    className="bg-[#3F5FA3] rounded-xl shadow-lg text-white hover:bg-[#3F5FA3]/90 active:scale-95 transition-all duration-300"
                  >
                    Save
                  </Button>
                  <Button
                    onClick={() => toggleEditingEmail()}
                    variant={"outline"}
                    className="ml-4 rounded-xl shadow-lg"
                  >
                    Back
                  </Button>
                </>
              )}
            </>
          )}
        </CardFooter>
      </Card>

    </div>
  );
}
