import * as XLSX from "xlsx";
import { format, differenceInMinutes } from "date-fns";
import { IItineraryActivity } from "@/store/itineraryActivityStore";

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

interface ExcelExportOptions {
  includeExpenses: boolean;
  includeTravelTimes: boolean;
  includeStatistics: boolean;
  includeContacts: boolean;
  separateSheets: boolean;
  includePhotos: boolean;
}

export class EnhancedExcelExporter {
  private workbook: XLSX.WorkBook;
  private options: ExcelExportOptions;

  constructor(options: ExcelExportOptions) {
    this.workbook = XLSX.utils.book_new();
    this.options = options;
  }

  export(itineraryDetails: ItineraryDetails): void {
    try {
      // Main itinerary sheet
      this.addItinerarySheet(itineraryDetails);
      
      // Additional sheets based on options
      if (this.options.separateSheets) {
        this.addDailySheets(itineraryDetails);
      }
      
      if (this.options.includeExpenses) {
        this.addExpensesSheet(itineraryDetails);
      }
      
      if (this.options.includeTravelTimes) {
        this.addTravelTimesSheet(itineraryDetails);
      }
      
      if (this.options.includeStatistics) {
        this.addStatisticsSheet(itineraryDetails);
      }
      
      if (this.options.includeContacts) {
        this.addContactsSheet(itineraryDetails);
      }
      
      // Save the workbook
      XLSX.writeFile(this.workbook, `${itineraryDetails.itineraryName || itineraryDetails.city}_detailed_itinerary.xlsx`);
    } catch (error) {
      console.error('Failed to generate Excel export:', error);
      throw error;
    }
  }

  private addItinerarySheet(details: ItineraryDetails) {
    const worksheet = XLSX.utils.json_to_sheet([]);
    
    // Header section
    const headerData = [
      [details.itineraryName || `${details.city}, ${details.country} Itinerary`],
      [`Destination: ${details.city}, ${details.country}`],
      [`Dates: ${format(details.fromDate, 'PPP')} - ${format(details.toDate, 'PPP')}`],
      [`Total Days: ${Math.ceil((details.toDate.getTime() - details.fromDate.getTime()) / (1000 * 60 * 60 * 24)) + 1}`],
      [`Total Activities: ${details.activities.length}`],
      details.createdBy ? [`Created by: ${details.createdBy}`] : [],
      [`Generated: ${format(new Date(), 'PPP')}`],
      [], // Empty row
    ].filter(row => row.length > 0);

    XLSX.utils.sheet_add_aoa(worksheet, headerData, { origin: 'A1' });

    // Activities data
    const activitiesData = details.activities
      .filter(activity => !activity.deleted_at)
      .map((activity, index) => ({
        '#': index + 1,
        'Date': activity.date ? format(new Date(activity.date), 'yyyy-MM-dd') : '',
        'Day': activity.date ? format(new Date(activity.date), 'EEEE') : '',
        'Start Time': activity.start_time || '',
        'End Time': activity.end_time || '',
        'Duration (min)': activity.start_time && activity.end_time 
          ? this.calculateDurationMinutes(activity.start_time, activity.end_time)
          : '',
        'Activity Name': activity.activity?.name || '',
        'Category': this.formatCategory(activity.activity?.types?.[0] || ''),
        'Description': activity.activity?.description || '',
        'Address': activity.activity?.address || '',
        'Phone': activity.activity?.phone_number || '',
        'Website': activity.activity?.website_url || '',
        'Rating': activity.activity?.rating || '',
        'Price Level': this.formatPriceLevel(activity.activity?.price_level),
        'Google Maps': activity.activity?.google_maps_url || '',
        'Coordinates': activity.activity?.coordinates 
          ? `${activity.activity.coordinates[1]}, ${activity.activity.coordinates[0]}`
          : '',
        'Notes': activity.notes || '',
        'Estimated Cost': this.estimateActivityCost(activity),
      }));

    // Add activities starting after header
    const startRow = headerData.length + 1;
    XLSX.utils.sheet_add_json(worksheet, activitiesData, {
      origin: `A${startRow}`,
      skipHeader: false,
    });

    // Apply formatting
    this.applyWorksheetFormatting(worksheet, activitiesData.length + startRow);
    
    XLSX.utils.book_append_sheet(this.workbook, worksheet, 'Itinerary');
  }

