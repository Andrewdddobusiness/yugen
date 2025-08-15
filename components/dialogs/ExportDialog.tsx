'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { 
  Download, 
  FileText, 
  Table, 
  Map, 
  Calendar, 
  Share2, 
  Settings,
  FileSpreadsheet,
  FileImage,
  Globe,
  Smartphone,
  Clock,
  DollarSign,
  QrCode,
  Phone
} from 'lucide-react';

// Import all export utilities
import { EnhancedPDFExporter } from '@/utils/export/enhancedPdfExport';
import { EnhancedExcelExporter } from '@/utils/export/enhancedExcelExport';
import { GoogleMapsExporter } from '@/utils/export/googleMapsExport';
import { TextMarkdownExporter } from '@/utils/export/textMarkdownExport';
import { CalendarExporter } from '@/utils/export/calendarExport';
import { IItineraryActivity } from '@/store/itineraryActivityStore';

interface ExportDialogProps {
  children: React.ReactNode;
  itineraryDetails: {
    city: string;
    country: string;
    fromDate: Date;
    toDate: Date;
    activities: IItineraryActivity[];
    itineraryName?: string;
    createdBy?: string;
    notes?: string;
  };
}

interface ExportOptions {
  // PDF Options
  pdfIncludeMap: boolean;
  pdfIncludeQRCodes: boolean;
  pdfIncludeTravelTimes: boolean;
  pdfIncludeExpenses: boolean;
  pdfIncludeContacts: boolean;
  pdfPaperSize: 'a4' | 'letter';
  pdfOrientation: 'portrait' | 'landscape';
  pdfTheme: 'default' | 'minimal' | 'colorful';

  // Excel Options
  excelIncludeExpenses: boolean;
  excelIncludeTravelTimes: boolean;
  excelIncludeStatistics: boolean;
  excelIncludeContacts: boolean;
  excelSeparateSheets: boolean;

  // Text Options
  textFormat: 'markdown' | 'plain' | 'rich';
  textIncludeMetadata: boolean;
  textIncludeContacts: boolean;
  textIncludeStatistics: boolean;
  textBulletStyle: 'dash' | 'asterisk' | 'number';

  // Calendar Options
  calendarTimeZone: string;
  calendarIncludeAlarms: boolean;
  calendarAlarmMinutes: number;
  calendarIncludeLocation: boolean;
  calendarIncludeDescription: boolean;
  calendarIncludeUrl: boolean;
}

const defaultExportOptions: ExportOptions = {
  // PDF defaults
  pdfIncludeMap: true,
  pdfIncludeQRCodes: true,
  pdfIncludeTravelTimes: true,
  pdfIncludeExpenses: true,
  pdfIncludeContacts: true,
  pdfPaperSize: 'a4',
  pdfOrientation: 'portrait',
  pdfTheme: 'default',

  // Excel defaults
  excelIncludeExpenses: true,
  excelIncludeTravelTimes: true,
  excelIncludeStatistics: true,
  excelIncludeContacts: true,
  excelSeparateSheets: true,

  // Text defaults
  textFormat: 'markdown',
  textIncludeMetadata: true,
  textIncludeContacts: true,
  textIncludeStatistics: true,
  textBulletStyle: 'dash',

  // Calendar defaults
  calendarTimeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  calendarIncludeAlarms: true,
  calendarAlarmMinutes: 15,
  calendarIncludeLocation: true,
  calendarIncludeDescription: true,
  calendarIncludeUrl: true,
};

