import { IItineraryActivity } from '@/store/itineraryActivityStore';
import { EnhancedPDFExporter } from '@/utils/export/enhancedPdfExport';
import { EnhancedExcelExporter } from '@/utils/export/enhancedExcelExport';
import { GoogleMapsExporter } from '@/utils/export/googleMapsExport';
import { TextMarkdownExporter } from '@/utils/export/textMarkdownExport';
import { CalendarExporter } from '@/utils/export/calendarExport';
import { generateShareableLink, createItineraryCollection } from '@/utils/shareableLinks';
import JSZip from 'jszip';

interface ItineraryDetails {
  city: string;
  country: string;
  fromDate: Date;
  toDate: Date;
  activities: IItineraryActivity[];
  itineraryName?: string;
  createdBy?: string;
  notes?: string;
  id?: string;
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
  filenamePrefix?: string;
}

interface BulkExportProgress {
  currentStep: string;
  completed: number;
  total: number;
  percentage: number;
  errors: string[];
}

export class BulkExporter {
  private static readonly BATCH_SIZE = 5; // Process 5 itineraries at a time

  /**
   * Export multiple itineraries in various formats
   */
  static async exportMultipleItineraries(
    itineraries: ItineraryDetails[],
    options: BulkExportOptions,
    progressCallback?: (progress: BulkExportProgress) => void
  ): Promise<void> {
    const totalSteps = this.calculateTotalSteps(itineraries.length, options);
    let currentStep = 0;
    const errors: string[] = [];

    const progress = (step: string) => {
      progressCallback?.({
        currentStep: step,
        completed: currentStep,
        total: totalSteps,
        percentage: Math.round((currentStep / totalSteps) * 100),
        errors: [...errors],
      });
      currentStep++;
    };

    try {
      // Create ZIP if requested
      const zip = options.zipOutput ? new JSZip() : null;
      const exportResults: { [format: string]: Blob[] } = {};

      // Process itineraries in batches to avoid overwhelming the browser
      const batches = this.createBatches(itineraries, this.BATCH_SIZE);

      for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        const batch = batches[batchIndex];
        
        progress(`Processing batch ${batchIndex + 1} of ${batches.length}`);

        // Process each itinerary in the current batch
        const batchPromises = batch.map(async (itinerary, index) => {
          const itineraryResults = await this.exportSingleItinerary(
            itinerary,
            options,
            `${options.filenamePrefix || 'itinerary'}_${batchIndex * this.BATCH_SIZE + index + 1}`
          );
          return { itinerary, results: itineraryResults };
        });

        const batchResults = await Promise.allSettled(batchPromises);
        
        // Process batch results
        batchResults.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            const { results } = result.value;
            Object.entries(results).forEach(([format, blob]) => {
              if (!exportResults[format]) exportResults[format] = [];
              exportResults[format].push(blob);
            });
          } else {
            const itinerary = batch[index];
            errors.push(`Failed to export ${itinerary.itineraryName || itinerary.city}: ${result.reason}`);
          }
        });

        // Small delay between batches to prevent browser freeze
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Create shared collection if requested
      if (options.includeSharedLinks && options.createCollection) {
        progress('Creating shared collection...');
        try {
          const collectionLink = await createItineraryCollection(
            itineraries,
            {
              name: `Travel Collection - ${new Date().toLocaleDateString()}`,
              description: `Collection of ${itineraries.length} travel itineraries`,
              createdBy: itineraries[0]?.createdBy || 'Anonymous',
            },
            {
              includePersonalNotes: false,
              includeContactInfo: true,
              allowEditing: false,
              publicView: true,
            }
          );

          if (zip) {
            zip.file('shared_collection_links.txt', this.generateCollectionLinksText(collectionLink));
          }
        } catch (error) {
          errors.push(`Failed to create shared collection: ${error}`);
        }
      }

      // Generate individual shared links if requested
      if (options.includeSharedLinks && !options.createCollection) {
        progress('Generating shared links...');
        const sharedLinksText = await this.generateIndividualSharedLinks(itineraries);
        if (zip) {
          zip.file('shared_links.txt', sharedLinksText);
        }
      }

      // Handle output
      if (options.zipOutput && zip) {
        progress('Creating ZIP file...');
        
        // Add files to ZIP with appropriate folder structure
        Object.entries(exportResults).forEach(([format, blobs]) => {
          const folderName = options.separateFolders ? `${format}/` : '';
          blobs.forEach((blob, index) => {
            const filename = `${folderName}${options.filenamePrefix || 'itinerary'}_${index + 1}.${this.getFileExtension(format)}`;
            zip.file(filename, blob);
          });
        });

        // Generate and download ZIP
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        this.downloadFile(zipBlob, `bulk_export_${Date.now()}.zip`, 'application/zip');
      } else {
        // Download files individually
        progress('Downloading files...');
        Object.entries(exportResults).forEach(([format, blobs]) => {
          blobs.forEach((blob, index) => {
            const filename = `${options.filenamePrefix || 'itinerary'}_${index + 1}.${this.getFileExtension(format)}`;
            this.downloadFile(blob, filename, blob.type);
          });
        });
      }

      progress('Export completed!');

      // Show summary
      if (errors.length > 0) {
        console.warn('Bulk export completed with errors:', errors);
      }

    } catch (error) {
      console.error('Bulk export failed:', error);
      throw error;
    }
  }

  /**
   * Export a single itinerary in all requested formats
   */
  private static async exportSingleItinerary(
    itinerary: ItineraryDetails,
    options: BulkExportOptions,
    filenamePrefix: string
  ): Promise<{ [format: string]: Blob }> {
    const results: { [format: string]: Blob } = {};

    try {
      // PDF Export
      if (options.formats.pdf) {
        const pdfExporter = new EnhancedPDFExporter({
          includeMap: true,
          includeQRCodes: true,
          includeTravelTimes: true,
          includeExpenses: true,
          includePhotos: false,
          includeContacts: true,
          paperSize: 'a4',
          orientation: 'portrait',
          theme: 'default',
        });

        // Generate PDF content (would need to modify the exporter to return Blob instead of direct download)
        const pdfContent = await this.generatePDFBlob(pdfExporter, itinerary);
        results.pdf = pdfContent;
      }

      // Excel Export
      if (options.formats.excel) {
        const excelContent = await this.generateExcelBlob(itinerary);
        results.excel = excelContent;
      }

      // Markdown Export
      if (options.formats.markdown) {
        const markdownContent = this.generateMarkdownBlob(itinerary);
        results.markdown = markdownContent;
      }

      // Calendar Export
      if (options.formats.calendar) {
        const calendarContent = this.generateCalendarBlob(itinerary);
        results.calendar = calendarContent;
      }

      // Google Maps Export
      if (options.formats.googleMaps) {
        const mapsContent = this.generateGoogleMapsBlob(itinerary);
        results.googleMaps = mapsContent;
      }

    } catch (error) {
      console.error(`Error exporting ${itinerary.itineraryName || itinerary.city}:`, error);
      throw error;
    }

    return results;
  }

  /**
   * Generate individual shared links for all itineraries
   */
  private static async generateIndividualSharedLinks(itineraries: ItineraryDetails[]): Promise<string> {
    const links: string[] = [];
    
    for (const itinerary of itineraries) {
      try {
        const shareLink = await generateShareableLink(itinerary, {
          includePersonalNotes: false,
          includeContactInfo: true,
          allowEditing: false,
          publicView: true,
        });

        links.push(`${itinerary.itineraryName || itinerary.city}: ${shareLink.shortUrl}`);
      } catch (error) {
        links.push(`${itinerary.itineraryName || itinerary.city}: Error generating link`);
      }
    }

    return `Shared Links for Travel Itineraries
Generated on: ${new Date().toLocaleString()}

${links.join('\n')}

Instructions:
- Click any link to view the itinerary
- Links expire after 30 days
- Share these links with friends and family
`;
  }

  /**
   * Generate collection links text
   */
  private static generateCollectionLinksText(collectionLink: any): string {
    return `Travel Collection Shared Link
Generated on: ${new Date().toLocaleString()}

Collection Link: ${collectionLink.shortUrl}
Collection ID: ${collectionLink.id}
Views: ${collectionLink.viewCount}
${collectionLink.expiresAt ? `Expires: ${collectionLink.expiresAt.toLocaleDateString()}` : 'No expiration'}

Instructions:
- Share this link to give access to the entire collection
- Recipients can view all itineraries in one place
- Individual itineraries can be exported from the collection view
`;
  }

  // Helper methods for generating different format blobs

  private static async generatePDFBlob(exporter: EnhancedPDFExporter, itinerary: ItineraryDetails): Promise<Blob> {
    // This would require modifying the PDF exporter to return blob instead of downloading
    // For now, we'll create a placeholder
    const content = `PDF export for ${itinerary.itineraryName || itinerary.city} would be generated here`;
    return new Blob([content], { type: 'application/pdf' });
  }

  private static async generateExcelBlob(itinerary: ItineraryDetails): Promise<Blob> {
    // This would use the Excel exporter to generate blob content
    const content = `Excel export for ${itinerary.itineraryName || itinerary.city} would be generated here`;
    return new Blob([content], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  }

  private static generateMarkdownBlob(itinerary: ItineraryDetails): Blob {
    const exporter = new TextMarkdownExporter({
      format: 'markdown',
      includeMetadata: true,
      includeContacts: true,
      includeStatistics: true,
      includeMap: false,
      bulletStyle: 'dash',
    });

    // Generate markdown content
    const content = this.generateMarkdownContent(itinerary);
    return new Blob([content], { type: 'text/markdown' });
  }

  private static generateCalendarBlob(itinerary: ItineraryDetails): Blob {
    const exporter = new CalendarExporter({
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      includeAlarms: true,
      alarmMinutesBefore: 15,
      includeLocation: true,
      includeDescription: true,
      includeUrl: true,
    });

    // Generate iCal content
    const content = this.generateICalContent(itinerary);
    return new Blob([content], { type: 'text/calendar' });
  }

  private static generateGoogleMapsBlob(itinerary: ItineraryDetails): Blob {
    // Generate KML content for Google My Maps
    const content = this.generateKMLContent(itinerary);
    return new Blob([content], { type: 'application/vnd.google-earth.kml+xml' });
  }

  // Content generation helpers (simplified versions)

  private static generateMarkdownContent(itinerary: ItineraryDetails): string {
    return `# ${itinerary.itineraryName || itinerary.city} Travel Itinerary

**${itinerary.city}, ${itinerary.country}**
**${itinerary.fromDate.toDateString()} - ${itinerary.toDate.toDateString()}**

## Activities

${itinerary.activities.map((activity, index) => `
${index + 1}. **${activity.activity?.name || 'Unnamed Activity'}**
   - Date: ${activity.date || 'Not specified'}
   - Time: ${activity.start_time || 'Not specified'}
   - Location: ${activity.activity?.address || 'Not specified'}
   ${activity.notes ? `- Notes: ${activity.notes}` : ''}
`).join('')}

Generated on ${new Date().toLocaleString()}
`;
  }

  private static generateICalContent(itinerary: ItineraryDetails): string {
    return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Planaway//Bulk Export//EN
CALSCALE:GREGORIAN
X-WR-CALNAME:${itinerary.itineraryName || itinerary.city} Itinerary

${itinerary.activities.filter(a => a.start_time && a.date).map((activity, index) => `
BEGIN:VEVENT
UID:bulk-export-${index}@planaway.website
DTSTART:${this.formatCalendarDateTime(activity.date as string, activity.start_time!)}
SUMMARY:${activity.activity?.name || 'Travel Activity'}
LOCATION:${activity.activity?.address || ''}
DESCRIPTION:${activity.notes || ''}
END:VEVENT
`).join('')}

END:VCALENDAR`;
  }

  private static generateKMLContent(itinerary: ItineraryDetails): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>${itinerary.itineraryName || itinerary.city} Itinerary</name>
    ${itinerary.activities.filter(a => a.activity?.coordinates).map((activity, index) => `
    <Placemark>
      <name>${activity.activity?.name || 'Activity'}</name>
      <description>${activity.notes || ''}</description>
      <Point>
        <coordinates>${activity.activity?.coordinates?.[0]},${activity.activity?.coordinates?.[1]},0</coordinates>
      </Point>
    </Placemark>
    `).join('')}
  </Document>
</kml>`;
  }

  // Utility methods

  private static calculateTotalSteps(itineraryCount: number, options: BulkExportOptions): number {
    let steps = Math.ceil(itineraryCount / this.BATCH_SIZE); // Processing batches
    
    if (options.includeSharedLinks) steps += 1;
    if (options.zipOutput) steps += 1;
    
    return steps + 1; // +1 for completion step
  }

  private static createBatches<T>(array: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < array.length; i += batchSize) {
      batches.push(array.slice(i, i + batchSize));
    }
    return batches;
  }

  private static getFileExtension(format: string): string {
    const extensions: { [key: string]: string } = {
      pdf: 'pdf',
      excel: 'xlsx',
      markdown: 'md',
      calendar: 'ics',
      googleMaps: 'kml',
    };
    return extensions[format] || 'txt';
  }

  private static formatCalendarDateTime(date: string, time: string): string {
    const activityDate = new Date(date);
    const [hours, minutes] = time.split(':').map(Number);
    activityDate.setHours(hours, minutes, 0, 0);
    return activityDate.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  }

  private static downloadFile(blob: Blob, filename: string, mimeType: string): void {
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

// Convenience functions
export const exportMultipleItineraries = BulkExporter.exportMultipleItineraries;
