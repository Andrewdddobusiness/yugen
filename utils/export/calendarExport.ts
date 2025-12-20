import { IItineraryActivity } from "@/store/itineraryActivityStore";
import { format, parseISO } from "date-fns";

interface ItineraryDetails {
  city: string;
  country: string;
  fromDate: Date;
  toDate: Date;
  activities: IItineraryActivity[];
  itineraryName?: string;
  createdBy?: string;
  timeZone?: string;
}

interface CalendarExportOptions {
  timeZone: string;
  includeAlarms: boolean;
  alarmMinutesBefore: number;
  includeLocation: boolean;
  includeDescription: boolean;
  includeUrl: boolean;
}

export class CalendarExporter {
  constructor(private options: CalendarExportOptions) {}

  /**
   * Export to iCal format (.ics file)
   */
  exportToICAL(details: ItineraryDetails): void {
    const icalContent = this.generateICAL(details);
    this.downloadFile(icalContent, `${details.itineraryName || details.city}_calendar.ics`, 'text/calendar');
  }

  /**
   * Export to Google Calendar (creates .ics file that can be imported)
   */
  exportToGoogleCalendar(details: ItineraryDetails): void {
    const icalContent = this.generateICAL(details);
    this.downloadFile(icalContent, `${details.itineraryName || details.city}_google_calendar.ics`, 'text/calendar');
  }

  /**
   * Generate Google Calendar URL for adding events
   */
  generateGoogleCalendarUrls(details: ItineraryDetails): { activity: IItineraryActivity; url: string }[] {
    return details.activities
      .filter(activity => activity.start_time && activity.date)
      .map(activity => ({
        activity,
        url: this.createGoogleCalendarEventUrl(activity, details),
      }));
  }

  /**
   * Export to Outlook format
   */
  exportToOutlook(details: ItineraryDetails): void {
    const icalContent = this.generateICAL(details, true); // Outlook-specific formatting
    this.downloadFile(icalContent, `${details.itineraryName || details.city}_outlook.ics`, 'text/calendar');
  }

  /**
   * Generate CSV format for calendar import
   */
  exportToCalendarCSV(details: ItineraryDetails): void {
    const csvContent = this.generateCalendarCSV(details);
    this.downloadFile(csvContent, `${details.itineraryName || details.city}_calendar.csv`, 'text/csv');
  }

  private generateICAL(details: ItineraryDetails, outlookMode = false): string {
    const lines: string[] = [];
    
    // Calendar header
    lines.push('BEGIN:VCALENDAR');
    lines.push('VERSION:2.0');
    lines.push('PRODID:-//Yugi//Travel Itinerary//EN');
    lines.push('CALSCALE:GREGORIAN');
    lines.push('METHOD:PUBLISH');
    
    if (!outlookMode) {
      lines.push(`X-WR-CALNAME:${details.itineraryName || `${details.city} Itinerary`}`);
      lines.push(`X-WR-CALDESC:Travel itinerary for ${details.city}, ${details.country}`);
      lines.push(`X-WR-TIMEZONE:${this.options.timeZone}`);
    }

    // Add timezone definition
    if (this.options.timeZone && !outlookMode) {
      lines.push(...this.generateTimezoneDefinition());
    }

    // Process activities
    const activitiesWithTime = details.activities.filter(activity => 
      activity.start_time && activity.date
    );

    activitiesWithTime.forEach((activity, index) => {
      lines.push(...this.generateVEvent(activity, details, index, outlookMode));
    });

    // Calendar footer
    lines.push('END:VCALENDAR');

    return lines.join('\r\n');
  }

