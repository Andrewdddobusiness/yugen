import { IItineraryActivity } from "@/store/itineraryActivityStore";
import { format } from "date-fns";

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

interface TextExportOptions {
  format: 'markdown' | 'plain' | 'rich';
  includeMetadata: boolean;
  includeContacts: boolean;
  includeStatistics: boolean;
  includeMap: boolean;
  bulletStyle: 'dash' | 'asterisk' | 'number';
}

export class TextMarkdownExporter {
  constructor(private options: TextExportOptions) {}

  export(details: ItineraryDetails): void {
    let content = '';

    switch (this.options.format) {
      case 'markdown':
        content = this.generateMarkdown(details);
        this.downloadFile(content, `${details.itineraryName || details.city}_itinerary.md`, 'text/markdown');
        break;
      case 'plain':
        content = this.generatePlainText(details);
        this.downloadFile(content, `${details.itineraryName || details.city}_itinerary.txt`, 'text/plain');
        break;
      case 'rich':
        content = this.generateRichText(details);
        this.downloadFile(content, `${details.itineraryName || details.city}_itinerary.rtf`, 'text/rtf');
        break;
    }
  }

  private generateMarkdown(details: ItineraryDetails): string {
    const lines: string[] = [];

    // Title
    lines.push(`# ${details.itineraryName || `${details.city} Travel Itinerary`}`);
    lines.push('');

    // Subtitle
    lines.push(`## ${details.city}, ${details.country}`);
    lines.push(`**${format(details.fromDate, 'MMMM d')} - ${format(details.toDate, 'MMMM d, yyyy')}**`);
    lines.push('');

    // Metadata
    if (this.options.includeMetadata) {
      const duration = Math.ceil((details.toDate.getTime() - details.fromDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      const totalActivities = details.activities.length;
      
      lines.push('## Trip Overview');
      lines.push('');
      lines.push(`- **Duration:** ${duration} days`);
      lines.push(`- **Total Activities:** ${totalActivities}`);
      lines.push(`- **Average per Day:** ${(totalActivities / duration).toFixed(1)} activities`);
      
      if (details.createdBy) {
        lines.push(`- **Created by:** ${details.createdBy}`);
      }
      lines.push(`- **Generated:** ${format(new Date(), 'PPP')}`);
      lines.push('');

      if (details.notes) {
        lines.push('### Notes');
        lines.push(details.notes);
        lines.push('');
      }
    }

    // Statistics
    if (this.options.includeStatistics) {
      lines.push(...this.generateStatisticsMarkdown(details));
    }

    // Table of Contents
    const groupedActivities = this.groupActivitiesByDate(details.activities);
    if (Object.keys(groupedActivities).length > 1) {
      lines.push('## Table of Contents');
      lines.push('');
      
      Object.keys(groupedActivities).sort().forEach((date, index) => {
        const dayNum = index + 1;
        const dayName = format(new Date(date), 'EEEE, MMMM d');
        lines.push(`${dayNum}. [Day ${dayNum}: ${dayName}](#day-${dayNum}-${format(new Date(date), 'MMMM-d').toLowerCase()})`);
      });
      lines.push('');
    }

    // Daily itinerary
    lines.push('## Daily Itinerary');
    lines.push('');

    Object.entries(groupedActivities).sort().forEach(([date, activities], dayIndex) => {
      const dayNum = dayIndex + 1;
      const dayName = format(new Date(date), 'EEEE, MMMM d');
      
      // Day header
      lines.push(`### Day ${dayNum}: ${dayName}`);
      lines.push('');

      // Sort activities by time
      const sortedActivities = activities.sort((a, b) => 
        (a.start_time || '00:00').localeCompare(b.start_time || '00:00')
      );

      sortedActivities.forEach((activity, actIndex) => {
        lines.push(...this.formatActivityMarkdown(activity, actIndex));
      });

      // Day summary
      const dayStats = this.calculateDayStats(activities);
      if (dayStats.totalDuration > 0) {
        lines.push('---');
        lines.push(`**Day ${dayNum} Summary:** ${activities.length} activities, ${dayStats.totalDuration} minutes total`);
        lines.push('');
      }

      lines.push('');
    });

    // Contacts section
    if (this.options.includeContacts) {
      lines.push(...this.generateContactsMarkdown(details));
    }

    return lines.join('\n');
  }

  private generatePlainText(details: ItineraryDetails): string {
    const lines: string[] = [];
    const separator = '=' .repeat(60);
    const minorSeparator = '-'.repeat(40);

    // Title
    lines.push(separator);
    lines.push((details.itineraryName || `${details.city} TRAVEL ITINERARY`).toUpperCase());
    lines.push(separator);
    lines.push('');

    // Subtitle
    lines.push(`${details.city}, ${details.country}`);
    lines.push(`${format(details.fromDate, 'MMMM d')} - ${format(details.toDate, 'MMMM d, yyyy')}`);
    lines.push('');

    // Metadata
    if (this.options.includeMetadata) {
      const duration = Math.ceil((details.toDate.getTime() - details.fromDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      
      lines.push('TRIP OVERVIEW');
      lines.push(minorSeparator);
      lines.push(`Duration: ${duration} days`);
      lines.push(`Total Activities: ${details.activities.length}`);
      lines.push(`Average per Day: ${(details.activities.length / duration).toFixed(1)} activities`);
      
      if (details.createdBy) {
        lines.push(`Created by: ${details.createdBy}`);
      }
      lines.push(`Generated: ${format(new Date(), 'PPP')}`);
      lines.push('');

      if (details.notes) {
        lines.push('NOTES:');
        lines.push(this.wrapText(details.notes, 70));
        lines.push('');
      }
    }

    // Daily itinerary
    lines.push('DAILY ITINERARY');
    lines.push(separator);
    lines.push('');

    const groupedActivities = this.groupActivitiesByDate(details.activities);
    
    Object.entries(groupedActivities).sort().forEach(([date, activities], dayIndex) => {
      const dayNum = dayIndex + 1;
      const dayName = format(new Date(date), 'EEEE, MMMM d, yyyy');
      
      // Day header
      lines.push(`DAY ${dayNum}: ${dayName.toUpperCase()}`);
      lines.push(minorSeparator);

      // Sort activities by time
      const sortedActivities = activities.sort((a, b) => 
        (a.start_time || '00:00').localeCompare(b.start_time || '00:00')
      );

      sortedActivities.forEach((activity, actIndex) => {
        lines.push(...this.formatActivityPlainText(activity, actIndex));
      });

      lines.push('');
    });

    // Contacts
    if (this.options.includeContacts) {
      lines.push(...this.generateContactsPlainText(details));
    }

    return lines.join('\n');
  }

  private generateRichText(details: ItineraryDetails): string {
    // RTF format with basic styling
    const rtfHeader = `{\\rtf1\\ansi\\deff0 {\\fonttbl {\\f0 Times New Roman;}{\\f1 Arial;}}`;
    const rtfStyles = `{\\colortbl;\\red0\\green0\\blue0;\\red25\\green111\\blue208;\\red220\\green20\\blue60;}`;
    
    let content = rtfHeader + rtfStyles;

    // Title
    content += `\\f1\\fs28\\b\\cf2 ${details.itineraryName || `${details.city} Travel Itinerary`}\\par\\par`;
    content += `\\f0\\fs20\\b0\\cf1 ${details.city}, ${details.country}\\par`;
    content += `${format(details.fromDate, 'MMMM d')} - ${format(details.toDate, 'MMMM d, yyyy')}\\par\\par`;

    // Daily activities
    const groupedActivities = this.groupActivitiesByDate(details.activities);
    
    Object.entries(groupedActivities).sort().forEach(([date, activities], dayIndex) => {
      const dayNum = dayIndex + 1;
      const dayName = format(new Date(date), 'EEEE, MMMM d');
      
      // Day header
      content += `\\f1\\fs24\\b\\cf2 Day ${dayNum}: ${dayName}\\par\\par`;
      
      const sortedActivities = activities.sort((a, b) => 
        (a.start_time || '00:00').localeCompare(b.start_time || '00:00')
      );

      sortedActivities.forEach(activity => {
        content += `\\f0\\fs18\\b ${activity.activity?.name || 'Unnamed Activity'}\\par`;
        
        if (activity.start_time) {
          content += `\\b0 ${this.formatTime(activity.start_time)}`;
          if (activity.end_time) {
            content += ` - ${this.formatTime(activity.end_time)}`;
          }
          content += '\\par';
        }
        
        if (activity.activity?.address) {
          content += `\\i ${activity.activity.address}\\i0\\par`;
        }
        
        if (activity.notes) {
          content += `${activity.notes}\\par`;
        }
        
        content += '\\par';
      });
    });

    content += '}';
    return content;
  }

  private formatActivityMarkdown(activity: IItineraryActivity, index: number): string[] {
    const lines: string[] = [];
    const bullet = this.getBulletStyle(index);

    // Activity name with time
    let activityLine = `${bullet} **${activity.activity?.name || 'Unnamed Activity'}**`;
    
    if (activity.start_time) {
      activityLine += ` *(${this.formatTime(activity.start_time)}`;
      if (activity.end_time) {
        activityLine += ` - ${this.formatTime(activity.end_time)}`;
      }
      activityLine += ')*';
    }
    
    lines.push(activityLine);

    // Location
    if (activity.activity?.address) {
      lines.push(`  📍 ${activity.activity.address}`);
    }

    // Details
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
      lines.push(`  ${details.join(' • ')}`);
    }

    // Notes
    if (activity.notes) {
      lines.push(`  > ${activity.notes}`);
    }

    // Links
    const links = [];
    if (activity.activity?.google_maps_url) {
      links.push(`[📍 Maps](${activity.activity.google_maps_url})`);
    }
    if (activity.activity?.website_url) {
      links.push(`[🌐 Website](${activity.activity.website_url})`);
    }

    if (links.length > 0) {
      lines.push(`  ${links.join(' • ')}`);
    }

    lines.push(''); // Empty line between activities
    return lines;
  }

  private formatActivityPlainText(activity: IItineraryActivity, index: number): string[] {
    const lines: string[] = [];
    const indent = '  ';

    // Activity header
    let header = `${index + 1}. ${activity.activity?.name || 'Unnamed Activity'}`;
    
    if (activity.start_time) {
      header += ` (${this.formatTime(activity.start_time)}`;
      if (activity.end_time) {
        header += ` - ${this.formatTime(activity.end_time)}`;
      }
      header += ')';
    }
    
    lines.push(header);

    // Location
    if (activity.activity?.address) {
      lines.push(`${indent}Location: ${activity.activity.address}`);
    }

    // Details
    if (activity.activity?.rating) {
      lines.push(`${indent}Rating: ${activity.activity.rating}/5 stars`);
    }
    if (activity.activity?.price_level) {
      lines.push(`${indent}Price Level: ${'$'.repeat(parseInt(activity.activity.price_level))}`);
    }
    if (activity.activity?.phone_number) {
      lines.push(`${indent}Phone: ${activity.activity.phone_number}`);
    }

    // Notes
    if (activity.notes) {
      lines.push(`${indent}Notes: ${activity.notes}`);
    }

    lines.push(''); // Empty line between activities
    return lines;
  }

  private generateStatisticsMarkdown(details: ItineraryDetails): string[] {
    const lines: string[] = [];
    const stats = this.calculateStatistics(details);

    lines.push('### Statistics');
    lines.push('');

    // Category breakdown
    if (Object.keys(stats.categories).length > 0) {
      lines.push('#### Activities by Category');
      lines.push('');
      
      Object.entries(stats.categories)
        .sort(([,a], [,b]) => b - a)
        .forEach(([category, count]) => {
          const percentage = ((count / stats.totalActivities) * 100).toFixed(1);
          lines.push(`- **${this.formatCategory(category)}**: ${count} activities (${percentage}%)`);
        });
      
      lines.push('');
    }

    // Time distribution
    lines.push('#### Time Distribution');
    lines.push('');
    lines.push(`- **Morning** (6 AM - 12 PM): ${stats.timeDistribution.morning} activities`);
    lines.push(`- **Afternoon** (12 PM - 6 PM): ${stats.timeDistribution.afternoon} activities`);
    lines.push(`- **Evening** (6 PM - 12 AM): ${stats.timeDistribution.evening} activities`);
    lines.push('');

    return lines;
  }

  private generateContactsMarkdown(details: ItineraryDetails): string[] {
    const lines: string[] = [];
    
    const contacts = details.activities.filter(a => 
      a.activity?.phone_number || a.activity?.website_url
    );

    if (contacts.length === 0) return lines;

    lines.push('## Important Contacts');
    lines.push('');

    contacts.forEach(activity => {
      lines.push(`### ${activity.activity?.name || 'Unnamed Activity'}`);
      
      if (activity.activity?.address) {
        lines.push(`📍 ${activity.activity.address}`);
      }
      if (activity.activity?.phone_number) {
        lines.push(`📞 [${activity.activity.phone_number}](tel:${activity.activity.phone_number})`);
      }
      if (activity.activity?.website_url) {
        lines.push(`🌐 [Website](${activity.activity.website_url})`);
      }
      
      lines.push('');
    });

    return lines;
  }

  private generateContactsPlainText(details: ItineraryDetails): string[] {
    const lines: string[] = [];
    const separator = '-'.repeat(40);
    
    const contacts = details.activities.filter(a => 
      a.activity?.phone_number || a.activity?.website_url
    );

    if (contacts.length === 0) return lines;

    lines.push('IMPORTANT CONTACTS');
    lines.push(separator);
    lines.push('');

    contacts.forEach((activity, index) => {
      lines.push(`${index + 1}. ${activity.activity?.name || 'Unnamed Activity'}`);
      
      if (activity.activity?.address) {
        lines.push(`   Location: ${activity.activity.address}`);
      }
      if (activity.activity?.phone_number) {
        lines.push(`   Phone: ${activity.activity.phone_number}`);
      }
      if (activity.activity?.website_url) {
        lines.push(`   Website: ${activity.activity.website_url}`);
      }
      
      lines.push('');
    });

    return lines;
  }

  // Helper methods
  private getBulletStyle(index: number): string {
    switch (this.options.bulletStyle) {
      case 'dash': return '-';
      case 'asterisk': return '*';
      case 'number': return `${index + 1}.`;
      default: return '-';
    }
  }

  private formatTime(time: string): string {
    const [hours, minutes] = time.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
  }

  private formatCategory(category: string): string {
    return category
      .replace(/_/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
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

  private calculateDayStats(activities: IItineraryActivity[]) {
    let totalDuration = 0;
    
    activities.forEach(activity => {
      if (activity.start_time && activity.end_time) {
        totalDuration += this.calculateDurationMinutes(activity.start_time, activity.end_time);
      }
    });

    return { totalDuration };
  }

  private calculateDurationMinutes(startTime: string, endTime: string): number {
    const [startHours, startMinutes] = startTime.split(':').map(Number);
    const [endHours, endMinutes] = endTime.split(':').map(Number);
    
    const startTotalMinutes = startHours * 60 + startMinutes;
    const endTotalMinutes = endHours * 60 + endMinutes;
    
    let duration = endTotalMinutes - startTotalMinutes;
    if (duration < 0) duration += 24 * 60;
    
    return duration;
  }

  private calculateStatistics(details: ItineraryDetails) {
    const categories: { [key: string]: number } = {};
    const timeDistribution = { morning: 0, afternoon: 0, evening: 0 };

    details.activities.forEach(activity => {
      // Category count
      const category = activity.activity?.types?.[0] || 'other';
      categories[category] = (categories[category] || 0) + 1;

      // Time distribution
      if (activity.start_time) {
        const hour = parseInt(activity.start_time.split(':')[0]);
        if (hour >= 6 && hour < 12) timeDistribution.morning++;
        else if (hour >= 12 && hour < 18) timeDistribution.afternoon++;
        else timeDistribution.evening++;
      }
    });

    return {
      totalActivities: details.activities.length,
      categories,
      timeDistribution,
    };
  }

  private wrapText(text: string, width: number): string {
    const words = text.split(' ');
    const lines = [];
    let currentLine = '';

    words.forEach(word => {
      if ((currentLine + word).length <= width) {
        currentLine += (currentLine ? ' ' : '') + word;
      } else {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      }
    });

    if (currentLine) lines.push(currentLine);
    return lines.join('\n');
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

// Export functions for backward compatibility
export const exportToMarkdown = (details: ItineraryDetails, options?: Partial<TextExportOptions>) => {
  const defaultOptions: TextExportOptions = {
    format: 'markdown',
    includeMetadata: true,
    includeContacts: true,
    includeStatistics: true,
    includeMap: false,
    bulletStyle: 'dash',
  };

  const exporter = new TextMarkdownExporter({ ...defaultOptions, ...options });
  exporter.export(details);
};

export const exportToPlainText = (details: ItineraryDetails, options?: Partial<TextExportOptions>) => {
  const defaultOptions: TextExportOptions = {
    format: 'plain',
    includeMetadata: true,
    includeContacts: true,
    includeStatistics: false,
    includeMap: false,
    bulletStyle: 'number',
  };

  const exporter = new TextMarkdownExporter({ ...defaultOptions, ...options });
  exporter.export(details);
};

export const exportToRichText = (details: ItineraryDetails, options?: Partial<TextExportOptions>) => {
  const defaultOptions: TextExportOptions = {
    format: 'rich',
    includeMetadata: true,
    includeContacts: true,
    includeStatistics: false,
    includeMap: false,
    bulletStyle: 'dash',
  };

  const exporter = new TextMarkdownExporter({ ...defaultOptions, ...options });
  exporter.export(details);
};