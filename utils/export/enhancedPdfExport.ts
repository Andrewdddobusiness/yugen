import jsPDF from "jspdf";
import autoTable from 'jspdf-autotable';
import { IItineraryActivity } from "@/store/itineraryActivityStore";
import { format } from "date-fns";
import QRCode from 'qrcode';

interface ItineraryDetails {
  city: string;
  country: string;
  fromDate: Date;
  toDate: Date;
  activities: IItineraryActivity[];
  itineraryName?: string;
  createdBy?: string;
  notes?: string;
}

interface PDFExportOptions {
  includeMap: boolean;
  includeQRCodes: boolean;
  includeTravelTimes: boolean;
  includeExpenses: boolean;
  includePhotos: boolean;
  includeContacts: boolean;
  paperSize: 'a4' | 'letter';
  orientation: 'portrait' | 'landscape';
  theme: 'default' | 'minimal' | 'colorful';
}

export class EnhancedPDFExporter {
  private pdf: jsPDF;
  private pageWidth: number;
  private pageHeight: number;
  private margins = { top: 20, right: 20, bottom: 20, left: 20 };
  private contentWidth: number;
  private yPosition: number = 0;
  private currentPage: number = 1;
  private colors = {
    primary: [59, 130, 246], // Blue
    secondary: [107, 114, 128], // Gray
    accent: [16, 185, 129], // Green
    text: [17, 24, 39], // Dark gray
    lightText: [156, 163, 175], // Light gray
    background: [249, 250, 251], // Light background
  };

  constructor(private options: PDFExportOptions) {
    this.pdf = new jsPDF({
      orientation: options.orientation,
      unit: 'mm',
      format: options.paperSize,
    });
    
    this.pageWidth = this.pdf.internal.pageSize.getWidth();
    this.pageHeight = this.pdf.internal.pageSize.getHeight();
    this.contentWidth = this.pageWidth - this.margins.left - this.margins.right;
    this.yPosition = this.margins.top;
  }

  async export(itineraryDetails: ItineraryDetails): Promise<void> {
    try {
      // Add cover page
      await this.addCoverPage(itineraryDetails);
      
      // Add table of contents
      this.addTableOfContents(itineraryDetails);
      
      // Add overview section
      this.addOverviewSection(itineraryDetails);
      
      // Add daily itinerary
      await this.addDailyItinerary(itineraryDetails);
      
      // Add appendices
      if (this.options.includeExpenses) {
        this.addExpensesSummary(itineraryDetails);
      }
      
      if (this.options.includeContacts) {
        this.addContactsSection(itineraryDetails);
      }
      
      // Add footer to all pages
      this.addFooters(itineraryDetails);
      
      // Save the PDF
      this.pdf.save(`${itineraryDetails.itineraryName || itineraryDetails.city}_itinerary.pdf`);
    } catch (error) {
      console.error('Failed to generate PDF:', error);
      throw error;
    }
  }

