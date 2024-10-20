"use client";
import React, { Suspense, useEffect, useState } from "react";
import { useDropzone } from "react-dropzone";
import Image from "next/image";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

import { MdPerson } from "react-icons/md";

import LoadingSpinner from "@/components/loading/loadingSpinner";
import DashboardLayout from "@/components/layouts/dashboardLayout";

// import { uploadToStorage } from "@/actions/file/actions";

import { createClient } from "@/utils/supabase/client";

const Profile = () => {
  const supabase = createClient();

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
  const [profileUrl, setProfileUrl] = useState("");

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

      const { data, error } = await supabase.storage
        .from("avatars")
        .upload(user.user.id + "/profile", file, {
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
    const fetchPublicUrl = async () => {
      try {
        const { auth } = supabase;
        const { data: user, error } = await auth.getUser();
        if (error || !user) {
          throw new Error("User not authenticated");
        }
        const { data } = await supabase.storage
          .from("avatars")
          .getPublicUrl(user.user.id + "/profile");
        if (error || !data) {
          throw new Error("Error fetching public URL");
        }
        setProfileUrl(data.publicUrl);
      } catch (error: any) {
        console.error("Error fetching public URL:", error.message);
      }
    };

    fetchPublicUrl();

    return () => {};
  }, [supabase]);

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

  return (
    <div>
      <DashboardLayout title="Settings" activePage="settings">
        <main className="flex min-h-[calc(100vh-_theme(spacing.16))] flex-1 flex-col gap-4 bg-muted/40 p-4 md:gap-8 md:p-10">
          <div className="mx-auto grid w-full max-w-6xl items-start gap-6 md:grid-cols-[180px_1fr] lg:grid-cols-[250px_1fr]">
            <nav className="hidden sm:grid gap-4 text-sm text-muted-foreground">
              <Link
                href="/settings/profile"
                className="font-semibold text-primary"
              >
                Profile
              </Link>
              <Link href="/settings/security">Login & Security</Link>
              <Link href="/settings/billing">Billing & Plans</Link>
            </nav>
            <div className="grid gap-6">
              {/* Profile Photo Section */}
              <Card className="">
                <CardHeader>
                  <CardTitle>Profile Photo</CardTitle>
                </CardHeader>
                <CardContent>
                  {!isEditingProfilePhoto ? (
                    <div className="flex items-center justify-between">
                      {profileUrl ? (
                        <Image
                          alt="Profile"
                          src={profileUrl}
                          width={100}
                          height={100}
                          className="w-16 h-16 rounded-full p-1 border"
                          priority
                        />
                      ) : (
                        <div className="p-1 border rounded-full">
                          <Skeleton className="h-[54px] w-[54px] rounded-full" />
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="w-full flex flex-row justify-between">
                      <Image
                        src={
                          file
                            ? URL.createObjectURL(file)
                            : profileUrl
                            ? profileUrl
                            : ""
                        }
                        alt="Profile"
                        width={100}
                        height={100}
                        className="w-16 h-16 rounded-full p-1 border"
                        priority
                      />

                      <div
                        {...getRootProps()}
                        className={`border-2 border-dashed rounded-lg w-[300px] ml-8 ${
                          isDragActive ? "border-blue-500" : ""
                        }`}
                      >
                        <Input
                          {...getInputProps()}
                          accept=".png, .jpg, .jpeg"
                        />

                        <>
                          <div className="flex flex-col items-center justify-center text-center">
                            <p className="text-gray-400 text-sm pt-2 px-2">
                              Drop your profile picture here, or click to select
                              a file.
                            </p>
                          </div>
                        </>
                      </div>
                    </div>
                  )}
                </CardContent>
                <CardFooter className="border-t px-6 py-4">
                  {!isEditingProfilePhoto ? (
                    <Button onClick={() => toggleEditingProfilePhoto()}>
                      Edit
                    </Button>
                  ) : (
                    <>
                      {loadingProfile ? (
                        <LoadingSpinner />
                      ) : (
                        <>
                          <Button onClick={handleProfileSave}>Save</Button>
                          <Button
                            onClick={() => toggleEditingProfilePhoto()}
                            variant={"outline"}
                            className="ml-4"
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
                  <CardTitle>Name</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-row justify-between">
                  {!isEditingName ? (
                    <>
                      {user ? (
                        <Input
                          disabled={!isEditingName}
                          placeholder="Enter your name"
                          value={
                            user.user_metadata.first_name +
                            " " +
                            user.user_metadata.last_name
                          }
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
                            value={
                              !isEditingName
                                ? user.user_metadata.first_name
                                : firstName
                            }
                            onChange={(e) => setFirstName(e.target.value)}
                          />
                          <Input
                            disabled={!isEditingName}
                            placeholder="Enter your last name"
                            value={
                              !isEditingName
                                ? user.user_metadata.last_name
                                : lastName
                            }
                            onChange={(e) => setLastName(e.target.value)}
                          />
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
                <CardFooter className="border-t px-6 py-4">
                  {!isEditingName ? (
                    <Button onClick={() => toggleEditingName()}>Edit</Button>
                  ) : (
                    <>
                      {loadingName ? (
                        <LoadingSpinner />
                      ) : (
                        <>
                          <Button onClick={handleNameSave}>Save</Button>
                          <Button
                            onClick={() => toggleEditingName()}
                            variant={"outline"}
                            className="ml-4"
                          >
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
                <CardContent className="flex flex-row justify-between">
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
                <CardFooter className="border-t px-6 py-4">
                  {!isEditingEmail ? (
                    <Button onClick={() => toggleEditingEmail()}>Edit</Button>
                  ) : (
                    <>
                      {loadingEmail ? (
                        <LoadingSpinner />
                      ) : (
                        <>
                          <Button onClick={handleEmailSave}>Save</Button>
                          <Button
                            onClick={() => toggleEditingEmail()}
                            variant={"outline"}
                            className="ml-4"
                          >
                            Back
                          </Button>
                        </>
                      )}{" "}
                    </>
                  )}
                </CardFooter>
              </Card>
            </div>
          </div>
        </main>
      </DashboardLayout>
    </div>
  );
};

export default Profile;
