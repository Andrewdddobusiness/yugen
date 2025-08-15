"use client";

import React, { useState, useRef } from 'react';
import { 
  Download, 
  FileText, 
  Image, 
  Map, 
  Share2, 
  Printer,
  Calendar,
  MapPin,
  Clock,
  ChevronDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface ItineraryActivity {
  itinerary_activity_id: string;
  date: string | null;
  start_time: string | null;
  end_time: string | null;
  notes?: string;
  activity?: {
    name: string;
    address?: string;
    coordinates?: [number, number];
    types?: string[];
    rating?: number;
    price_level?: string;
    phone_number?: string;
    website_url?: string;
  };
}

interface MapExportProps {
  activities: ItineraryActivity[];
  mapInstance?: google.maps.Map;
  itineraryName?: string;
  destinationName?: string;
  className?: string;
}

interface ExportOptions {
  format: 'pdf' | 'image' | 'kml' | 'json' | 'csv';
  includeMap: boolean;
  includeDetails: boolean;
  includeNotes: boolean;
  dateRange: 'all' | 'selected';
  selectedDates: string[];
  imageFormat: 'png' | 'jpg';
  imageQuality: 'low' | 'medium' | 'high';
  mapZoom: number;
}

export function MapExport({
  activities,
  mapInstance,
  itineraryName = 'My Itinerary',
  destinationName = 'Travel Destination',
  className,
}: MapExportProps) {
  const [showExportPanel, setShowExportPanel] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    format: 'pdf',
    includeMap: true,
    includeDetails: true,
    includeNotes: false,
    dateRange: 'all',
    selectedDates: [],
    imageFormat: 'png',
    imageQuality: 'high',
    mapZoom: 14,
  });

  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Get unique dates from activities
  const availableDates = Array.from(
    new Set(activities.filter(a => a.date).map(a => a.date!))
  ).sort();

  // Filter activities based on export options
  const getFilteredActivities = () => {
    if (exportOptions.dateRange === 'selected' && exportOptions.selectedDates.length > 0) {
      return activities.filter(a => a.date && exportOptions.selectedDates.includes(a.date));
    }
    return activities;
  };

  // Export as PDF
  const exportToPDF = async () => {
    const filteredActivities = getFilteredActivities();
    
    // Create PDF content
    const pdfContent = generatePDFContent(filteredActivities);
    
    // For a real implementation, you would use a library like jsPDF
    // Here's a simplified version that creates a printable HTML document
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(pdfContent);
      printWindow.document.close();
      
      // Trigger print dialog
      setTimeout(() => {
        printWindow.print();
      }, 500);
    }
  };

  // Export as image
  const exportAsImage = async () => {
    if (!mapInstance || !canvasRef.current) return;

    setIsExporting(true);
    
    try {
      // Capture map as image using Google Maps API
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) return;

      // Set canvas size based on quality
      const sizes = {
        low: { width: 800, height: 600 },
        medium: { width: 1200, height: 900 },
        high: { width: 1600, height: 1200 },
      };
      
      const size = sizes[exportOptions.imageQuality];
      canvas.width = size.width;
      canvas.height = size.height;

      // Draw map (simplified - in real implementation, you'd use Google Maps Static API)
      ctx.fillStyle = '#e5e7eb';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#374151';
      ctx.font = '24px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(`${itineraryName} - ${destinationName}`, canvas.width / 2, 50);
      
      // Add activity markers (simplified)
      const filteredActivities = getFilteredActivities();
      filteredActivities.forEach((activity, index) => {
        const x = 100 + (index % 5) * 200;
        const y = 150 + Math.floor(index / 5) * 100;
        
        // Draw marker
        ctx.fillStyle = '#3b82f6';
        ctx.beginPath();
        ctx.arc(x, y, 15, 0, 2 * Math.PI);
        ctx.fill();
        
        // Add activity name
        ctx.fillStyle = '#374151';
        ctx.font = '12px Arial';
        ctx.textAlign = 'left';
        ctx.fillText(activity.activity?.name || 'Activity', x + 25, y + 5);
      });

      // Download image
      const link = document.createElement('a');
      link.download = `${itineraryName}-map.${exportOptions.imageFormat}`;
      link.href = canvas.toDataURL(`image/${exportOptions.imageFormat}`);
      link.click();
    } catch (error) {
      console.error('Failed to export image:', error);
    } finally {
      setIsExporting(false);
    }
  };

  // Export as KML
  const exportAsKML = () => {
    const filteredActivities = getFilteredActivities();
    const kmlContent = generateKMLContent(filteredActivities);
    
    const blob = new Blob([kmlContent], { type: 'application/vnd.google-earth.kml+xml' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${itineraryName}.kml`;
    link.click();
  };

  // Export as JSON
  const exportAsJSON = () => {
    const filteredActivities = getFilteredActivities();
    const jsonData = {
      itinerary: {
        name: itineraryName,
        destination: destinationName,
        exported_at: new Date().toISOString(),
        activities: filteredActivities.map(activity => ({
          id: activity.itinerary_activity_id,
          name: activity.activity?.name,
          address: activity.activity?.address,
          coordinates: activity.activity?.coordinates,
          date: activity.date,
          start_time: activity.start_time,
          end_time: activity.end_time,
          notes: exportOptions.includeNotes ? activity.notes : undefined,
          rating: activity.activity?.rating,
          types: activity.activity?.types,
          phone: activity.activity?.phone_number,
          website: activity.activity?.website_url,
        })),
      },
    };
    
    const blob = new Blob([JSON.stringify(jsonData, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${itineraryName}.json`;
    link.click();
  };

  // Export as CSV
  const exportAsCSV = () => {
    const filteredActivities = getFilteredActivities();
    const csvContent = generateCSVContent(filteredActivities);
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${itineraryName}.csv`;
    link.click();
  };

  // Handle export based on selected format
  const handleExport = async () => {
    setIsExporting(true);
    
    try {
      switch (exportOptions.format) {
        case 'pdf':
          await exportToPDF();
          break;
        case 'image':
          await exportAsImage();
          break;
        case 'kml':
          exportAsKML();
          break;
        case 'json':
          exportAsJSON();
          break;
        case 'csv':
          exportAsCSV();
          break;
      }
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
      setShowExportPanel(false);
    }
  };

  // Share itinerary
  const handleShare = async () => {
    const shareData = {
      title: `${itineraryName} - ${destinationName}`,
      text: `Check out my travel itinerary for ${destinationName}!`,
      url: window.location.href,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (error) {
        console.error('Failed to share:', error);
        // Fallback to copying URL
        copyToClipboard();
      }
    } else {
      copyToClipboard();
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(window.location.href);
    // You could show a toast notification here
  };

  return (
    <div className={cn("relative", className)}>
      <canvas ref={canvasRef} className="hidden" />
      
      {/* Export Controls */}
      <div className="absolute bottom-4 right-4 z-10 space-y-2">
        {/* Quick Actions */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleShare}
            className="bg-white/95 hover:bg-white shadow-lg"
          >
            <Share2 className="h-4 w-4" />
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowExportPanel(!showExportPanel)}
            className="bg-white/95 hover:bg-white shadow-lg"
          >
            <Download className="h-4 w-4 mr-2" />
            Export
            <ChevronDown className={cn(
              "h-3 w-3 ml-1 transition-transform",
              showExportPanel && "rotate-180"
            )} />
          </Button>
        </div>

        {/* Export Panel */}
        {showExportPanel && (
          <Card className="p-4 bg-white/95 backdrop-blur shadow-lg min-w-80">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Download className="h-4 w-4" />
                <h3 className="font-semibold">Export Itinerary</h3>
              </div>

              {/* Format Selection */}
              <div>
                <label className="text-sm font-medium mb-2 block">Format</label>
                <Select 
                  value={exportOptions.format} 
                  onValueChange={(value: ExportOptions['format']) => 
                    setExportOptions(prev => ({ ...prev, format: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pdf">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        PDF Document
                      </div>
                    </SelectItem>
                    <SelectItem value="image">
                      <div className="flex items-center gap-2">
                        <Image className="h-4 w-4" />
                        Image (PNG/JPG)
                      </div>
                    </SelectItem>
                    <SelectItem value="kml">
                      <div className="flex items-center gap-2">
                        <Map className="h-4 w-4" />
                        KML (Google Earth)
                      </div>
                    </SelectItem>
                    <SelectItem value="json">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        JSON Data
                      </div>
                    </SelectItem>
                    <SelectItem value="csv">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        CSV Spreadsheet
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Content Options */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Include</label>
                
                <div className="space-y-2">
                  {(exportOptions.format === 'pdf' || exportOptions.format === 'image') && (
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="include-map"
                        checked={exportOptions.includeMap}
                        onCheckedChange={(checked) => 
                          setExportOptions(prev => ({ ...prev, includeMap: !!checked }))
                        }
                      />
                      <label htmlFor="include-map" className="text-sm">Map visualization</label>
                    </div>
                  )}
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="include-details"
                      checked={exportOptions.includeDetails}
                      onCheckedChange={(checked) => 
                        setExportOptions(prev => ({ ...prev, includeDetails: !!checked }))
                      }
                    />
                    <label htmlFor="include-details" className="text-sm">Activity details</label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="include-notes"
                      checked={exportOptions.includeNotes}
                      onCheckedChange={(checked) => 
                        setExportOptions(prev => ({ ...prev, includeNotes: !!checked }))
                      }
                    />
                    <label htmlFor="include-notes" className="text-sm">Personal notes</label>
                  </div>
                </div>
              </div>

              {/* Date Range */}
              <div>
                <label className="text-sm font-medium mb-2 block">Date Range</label>
                <Select 
                  value={exportOptions.dateRange} 
                  onValueChange={(value: 'all' | 'selected') => 
                    setExportOptions(prev => ({ ...prev, dateRange: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All dates ({availableDates.length} days)</SelectItem>
                    <SelectItem value="selected">Selected dates only</SelectItem>
                  </SelectContent>
                </Select>

                {exportOptions.dateRange === 'selected' && (
                  <div className="mt-2 space-y-1 max-h-32 overflow-y-auto">
                    {availableDates.map((date) => (
                      <div key={date} className="flex items-center space-x-2">
                        <Checkbox
                          id={`date-${date}`}
                          checked={exportOptions.selectedDates.includes(date)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setExportOptions(prev => ({
                                ...prev,
                                selectedDates: [...prev.selectedDates, date]
                              }));
                            } else {
                              setExportOptions(prev => ({
                                ...prev,
                                selectedDates: prev.selectedDates.filter(d => d !== date)
                              }));
                            }
                          }}
                        />
                        <label htmlFor={`date-${date}`} className="text-sm">
                          {new Date(date).toLocaleDateString()}
                        </label>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Image-specific options */}
              {exportOptions.format === 'image' && (
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Image Quality</label>
                    <Select 
                      value={exportOptions.imageQuality} 
                      onValueChange={(value: 'low' | 'medium' | 'high') => 
                        setExportOptions(prev => ({ ...prev, imageQuality: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low (800×600)</SelectItem>
                        <SelectItem value="medium">Medium (1200×900)</SelectItem>
                        <SelectItem value="high">High (1600×1200)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium mb-2 block">Format</label>
                    <Select 
                      value={exportOptions.imageFormat} 
                      onValueChange={(value: 'png' | 'jpg') => 
                        setExportOptions(prev => ({ ...prev, imageFormat: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="png">PNG (better quality)</SelectItem>
                        <SelectItem value="jpg">JPG (smaller file)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {/* Export Button */}
              <Button
                onClick={handleExport}
                disabled={isExporting || (exportOptions.dateRange === 'selected' && exportOptions.selectedDates.length === 0)}
                className="w-full"
              >
                {isExporting ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                    Exporting...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Download className="h-4 w-4" />
                    Export {exportOptions.format.toUpperCase()}
                  </div>
                )}
              </Button>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

// Helper functions for generating export content

function generatePDFContent(activities: ItineraryActivity[]): string {
  const groupedByDate = activities.reduce((acc, activity) => {
    const date = activity.date || 'No date';
    if (!acc[date]) acc[date] = [];
    acc[date].push(activity);
    return acc;
  }, {} as Record<string, ItineraryActivity[]>);

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Travel Itinerary</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { text-align: center; margin-bottom: 30px; }
        .day { margin-bottom: 20px; page-break-inside: avoid; }
        .day-title { font-size: 18px; font-weight: bold; color: #333; margin-bottom: 10px; }
        .activity { margin-bottom: 15px; padding: 10px; border-left: 3px solid #3b82f6; }
        .activity-name { font-weight: bold; }
        .activity-details { color: #666; font-size: 14px; margin-top: 5px; }
        @media print { body { margin: 0; } }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Travel Itinerary</h1>
        <p>Generated on ${new Date().toLocaleDateString()}</p>
      </div>
      ${Object.entries(groupedByDate).map(([date, dayActivities]) => `
        <div class="day">
          <div class="day-title">${new Date(date).toLocaleDateString()}</div>
          ${dayActivities.map(activity => `
            <div class="activity">
              <div class="activity-name">${activity.activity?.name || 'Unnamed Activity'}</div>
              <div class="activity-details">
                ${activity.start_time ? `Time: ${activity.start_time}${activity.end_time ? ` - ${activity.end_time}` : ''}` : ''}
                ${activity.activity?.address ? `<br>Address: ${activity.activity.address}` : ''}
                ${activity.notes ? `<br>Notes: ${activity.notes}` : ''}
              </div>
            </div>
          `).join('')}
        </div>
      `).join('')}
    </body>
    </html>
  `;
}

function generateKMLContent(activities: ItineraryActivity[]): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>Travel Itinerary</name>
    <description>Generated travel itinerary</description>
    ${activities.map(activity => {
      if (!activity.activity?.coordinates) return '';
      const [lng, lat] = activity.activity.coordinates;
      return `
    <Placemark>
      <name>${activity.activity?.name || 'Unnamed Activity'}</name>
      <description><![CDATA[
        ${activity.date ? `Date: ${activity.date}<br>` : ''}
        ${activity.start_time ? `Time: ${activity.start_time}${activity.end_time ? ` - ${activity.end_time}` : ''}<br>` : ''}
        ${activity.activity?.address ? `Address: ${activity.activity.address}<br>` : ''}
        ${activity.notes ? `Notes: ${activity.notes}<br>` : ''}
      ]]></description>
      <Point>
        <coordinates>${lng},${lat},0</coordinates>
      </Point>
    </Placemark>`;
    }).join('')}
  </Document>
</kml>`;
}

function generateCSVContent(activities: ItineraryActivity[]): string {
  const headers = ['Name', 'Date', 'Start Time', 'End Time', 'Address', 'Coordinates', 'Notes'];
  const rows = activities.map(activity => [
    activity.activity?.name || '',
    activity.date || '',
    activity.start_time || '',
    activity.end_time || '',
    activity.activity?.address || '',
    activity.activity?.coordinates ? activity.activity.coordinates.join(', ') : '',
    activity.notes || '',
  ]);

  return [headers, ...rows]
    .map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(','))
    .join('\n');
}