  private addDailySheets(details: ItineraryDetails) {
    const groupedActivities = this.groupActivitiesByDate(details.activities);
    
    Object.entries(groupedActivities).forEach(([date, activities], dayIndex) => {
      const worksheet = XLSX.utils.json_to_sheet([]);
      
      // Day header
      const dayHeader = [
        [`Day ${dayIndex + 1}: ${format(new Date(date), 'EEEE, MMMM d, yyyy')}`],
        [`Total Activities: ${activities.length}`],
        [`Total Duration: ${this.calculateTotalDayDuration(activities)} minutes`],
        [], // Empty row
      ];
      
      XLSX.utils.sheet_add_aoa(worksheet, dayHeader, { origin: 'A1' });

      // Activities for the day
      const dayActivities = activities.map((activity, index) => ({
        'Time': activity.start_time || '',
        'Activity': activity.activity?.name || '',
        'Duration': activity.start_time && activity.end_time 
          ? `${this.calculateDurationMinutes(activity.start_time, activity.end_time)} min`
          : '',
        'Location': activity.activity?.address || '',
        'Category': this.formatCategory(activity.activity?.types?.[0] || ''),
        'Rating': activity.activity?.rating || '',
        'Cost': this.estimateActivityCost(activity),
        'Notes': activity.notes || '',
      }));

      XLSX.utils.sheet_add_json(worksheet, dayActivities, {
        origin: 'A5',
        skipHeader: false,
      });

      const sheetName = `Day ${dayIndex + 1} - ${format(new Date(date), 'MMM d')}`;
      XLSX.utils.book_append_sheet(this.workbook, worksheet, sheetName);
    });
  }

  private addExpensesSheet(details: ItineraryDetails) {
    const worksheet = XLSX.utils.json_to_sheet([]);
    
    // Header
    const header = [
      ['Expense Analysis'],
      [`Generated: ${format(new Date(), 'PPP')}`],
      [],
    ];
    
    XLSX.utils.sheet_add_aoa(worksheet, header, { origin: 'A1' });

    // Calculate expenses by category
    const expensesByCategory = this.calculateExpensesByCategory(details.activities);
    const categoryData = Object.entries(expensesByCategory).map(([category, data]) => ({
      'Category': this.formatCategory(category),
      'Activities': data.count,
      'Total Cost': data.total,
      'Average Cost': Math.round(data.total / data.count),
      'Percentage': `${((data.total / data.grandTotal) * 100).toFixed(1)}%`,
    }));

    XLSX.utils.sheet_add_json(worksheet, categoryData, {
      origin: 'A4',
      skipHeader: false,
    });

    // Daily expenses
    const dailyExpenses = this.calculateDailyExpenses(details.activities);
    const dailyData = Object.entries(dailyExpenses).map(([date, amount]) => ({
      'Date': format(new Date(date), 'yyyy-MM-dd'),
      'Day': format(new Date(date), 'EEEE'),
      'Total Cost': amount,
    }));

    // Add daily expenses section
    const dailyStartRow = categoryData.length + 7;
    XLSX.utils.sheet_add_aoa(worksheet, [['Daily Expenses']], { origin: `A${dailyStartRow}` });
    XLSX.utils.sheet_add_json(worksheet, dailyData, {
      origin: `A${dailyStartRow + 1}`,
      skipHeader: false,
    });

    XLSX.utils.book_append_sheet(this.workbook, worksheet, 'Expenses');
  }

