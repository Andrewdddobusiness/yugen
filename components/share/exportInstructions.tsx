import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface ExportInstructionsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ExportInstructions({ open, onOpenChange }: ExportInstructionsProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Import Your Itinerary to Google Maps</DialogTitle>
          <DialogDescription>
            <ol className="list-decimal pl-4 space-y-2 mt-4">
              <li>Your KML file has been downloaded</li>
              <li>A new Google My Maps tab will open</li>
              <li>Click the "Import" button in My Maps</li>
              <li>Select the KML file you just downloaded</li>
              <li>Your itinerary locations will appear on the map</li>
            </ol>
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}
