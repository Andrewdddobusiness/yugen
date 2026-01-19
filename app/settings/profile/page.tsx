"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { updateProfile } from "@/actions/auth/actions";
import { createClient } from "@/utils/supabase/client";
import { useAuth } from "@/components/provider/auth/AuthProvider";
import { updateAiItineraryPreferences } from "@/actions/supabase/profilePreferences";
import {
  getAiItineraryPreferencesFromProfile,
  type ItineraryInterest,
  type ItineraryPace,
  type ItineraryTravelMode,
} from "@/lib/ai/itinerary/intelligence/preferences";

const profileSchema = z.object({
  display_name: z.string().min(1, "Display name is required").max(100, "Display name too long"),
  avatar_url: z.string().url("Invalid URL").optional().or(z.literal("")),
  timezone: z.string().optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

const timezones = [
  { value: "UTC", label: "UTC" },
  { value: "America/New_York", label: "Eastern Time" },
  { value: "America/Chicago", label: "Central Time" },
  { value: "America/Denver", label: "Mountain Time" },
  { value: "America/Los_Angeles", label: "Pacific Time" },
  { value: "Europe/London", label: "London" },
  { value: "Europe/Paris", label: "Paris" },
  { value: "Asia/Tokyo", label: "Tokyo" },
  { value: "Asia/Sydney", label: "Sydney" },
];

const itineraryInterestOptions: Array<{ key: ItineraryInterest; label: string }> = [
  { key: "sights", label: "Sights" },
  { key: "museums", label: "Museums" },
  { key: "food", label: "Food" },
  { key: "shopping", label: "Shopping" },
  { key: "nature", label: "Nature" },
  { key: "nightlife", label: "Nightlife" },
];

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [isPreferencesSaving, setIsPreferencesSaving] = useState(false);
  const [itineraryPreferences, setItineraryPreferences] = useState<{
    pace: ItineraryPace | "";
    dayStart: string;
    dayEnd: string;
    travelMode: ItineraryTravelMode | "";
    interests: ItineraryInterest[];
  }>({
    pace: "",
    dayStart: "",
    dayEnd: "",
    travelMode: "",
    interests: [],
  });
  const supabase = createClient();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
  });

  const watchedTimezone = watch("timezone");

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (error && error.code !== "PGRST116") {
        console.error("Error fetching profile:", error);
        return;
      }

      if (data) {
        setProfile(data);
        setValue("display_name", data.display_name || "");
        setValue("avatar_url", data.avatar_url || "");
        setValue("timezone", data.timezone || "UTC");

        const aiPrefs = getAiItineraryPreferencesFromProfile(data.preferences);
        setItineraryPreferences({
          pace: (aiPrefs?.pace ?? "") as ItineraryPace | "",
          dayStart: aiPrefs?.day_start ?? "",
          dayEnd: aiPrefs?.day_end ?? "",
          travelMode: (aiPrefs?.travel_mode ?? "") as ItineraryTravelMode | "",
          interests: Array.isArray(aiPrefs?.interests) ? aiPrefs!.interests! : [],
        });
      } else {
        // Set default values if no profile exists
        setValue("display_name", user.user_metadata?.full_name || "");
        setValue("avatar_url", user.user_metadata?.avatar_url || "");
        setValue("timezone", "UTC");
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
    }
  };

  const onSaveItineraryPreferences = async () => {
    setIsPreferencesSaving(true);
    try {
      const result = await updateAiItineraryPreferences({
        pace: itineraryPreferences.pace ? itineraryPreferences.pace : null,
        dayStart: itineraryPreferences.dayStart ? itineraryPreferences.dayStart : null,
        dayEnd: itineraryPreferences.dayEnd ? itineraryPreferences.dayEnd : null,
        travelMode: itineraryPreferences.travelMode ? itineraryPreferences.travelMode : null,
        interests: itineraryPreferences.interests.length > 0 ? itineraryPreferences.interests : null,
      });

      if (result.success) {
        toast.success("Itinerary assistant preferences updated");
        await fetchProfile();
      } else {
        toast.error(result.message || "Failed to update itinerary assistant preferences");
      }
    } catch (error) {
      console.error("Preferences update error:", error);
      toast.error("An unexpected error occurred");
    } finally {
      setIsPreferencesSaving(false);
    }
  };

  const onSubmit = async (data: ProfileFormData) => {
    setIsLoading(true);

    try {
      const formData = new FormData();
      formData.append("display_name", data.display_name);
      if (data.avatar_url) formData.append("avatar_url", data.avatar_url);
      if (data.timezone) formData.append("timezone", data.timezone);

      const result = await updateProfile(formData);

      if (result.success) {
        toast.success("Profile updated successfully");
        await refreshUser();
        await fetchProfile();
      } else {
        toast.error(result.message || "Failed to update profile");
      }
    } catch (error) {
      console.error("Profile update error:", error);
      toast.error("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
          <p className="text-muted-foreground">Please sign in to view this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-2xl mx-auto py-8 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Profile Settings</CardTitle>
          <CardDescription>
            Update your profile information and preferences.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={user.email || ""}
                disabled
                className="bg-muted"
              />
              <p className="text-sm text-muted-foreground">
                Email cannot be changed. Contact support if you need to update it.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="display_name">Display Name</Label>
              <Input
                id="display_name"
                {...register("display_name")}
                placeholder="Enter your display name"
              />
              {errors.display_name && (
                <p className="text-sm text-destructive">{errors.display_name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="avatar_url">Avatar URL</Label>
              <Input
                id="avatar_url"
                {...register("avatar_url")}
                placeholder="https://example.com/avatar.jpg"
              />
              {errors.avatar_url && (
                <p className="text-sm text-destructive">{errors.avatar_url.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="timezone">Timezone</Label>
              <Select
                value={watchedTimezone}
                onValueChange={(value) => setValue("timezone", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select timezone" />
                </SelectTrigger>
                <SelectContent>
                  {timezones.map((tz) => (
                    <SelectItem key={tz.value} value={tz.value}>
                      {tz.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="pt-4">
              <Button type="submit" disabled={isLoading} className="w-full">
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    Updating...
                  </div>
                ) : (
                  "Update Profile"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Itinerary Assistant Preferences</CardTitle>
          <CardDescription>
            These preferences guide the assistant when planning schedules and themed days.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Pace</Label>
              <Select
                value={itineraryPreferences.pace || "default"}
                onValueChange={(value) =>
                  setItineraryPreferences((prev) => ({
                    ...prev,
                    pace: value === "default" ? "" : (value as ItineraryPace),
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select pace" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Use defaults</SelectItem>
                  <SelectItem value="relaxed">Relaxed</SelectItem>
                  <SelectItem value="balanced">Balanced</SelectItem>
                  <SelectItem value="packed">Packed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Travel mode</Label>
              <Select
                value={itineraryPreferences.travelMode || "default"}
                onValueChange={(value) =>
                  setItineraryPreferences((prev) => ({
                    ...prev,
                    travelMode: value === "default" ? "" : (value as ItineraryTravelMode),
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select travel mode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Use defaults</SelectItem>
                  <SelectItem value="walking">Walking</SelectItem>
                  <SelectItem value="transit">Transit</SelectItem>
                  <SelectItem value="driving">Driving</SelectItem>
                  <SelectItem value="bicycling">Bicycling</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Day start</Label>
              <Input
                type="time"
                value={itineraryPreferences.dayStart}
                onChange={(e) =>
                  setItineraryPreferences((prev) => ({
                    ...prev,
                    dayStart: e.target.value,
                  }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Day end</Label>
              <Input
                type="time"
                value={itineraryPreferences.dayEnd}
                onChange={(e) =>
                  setItineraryPreferences((prev) => ({
                    ...prev,
                    dayEnd: e.target.value,
                  }))
                }
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Interests</Label>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {itineraryInterestOptions.map((option) => {
                const checked = itineraryPreferences.interests.includes(option.key);
                return (
                  <label key={option.key} className="flex items-center gap-3 text-sm">
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(next) => {
                        setItineraryPreferences((prev) => {
                          const set = new Set(prev.interests);
                          if (next) set.add(option.key);
                          else set.delete(option.key);
                          return { ...prev, interests: Array.from(set) };
                        });
                      }}
                    />
                    <span>{option.label}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <Button type="button" onClick={onSaveItineraryPreferences} disabled={isPreferencesSaving} className="w-full">
            {isPreferencesSaving ? (
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Saving...
              </div>
            ) : (
              "Save Itinerary Assistant Preferences"
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