  private addTravelTimesSheet(details: ItineraryDetails) {
    const worksheet = XLSX.utils.json_to_sheet([]);
    
    // Header
    const header = [
      ['Travel Times Analysis'],
      [`Generated: ${format(new Date(), 'PPP')}`],
      [],
    ];
    
    XLSX.utils.sheet_add_aoa(worksheet, header, { origin: 'A1' });

    // Calculate travel times between consecutive activities
    const travelData: any[] = [];
    const groupedActivities = this.groupActivitiesByDate(details.activities);
    
    Object.entries(groupedActivities).forEach(([date, activities]) => {
      activities.sort((a, b) => (a.start_time || '').localeCompare(b.start_time || ''));
      
      for (let i = 0; i < activities.length - 1; i++) {
        const from = activities[i];
        const to = activities[i + 1];
        
        if (from.activity?.coordinates && to.activity?.coordinates) {
          const distance = this.calculateDistance(from.activity.coordinates, to.activity.coordinates);
          const estimatedTime = this.estimateTravelTime(distance);
          
          travelData.push({
            'Date': format(new Date(date), 'yyyy-MM-dd'),
            'From': from.activity?.name || '',
            'From Time': from.end_time || from.start_time || '',
            'To': to.activity?.name || '',
            'To Time': to.start_time || '',
            'Distance (km)': (distance / 1000).toFixed(2),
            'Est. Travel Time (min)': estimatedTime,
            'Available Time (min)': this.calculateAvailableTime(from, to),
            'Buffer': this.calculateAvailableTime(from, to) - estimatedTime,
          });
        }
      }
    });

    XLSX.utils.sheet_add_json(worksheet, travelData, {
      origin: 'A4',
      skipHeader: false,
    });

    XLSX.utils.book_append_sheet(this.workbook, worksheet, 'Travel Times');
  }

  private addStatisticsSheet(details: ItineraryDetails) {
    const worksheet = XLSX.utils.json_to_sheet([]);
    
    // Calculate various statistics
    const stats = this.calculateItineraryStatistics(details);
    
    const statsData = [
      ['Itinerary Statistics'],
      [`Generated: ${format(new Date(), 'PPP')}`],
      [],
      ['General Statistics'],
      ['Total Days', stats.totalDays],
      ['Total Activities', stats.totalActivities],
      ['Activities per Day (avg)', stats.activitiesPerDay.toFixed(1)],
      ['Total Planned Time (hours)', stats.totalPlannedHours.toFixed(1)],
      ['Average Activity Duration (min)', stats.avgActivityDuration.toFixed(0)],
      [],
      ['Category Breakdown'],
      ...Object.entries(stats.categoryCounts).map(([category, count]) => [
        this.formatCategory(category), count
      ]),
      [],
      ['Time Distribution'],
      ['Morning Activities (6-12)', stats.timeDistribution.morning],
      ['Afternoon Activities (12-18)', stats.timeDistribution.afternoon],
      ['Evening Activities (18-24)', stats.timeDistribution.evening],
      [],
      ['Ratings Analysis'],
      ['Average Rating', stats.avgRating.toFixed(1)],
      ['Highly Rated (4+ stars)', stats.highlyRated],
      ['Activities with Ratings', stats.activitiesWithRatings],
      [],
      ['Cost Analysis'],
      ['Total Estimated Cost', `$${stats.totalCost.toFixed(2)}`],
      ['Average Cost per Activity', `$${stats.avgCostPerActivity.toFixed(2)}`],
      ['Average Cost per Day', `$${stats.avgCostPerDay.toFixed(2)}`],
    ];

    XLSX.utils.sheet_add_aoa(worksheet, statsData, { origin: 'A1' });
    
    XLSX.utils.book_append_sheet(this.workbook, worksheet, 'Statistics');
  }

