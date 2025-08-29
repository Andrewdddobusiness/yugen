'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/components/ui/use-toast';
import { 
  Download, 
  FileText, 
  Table, 
  Calendar, 
  Map, 
  Package,
  Share2,
  FolderOpen,
  AlertCircle,
  CheckCircle,
  Clock,
  Users
} from 'lucide-react';

import { exportMultipleItineraries } from '@/utils/bulkExport';
import { IItineraryActivity } from '@/store/itineraryActivityStore';

interface BulkExportDialogProps {
  children: React.ReactNode;
  itineraries: Array<{
    city: string;
    country: string;
    fromDate: Date;
    toDate: Date;
    activities: IItineraryActivity[];
    itineraryName?: string;
    createdBy?: string;
    notes?: string;
    id?: string;
  }>;
}

interface BulkExportOptions {
  formats: {
    pdf: boolean;
    excel: boolean;
    markdown: boolean;
    calendar: boolean;
    googleMaps: boolean;
  };
  includeSharedLinks: boolean;
  createCollection: boolean;
  zipOutput: boolean;
  separateFolders: boolean;
  filenamePrefix: string;
}

interface BulkExportProgress {
  currentStep: string;
  completed: number;
  total: number;
  percentage: number;
  errors: string[];
}

const defaultBulkOptions: BulkExportOptions = {
  formats: {
    pdf: true,
    excel: true,
    markdown: false,
    calendar: true,
    googleMaps: false,
  },
  includeSharedLinks: true,
  createCollection: true,
  zipOutput: true,
  separateFolders: true,
  filenamePrefix: 'itinerary',
};

