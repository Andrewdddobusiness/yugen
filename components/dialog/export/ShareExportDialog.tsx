"use client";

import * as React from "react";
import Link from "next/link";
import { FileSpreadsheet, MapPin, FileText, ArrowLeft } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useQuery } from "@tanstack/react-query";
import { fetchItineraryDestination } from "@/actions/supabase/actions";
import { useItineraryActivityStore } from "@/store/itineraryActivityStore";
import { Button } from "@/components/ui/button";
import { ExportDownloadState } from "@/components/dialog/export/ExportDownloadState";
import { useState } from "react";

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

export function ShareExportDialog({ open, onOpenChange, itineraryId }: ExportDialogProps) {
  const { itineraryActivities } = useItineraryActivityStore();
  const [showInstructions, setShowInstructions] = useState(false);
  const [showDownloadState, setShowDownloadState] = useState<"pdf" | "excel" | null>(null);
  const [kmlData, setKmlData] = React.useState<{ content: string; fileName: string } | null>(null);

  const exportOptions: ExportOption[] = [
    {
      id: "pdf",
      title: "PDF Document",
      description: "Export your itinerary as a detailed PDF document",
      icon: FileText,
      onClick: () => setShowDownloadState("pdf"),
    },
    {
      id: "maps",
      title: "Google Maps",
      description: "Export locations to Google Maps for navigation",
      icon: MapPin,
      onClick: () => {
        setShowInstructions(true);
        void prepareKMLData();
      },
    },
    {
      id: "excel",
      title: "Excel Spreadsheet",
      description: "Export your itinerary as an Excel spreadsheet",
      icon: FileSpreadsheet,
      onClick: () => setShowDownloadState("excel"),
    },
  ];

  const { data: destinationData } = useQuery({
    queryKey: ["itineraryDestination", itineraryId],
    queryFn: () => fetchItineraryDestination(itineraryId as string),
    enabled: !!itineraryId,
  });

  const prepareKMLData = async () => {
    if (itineraryActivities && destinationData?.data) {
      const locations = itineraryActivities
        .filter(
          (activity): activity is typeof activity & { activity: { coordinates: [number, number] } } =>
            !!activity.activity?.place_id &&
            Array.isArray(activity.activity?.coordinates) &&
            activity.activity.coordinates.length === 2
        )
        .map((activity) => ({
          name: activity.activity?.name || "",
          placeId: activity.activity?.place_id || "",
          coordinates: activity.activity.coordinates,
          description: activity.activity?.description || "",
          address: activity.activity?.address || "",
        }));

      if (locations.length > 0) {
        const { generateKML } = await import("@/utils/export/kmlExport");
        const kmlContent = generateKML(locations, `${destinationData.data.city} Itinerary`);
        setKmlData({
          content: kmlContent,
          fileName: `${destinationData.data.city}_itinerary.kml`,
        });
      }
    }
  };

  const handleDownloadKML = async () => {
    if (kmlData) {
      const { exportToMyMaps } = await import("@/utils/export/mapsExport");
      exportToMyMaps(kmlData.content, kmlData.fileName.replace(".kml", ""));
    }
  };

  const executeExport = async () => {
    if (!showDownloadState || !destinationData?.data || !itineraryActivities) return;

    try {
      const itineraryDetails = {
        city: destinationData.data.city,
        country: destinationData.data.country,
        fromDate: new Date(destinationData.data.from_date),
        toDate: new Date(destinationData.data.to_date),
        activities: itineraryActivities,
      };

      if (showDownloadState === "pdf") {
        const { exportToPDF } = await import("@/utils/export/pdfExport");
        await exportToPDF(itineraryDetails);
      } else if (showDownloadState === "excel") {
        const { exportToExcel } = await import("@/utils/export/excelExport");
        await exportToExcel(itineraryDetails);
      }
    } catch (error) {
      console.error("Error in executeExport:", error);
      throw error;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        {showDownloadState ? (
          <ExportDownloadState
            type={showDownloadState}
            onBack={() => setShowDownloadState(null)}
            onClose={() => {
              setShowDownloadState(null);
              if (onOpenChange) onOpenChange(false);
            }}
            onExport={executeExport}
          />
        ) : showInstructions ? (
          <>
            <DialogHeader>
              <div className="flex items-center">
                <Button
                  variant="ghost"
                  size="icon"
                  className="mr-2"
                  onClick={() => {
                    setShowInstructions(false);
                    setKmlData(null);
                  }}
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <DialogTitle>Import to Google My Maps</DialogTitle>
              </div>
              <DialogDescription className="p-4">
                <ol className="list-decimal pl-4 space-y-4">
                  <li>
                    Download your itinerary file
                    <Button onClick={handleDownloadKML} className="ml-2" variant="secondary">
                      Download KML File
                    </Button>
                  </li>
                  <li>
                    Go to{" "}
                    <Link
                      href="https://www.google.com/maps/d/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      Google My Maps
                    </Link>
                  </li>
                  <li>Click the &quot;Import&quot; button</li>
                  <li>Select the KML file you just downloaded</li>
                  <li>Your itinerary locations will appear on the map</li>
                </ol>
              </DialogDescription>
            </DialogHeader>
          </>
        ) : (
          <>
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
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