  private addContactsSheet(details: ItineraryDetails) {
    const worksheet = XLSX.utils.json_to_sheet([]);
    
    const header = [
      ['Important Contacts'],
      [`Generated: ${format(new Date(), 'PPP')}`],
      [],
    ];
    
    XLSX.utils.sheet_add_aoa(worksheet, header, { origin: 'A1' });

    const contactsData = details.activities
      .filter(activity => 
        activity.activity?.phone_number || 
        activity.activity?.website_url ||
        activity.activity?.address
      )
      .map(activity => ({
        'Name': activity.activity?.name || '',
        'Category': this.formatCategory(activity.activity?.types?.[0] || ''),
        'Phone': activity.activity?.phone_number || '',
        'Website': activity.activity?.website_url || '',
        'Address': activity.activity?.address || '',
        'Date Scheduled': activity.date ? format(new Date(activity.date), 'yyyy-MM-dd') : '',
        'Time': activity.start_time || '',
      }));

    XLSX.utils.sheet_add_json(worksheet, contactsData, {
      origin: 'A4',
      skipHeader: false,
    });

    XLSX.utils.book_append_sheet(this.workbook, worksheet, 'Contacts');
  }

  // Helper methods
  private applyWorksheetFormatting(worksheet: XLSX.WorkSheet, lastRow: number) {
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
    
    // Set column widths
    const columnWidths = [
      { wch: 5 },   // #
      { wch: 12 },  // Date
      { wch: 10 },  // Day
      { wch: 10 },  // Start Time
      { wch: 10 },  // End Time
      { wch: 12 },  // Duration
      { wch: 30 },  // Activity Name
      { wch: 15 },  // Category
      { wch: 40 },  // Description
      { wch: 40 },  // Address
      { wch: 15 },  // Phone
      { wch: 30 },  // Website
      { wch: 8 },   // Rating
      { wch: 12 },  // Price Level
      { wch: 30 },  // Google Maps
      { wch: 20 },  // Coordinates
      { wch: 30 },  // Notes
      { wch: 12 },  // Cost
    ];
    
    worksheet['!cols'] = columnWidths;
  }

  private calculateDurationMinutes(startTime: string, endTime: string): number {
    const [startHours, startMinutes] = startTime.split(':').map(Number);
    const [endHours, endMinutes] = endTime.split(':').map(Number);
    
    const startTotalMinutes = startHours * 60 + startMinutes;
    const endTotalMinutes = endHours * 60 + endMinutes;
    
    let duration = endTotalMinutes - startTotalMinutes;
    if (duration < 0) duration += 24 * 60; // Handle overnight activities
    
    return duration;
  }

