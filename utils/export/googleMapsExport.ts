import { IItineraryActivity } from "@/store/itineraryActivityStore";
import { format } from "date-fns";

interface ItineraryDetails {
  city: string;
  country: string;
  fromDate: Date;
  toDate: Date;
  activities: IItineraryActivity[];
  itineraryName?: string;
}

export class GoogleMapsExporter {
  /**
   * Create a Google My Maps import file (KMZ format)
   */
  static exportToMyMaps(details: ItineraryDetails): void {
    const kmlContent = this.generateKMLForMyMaps(details);
    this.downloadFile(kmlContent, `${details.itineraryName || details.city}_my_maps.kml`, 'application/vnd.google-earth.kml+xml');
  }

  /**
   * Create a simple Google Maps list (sharing multiple locations)
   */
  static exportToGoogleMaps(details: ItineraryDetails): void {
    const activities = details.activities.filter(a => a.activity?.coordinates);
    
    if (activities.length === 0) {
      throw new Error('No activities with coordinates found');
    }

    // Generate Google Maps URL with multiple destinations
    const waypoints = activities
      .slice(1) // Skip first as it will be the origin
      .map(activity => {
        const [lng, lat] = activity.activity!.coordinates!;
        return `${lat},${lng}`;
      })
      .join('|');

    const firstActivity = activities[0];
    const lastActivity = activities[activities.length - 1];
    
    const [originLng, originLat] = firstActivity.activity!.coordinates!;
    const [destLng, destLat] = lastActivity.activity!.coordinates!;

    let googleMapsUrl = `https://www.google.com/maps/dir/${originLat},${originLng}`;
    
    if (waypoints) {
      googleMapsUrl += `/${waypoints}`;
    }
    
    googleMapsUrl += `/${destLat},${destLng}`;

    // Open in new tab
    window.open(googleMapsUrl, '_blank');
  }

  /**
   * Create a Google Maps list with search queries
   */
  static exportAsSearchList(details: ItineraryDetails): void {
    const searchList = details.activities
      .filter(a => a.activity?.name)
      .map(activity => ({
        name: activity.activity!.name,
        address: activity.activity?.address || '',
        date: activity.date,
        time: activity.start_time,
        searchQuery: this.createSearchQuery(activity),
      }));

    const htmlContent = this.generateSearchListHTML(details, searchList);
    this.downloadFile(htmlContent, `${details.itineraryName || details.city}_google_search_list.html`, 'text/html');
  }

  /**
   * Export as Google Earth KML
   */
  static exportToGoogleEarth(details: ItineraryDetails): void {
    const kmlContent = this.generateAdvancedKML(details);
    this.downloadFile(kmlContent, `${details.itineraryName || details.city}_google_earth.kml`, 'application/vnd.google-earth.kml+xml');
  }

  /**
   * Create shareable Google Maps custom map URL
   */
  static createCustomMapUrl(details: ItineraryDetails): string {
    // This would typically require Google My Maps API
    // For now, we'll create a Google Maps URL with the first activity
    const firstActivity = details.activities.find(a => a.activity?.coordinates);
    
    if (!firstActivity?.activity?.coordinates) {
      throw new Error('No activities with coordinates found');
    }

    const [lng, lat] = firstActivity.activity.coordinates;
    return `https://www.google.com/maps/@${lat},${lng},12z`;
  }

  /**
   * Generate directions for daily routes
   */
  static generateDailyDirections(details: ItineraryDetails): { [date: string]: string } {
    const dailyDirections: { [date: string]: string } = {};
    const groupedActivities = this.groupActivitiesByDate(details.activities);

    Object.entries(groupedActivities).forEach(([date, activities]) => {
      const activitiesWithCoords = activities.filter(a => a.activity?.coordinates);
      
      if (activitiesWithCoords.length < 2) {
        dailyDirections[date] = 'No route available (less than 2 locations)';
        return;
      }

      // Sort by time
      activitiesWithCoords.sort((a, b) => (a.start_time || '').localeCompare(b.start_time || ''));

      const waypoints = activitiesWithCoords
        .slice(1, -1) // Exclude first and last (they become origin and destination)
        .map(activity => {
          const [lng, lat] = activity.activity!.coordinates!;
          return `${lat},${lng}`;
        })
        .join('|');

      const first = activitiesWithCoords[0];
      const last = activitiesWithCoords[activitiesWithCoords.length - 1];
      
      const [originLng, originLat] = first.activity!.coordinates!;
      const [destLng, destLat] = last.activity!.coordinates!;

      let url = `https://www.google.com/maps/dir/${originLat},${originLng}`;
      
      if (waypoints) {
        url += `/${waypoints}`;
      }
      
      url += `/${destLat},${destLng}`;

      dailyDirections[date] = url;
    });

    return dailyDirections;
  }

