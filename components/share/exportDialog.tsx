"use client";

import * as React from "react";
import { FileSpreadsheet, MapPin, FileText } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { exportToPDF } from "@/utils/export/pdfExport";
import { useQuery } from "@tanstack/react-query";
import { fetchItineraryDestination, fetchItineraryActivities } from "@/actions/supabase/actions";
import { useItineraryActivityStore } from "@/store/itineraryActivityStore";

interface ExportOption {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  onClick: () => void;
}

interface ExportDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  itineraryId?: string;
}

export function ExportDialog({ open, onOpenChange, itineraryId }: ExportDialogProps) {
  const { itineraryActivities } = useItineraryActivityStore();

  const exportOptions: ExportOption[] = [
    {
      id: "pdf",
      title: "PDF Document",
      description: "Export your itinerary as a detailed PDF document",
      icon: FileText,
      onClick: () => handleExport("pdf"),
    },
    {
      id: "maps",
      title: "Google Maps",
      description: "Export locations to Google Maps for navigation",
      icon: MapPin,
      onClick: () => handleExport("maps"),
    },
    {
      id: "excel",
      title: "Excel Spreadsheet",
      description: "Export your itinerary as an Excel spreadsheet",
      icon: FileSpreadsheet,
      onClick: () => handleExport("excel"),
    },
  ];

  // Fetch itinerary details
  const { data: destinationData } = useQuery({
    queryKey: ["itineraryDestination", itineraryId],
    queryFn: () => fetchItineraryDestination(itineraryId as string),
    enabled: !!itineraryId,
  });

  // Fetch activities
  //   const { data: activities } = useQuery({
  //     queryKey: ["itineraryActivities", itineraryId],
  //     queryFn: () => fetchItineraryActivities(itineraryId as string, itineraryId as string),
  //     enabled: !!itineraryId,
  //   });

  const handleExport = async (type: string) => {
    try {
      switch (type) {
        case "pdf":
          if (destinationData?.data && itineraryActivities) {
            const itineraryDetails = {
              city: destinationData.data.city,
              country: destinationData.data.country,
              fromDate: new Date(destinationData.data.from_date),
              toDate: new Date(destinationData.data.to_date),
              activities: itineraryActivities,
            };
            await exportToPDF(itineraryDetails);
          }
          break;
        case "maps":
          // Implement Google Maps export logic
          console.log("Exporting to Google Maps...");
          break;
        case "excel":
          // Implement Excel export logic
          console.log("Exporting as Excel...");
          break;
      }
    } catch (error) {
      console.error(`Error exporting as ${type}:`, error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Export Itinerary</DialogTitle>
          <DialogDescription>Choose a format to export your itinerary</DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh]">
          <div className="flex flex-col gap-4 p-4">
            {exportOptions.map((option, index) => (
              <React.Fragment key={option.id}>
                {index > 0 && <Separator />}
                <button
                  onClick={option.onClick}
                  className="flex items-start gap-4 hover:bg-accent p-2 rounded-lg transition-colors"
                >
                  <div className="rounded-md bg-primary/10 p-2">
                    <option.icon className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex flex-col items-start">
                    <div className="text-sm font-semibold">{option.title}</div>
                    <div className="text-sm text-muted-foreground">{option.description}</div>
                  </div>
                </button>
              </React.Fragment>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