  private generateVEvent(activity: IItineraryActivity, details: ItineraryDetails, index: number, outlookMode = false): string[] {
    const lines: string[] = [];
    
    lines.push('BEGIN:VEVENT');
    
    // Unique identifier
    const uid = `${activity.itinerary_activity_id || `activity-${index}`}@journey-app.com`;
    lines.push(`UID:${uid}`);
    
    // Creation and modification dates
    const now = new Date();
    const timestamp = this.formatDateTimeUTC(now);
    lines.push(`DTSTAMP:${timestamp}`);
    lines.push(`CREATED:${timestamp}`);
    lines.push(`LAST-MODIFIED:${timestamp}`);

    // Activity dates and times
    const activityDate = new Date(activity.date as string);
    const startDateTime = this.combineDateTime(activityDate, activity.start_time!);
    const endDateTime = activity.end_time 
      ? this.combineDateTime(activityDate, activity.end_time)
      : new Date(startDateTime.getTime() + 60 * 60 * 1000); // Default 1 hour duration

    if (outlookMode || !this.options.timeZone) {
      lines.push(`DTSTART:${this.formatDateTimeUTC(startDateTime)}`);
      lines.push(`DTEND:${this.formatDateTimeUTC(endDateTime)}`);
    } else {
      lines.push(`DTSTART;TZID=${this.options.timeZone}:${this.formatDateTime(startDateTime)}`);
      lines.push(`DTEND;TZID=${this.options.timeZone}:${this.formatDateTime(endDateTime)}`);
    }

    // Event title
    const summary = activity.activity?.name || 'Travel Activity';
    lines.push(`SUMMARY:${this.escapeICALText(summary)}`);

    // Location
    if (this.options.includeLocation && activity.activity?.address) {
      lines.push(`LOCATION:${this.escapeICALText(activity.activity.address)}`);
      
      // Geographic coordinates
      if (activity.activity?.coordinates) {
        const [lng, lat] = activity.activity.coordinates;
        lines.push(`GEO:${lat};${lng}`);
      }
    }

    // Description
    if (this.options.includeDescription) {
      const descriptionParts: string[] = [];
      
      if (activity.activity?.address) {
        descriptionParts.push(`Location: ${activity.activity.address}`);
      }
      
      if (activity.activity?.rating) {
        descriptionParts.push(`Rating: ${activity.activity.rating}/5 stars`);
      }
      
      if (activity.activity?.price_level) {
        descriptionParts.push(`Price Level: ${'$'.repeat(parseInt(activity.activity.price_level))}`);
      }
      
      if (activity.activity?.phone_number) {
        descriptionParts.push(`Phone: ${activity.activity.phone_number}`);
      }
      
      if (activity.notes) {
        descriptionParts.push(`Notes: ${activity.notes}`);
      }
      
      descriptionParts.push(`\\nPart of: ${details.itineraryName || `${details.city} Itinerary`}`);
      
      if (descriptionParts.length > 0) {
        const description = descriptionParts.join('\\n');
        lines.push(`DESCRIPTION:${this.escapeICALText(description)}`);
      }
    }

    // URL
    if (this.options.includeUrl && activity.activity?.google_maps_url) {
      lines.push(`URL:${activity.activity.google_maps_url}`);
    }

    // Categories
    const categories = [];
    if (activity.activity?.types?.[0]) {
      categories.push(this.formatCategory(activity.activity.types[0]));
    }
    categories.push('Travel', details.city);
    lines.push(`CATEGORIES:${categories.join(',')}`);

    // Status and transparency
    lines.push('STATUS:CONFIRMED');
    lines.push('TRANSP:OPAQUE');

    // Alarm/reminder
    if (this.options.includeAlarms && this.options.alarmMinutesBefore > 0) {
      lines.push('BEGIN:VALARM');
      lines.push('ACTION:DISPLAY');
      lines.push(`DESCRIPTION:Reminder: ${summary}`);
      lines.push(`TRIGGER:-PT${this.options.alarmMinutesBefore}M`);
      lines.push('END:VALARM');
    }

    lines.push('END:VEVENT');
    
    return lines;
  }