export function ExportDialog({ children, itineraryDetails }: ExportDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [exportOptions, setExportOptions] = useState<ExportOptions>(defaultExportOptions);
  const [isExporting, setIsExporting] = useState(false);
  const [exportingFormat, setExportingFormat] = useState<string>('');
  const { toast } = useToast();

  const updateOption = <K extends keyof ExportOptions>(key: K, value: ExportOptions[K]) => {
    setExportOptions(prev => ({ ...prev, [key]: value }));
  };

  const handleExport = async (format: string) => {
    setIsExporting(true);
    setExportingFormat(format);

    try {
      switch (format) {
        case 'pdf':
          const pdfExporter = new EnhancedPDFExporter({
            includeMap: exportOptions.pdfIncludeMap,
            includeQRCodes: exportOptions.pdfIncludeQRCodes,
            includeTravelTimes: exportOptions.pdfIncludeTravelTimes,
            includeExpenses: exportOptions.pdfIncludeExpenses,
            includePhotos: false,
            includeContacts: exportOptions.pdfIncludeContacts,
            paperSize: exportOptions.pdfPaperSize,
            orientation: exportOptions.pdfOrientation,
            theme: exportOptions.pdfTheme,
          });
          await pdfExporter.export(itineraryDetails);
          break;

        case 'excel':
          const excelExporter = new EnhancedExcelExporter({
            includeExpenses: exportOptions.excelIncludeExpenses,
            includeTravelTimes: exportOptions.excelIncludeTravelTimes,
            includeStatistics: exportOptions.excelIncludeStatistics,
            includeContacts: exportOptions.excelIncludeContacts,
            separateSheets: exportOptions.excelSeparateSheets,
            includePhotos: false,
          });
          excelExporter.export(itineraryDetails);
          break;

        case 'markdown':
          const markdownExporter = new TextMarkdownExporter({
            format: exportOptions.textFormat,
            includeMetadata: exportOptions.textIncludeMetadata,
            includeContacts: exportOptions.textIncludeContacts,
            includeStatistics: exportOptions.textIncludeStatistics,
            includeMap: false,
            bulletStyle: exportOptions.textBulletStyle,
          });
          markdownExporter.export(itineraryDetails);
          break;

        case 'google-maps':
          GoogleMapsExporter.exportToGoogleMaps(itineraryDetails);
          break;

        case 'google-my-maps':
          GoogleMapsExporter.exportToMyMaps(itineraryDetails);
          break;

        case 'google-earth':
          GoogleMapsExporter.exportToGoogleEarth(itineraryDetails);
          break;

        case 'search-list':
          GoogleMapsExporter.exportAsSearchList(itineraryDetails);
          break;

        case 'ical':
          const calendarExporter = new CalendarExporter({
            timeZone: exportOptions.calendarTimeZone,
            includeAlarms: exportOptions.calendarIncludeAlarms,
            alarmMinutesBefore: exportOptions.calendarAlarmMinutes,
            includeLocation: exportOptions.calendarIncludeLocation,
            includeDescription: exportOptions.calendarIncludeDescription,
            includeUrl: exportOptions.calendarIncludeUrl,
          });
          calendarExporter.exportToICAL(itineraryDetails);
          break;

        case 'google-calendar':
          const googleCalExporter = new CalendarExporter({
            timeZone: exportOptions.calendarTimeZone,
            includeAlarms: exportOptions.calendarIncludeAlarms,
            alarmMinutesBefore: exportOptions.calendarAlarmMinutes,
            includeLocation: exportOptions.calendarIncludeLocation,
            includeDescription: exportOptions.calendarIncludeDescription,
            includeUrl: exportOptions.calendarIncludeUrl,
          });
          googleCalExporter.exportToGoogleCalendar(itineraryDetails);
          break;

        case 'outlook':
          const outlookExporter = new CalendarExporter({
            timeZone: 'UTC',
            includeAlarms: exportOptions.calendarIncludeAlarms,
            alarmMinutesBefore: exportOptions.calendarAlarmMinutes,
            includeLocation: exportOptions.calendarIncludeLocation,
            includeDescription: exportOptions.calendarIncludeDescription,
            includeUrl: exportOptions.calendarIncludeUrl,
          });
          outlookExporter.exportToOutlook(itineraryDetails);
          break;

        default:
          throw new Error(`Unsupported export format: ${format}`);
      }

      toast({
        title: 'Export Successful',
        description: `Your itinerary has been exported as ${format.toUpperCase()}.`,
      });

      setIsOpen(false);
    } catch (error) {
      console.error(`Export failed for ${format}:`, error);
      toast({
        title: 'Export Failed',
        description: `Failed to export your itinerary. Please try again.`,
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
      setExportingFormat('');
    }
  };

  const ExportButton = ({ 
    format, 
    icon: Icon, 
    title, 
    description, 
    badge, 
    onClick 
  }: {
    format: string;
    icon: React.ComponentType<any>;
    title: string;
    description: string;
    badge?: string;
    onClick: () => void;
  }) => (
    <Card className="cursor-pointer hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Icon className="h-5 w-5 text-blue-600" />
            <CardTitle className="text-sm">{title}</CardTitle>
          </div>
          {badge && <Badge variant="secondary" className="text-xs">{badge}</Badge>}
        </div>
        <CardDescription className="text-xs">{description}</CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <Button
          size="sm"
          className="w-full"
          onClick={onClick}
          disabled={isExporting}
        >
          {isExporting && exportingFormat === format ? (
            <>
              <Clock className="h-3 w-3 mr-1 animate-spin" />
              Exporting...
            </>
          ) : (
            <>
              <Download className="h-3 w-3 mr-1" />
              Export
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Export Itinerary
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="formats" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="formats">Export Formats</TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-1">
              <Settings className="h-3 w-3" />
              Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="formats" className="space-y-6">
            {/* Document Formats */}
            <div>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Document Formats
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <ExportButton
                  format="pdf"
                  icon={FileText}
                  title="PDF Document"
                  description="Professional PDF with cover page, QR codes, and detailed formatting"
                  badge="Recommended"
                  onClick={() => handleExport('pdf')}
                />
                <ExportButton
                  format="excel"
                  icon={FileSpreadsheet}
                  title="Excel Workbook"
                  description="Multi-sheet Excel file with statistics, expenses, and travel analysis"
                  onClick={() => handleExport('excel')}
                />
                <ExportButton
                  format="markdown"
                  icon={FileText}
                  title="Text/Markdown"
                  description="Markdown, plain text, or rich text format for easy sharing"
                  onClick={() => handleExport('markdown')}
                />
              </div>
            </div>

            <Separator />

            {/* Map Formats */}
            <div>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Map className="h-4 w-4" />
                Map Formats
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <ExportButton
                  format="google-maps"
                  icon={Map}
                  title="Google Maps Route"
                  description="Open route with all stops in Google Maps for navigation"
                  onClick={() => handleExport('google-maps')}
                />
                <ExportButton
                  format="google-my-maps"
                  icon={Globe}
                  title="Google My Maps"
                  description="KML file for importing into Google My Maps with custom markers"
                  onClick={() => handleExport('google-my-maps')}
                />
                <ExportButton
                  format="google-earth"
                  icon={FileImage}
                  title="Google Earth"
                  description="Advanced KML with routes, day-by-day organization, and rich info"
                  onClick={() => handleExport('google-earth')}
                />
                <ExportButton
                  format="search-list"
                  icon={Globe}
                  title="Search List"
                  description="HTML page with Google Maps search links for each location"
                  onClick={() => handleExport('search-list')}
                />
              </div>
            </div>

            <Separator />

            {/* Calendar Formats */}
            <div>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Calendar Formats
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <ExportButton
                  format="ical"
                  icon={Calendar}
                  title="iCal/ICS File"
                  description="Universal calendar format compatible with most calendar apps"
                  onClick={() => handleExport('ical')}
                />
                <ExportButton
                  format="google-calendar"
                  icon={Calendar}
                  title="Google Calendar"
                  description="Import directly into Google Calendar with alarms and locations"
                  onClick={() => handleExport('google-calendar')}
                />
                <ExportButton
                  format="outlook"
                  icon={Calendar}
                  title="Outlook Calendar"
                  description="Outlook-compatible ICS file with proper timezone handling"
                  onClick={() => handleExport('outlook')}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <Tabs defaultValue="pdf" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="pdf">PDF</TabsTrigger>
                <TabsTrigger value="excel">Excel</TabsTrigger>
                <TabsTrigger value="text">Text</TabsTrigger>
                <TabsTrigger value="calendar">Calendar</TabsTrigger>
              </TabsList>

              {/* PDF Settings */}
              <TabsContent value="pdf" className="space-y-4">
                <h3 className="text-lg font-semibold">PDF Export Settings</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="pdf-qr-codes"
                        checked={exportOptions.pdfIncludeQRCodes}
                        onCheckedChange={(checked) => updateOption('pdfIncludeQRCodes', checked as boolean)}
                      />
                      <label htmlFor="pdf-qr-codes" className="text-sm flex items-center gap-1">
                        <QrCode className="h-3 w-3" />
                        Include QR codes for locations
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="pdf-travel-times"
                        checked={exportOptions.pdfIncludeTravelTimes}
                        onCheckedChange={(checked) => updateOption('pdfIncludeTravelTimes', checked as boolean)}
                      />
                      <label htmlFor="pdf-travel-times" className="text-sm flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Include travel time estimates
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="pdf-expenses"
                        checked={exportOptions.pdfIncludeExpenses}
                        onCheckedChange={(checked) => updateOption('pdfIncludeExpenses', checked as boolean)}
                      />
                      <label htmlFor="pdf-expenses" className="text-sm flex items-center gap-1">
                        <DollarSign className="h-3 w-3" />
                        Include expense summary
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="pdf-contacts"
                        checked={exportOptions.pdfIncludeContacts}
                        onCheckedChange={(checked) => updateOption('pdfIncludeContacts', checked as boolean)}
                      />
                      <label htmlFor="pdf-contacts" className="text-sm flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        Include contact information
                      </label>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium">Paper Size</label>
                      <Select 
                        value={exportOptions.pdfPaperSize} 
                        onValueChange={(value) => updateOption('pdfPaperSize', value as 'a4' | 'letter')}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="a4">A4</SelectItem>
                          <SelectItem value="letter">Letter</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Orientation</label>
                      <Select 
                        value={exportOptions.pdfOrientation} 
                        onValueChange={(value) => updateOption('pdfOrientation', value as 'portrait' | 'landscape')}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="portrait">Portrait</SelectItem>
                          <SelectItem value="landscape">Landscape</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Theme</label>
                      <Select 
                        value={exportOptions.pdfTheme} 
                        onValueChange={(value) => updateOption('pdfTheme', value as 'default' | 'minimal' | 'colorful')}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="default">Default</SelectItem>
                          <SelectItem value="minimal">Minimal</SelectItem>
                          <SelectItem value="colorful">Colorful</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* Excel Settings */}
              <TabsContent value="excel" className="space-y-4">
                <h3 className="text-lg font-semibold">Excel Export Settings</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="excel-expenses"
                        checked={exportOptions.excelIncludeExpenses}
                        onCheckedChange={(checked) => updateOption('excelIncludeExpenses', checked as boolean)}
                      />
                      <label htmlFor="excel-expenses" className="text-sm">Include expense analysis sheet</label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="excel-travel-times"
                        checked={exportOptions.excelIncludeTravelTimes}
                        onCheckedChange={(checked) => updateOption('excelIncludeTravelTimes', checked as boolean)}
                      />
                      <label htmlFor="excel-travel-times" className="text-sm">Include travel times analysis</label>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="excel-statistics"
                        checked={exportOptions.excelIncludeStatistics}
                        onCheckedChange={(checked) => updateOption('excelIncludeStatistics', checked as boolean)}
                      />
                      <label htmlFor="excel-statistics" className="text-sm">Include statistics sheet</label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="excel-separate-sheets"
                        checked={exportOptions.excelSeparateSheets}
                        onCheckedChange={(checked) => updateOption('excelSeparateSheets', checked as boolean)}
                      />
                      <label htmlFor="excel-separate-sheets" className="text-sm">Create separate daily sheets</label>
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* Text Settings */}
              <TabsContent value="text" className="space-y-4">
                <h3 className="text-lg font-semibold">Text Export Settings</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium">Format</label>
                      <Select 
                        value={exportOptions.textFormat} 
                        onValueChange={(value) => updateOption('textFormat', value as 'markdown' | 'plain' | 'rich')}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="markdown">Markdown (.md)</SelectItem>
                          <SelectItem value="plain">Plain Text (.txt)</SelectItem>
                          <SelectItem value="rich">Rich Text (.rtf)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Bullet Style</label>
                      <Select 
                        value={exportOptions.textBulletStyle} 
                        onValueChange={(value) => updateOption('textBulletStyle', value as 'dash' | 'asterisk' | 'number')}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="dash">Dashes (-)</SelectItem>
                          <SelectItem value="asterisk">Asterisks (*)</SelectItem>
                          <SelectItem value="number">Numbers (1.)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="text-metadata"
                        checked={exportOptions.textIncludeMetadata}
                        onCheckedChange={(checked) => updateOption('textIncludeMetadata', checked as boolean)}
                      />
                      <label htmlFor="text-metadata" className="text-sm">Include trip metadata</label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="text-contacts"
                        checked={exportOptions.textIncludeContacts}
                        onCheckedChange={(checked) => updateOption('textIncludeContacts', checked as boolean)}
                      />
                      <label htmlFor="text-contacts" className="text-sm">Include contact information</label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="text-statistics"
                        checked={exportOptions.textIncludeStatistics}
                        onCheckedChange={(checked) => updateOption('textIncludeStatistics', checked as boolean)}
                      />
                      <label htmlFor="text-statistics" className="text-sm">Include activity statistics</label>
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* Calendar Settings */}
              <TabsContent value="calendar" className="space-y-4">
                <h3 className="text-lg font-semibold">Calendar Export Settings</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium">Time Zone</label>
                      <Select 
                        value={exportOptions.calendarTimeZone} 
                        onValueChange={(value) => updateOption('calendarTimeZone', value)}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="America/New_York">Eastern Time</SelectItem>
                          <SelectItem value="America/Chicago">Central Time</SelectItem>
                          <SelectItem value="America/Denver">Mountain Time</SelectItem>
                          <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
                          <SelectItem value="Europe/London">GMT</SelectItem>
                          <SelectItem value="Europe/Paris">Central European Time</SelectItem>
                          <SelectItem value="Asia/Tokyo">Japan Time</SelectItem>
                          <SelectItem value="UTC">UTC</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="calendar-alarms"
                        checked={exportOptions.calendarIncludeAlarms}
                        onCheckedChange={(checked) => updateOption('calendarIncludeAlarms', checked as boolean)}
                      />
                      <label htmlFor="calendar-alarms" className="text-sm">Include reminders/alarms</label>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="calendar-location"
                        checked={exportOptions.calendarIncludeLocation}
                        onCheckedChange={(checked) => updateOption('calendarIncludeLocation', checked as boolean)}
                      />
                      <label htmlFor="calendar-location" className="text-sm">Include location data</label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="calendar-description"
                        checked={exportOptions.calendarIncludeDescription}
                        onCheckedChange={(checked) => updateOption('calendarIncludeDescription', checked as boolean)}
                      />
                      <label htmlFor="calendar-description" className="text-sm">Include detailed descriptions</label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="calendar-url"
                        checked={exportOptions.calendarIncludeUrl}
                        onCheckedChange={(checked) => updateOption('calendarIncludeUrl', checked as boolean)}
                      />
                      <label htmlFor="calendar-url" className="text-sm">Include website URLs</label>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}