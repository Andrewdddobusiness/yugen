// Custom hook for export functionality
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { EnhancedPDFExporter } from '@/utils/export/enhancedPdfExport';
import { EnhancedExcelExporter } from '@/utils/export/enhancedExcelExport';
import { GoogleMapsExporter } from '@/utils/export/googleMapsExport';
import { TextMarkdownExporter } from '@/utils/export/textMarkdownExport';
import { CalendarExporter } from '@/utils/export/calendarExport';
import { ExportOptions, ItineraryDetails } from './types';

interface UseExportHandlersProps {
  itineraryDetails: ItineraryDetails;
  exportOptions: ExportOptions;
  onExportComplete?: () => void;
}

export const useExportHandlers = ({
  itineraryDetails,
  exportOptions,
  onExportComplete,
}: UseExportHandlersProps) => {
  const [isExporting, setIsExporting] = useState(false);
  const [exportingFormat, setExportingFormat] = useState<string>('');
  const { toast } = useToast();

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

      onExportComplete?.();
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

  return {
    handleExport,
    isExporting,
    exportingFormat,
  };
};