  private async addCoverPage(details: ItineraryDetails) {
    // Background gradient
    if (this.options.theme === 'colorful') {
      this.addGradientBackground();
    }

    // Title
    this.pdf.setFontSize(36);
    this.pdf.setTextColor(...this.colors.primary);
    this.pdf.text(
      details.itineraryName || `${details.city} Adventure`,
      this.pageWidth / 2,
      this.pageHeight / 3,
      { align: 'center' }
    );

    // Subtitle
    this.yPosition = this.pageHeight / 3 + 20;
    this.pdf.setFontSize(20);
    this.pdf.setTextColor(...this.colors.text);
    this.pdf.text(
      `${details.city}, ${details.country}`,
      this.pageWidth / 2,
      this.yPosition,
      { align: 'center' }
    );

    // Dates
    this.yPosition += 15;
    this.pdf.setFontSize(16);
    this.pdf.setTextColor(...this.colors.secondary);
    const dateRange = `${format(details.fromDate, 'MMMM d, yyyy')} - ${format(details.toDate, 'MMMM d, yyyy')}`;
    this.pdf.text(dateRange, this.pageWidth / 2, this.yPosition, { align: 'center' });

    // Trip duration
    this.yPosition += 10;
    const duration = Math.ceil((details.toDate.getTime() - details.fromDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    this.pdf.setFontSize(14);
    this.pdf.text(`${duration} days`, this.pageWidth / 2, this.yPosition, { align: 'center' });

    // Created by
    if (details.createdBy) {
      this.yPosition = this.pageHeight - 40;
      this.pdf.setFontSize(12);
      this.pdf.text(`Created by: ${details.createdBy}`, this.pageWidth / 2, this.yPosition, { align: 'center' });
    }

    // Generated date
    this.yPosition = this.pageHeight - 30;
    this.pdf.setFontSize(10);
    this.pdf.setTextColor(...this.colors.lightText);
    this.pdf.text(`Generated on ${format(new Date(), 'PPP')}`, this.pageWidth / 2, this.yPosition, { align: 'center' });

    this.addNewPage();
  }

  private addTableOfContents(details: ItineraryDetails) {
    this.pdf.setFontSize(24);
    this.pdf.setTextColor(...this.colors.primary);
    this.pdf.text('Table of Contents', this.margins.left, this.yPosition);
    this.yPosition += 15;

    const sections = [
      { title: 'Trip Overview', page: 3 },
      { title: 'Daily Itinerary', page: 4 },
    ];

    // Add daily sections
    const groupedActivities = this.groupActivitiesByDate(details.activities);
    let pageNum = 5;
    Object.keys(groupedActivities).forEach((date, index) => {
      sections.push({
        title: `Day ${index + 1}: ${format(new Date(date), 'EEEE, MMMM d')}`,
        page: pageNum++,
      });
    });

    if (this.options.includeExpenses) {
      sections.push({ title: 'Expense Summary', page: pageNum++ });
    }

    if (this.options.includeContacts) {
      sections.push({ title: 'Important Contacts', page: pageNum++ });
    }

    // Render TOC
    this.pdf.setFontSize(14);
    sections.forEach((section) => {
      this.pdf.setTextColor(...this.colors.text);
      this.pdf.text(section.title, this.margins.left + 10, this.yPosition);
      
      // Dotted line
      const titleWidth = this.pdf.getTextWidth(section.title);
      const dotsStart = this.margins.left + 10 + titleWidth + 5;
      const dotsEnd = this.pageWidth - this.margins.right - 20;
      
      this.pdf.setLineDashPattern([1, 1], 0);
      this.pdf.line(dotsStart, this.yPosition - 1, dotsEnd, this.yPosition - 1);
      this.pdf.setLineDashPattern([], 0);
      
      // Page number
      this.pdf.text(section.page.toString(), this.pageWidth - this.margins.right - 10, this.yPosition);
      
      this.yPosition += 10;
    });

    this.addNewPage();
  }

  private addOverviewSection(details: ItineraryDetails) {
    this.pdf.setFontSize(24);
    this.pdf.setTextColor(...this.colors.primary);
    this.pdf.text('Trip Overview', this.margins.left, this.yPosition);
    this.yPosition += 15;

    // Trip stats
    const totalActivities = details.activities.length;
    const uniqueTypes = new Set(details.activities.flatMap(a => a.activity?.types || []));
    const totalDays = Math.ceil((details.toDate.getTime() - details.fromDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    const stats = [
      { label: 'Total Days', value: totalDays.toString() },
      { label: 'Total Activities', value: totalActivities.toString() },
      { label: 'Activity Types', value: uniqueTypes.size.toString() },
      { label: 'Average per Day', value: (totalActivities / totalDays).toFixed(1) },
    ];

    // Create stats grid
    const statWidth = this.contentWidth / 4;
    stats.forEach((stat, index) => {
      const x = this.margins.left + (index * statWidth);
      
      // Box
      this.pdf.setFillColor(...this.colors.background);
      this.pdf.roundedRect(x, this.yPosition, statWidth - 5, 25, 3, 3, 'F');
      
      // Value
      this.pdf.setFontSize(20);
      this.pdf.setTextColor(...this.colors.primary);
      this.pdf.text(stat.value, x + statWidth / 2, this.yPosition + 10, { align: 'center' });
      
      // Label
      this.pdf.setFontSize(12);
      this.pdf.setTextColor(...this.colors.secondary);
      this.pdf.text(stat.label, x + statWidth / 2, this.yPosition + 20, { align: 'center' });
    });

    this.yPosition += 35;

    // Notes section
    if (details.notes) {
      this.pdf.setFontSize(16);
      this.pdf.setTextColor(...this.colors.text);
      this.pdf.text('Notes', this.margins.left, this.yPosition);
      this.yPosition += 8;
      
      this.pdf.setFontSize(12);
      this.pdf.setTextColor(...this.colors.secondary);
      const lines = this.pdf.splitTextToSize(details.notes, this.contentWidth);
      lines.forEach((line: string) => {
        this.pdf.text(line, this.margins.left, this.yPosition);
        this.yPosition += 6;
      });
    }

    this.addNewPage();
  }

  private async addDailyItinerary(details: ItineraryDetails) {
    const groupedActivities = this.groupActivitiesByDate(details.activities);
    const dates = Object.keys(groupedActivities).sort();

    for (let dayIndex = 0; dayIndex < dates.length; dayIndex++) {
      const date = dates[dayIndex];
      const activities = groupedActivities[date];
      
      // Day header
      this.pdf.setFillColor(...this.colors.primary);
      this.pdf.rect(0, this.yPosition - 5, this.pageWidth, 20, 'F');
      
      this.pdf.setFontSize(18);
      this.pdf.setTextColor(255, 255, 255);
      this.pdf.text(
        `Day ${dayIndex + 1}: ${format(new Date(date), 'EEEE, MMMM d, yyyy')}`,
        this.margins.left,
        this.yPosition + 5
      );
      
      this.yPosition += 25;

      // Activities for the day
      for (const activity of activities) {
        if (this.checkPageBreak(60)) {
          this.addNewPage();
        }

        await this.addActivityEntry(activity);
      }

      // Add some space before next day
      this.yPosition += 10;
    }
  }

  private async addActivityEntry(activity: IItineraryActivity) {
    const startY = this.yPosition;
    
    // Time column
    const timeColumnWidth = 50;
    if (activity.start_time) {
      this.pdf.setFontSize(14);
      this.pdf.setTextColor(...this.colors.primary);
      this.pdf.text(this.formatTime(activity.start_time), this.margins.left, this.yPosition);
      
      if (activity.end_time) {
        this.yPosition += 6;
        this.pdf.setFontSize(12);
        this.pdf.text(`to ${this.formatTime(activity.end_time)}`, this.margins.left, this.yPosition);
        
        // Duration
        const duration = this.calculateDuration(activity.start_time, activity.end_time);
        this.yPosition += 5;
        this.pdf.setFontSize(10);
        this.pdf.setTextColor(...this.colors.lightText);
        this.pdf.text(duration, this.margins.left, this.yPosition);
      }
    }

    // Reset Y position for content column
    this.yPosition = startY;
    const contentX = this.margins.left + timeColumnWidth;
    const contentWidth = this.contentWidth - timeColumnWidth - 10;

    // Activity name
    this.pdf.setFontSize(16);
    this.pdf.setTextColor(...this.colors.text);
    this.pdf.text(activity.activity?.name || 'Unnamed Activity', contentX, this.yPosition);
    this.yPosition += 8;

    // Location
    if (activity.activity?.address) {
      this.pdf.setFontSize(12);
      this.pdf.setTextColor(...this.colors.secondary);
      const addressLines = this.pdf.splitTextToSize(activity.activity.address, contentWidth);
      addressLines.forEach((line: string) => {
        this.pdf.text(line, contentX, this.yPosition);
        this.yPosition += 5;
      });
    }

    // Activity details in a grid
    const details = [];
    if (activity.activity?.rating) {
      details.push(`⭐ ${activity.activity.rating}/5`);
    }
    if (activity.activity?.price_level) {
      details.push(`💰 ${'$'.repeat(parseInt(activity.activity.price_level))}`);
    }
    if (activity.activity?.phone_number) {
      details.push(`📞 ${activity.activity.phone_number}`);
    }

    if (details.length > 0) {
      this.yPosition += 3;
      this.pdf.setFontSize(10);
      this.pdf.setTextColor(...this.colors.secondary);
      this.pdf.text(details.join('  •  '), contentX, this.yPosition);
      this.yPosition += 6;
    }

    // Notes
    if (activity.notes) {
      this.pdf.setFontSize(11);
      this.pdf.setTextColor(...this.colors.text);
      this.pdf.setFont(undefined, 'italic');
      const noteLines = this.pdf.splitTextToSize(activity.notes, contentWidth);
      noteLines.forEach((line: string) => {
        this.pdf.text(line, contentX, this.yPosition);
        this.yPosition += 5;
      });
      this.pdf.setFont(undefined, 'normal');
    }

    // QR Code
    if (this.options.includeQRCodes && activity.activity?.google_maps_url) {
      try {
        const qrDataUrl = await QRCode.toDataURL(activity.activity.google_maps_url, {
          width: 60,
          margin: 0,
        });
        this.pdf.addImage(qrDataUrl, 'PNG', this.pageWidth - this.margins.right - 25, startY, 25, 25);
      } catch (error) {
        console.error('Failed to generate QR code:', error);
      }
    }

    // Add separator line
    this.yPosition += 8;
    this.pdf.setDrawColor(...this.colors.lightText);
    this.pdf.setLineWidth(0.1);
    this.pdf.line(this.margins.left, this.yPosition, this.pageWidth - this.margins.right, this.yPosition);
    this.yPosition += 8;
  }

  private addExpensesSummary(details: ItineraryDetails) {
    this.addNewPage();
    
    this.pdf.setFontSize(24);
    this.pdf.setTextColor(...this.colors.primary);
    this.pdf.text('Expense Summary', this.margins.left, this.yPosition);
    this.yPosition += 15;

    // Calculate expenses by category
    const expenses: { [key: string]: number } = {};
    let totalExpense = 0;

    details.activities.forEach(activity => {
      const category = activity.activity?.types?.[0] || 'Other';
      const estimatedCost = this.estimateActivityCost(activity);
      
      if (!expenses[category]) {
        expenses[category] = 0;
      }
      expenses[category] += estimatedCost;
      totalExpense += estimatedCost;
    });

    // Create expense table
    const tableData = Object.entries(expenses).map(([category, amount]) => [
      this.formatCategoryName(category),
      `$${amount.toFixed(2)}`,
      `${((amount / totalExpense) * 100).toFixed(1)}%`
    ]);

    autoTable(this.pdf, {
      head: [['Category', 'Amount', 'Percentage']],
      body: tableData,
      foot: [['Total', `$${totalExpense.toFixed(2)}`, '100%']],
      startY: this.yPosition,
      theme: 'striped',
      headStyles: { fillColor: this.colors.primary },
      footStyles: { fillColor: this.colors.secondary, fontStyle: 'bold' },
    });
  }

  private addContactsSection(details: ItineraryDetails) {
    this.addNewPage();
    
    this.pdf.setFontSize(24);
    this.pdf.setTextColor(...this.colors.primary);
    this.pdf.text('Important Contacts', this.margins.left, this.yPosition);
    this.yPosition += 15;

    const contacts = details.activities
      .filter(a => a.activity?.phone_number || a.activity?.website_url)
      .map(a => ({
        name: a.activity?.name || '',
        phone: a.activity?.phone_number || '',
        website: a.activity?.website_url || '',
        address: a.activity?.address || '',
      }));

    if (contacts.length === 0) {
      this.pdf.setFontSize(12);
      this.pdf.setTextColor(...this.colors.secondary);
      this.pdf.text('No contact information available.', this.margins.left, this.yPosition);
      return;
    }

    contacts.forEach(contact => {
      this.pdf.setFontSize(14);
      this.pdf.setTextColor(...this.colors.text);
      this.pdf.text(contact.name, this.margins.left, this.yPosition);
      this.yPosition += 6;

      if (contact.phone) {
        this.pdf.setFontSize(12);
        this.pdf.setTextColor(...this.colors.secondary);
        this.pdf.text(`Phone: ${contact.phone}`, this.margins.left + 10, this.yPosition);
        this.yPosition += 5;
      }

      if (contact.website) {
        this.pdf.setFontSize(12);
        this.pdf.setTextColor(...this.colors.primary);
        this.pdf.textWithLink('Website', this.margins.left + 10, this.yPosition, { url: contact.website });
        this.yPosition += 5;
      }

      if (contact.address) {
        this.pdf.setFontSize(11);
        this.pdf.setTextColor(...this.colors.secondary);
        const addressLines = this.pdf.splitTextToSize(contact.address, this.contentWidth - 10);
        addressLines.forEach((line: string) => {
          this.pdf.text(line, this.margins.left + 10, this.yPosition);
          this.yPosition += 4;
        });
      }

      this.yPosition += 8;
    });
  }

  private addFooters(details: ItineraryDetails) {
    const totalPages = this.pdf.getNumberOfPages();
    
    for (let i = 1; i <= totalPages; i++) {
      this.pdf.setPage(i);
      
      // Skip cover page
      if (i === 1) continue;
      
      // Page number
      this.pdf.setFontSize(10);
      this.pdf.setTextColor(...this.colors.lightText);
      this.pdf.text(
        `Page ${i} of ${totalPages}`,
        this.pageWidth / 2,
        this.pageHeight - 10,
        { align: 'center' }
      );
      
      // Itinerary name
      this.pdf.setFontSize(9);
      this.pdf.text(
        details.itineraryName || `${details.city} Itinerary`,
        this.margins.left,
        this.pageHeight - 10
      );
      
      // Date
      this.pdf.text(
        format(new Date(), 'MMM d, yyyy'),
        this.pageWidth - this.margins.right,
        this.pageHeight - 10,
        { align: 'right' }
      );
    }
  }

  // Helper methods
  private addNewPage() {
    this.pdf.addPage();
    this.currentPage++;
    this.yPosition = this.margins.top;
  }

  private checkPageBreak(requiredSpace: number): boolean {
    return this.yPosition + requiredSpace > this.pageHeight - this.margins.bottom;
  }

  private addGradientBackground() {
    // Simple gradient effect using rectangles
    const steps = 10;
    const stepHeight = this.pageHeight / steps;
    
    for (let i = 0; i < steps; i++) {
      const opacity = 1 - (i / steps) * 0.9;
      this.pdf.setFillColor(
        this.colors.primary[0],
        this.colors.primary[1],
        this.colors.primary[2]
      );
      this.pdf.setGState(new this.pdf.GState({ opacity }));
      this.pdf.rect(0, i * stepHeight, this.pageWidth, stepHeight, 'F');
    }
    
    this.pdf.setGState(new this.pdf.GState({ opacity: 1 }));
  }

  private formatTime(time: string): string {
    const [hours, minutes] = time.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
  }

  private calculateDuration(startTime: string, endTime: string): string {
    const [startHours, startMinutes] = startTime.split(':').map(Number);
    const [endHours, endMinutes] = endTime.split(':').map(Number);
    
    let totalMinutes = (endHours * 60 + endMinutes) - (startHours * 60 + startMinutes);
    if (totalMinutes < 0) totalMinutes += 24 * 60;
    
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    
    if (hours === 0) return `${minutes}min`;
    if (minutes === 0) return `${hours}h`;
    return `${hours}h ${minutes}min`;
  }

  private groupActivitiesByDate(activities: IItineraryActivity[]) {
    return activities.reduce((groups: { [key: string]: IItineraryActivity[] }, activity) => {
      const date = activity.date;
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(activity);
      return groups;
    }, {});
  }

  private estimateActivityCost(activity: IItineraryActivity): number {
    const priceLevel = parseInt(activity.activity?.price_level || '0');
    const basePrice = [0, 15, 30, 60, 100];
    return basePrice[priceLevel] || 0;
  }

  private formatCategoryName(category: string): string {
    return category
      .replace(/_/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
}

// Export function for backward compatibility
export const exportToPDF = async (
  itineraryDetails: ItineraryDetails,
  options?: Partial<PDFExportOptions>
) => {
  const defaultOptions: PDFExportOptions = {
    includeMap: true,
    includeQRCodes: true,
    includeTravelTimes: true,
    includeExpenses: true,
    includePhotos: false,
    includeContacts: true,
    paperSize: 'a4',
    orientation: 'portrait',
    theme: 'default',
  };

  const exporter = new EnhancedPDFExporter({ ...defaultOptions, ...options });
  await exporter.export(itineraryDetails);
};