  private generateTimezoneDefinition(): string[] {
    // Simplified timezone definition for common timezones
    const tzMap: { [key: string]: string[] } = {
      'America/New_York': [
        'BEGIN:VTIMEZONE',
        'TZID:America/New_York',
        'BEGIN:STANDARD',
        'DTSTART:20231105T020000',
        'TZNAME:EST',
        'TZOFFSETFROM:-0400',
        'TZOFFSETTO:-0500',
        'RRULE:FREQ=YEARLY;BYMONTH=11;BYDAY=1SU',
        'END:STANDARD',
        'BEGIN:DAYLIGHT',
        'DTSTART:20240310T020000',
        'TZNAME:EDT',
        'TZOFFSETFROM:-0500',
        'TZOFFSETTO:-0400',
        'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=2SU',
        'END:DAYLIGHT',
        'END:VTIMEZONE',
      ],
      'Europe/London': [
        'BEGIN:VTIMEZONE',
        'TZID:Europe/London',
        'BEGIN:STANDARD',
        'DTSTART:20231029T020000',
        'TZNAME:GMT',
        'TZOFFSETFROM:+0100',
        'TZOFFSETTO:+0000',
        'RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU',
        'END:STANDARD',
        'BEGIN:DAYLIGHT',
        'DTSTART:20240331T010000',
        'TZNAME:BST',
        'TZOFFSETFROM:+0000',
        'TZOFFSETTO:+0100',
        'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU',
        'END:DAYLIGHT',
        'END:VTIMEZONE',
      ],
    };

    return tzMap[this.options.timeZone] || [];
  }

  private createGoogleCalendarEventUrl(activity: IItineraryActivity, details: ItineraryDetails): string {
    const baseUrl = 'https://calendar.google.com/calendar/render?action=TEMPLATE';
    const params = new URLSearchParams();

    // Event title
    params.append('text', activity.activity?.name || 'Travel Activity');

    // Date and time
    if (activity.start_time && activity.date) {
      const activityDate = new Date(activity.date as string);
      const startDateTime = this.combineDateTime(activityDate, activity.start_time);
      const endDateTime = activity.end_time 
        ? this.combineDateTime(activityDate, activity.end_time)
        : new Date(startDateTime.getTime() + 60 * 60 * 1000);

      // Google Calendar expects format: YYYYMMDDTHHmmSS or YYYYMMDD for all-day
      const formatGoogleDateTime = (date: Date) => {
        return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
      };

      params.append('dates', `${formatGoogleDateTime(startDateTime)}/${formatGoogleDateTime(endDateTime)}`);
    }

    // Location
    if (activity.activity?.address) {
      params.append('location', activity.activity.address);
    }

    // Description
    const descriptionParts: string[] = [];
    if (activity.activity?.rating) {
      descriptionParts.push(`Rating: ${activity.activity.rating}/5 stars`);
    }
    if (activity.notes) {
      descriptionParts.push(`Notes: ${activity.notes}`);
    }
    if (activity.activity?.google_maps_url) {
      descriptionParts.push(`Map: ${activity.activity.google_maps_url}`);
    }
    descriptionParts.push(`Part of: ${details.itineraryName || `${details.city} Itinerary`}`);

    if (descriptionParts.length > 0) {
      params.append('details', descriptionParts.join('\n'));
    }

    return `${baseUrl}&${params.toString()}`;
  }

