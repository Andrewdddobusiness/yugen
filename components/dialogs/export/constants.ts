// Export dialog constants and configuration
import { 
  FileText, 
  FileSpreadsheet,
  Map, 
  Globe,
  FileImage,
  Calendar,
} from 'lucide-react';
import { ExportOptions, ExportFormat } from './types';

export const defaultExportOptions: ExportOptions = {
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

export const exportFormats: Record<string, ExportFormat> = {
  // Document formats
  pdf: {
    id: 'pdf',
    icon: FileText,
    title: 'PDF Document',
    description: 'Professional PDF with cover page, QR codes, and detailed formatting',
    badge: 'Recommended',
    category: 'document',
  },
  excel: {
    id: 'excel',
    icon: FileSpreadsheet,
    title: 'Excel Workbook',
    description: 'Multi-sheet Excel file with statistics, expenses, and travel analysis',
    category: 'document',
  },
  markdown: {
    id: 'markdown',
    icon: FileText,
    title: 'Text/Markdown',
    description: 'Markdown, plain text, or rich text format for easy sharing',
    category: 'document',
  },

  // Map formats
  'google-maps': {
    id: 'google-maps',
    icon: Map,
    title: 'Google Maps Route',
    description: 'Open route with all stops in Google Maps for navigation',
    category: 'map',
  },
  'google-my-maps': {
    id: 'google-my-maps',
    icon: Globe,
    title: 'Google My Maps',
    description: 'KML file for importing into Google My Maps with custom markers',
    category: 'map',
  },
  'google-earth': {
    id: 'google-earth',
    icon: FileImage,
    title: 'Google Earth',
    description: 'Advanced KML with routes, day-by-day organization, and rich info',
    category: 'map',
  },
  'search-list': {
    id: 'search-list',
    icon: Globe,
    title: 'Search List',
    description: 'HTML page with Google Maps search links for each location',
    category: 'map',
  },

  // Calendar formats
  ical: {
    id: 'ical',
    icon: Calendar,
    title: 'iCal/ICS File',
    description: 'Universal calendar format compatible with most calendar apps',
    category: 'calendar',
  },
  'google-calendar': {
    id: 'google-calendar',
    icon: Calendar,
    title: 'Google Calendar',
    description: 'Import directly into Google Calendar with alarms and locations',
    category: 'calendar',
  },
  outlook: {
    id: 'outlook',
    icon: Calendar,
    title: 'Outlook Calendar',
    description: 'Outlook-compatible ICS file with proper timezone handling',
    category: 'calendar',
  },
};

export const timeZoneOptions = [
  { value: 'America/New_York', label: 'Eastern Time' },
  { value: 'America/Chicago', label: 'Central Time' },
  { value: 'America/Denver', label: 'Mountain Time' },
  { value: 'America/Los_Angeles', label: 'Pacific Time' },
  { value: 'Europe/London', label: 'GMT' },
  { value: 'Europe/Paris', label: 'Central European Time' },
  { value: 'Asia/Tokyo', label: 'Japan Time' },
  { value: 'UTC', label: 'UTC' },
];