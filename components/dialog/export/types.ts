// Export dialog type definitions
import { IItineraryActivity } from '@/store/itineraryActivityStore';

export interface ExportDialogProps {
  children: React.ReactNode;
  itineraryDetails: ItineraryDetails;
}

export interface ItineraryDetails {
  city: string;
  country: string;
  fromDate: Date;
  toDate: Date;
  activities: IItineraryActivity[];
  itineraryName?: string;
  createdBy?: string;
  notes?: string;
}

export interface ExportOptions {
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

export interface ExportFormat {
  id: string;
  icon: React.ComponentType<any>;
  title: string;
  description: string;
  badge?: string;
  category: 'document' | 'map' | 'calendar';
}

export interface ExportButtonProps {
  format: string;
  icon: React.ComponentType<any>;
  title: string;
  description: string;
  badge?: string;
  onClick: () => void;
  isExporting: boolean;
  exportingFormat: string;
}