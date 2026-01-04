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
import { cn } from "@/lib/utils";
import { downloadKML } from "@/utils/export/kmlExport";

interface ExportOption {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  onClick: () => void;
  disabled?: boolean;
}

interface ExportDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  itineraryId?: string;
  destinationId?: string;
}

export function ShareExportDialog({ open, onOpenChange, itineraryId, destinationId }: ExportDialogProps) {
  const { itineraryActivities, fetchItineraryActivities, setItineraryActivities } = useItineraryActivityStore();
  const [showInstructions, setShowInstructions] = useState(false);
  const [showDownloadState, setShowDownloadState] = useState<"pdf" | "excel" | null>(null);
  const [kmlData, setKmlData] = React.useState<{ content: string; fileName: string } | null>(null);

  const dialogOpen = Boolean(open);

  const { data: itineraryActivitiesData, isLoading: isItineraryActivitiesLoading } = useQuery({
    queryKey: ["itineraryActivities", itineraryId, destinationId],
    queryFn: () => fetchItineraryActivities(itineraryId as string, destinationId as string),
    enabled: dialogOpen && !!itineraryId && !!destinationId,
    staleTime: 10 * 60 * 1000,
    gcTime: 20 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  React.useEffect(() => {
    if (Array.isArray(itineraryActivitiesData)) {
      setItineraryActivities(itineraryActivitiesData);
    }
  }, [itineraryActivitiesData, setItineraryActivities]);

  const { data: destinationData, isLoading: isDestinationLoading } = useQuery({
    queryKey: ["itineraryDestination", itineraryId, destinationId],
    queryFn: () => fetchItineraryDestination(itineraryId as string, destinationId),
    enabled: dialogOpen && !!itineraryId,
    staleTime: Infinity,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const destination = destinationData?.data;
  const activitiesForExport = itineraryActivitiesData ?? itineraryActivities;
  const isExportDataLoading = isItineraryActivitiesLoading || isDestinationLoading;
  const canExport = !isExportDataLoading && !!destination;

  const exportOptions: ExportOption[] = [
    {
      id: "pdf",
      title: "PDF Document",
      description: "Export your itinerary as a detailed PDF document",
      icon: FileText,
      onClick: () => setShowDownloadState("pdf"),
      disabled: !canExport,
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
      disabled: !canExport,
    },
    {
      id: "excel",
      title: "Excel Spreadsheet",
      description: "Export your itinerary as an Excel spreadsheet",
      icon: FileSpreadsheet,
      onClick: () => setShowDownloadState("excel"),
      disabled: !canExport,
    },
  ];

  const prepareKMLData = async () => {
    if (activitiesForExport && destination) {
      const locations = activitiesForExport
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
        const kmlContent = generateKML(locations, `${destination.city} Itinerary`);
        setKmlData({
          content: kmlContent,
          fileName: `${destination.city}_itinerary.kml`,
        });
      }
    }
  };

  const handleDownloadKML = () => {
    if (!kmlData) return;
    downloadKML(kmlData.content, kmlData.fileName);
  };

  const executeExport = async () => {
    if (!showDownloadState || !destination || !activitiesForExport) {
      throw new Error("Export data is not ready yet.");
    }

    try {
      const itineraryDetails = {
        city: destination.city,
        country: destination.country,
        fromDate: new Date(destination.from_date),
        toDate: new Date(destination.to_date),
        activities: activitiesForExport,
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
      <DialogContent className="sm:max-w-[460px] !bg-bg-0 !border-stroke-200/60 !shadow-float dark:!bg-ink-900 dark:!border-white/10">
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
              <DialogDescription className="p-4 text-ink-500">
                <ol className="list-decimal pl-4 space-y-4">
                  <li>
                    Download your itinerary file
                    <Button
                      onClick={handleDownloadKML}
                      className="ml-2"
                      variant="default"
                      disabled={!kmlData}
                    >
                      {kmlData ? "Download KML File" : "Preparing…"}
                    </Button>
                  </li>
                  <li>
                    Go to{" "}
                    <Link
                      href="https://www.google.com/maps/d/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-brand-600 hover:underline"
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
              <DialogDescription className="text-ink-500">
                Choose a format to export your itinerary.
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-[60vh]">
              <div className="flex flex-col gap-4 p-4">
                {isExportDataLoading ? (
                  <div className="flex items-center gap-2 text-sm text-ink-500">
                    <div className="h-4 w-4 rounded-full border-2 border-stroke-200 border-t-brand-500 animate-spin" />
                    Preparing export options…
                  </div>
                ) : !destination ? (
                  <div className="text-sm text-ink-500">
                    Couldn’t load trip details. Try closing and reopening this dialog.
                  </div>
                ) : null}
                {exportOptions.map((option, index) => (
                  <React.Fragment key={option.id}>
                    {index > 0 && <Separator />}
                    <button
                      disabled={option.disabled}
                      onClick={option.onClick}
                      className={cn(
                        "flex items-start gap-4 p-3 rounded-xl text-left transition-all",
                        "border border-stroke-200 bg-bg-0/70 hover:bg-bg-50",
                        "active:translate-y-[2px] active:shadow-pressable-pressed shadow-sm",
                        option.disabled && "opacity-60 cursor-not-allowed active:translate-y-0"
                      )}
                    >
                      <div className="rounded-lg bg-brand-500/10 p-2 text-brand-500">
                        <option.icon className="h-6 w-6" />
                      </div>
                      <div className="flex flex-col items-start">
                        <div className="text-sm font-semibold text-ink-900">{option.title}</div>
                        <div className="text-sm text-ink-500">{option.description}</div>
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