  private generateCalendarCSV(details: ItineraryDetails): string {
    const headers = [
      'Subject',
      'Start Date',
      'Start Time', 
      'End Date',
      'End Time',
      'All Day Event',
      'Description',
      'Location',
      'Private'
    ];

    const rows = details.activities
      .filter(activity => activity.start_time && activity.date)
      .map(activity => {
        const activityDate = new Date(activity.date as string);
        const startDateTime = this.combineDateTime(activityDate, activity.start_time!);
        const endDateTime = activity.end_time 
          ? this.combineDateTime(activityDate, activity.end_time)
          : new Date(startDateTime.getTime() + 60 * 60 * 1000);

        const description = [
          activity.activity?.rating ? `Rating: ${activity.activity.rating}/5` : '',
          activity.notes || '',
          `Part of ${details.itineraryName || `${details.city} Itinerary`}`,
        ].filter(Boolean).join(' | ');

        return [
          activity.activity?.name || 'Travel Activity',
          format(startDateTime, 'MM/dd/yyyy'),
          format(startDateTime, 'HH:mm:ss'),
          format(endDateTime, 'MM/dd/yyyy'),
          format(endDateTime, 'HH:mm:ss'),
          'False',
          description,
          activity.activity?.address || '',
          'False'
        ];
      });

    return [headers, ...rows]
      .map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(','))
      .join('\n');
  }

  // Helper methods
  private combineDateTime(date: Date, time: string): Date {
    const [hours, minutes] = time.split(':').map(Number);
    const combined = new Date(date);
    combined.setHours(hours, minutes, 0, 0);
    return combined;
  }

  private formatDateTime(date: Date): string {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0];
  }

  private formatDateTimeUTC(date: Date): string {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  }

  private escapeICALText(text: string): string {
    return text
      .replace(/\\/g, '\\\\')
      .replace(/;/g, '\\;')
      .replace(/,/g, '\\,')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '');
  }

  private formatCategory(category: string): string {
    return category
      .replace(/_/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  private downloadFile(content: string, filename: string, mimeType: string): void {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}

// Utility functions for different calendar formats
export class CalendarFormatUtils {
  /**
   * Generate Apple Calendar specific format
   */
  static generateAppleCalendar(details: ItineraryDetails, options?: Partial<CalendarExportOptions>): string {
    const defaultOptions: CalendarExportOptions = {
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      includeAlarms: true,
      alarmMinutesBefore: 15,
      includeLocation: true,
      includeDescription: true,
      includeUrl: true,
    };

    const exporter = new CalendarExporter({ ...defaultOptions, ...options });
    return exporter['generateICAL'](details);
  }

  /**
   * Generate Outlook specific format
   */
  static generateOutlookCalendar(details: ItineraryDetails, options?: Partial<CalendarExportOptions>): string {
    const defaultOptions: CalendarExportOptions = {
      timeZone: 'UTC',
      includeAlarms: true,
      alarmMinutesBefore: 15,
      includeLocation: true,
      includeDescription: true,
      includeUrl: true,
    };

    const exporter = new CalendarExporter({ ...defaultOptions, ...options });
    return exporter['generateICAL'](details, true);
  }

  /**
   * Create bulk Google Calendar URLs
   */
  static createGoogleCalendarBulkImport(details: ItineraryDetails): string[] {
    const defaultOptions: CalendarExportOptions = {
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      includeAlarms: false,
      alarmMinutesBefore: 0,
      includeLocation: true,
      includeDescription: true,
      includeUrl: true,
    };

    const exporter = new CalendarExporter(defaultOptions);
    const urls = exporter.generateGoogleCalendarUrls(details);
    return urls.map(item => item.url);
  }
}

// Export functions for backward compatibility
export const exportToICAL = (details: ItineraryDetails, options?: Partial<CalendarExportOptions>) => {
  const defaultOptions: CalendarExportOptions = {
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    includeAlarms: true,
    alarmMinutesBefore: 15,
    includeLocation: true,
    includeDescription: true,
    includeUrl: true,
  };

  const exporter = new CalendarExporter({ ...defaultOptions, ...options });
  exporter.exportToICAL(details);
};

export const exportToGoogleCalendar = (details: ItineraryDetails, options?: Partial<CalendarExportOptions>) => {
  const defaultOptions: CalendarExportOptions = {
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    includeAlarms: true,
    alarmMinutesBefore: 15,
    includeLocation: true,
    includeDescription: true,
    includeUrl: true,
  };

  const exporter = new CalendarExporter({ ...defaultOptions, ...options });
  exporter.exportToGoogleCalendar(details);
};

export const exportToOutlook = (details: ItineraryDetails, options?: Partial<CalendarExportOptions>) => {
  const defaultOptions: CalendarExportOptions = {
    timeZone: 'UTC',
    includeAlarms: true,
    alarmMinutesBefore: 15,
    includeLocation: true,
    includeDescription: true,
    includeUrl: true,
  };

  const exporter = new CalendarExporter({ ...defaultOptions, ...options });
  exporter.exportToOutlook(details);
};
