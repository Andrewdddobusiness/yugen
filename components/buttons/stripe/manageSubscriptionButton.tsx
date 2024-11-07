"use client";
import { Button } from "@/components/ui/button";
import { createCustomerPortalSession } from "@/actions/stripe/actions";
import { useState } from "react";

export default function ManageSubscriptionButton() {
  const [loading, setLoading] = useState(false);

  const handlePortalAccess = async () => {
    try {
      setLoading(true);
      const { url } = await createCustomerPortalSession();
      window.location.href = url;
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button className="w-full" onClick={handlePortalAccess} disabled={loading}>
      {loading ? "Loading..." : "Manage Subscription"}
    </Button>
  );
}
