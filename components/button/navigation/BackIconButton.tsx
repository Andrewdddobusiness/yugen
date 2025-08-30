"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function BackIconButton() {
  const router = useRouter();
  const [clicked, setClicked] = useState(false);

  const goBack = () => {
    router.back();
  };

  const handleClick = () => {
    setClicked(true);
    goBack();
  };

  return (
    <Button
      variant={"ghost"}
      className={`relative ${
        clicked ? "bg-gray-700" : "hover:bg-gray-200"
      } transition-colors duration-300`}
      onClick={handleClick}
    >
      <ChevronLeft size={16} />
    </Button>
  );
}