export function BulkExportDialog({ children, itineraries }: BulkExportDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<BulkExportOptions>(defaultBulkOptions);
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState<BulkExportProgress | null>(null);
  const [exportComplete, setExportComplete] = useState(false);
  const { toast } = useToast();

  const updateOption = <K extends keyof BulkExportOptions>(key: K, value: BulkExportOptions[K]) => {
    setOptions(prev => ({ ...prev, [key]: value }));
  };

  const updateFormatOption = (format: keyof BulkExportOptions['formats'], enabled: boolean) => {
    setOptions(prev => ({
      ...prev,
      formats: { ...prev.formats, [format]: enabled }
    }));
  };

  const calculateEstimatedSize = (): string => {
    const selectedFormats = Object.entries(options.formats).filter(([_, enabled]) => enabled);
    const avgSizePerFormat = { pdf: 2, excel: 1, markdown: 0.1, calendar: 0.1, googleMaps: 0.5 }; // MB
    
    let totalSize = 0;
    selectedFormats.forEach(([format]) => {
      totalSize += (avgSizePerFormat[format as keyof typeof avgSizePerFormat] || 0.5) * itineraries.length;
    });

    if (totalSize < 1) return `${Math.round(totalSize * 1000)} KB`;
    return `${Math.round(totalSize * 10) / 10} MB`;
  };

  const getSelectedFormatsCount = (): number => {
    return Object.values(options.formats).filter(Boolean).length;
  };

  const handleBulkExport = async () => {
    // Validation
    if (itineraries.length === 0) {
      toast({
        title: 'No Itineraries',
        description: 'Please select at least one itinerary to export.',
        variant: 'destructive',
      });
      return;
    }

    if (getSelectedFormatsCount() === 0) {
      toast({
        title: 'No Formats Selected',
        description: 'Please select at least one export format.',
        variant: 'destructive',
      });
      return;
    }

    setIsExporting(true);
    setExportComplete(false);
    setProgress(null);

    try {
      await exportMultipleItineraries(
        itineraries,
        options,
        (progressUpdate) => {
          setProgress(progressUpdate);
        }
      );

      setExportComplete(true);
      toast({
        title: 'Bulk Export Complete',
        description: `Successfully exported ${itineraries.length} itineraries in ${getSelectedFormatsCount()} formats.`,
      });
    } catch (error) {
      console.error('Bulk export failed:', error);
      toast({
        title: 'Export Failed',
        description: 'Failed to complete bulk export. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const resetDialog = () => {
    setProgress(null);
    setExportComplete(false);
    setIsExporting(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      setIsOpen(open);
      if (!open) setTimeout(resetDialog, 300);
    }}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Bulk Export Itineraries
          </DialogTitle>
        </DialogHeader>

        {isExporting || exportComplete ? (
          // Export Progress View
          <div className="space-y-6">
            {progress && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    {exportComplete ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <Clock className="h-5 w-5 text-blue-600 animate-spin" />
                    )}
                    {exportComplete ? 'Export Complete!' : 'Exporting...'}
                  </CardTitle>
                  <CardDescription>
                    {progress.currentStep}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Progress</span>
                      <span>{progress.completed}/{progress.total} steps</span>
                    </div>
                    <Progress value={progress.percentage} className="w-full" />
                  </div>

                  {progress.errors.length > 0 && (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        <div className="space-y-1">
                          <p className="font-medium">Errors encountered:</p>
                          <ul className="text-sm space-y-1">
                            {progress.errors.map((error, index) => (
                              <li key={index} className="text-red-600">• {error}</li>
                            ))}
                          </ul>
                        </div>
                      </AlertDescription>
                    </Alert>
                  )}

                  {exportComplete && (
                    <div className="text-center pt-4">
                      <Button onClick={() => setIsOpen(false)}>
                        Close
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        ) : (
          // Configuration View
          <div className="space-y-6">
            {/* Export Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Export Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-blue-600">{itineraries.length}</div>
                    <div className="text-sm text-muted-foreground">Itineraries</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-green-600">{getSelectedFormatsCount()}</div>
                    <div className="text-sm text-muted-foreground">Formats</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-purple-600">
                      {itineraries.reduce((sum, it) => sum + it.activities.length, 0)}
                    </div>
                    <div className="text-sm text-muted-foreground">Activities</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-orange-600">{calculateEstimatedSize()}</div>
                    <div className="text-sm text-muted-foreground">Est. Size</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Export Formats */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Export Formats</CardTitle>
                <CardDescription>Select which formats to export for each itinerary</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <FileText className="h-4 w-4 text-red-600" />
                      <label className="text-sm font-medium">PDF Documents</label>
                    </div>
                    <Checkbox
                      checked={options.formats.pdf}
                      onCheckedChange={(checked) => updateFormatOption('pdf', checked as boolean)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Table className="h-4 w-4 text-green-600" />
                      <label className="text-sm font-medium">Excel Workbooks</label>
                    </div>
                    <Checkbox
                      checked={options.formats.excel}
                      onCheckedChange={(checked) => updateFormatOption('excel', checked as boolean)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <FileText className="h-4 w-4 text-blue-600" />
                      <label className="text-sm font-medium">Markdown Files</label>
                    </div>
                    <Checkbox
                      checked={options.formats.markdown}
                      onCheckedChange={(checked) => updateFormatOption('markdown', checked as boolean)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4 text-purple-600" />
                      <label className="text-sm font-medium">Calendar Files</label>
                    </div>
                    <Checkbox
                      checked={options.formats.calendar}
                      onCheckedChange={(checked) => updateFormatOption('calendar', checked as boolean)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Map className="h-4 w-4 text-orange-600" />
                      <label className="text-sm font-medium">Google Maps (KML)</label>
                    </div>
                    <Checkbox
                      checked={options.formats.googleMaps}
                      onCheckedChange={(checked) => updateFormatOption('googleMaps', checked as boolean)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Export Options */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Export Options</CardTitle>
                <CardDescription>Configure how the exports are organized and delivered</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium">Create ZIP Archive</label>
                      <p className="text-xs text-muted-foreground">Bundle all files into a single ZIP download</p>
                    </div>
                    <Checkbox
                      checked={options.zipOutput}
                      onCheckedChange={(checked) => updateOption('zipOutput', checked as boolean)}
                    />
                  </div>
                  
                  {options.zipOutput && (
                    <div className="flex items-center justify-between pl-4">
                      <div>
                        <label className="text-sm font-medium">Separate Folders by Format</label>
                        <p className="text-xs text-muted-foreground">Organize files in format-specific folders</p>
                      </div>
                      <Checkbox
                        checked={options.separateFolders}
                        onCheckedChange={(checked) => updateOption('separateFolders', checked as boolean)}
                      />
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium">Generate Shared Links</label>
                      <p className="text-xs text-muted-foreground">Create web links for easy sharing</p>
                    </div>
                    <Checkbox
                      checked={options.includeSharedLinks}
                      onCheckedChange={(checked) => updateOption('includeSharedLinks', checked as boolean)}
                    />
                  </div>

                  {options.includeSharedLinks && (
                    <div className="flex items-center justify-between pl-4">
                      <div>
                        <label className="text-sm font-medium">Create Collection</label>
                        <p className="text-xs text-muted-foreground">Bundle all itineraries in one shared link</p>
                      </div>
                      <Checkbox
                        checked={options.createCollection}
                        onCheckedChange={(checked) => updateOption('createCollection', checked as boolean)}
                      />
                    </div>
                  )}

                  <div>
                    <label className="text-sm font-medium">Filename Prefix</label>
                    <Input
                      value={options.filenamePrefix}
                      onChange={(e) => updateOption('filenamePrefix', e.target.value)}
                      placeholder="itinerary"
                      className="mt-1"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Files will be named: {options.filenamePrefix}_1.pdf, {options.filenamePrefix}_2.xlsx, etc.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Itinerary List Preview */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Itineraries to Export</CardTitle>
                <CardDescription>Preview of selected itineraries</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {itineraries.map((itinerary, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-muted rounded-lg">
                      <div>
                        <div className="font-medium text-sm">
                          {itinerary.itineraryName || `${itinerary.city}, ${itinerary.country}`}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {itinerary.activities.length} activities • {itinerary.fromDate.toDateString()}
                        </div>
                      </div>
                      <Badge variant="secondary">{index + 1}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Export Button */}
            <div className="flex justify-between items-center pt-4">
              <div className="text-sm text-muted-foreground">
                {itineraries.length} itineraries × {getSelectedFormatsCount()} formats = {itineraries.length * getSelectedFormatsCount()} files
              </div>
              <Button
                onClick={handleBulkExport}
                disabled={getSelectedFormatsCount() === 0}
                size="lg"
                className="min-w-[150px]"
              >
                <Download className="h-4 w-4 mr-2" />
                Start Export
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}