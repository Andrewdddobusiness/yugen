import { useState } from "react";
import { Trash2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

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
import { Button } from "@/components/ui/button";
import { useActivitiesStore } from "@/store/activityStore";
interface ClearHistoryButtonProps {
  onClearHistory: () => Promise<void>;
}

export default function ClearHistoryButton({ onClearHistory }: ClearHistoryButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const queryClient = useQueryClient();

  const { setSearchHistoryActivities } = useActivitiesStore();

  const handleClearHistory = async () => {
    try {
      setIsLoading(true);
      await onClearHistory();
      await queryClient.invalidateQueries({ queryKey: ["searchHistoryActivities"] });
      setSearchHistoryActivities([]);
      toast.success("Search history cleared successfully");
    } catch (error) {
      console.error("Error clearing history:", error);
      toast.error("Failed to clear search history");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 hover:text-red-500 h-8 rounded-full text-gray-500">
          <Trash2 className="h-4 w-4" />
          <span className="hidden xs:inline">Clear History</span>
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>Clear Search History</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to clear your search history? <br />
            <span className="text-sm italic">This action cannot be undone.</span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleClearHistory}
            disabled={isLoading}
            className="bg-[#FF3A3A] hover:bg-[#FF3A3A]/80"
          >
            {isLoading ? "Clearing..." : "Clear History"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