  // Private helper methods
  private static generateKMLForMyMaps(details: ItineraryDetails): string {
    const activities = details.activities.filter(a => a.activity?.coordinates);
    
    const placemarks = activities.map((activity, index) => {
      const [lng, lat] = activity.activity!.coordinates!;
      const dayIndex = this.getDayIndex(activity.date, details.fromDate);
      
      return `
    <Placemark>
      <name>${activity.activity?.name || `Activity ${index + 1}`}</name>
      <description><![CDATA[
        <div style="font-family: Arial, sans-serif;">
          <h3>${activity.activity?.name || 'Unnamed Activity'}</h3>
          ${activity.date ? `<p><strong>Date:</strong> ${format(new Date(activity.date), 'EEEE, MMMM d, yyyy')}</p>` : ''}
          ${activity.start_time ? `<p><strong>Time:</strong> ${this.formatTime(activity.start_time)}${activity.end_time ? ` - ${this.formatTime(activity.end_time)}` : ''}</p>` : ''}
          ${activity.activity?.address ? `<p><strong>Address:</strong> ${activity.activity.address}</p>` : ''}
          ${activity.activity?.rating ? `<p><strong>Rating:</strong> ⭐ ${activity.activity.rating}/5</p>` : ''}
          ${activity.activity?.phone_number ? `<p><strong>Phone:</strong> ${activity.activity.phone_number}</p>` : ''}
          ${activity.notes ? `<p><strong>Notes:</strong> ${activity.notes}</p>` : ''}
          ${activity.activity?.google_maps_url ? `<p><a href="${activity.activity.google_maps_url}" target="_blank">View on Google Maps</a></p>` : ''}
        </div>
      ]]></description>
      <styleUrl>#day${dayIndex}</styleUrl>
      <Point>
        <coordinates>${lng},${lat},0</coordinates>
      </Point>
    </Placemark>`;
    }).join('');

    const styles = this.generateKMLStyles();

    return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>${details.itineraryName || `${details.city} Itinerary`}</name>
    <description>Travel itinerary for ${details.city}, ${details.country}. Generated on ${format(new Date(), 'PPP')}</description>
    
    ${styles}
    
    <Folder>
      <name>Daily Activities</name>
      <description>All scheduled activities organized by location</description>
      ${placemarks}
    </Folder>
  </Document>
</kml>`;
  }

  private static generateAdvancedKML(details: ItineraryDetails): string {
    const groupedActivities = this.groupActivitiesByDate(details.activities);
    
    const folders = Object.entries(groupedActivities).map(([date, activities], dayIndex) => {
      const dayActivities = activities.filter(a => a.activity?.coordinates);
      
      const placemarks = dayActivities.map(activity => {
        const [lng, lat] = activity.activity!.coordinates!;
        
        return `
      <Placemark>
        <name>${activity.activity?.name || 'Unnamed Activity'}</name>
        <description><![CDATA[
          <div style="font-family: Arial, sans-serif; max-width: 300px;">
            <h3 style="margin-top: 0; color: #1a73e8;">${activity.activity?.name || 'Unnamed Activity'}</h3>
            <table style="width: 100%; font-size: 14px;">
              ${activity.start_time ? `<tr><td><strong>Time:</strong></td><td>${this.formatTime(activity.start_time)}${activity.end_time ? ` - ${this.formatTime(activity.end_time)}` : ''}</td></tr>` : ''}
              ${activity.activity?.address ? `<tr><td><strong>Address:</strong></td><td>${activity.activity.address}</td></tr>` : ''}
              ${activity.activity?.rating ? `<tr><td><strong>Rating:</strong></td><td>⭐ ${activity.activity.rating}/5</td></tr>` : ''}
              ${activity.activity?.price_level ? `<tr><td><strong>Price:</strong></td><td>${'$'.repeat(parseInt(activity.activity.price_level))}</td></tr>` : ''}
              ${activity.activity?.phone_number ? `<tr><td><strong>Phone:</strong></td><td><a href="tel:${activity.activity.phone_number}">${activity.activity.phone_number}</a></td></tr>` : ''}
            </table>
            ${activity.notes ? `<p style="margin-top: 10px; padding: 8px; background: #f8f9fa; border-radius: 4px;"><em>${activity.notes}</em></p>` : ''}
            <div style="margin-top: 10px;">
              ${activity.activity?.google_maps_url ? `<a href="${activity.activity.google_maps_url}" target="_blank" style="color: #1a73e8;">📍 View on Google Maps</a>` : ''}
              ${activity.activity?.website_url ? `<br><a href="${activity.activity.website_url}" target="_blank" style="color: #1a73e8;">🌐 Visit Website</a>` : ''}
            </div>
          </div>
        ]]></description>
        <styleUrl>#day${dayIndex + 1}Style</styleUrl>
        <Point>
          <coordinates>${lng},${lat},0</coordinates>
        </Point>
      </Placemark>`;
      }).join('');

      // Create path connecting activities
      const pathCoords = dayActivities.map(activity => {
        const [lng, lat] = activity.activity!.coordinates!;
        return `${lng},${lat},0`;
      }).join(' ');

      const pathPlacemark = dayActivities.length > 1 ? `
      <Placemark>
        <name>Day ${dayIndex + 1} Route</name>
        <description>Route connecting all activities for ${format(new Date(date), 'EEEE, MMMM d')}</description>
        <styleUrl>#routeStyle</styleUrl>
        <LineString>
          <tessellate>1</tessellate>
          <coordinates>${pathCoords}</coordinates>
        </LineString>
      </Placemark>` : '';

      return `
    <Folder>
      <name>Day ${dayIndex + 1} - ${format(new Date(date), 'EEEE, MMM d')}</name>
      <description>${dayActivities.length} activities planned</description>
      ${placemarks}
      ${pathPlacemark}
    </Folder>`;
    }).join('');

    const advancedStyles = this.generateAdvancedKMLStyles();

    return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>${details.itineraryName || `${details.city} Itinerary`}</name>
    <description>
      Complete travel itinerary for ${details.city}, ${details.country}
      ${format(details.fromDate, 'MMMM d')} - ${format(details.toDate, 'MMMM d, yyyy')}
      Generated on ${format(new Date(), 'PPP')}
    </description>
    
    ${advancedStyles}
    
    ${folders}
  </Document>
</kml>`;
  }

