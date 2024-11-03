"use client";
import React, { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

import { Input } from "@/components/ui/input";

export default function SecurityCards() {
  const [deleteAccountVisible, setDeleteAccountVisible] = useState(false);

  const toggleDeleteAccountVisibility = () => {
    setDeleteAccountVisible(!deleteAccountVisible);
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 3xl:grid-cols-4 5xl:grid-cols-5 gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Password</CardTitle>
        </CardHeader>

        <CardContent className="flex flex-row justify-between min-h-[70px] mb-[21px]">
          <Input disabled type="password" placeholder="************" />
        </CardContent>

        <CardFooter className="border-t py-4">
          <Link href="/login/reset">
            <Button>Reset Password</Button>
          </Link>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Delete Your Account</CardTitle>
          <CardDescription>Click the button below to delete your account.</CardDescription>
        </CardHeader>

        <CardContent className="flex flex-row justify-between min-h-[70px]" />

        <CardFooter className="border-t py-4">
          <Button variant="destructive" onClick={toggleDeleteAccountVisibility}>
            Delete Account
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
