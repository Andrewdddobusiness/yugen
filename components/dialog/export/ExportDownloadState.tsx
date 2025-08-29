import * as React from "react";
import { Progress } from "@/components/ui/progress";
import { DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useState, useRef } from "react";

interface ExportDownloadStateProps {
  type: "pdf" | "excel";
  onBack: () => void;
  onClose: () => void;
  onExport: () => Promise<void>;
}

export function ExportDownloadState({ type, onBack, onClose, onExport }: ExportDownloadStateProps) {
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<"downloading" | "success" | "error">("downloading");
  const hasExported = useRef(false);

  useEffect(() => {
    hasExported.current = false;
    return () => {
      hasExported.current = false;
    };
  }, []);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    let mounted = true;

    if (status === "downloading" && !hasExported.current) {
      timer = setInterval(() => {
        if (mounted) {
          setProgress((prev) => {
            const next = prev + 20;
            if (next >= 100) {
              clearInterval(timer);
              handleExport();
            }
            return next;
          });
        }
      }, 500);
    }

    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, [status]);

  const handleExport = async () => {
    if (hasExported.current) return;
    hasExported.current = true;

    try {
      await onExport();
      setStatus("success");
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (error) {
      console.error("Export failed:", error);
      setStatus("error");
      hasExported.current = false;
    }
  };

  return (
    <div className="space-y-6 py-4">
      <DialogHeader>
        <div className="flex items-center">
          {status === "error" && (
            <Button variant="ghost" size="icon" className="mr-2" onClick={onBack}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          <DialogTitle>
            {status === "downloading" && `Preparing ${type.toUpperCase()} Document`}
            {status === "success" && "Export Complete!"}
            {status === "error" && "Export Failed"}
          </DialogTitle>
        </div>
        <DialogDescription>
          {status === "downloading" && "Please wait while we prepare your document..."}
          {status === "success" && "Your document has been downloaded successfully."}
          {status === "error" && "There was an error exporting your document. Please try again."}
        </DialogDescription>
      </DialogHeader>

      <div className={cn("space-y-4", status === "success" && "animate-in fade-in-0")}>
        {status === "downloading" && <Progress value={progress} className="w-full animate-in fade-in-0 " />}
        {status === "success" && (
          <div className="flex items-center justify-center text-primary">
            <CheckCircle2 className="h-12 w-12 animate-in zoom-in-0 text-[#3A86FF]" />
          </div>
        )}
        {status === "error" && (
          <div className="flex items-center justify-center text-destructive">
            <XCircle className="h-12 w-12 animate-in zoom-in-0" />
          </div>
        )}
      </div>
    </div>
  );
}