  private static generateSearchListHTML(details: ItineraryDetails, searchList: any[]): string {
    const groupedByDate = searchList.reduce((groups: any, item) => {
      if (!groups[item.date]) groups[item.date] = [];
      groups[item.date].push(item);
      return groups;
    }, {});

    const dailyLists = Object.entries(groupedByDate).map(([date, items]: [string, any]) => {
      const itemsHtml = items.map((item: any) => `
        <div class="activity-item">
          <h4>${item.name}</h4>
          ${item.time ? `<p class="time">🕒 ${this.formatTime(item.time)}</p>` : ''}
          ${item.address ? `<p class="address">📍 ${item.address}</p>` : ''}
          <a href="${item.searchQuery}" target="_blank" class="search-link">Search on Google Maps</a>
        </div>
      `).join('');

      return `
        <div class="day-section">
          <h3>Day ${this.getDayIndex(date, details.fromDate) + 1} - ${format(new Date(date), 'EEEE, MMMM d')}</h3>
          <div class="activities">
            ${itemsHtml}
          </div>
        </div>
      `;
    }).join('');

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${details.itineraryName || details.city} - Google Maps Search List</title>
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
      line-height: 1.6;
      background-color: #f8f9fa;
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
      padding: 20px;
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .header h1 {
      color: #1a73e8;
      margin-bottom: 10px;
    }
    .day-section {
      margin-bottom: 30px;
      background: white;
      border-radius: 8px;
      padding: 20px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .day-section h3 {
      color: #1a73e8;
      border-bottom: 2px solid #e8f0fe;
      padding-bottom: 10px;
      margin-bottom: 20px;
    }
    .activity-item {
      margin-bottom: 20px;
      padding: 15px;
      background: #f8f9fa;
      border-radius: 6px;
      border-left: 4px solid #1a73e8;
    }
    .activity-item h4 {
      margin: 0 0 8px 0;
      color: #333;
    }
    .time, .address {
      margin: 5px 0;
      color: #666;
      font-size: 14px;
    }
    .search-link {
      display: inline-block;
      background: #1a73e8;
      color: white;
      padding: 8px 16px;
      text-decoration: none;
      border-radius: 4px;
      font-size: 14px;
      margin-top: 8px;
    }
    .search-link:hover {
      background: #1557b0;
    }
    .footer {
      text-align: center;
      margin-top: 30px;
      color: #666;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>${details.itineraryName || `${details.city} Itinerary`}</h1>
    <p>${details.city}, ${details.country}</p>
    <p>${format(details.fromDate, 'MMMM d')} - ${format(details.toDate, 'MMMM d, yyyy')}</p>
  </div>
  
  ${dailyLists}
  
  <div class="footer">
    <p>Generated on ${format(new Date(), 'PPP')}</p>
    <p>Click any "Search on Google Maps" link to find the location</p>
  </div>
</body>
</html>`;
  }

  private static createSearchQuery(activity: IItineraryActivity): string {
    const query = activity.activity?.name || '';
    const address = activity.activity?.address || '';
    
    let searchTerm = query;
    if (address) {
      searchTerm += ` ${address}`;
    }
    
    return `https://www.google.com/maps/search/${encodeURIComponent(searchTerm)}`;
  }

  private static generateKMLStyles(): string {
    const colors = [
      'ff1e88e5', // Day 1 - Blue
      'ff1565c0', // Day 2 - Purple  
      'ff00796b', // Day 3 - Teal
      'ff689f38', // Day 4 - Light Green
      'fff57c00', // Day 5 - Orange
      'ffd32f2f', // Day 6 - Red
      'ff7b1fa2', // Day 7 - Purple
    ];

    return colors.map((color, index) => `
    <Style id="day${index}">
      <IconStyle>
        <color>${color}</color>
        <scale>1.2</scale>
        <Icon>
          <href>http://maps.google.com/mapfiles/kml/shapes/placemark_circle.png</href>
        </Icon>
      </IconStyle>
      <LabelStyle>
        <color>${color}</color>
        <scale>0.8</scale>
      </LabelStyle>
    </Style>`).join('');
  }

  private static generateAdvancedKMLStyles(): string {
    const styles = [];
    
    // Day styles with different colors
    const dayColors = [
      { color: 'ff1e88e5', name: 'Blue' },
      { color: 'ff1565c0', name: 'Purple' },
      { color: 'ff00796b', name: 'Teal' },
      { color: 'ff689f38', name: 'Green' },
      { color: 'fff57c00', name: 'Orange' },
      { color: 'ffd32f2f', name: 'Red' },
      { color: 'ff7b1fa2', name: 'Deep Purple' },
    ];

    dayColors.forEach((day, index) => {
      styles.push(`
    <Style id="day${index + 1}Style">
      <IconStyle>
        <color>${day.color}</color>
        <scale>1.3</scale>
        <Icon>
          <href>http://maps.google.com/mapfiles/kml/shapes/placemark_circle.png</href>
        </Icon>
        <hotSpot x="0.5" y="0" xunits="fraction" yunits="fraction"/>
      </IconStyle>
      <LabelStyle>
        <color>${day.color}</color>
        <scale>0.9</scale>
      </LabelStyle>
      <BalloonStyle>
        <textColor>ff000000</textColor>
        <bgColor>ffffffff</bgColor>
      </BalloonStyle>
    </Style>`);
    });

    // Route style
    styles.push(`
    <Style id="routeStyle">
      <LineStyle>
        <color>7f1e88e5</color>
        <width>3</width>
      </LineStyle>
      <PolyStyle>
        <color>3f1e88e5</color>
      </PolyStyle>
    </Style>`);

    return styles.join('');
  }

  private static formatTime(time: string): string {
    const [hours, minutes] = time.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
  }

  private static getDayIndex(date: string, startDate: Date): number {
    const activityDate = new Date(date);
    const diffTime = activityDate.getTime() - startDate.getTime();
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  }

  private static groupActivitiesByDate(activities: IItineraryActivity[]) {
    return activities.reduce((groups: { [key: string]: IItineraryActivity[] }, activity) => {
      const date = activity.date;
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(activity);
      return groups;
    }, {});
  }

  private static downloadFile(content: string, filename: string, mimeType: string): void {
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
export const exportToMyMaps = (details: ItineraryDetails) => GoogleMapsExporter.exportToMyMaps(details);
export const exportToGoogleMaps = (details: ItineraryDetails) => GoogleMapsExporter.exportToGoogleMaps(details);
export const exportAsSearchList = (details: ItineraryDetails) => GoogleMapsExporter.exportAsSearchList(details);
export const exportToGoogleEarth = (details: ItineraryDetails) => GoogleMapsExporter.exportToGoogleEarth(details);