  private formatCategory(category: string): string {
    return category
      .replace(/_/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  private formatPriceLevel(priceLevel?: string): string {
    if (!priceLevel) return '';
    const level = parseInt(priceLevel);
    return '$'.repeat(level);
  }

  private estimateActivityCost(activity: IItineraryActivity): number {
    const priceLevel = parseInt(activity.activity?.price_level || '0');
    const baseCosts = [0, 15, 30, 60, 100];
    return baseCosts[priceLevel] || 0;
  }

  private groupActivitiesByDate(activities: IItineraryActivity[]) {
    return activities.reduce((groups: { [key: string]: IItineraryActivity[] }, activity) => {
      const date = activity.date;
      if (!date) return groups;
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(activity);
      return groups;
    }, {});
  }

  private calculateTotalDayDuration(activities: IItineraryActivity[]): number {
    return activities.reduce((total, activity) => {
      if (activity.start_time && activity.end_time) {
        return total + this.calculateDurationMinutes(activity.start_time, activity.end_time);
      }
      return total;
    }, 0);
  }

  private calculateExpensesByCategory(activities: IItineraryActivity[]) {
    const expenses: { [key: string]: { count: number; total: number; grandTotal: number } } = {};
    let grandTotal = 0;

    activities.forEach(activity => {
      const category = activity.activity?.types?.[0] || 'other';
      const cost = this.estimateActivityCost(activity);
      
      if (!expenses[category]) {
        expenses[category] = { count: 0, total: 0, grandTotal: 0 };
      }
      
      expenses[category].count++;
      expenses[category].total += cost;
      grandTotal += cost;
    });

    // Add grand total to each category for percentage calculation
    Object.keys(expenses).forEach(category => {
      expenses[category].grandTotal = grandTotal;
    });

    return expenses;
  }

  private calculateDailyExpenses(activities: IItineraryActivity[]) {
    const daily: { [key: string]: number } = {};
    
    activities.forEach(activity => {
      const date = activity.date;
      if (!date) return;
      const cost = this.estimateActivityCost(activity);
      
      if (!daily[date]) {
        daily[date] = 0;
      }
      daily[date] += cost;
    });

    return daily;
  }

  private calculateDistance(coord1: [number, number], coord2: [number, number]): number {
    const [lng1, lat1] = coord1;
    const [lng2, lat2] = coord2;
    
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lng2 - lng1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) *
      Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  private estimateTravelTime(distance: number): number {
    // Estimate travel time assuming walking speed of 5 km/h
    const walkingSpeed = 5000; // meters per hour
    return Math.round((distance / walkingSpeed) * 60); // minutes
  }

  private calculateAvailableTime(from: IItineraryActivity, to: IItineraryActivity): number {
    if (!from.end_time || !to.start_time) return 0;
    
    const fromEnd = from.end_time.split(':').map(Number);
    const toStart = to.start_time.split(':').map(Number);
    
    const fromMinutes = fromEnd[0] * 60 + fromEnd[1];
    const toMinutes = toStart[0] * 60 + toStart[1];
    
    let diff = toMinutes - fromMinutes;
    if (diff < 0) diff += 24 * 60;
    
    return diff;
  }

  private calculateItineraryStatistics(details: ItineraryDetails) {
    const activities = details.activities;
    const totalDays = Math.ceil((details.toDate.getTime() - details.fromDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    
    // Category counts
    const categoryCounts: { [key: string]: number } = {};
    activities.forEach(activity => {
      const category = activity.activity?.types?.[0] || 'other';
      categoryCounts[category] = (categoryCounts[category] || 0) + 1;
    });

    // Time distribution
    const timeDistribution = { morning: 0, afternoon: 0, evening: 0 };
    activities.forEach(activity => {
      if (activity.start_time) {
        const hour = parseInt(activity.start_time.split(':')[0]);
        if (hour >= 6 && hour < 12) timeDistribution.morning++;
        else if (hour >= 12 && hour < 18) timeDistribution.afternoon++;
        else timeDistribution.evening++;
      }
    });

    // Duration and rating analysis
    let totalPlannedMinutes = 0;
    let totalRating = 0;
    let activitiesWithRatings = 0;
    let activitiesWithDuration = 0;
    let highlyRated = 0;

    activities.forEach(activity => {
      if (activity.start_time && activity.end_time) {
        totalPlannedMinutes += this.calculateDurationMinutes(activity.start_time, activity.end_time);
        activitiesWithDuration++;
      }
      
      if (activity.activity?.rating) {
        totalRating += activity.activity.rating;
        activitiesWithRatings++;
        if (activity.activity.rating >= 4) highlyRated++;
      }
    });

    // Cost analysis
    const totalCost = activities.reduce((sum, activity) => sum + this.estimateActivityCost(activity), 0);

    return {
      totalDays,
      totalActivities: activities.length,
      activitiesPerDay: activities.length / totalDays,
      totalPlannedHours: totalPlannedMinutes / 60,
      avgActivityDuration: activitiesWithDuration > 0 ? totalPlannedMinutes / activitiesWithDuration : 0,
      categoryCounts,
      timeDistribution,
      avgRating: activitiesWithRatings > 0 ? totalRating / activitiesWithRatings : 0,
      activitiesWithRatings,
      highlyRated,
      totalCost,
      avgCostPerActivity: totalCost / activities.length,
      avgCostPerDay: totalCost / totalDays,
    };
  }
}

// Export function for backward compatibility
export const exportToExcel = (
  itineraryDetails: ItineraryDetails,
  options?: Partial<ExcelExportOptions>
) => {
  const defaultOptions: ExcelExportOptions = {
    includeExpenses: true,
    includeTravelTimes: true,
    includeStatistics: true,
    includeContacts: true,
    separateSheets: true,
    includePhotos: false,
  };

  const exporter = new EnhancedExcelExporter({ ...defaultOptions, ...options });
  exporter.export(itineraryDetails);
};