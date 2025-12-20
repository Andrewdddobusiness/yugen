'use client';

import React, { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { IItineraryActivity } from '@/store/itineraryActivityStore';
import { Button } from '@/components/ui/button';
import { Printer, ArrowLeft } from 'lucide-react';

interface PrintViewProps {
  itineraryDetails: {
    city: string;
    country: string;
    fromDate: Date;
    toDate: Date;
    activities: IItineraryActivity[];
    itineraryName?: string;
    createdBy?: string;
    notes?: string;
  };
  onClose?: () => void;
}

interface PrintOptions {
  includeContacts: boolean;
  includeNotes: boolean;
  includeRatings: boolean;
  includeTravelTimes: boolean;
  compactMode: boolean;
  blackWhite: boolean;
}

const defaultPrintOptions: PrintOptions = {
  includeContacts: true,
  includeNotes: true,
  includeRatings: true,
  includeTravelTimes: true,
  compactMode: false,
  blackWhite: true,
};

export function PrintView({ itineraryDetails, onClose }: PrintViewProps) {
  const [printOptions, setPrintOptions] = useState<PrintOptions>(defaultPrintOptions);
  const [isPreviewMode, setIsPreviewMode] = useState(true);

  // Group activities by date
  const groupActivitiesByDate = (activities: IItineraryActivity[]) => {
    return activities.reduce((groups: { [key: string]: IItineraryActivity[] }, activity) => {
      const date = activity.date;
      if (!date) return groups;
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(activity);
      return groups;
    }, {});
  };

  const formatTime = (time: string): string => {
    const [hours, minutes] = time.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  const calculateDuration = (startTime: string, endTime: string): string => {
    const [startHours, startMinutes] = startTime.split(':').map(Number);
    const [endHours, endMinutes] = endTime.split(':').map(Number);
    
    let totalMinutes = (endHours * 60 + endMinutes) - (startHours * 60 + startMinutes);
    if (totalMinutes < 0) totalMinutes += 24 * 60;
    
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    
    if (hours === 0) return `${minutes}min`;
    if (minutes === 0) return `${hours}h`;
    return `${hours}h ${minutes}min`;
  };

  const handlePrint = () => {
    setIsPreviewMode(false);
    setTimeout(() => {
      window.print();
      setIsPreviewMode(true);
    }, 100);
  };

  const groupedActivities = groupActivitiesByDate(itineraryDetails.activities);
  const totalDays = Math.ceil((itineraryDetails.toDate.getTime() - itineraryDetails.fromDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  useEffect(() => {
    // Add print-specific styles
    const printStyles = `
      @media print {
        @page {
          size: A4;
          margin: 0.75in;
        }
        
        body {
          font-family: 'Times New Roman', serif;
          font-size: 11pt;
          line-height: 1.3;
          color: ${printOptions.blackWhite ? '#000' : '#333'};
        }
        
        .print-header {
          border-bottom: 2px solid #333;
          padding-bottom: 10pt;
          margin-bottom: 15pt;
        }
        
        .print-title {
          font-size: 18pt;
          font-weight: bold;
          margin-bottom: 5pt;
        }
        
        .print-subtitle {
          font-size: 14pt;
          color: #666;
          margin-bottom: 3pt;
        }
        
        .print-dates {
          font-size: 12pt;
          font-style: italic;
        }
        
        .day-section {
          page-break-inside: avoid;
          margin-bottom: 20pt;
        }
        
        .day-header {
          background-color: ${printOptions.blackWhite ? '#f0f0f0' : '#e3f2fd'};
          padding: 8pt;
          font-size: 14pt;
          font-weight: bold;
          margin-bottom: 10pt;
          border: 1px solid #ccc;
        }
        
        .activity-item {
          margin-bottom: ${printOptions.compactMode ? '8pt' : '12pt'};
          padding-left: 15pt;
          position: relative;
          page-break-inside: avoid;
        }
        
        .activity-time {
          position: absolute;
          left: 0;
          top: 0;
          width: 60pt;
          font-weight: bold;
          font-size: 10pt;
        }
        
        .activity-name {
          font-weight: bold;
          font-size: 12pt;
          margin-bottom: 3pt;
        }
        
        .activity-details {
          font-size: 10pt;
          color: #666;
          margin-bottom: 2pt;
        }
        
        .activity-address {
          font-size: 10pt;
          font-style: italic;
          margin-bottom: 2pt;
        }
        
        .activity-notes {
          font-size: 10pt;
          margin-top: 5pt;
          padding: 5pt;
          background-color: #f9f9f9;
          border-left: 3pt solid #ccc;
        }
        
        .contacts-section {
          page-break-before: always;
          margin-top: 20pt;
        }
        
        .section-header {
          font-size: 16pt;
          font-weight: bold;
          border-bottom: 1px solid #333;
          margin-bottom: 10pt;
          padding-bottom: 5pt;
        }
        
        .contact-item {
          margin-bottom: 10pt;
          padding: 5pt;
          border: 1px solid #ddd;
        }
        
        .no-print {
          display: none !important;
        }
        
        .compact .activity-item {
          margin-bottom: 6pt;
        }
        
        .compact .activity-details {
          font-size: 9pt;
        }
      }
      
      @media screen {
        .print-preview {
          max-width: 8.5in;
          margin: 0 auto;
          padding: 20px;
          background: white;
          box-shadow: 0 0 10px rgba(0,0,0,0.1);
          min-height: 11in;
        }
      }
    `;

    const styleElement = document.createElement('style');
    styleElement.textContent = printStyles;
    document.head.appendChild(styleElement);

    return () => {
      document.head.removeChild(styleElement);
    };
  }, [printOptions]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Print Controls - Hidden during print */}
      {isPreviewMode && (
        <div className="no-print bg-white border-b border-gray-200 p-4 sticky top-0 z-10">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {onClose && (
                <Button variant="ghost" onClick={onClose} className="flex items-center gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </Button>
              )}
              <h1 className="text-lg font-semibold">Print Preview</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Print Options */}
              <div className="flex items-center space-x-2 text-sm">
                <label className="flex items-center space-x-1">
                  <input
                    type="checkbox"
                    checked={printOptions.compactMode}
                    onChange={(e) => setPrintOptions(prev => ({ ...prev, compactMode: e.target.checked }))}
                  />
                  <span>Compact</span>
                </label>
                <label className="flex items-center space-x-1">
                  <input
                    type="checkbox"
                    checked={printOptions.blackWhite}
                    onChange={(e) => setPrintOptions(prev => ({ ...prev, blackWhite: e.target.checked }))}
                  />
                  <span>B&W</span>
                </label>
                <label className="flex items-center space-x-1">
                  <input
                    type="checkbox"
                    checked={printOptions.includeContacts}
                    onChange={(e) => setPrintOptions(prev => ({ ...prev, includeContacts: e.target.checked }))}
                  />
                  <span>Contacts</span>
                </label>
                <label className="flex items-center space-x-1">
                  <input
                    type="checkbox"
                    checked={printOptions.includeNotes}
                    onChange={(e) => setPrintOptions(prev => ({ ...prev, includeNotes: e.target.checked }))}
                  />
                  <span>Notes</span>
                </label>
              </div>
              
              <Button onClick={handlePrint} className="flex items-center gap-2">
                <Printer className="h-4 w-4" />
                Print
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Print Content */}
      <div className={`print-preview ${printOptions.compactMode ? 'compact' : ''}`}>
        {/* Header */}
        <div className="print-header">
          <div className="print-title">
            {itineraryDetails.itineraryName || `${itineraryDetails.city} Travel Itinerary`}
          </div>
          <div className="print-subtitle">
            {itineraryDetails.city}, {itineraryDetails.country}
          </div>
          <div className="print-dates">
            {format(itineraryDetails.fromDate, 'MMMM d')} - {format(itineraryDetails.toDate, 'MMMM d, yyyy')}
          </div>
          <div style={{ fontSize: '10pt', marginTop: '8pt', color: '#666' }}>
            {totalDays} days • {itineraryDetails.activities.length} activities
            {itineraryDetails.createdBy && ` • Created by ${itineraryDetails.createdBy}`}
          </div>
        </div>

        {/* Trip Notes */}
        {printOptions.includeNotes && itineraryDetails.notes && (
          <div style={{ marginBottom: '20pt', padding: '10pt', backgroundColor: '#f9f9f9', border: '1px solid #ddd' }}>
            <div style={{ fontWeight: 'bold', marginBottom: '5pt' }}>Trip Notes:</div>
            <div style={{ fontSize: '10pt', lineHeight: '1.4' }}>
              {itineraryDetails.notes}
            </div>
          </div>
        )}

        {/* Daily Itinerary */}
        {Object.entries(groupedActivities)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([date, activities], dayIndex) => {
            const sortedActivities = activities.sort((a, b) => 
              (a.start_time || '00:00').localeCompare(b.start_time || '00:00')
            );

            return (
              <div key={date} className="day-section">
                <div className="day-header">
                  Day {dayIndex + 1}: {format(new Date(date), 'EEEE, MMMM d, yyyy')}
                </div>
                
                {sortedActivities.map((activity, activityIndex) => (
                  <div key={activityIndex} className="activity-item">
                    {activity.start_time && (
                      <div className="activity-time">
                        {formatTime(activity.start_time)}
                        {printOptions.includeTravelTimes && activity.end_time && (
                          <div style={{ fontSize: '8pt', color: '#999', marginTop: '1pt' }}>
                            {calculateDuration(activity.start_time, activity.end_time)}
                          </div>
                        )}
                      </div>
                    )}
                    
                    <div className="activity-name">
                      {activity.activity?.name || 'Unnamed Activity'}
                    </div>
                    
                    {activity.activity?.address && (
                      <div className="activity-address">
                        📍 {activity.activity.address}
                      </div>
                    )}
                    
                    {(printOptions.includeRatings || printOptions.includeContacts) && (
                      <div className="activity-details">
                        {printOptions.includeRatings && activity.activity?.rating && (
                          <span>⭐ {activity.activity.rating}/5 • </span>
                        )}
                        {activity.activity?.price_level && (
                          <span>💰 {'$'.repeat(parseInt(activity.activity.price_level))} • </span>
                        )}
                        {printOptions.includeContacts && activity.activity?.phone_number && (
                          <span>📞 {activity.activity.phone_number} • </span>
                        )}
                        {activity.activity?.types?.[0] && (
                          <span>{activity.activity.types[0].replace(/_/g, ' ')} </span>
                        )}
                      </div>
                    )}
                    
                    {printOptions.includeNotes && activity.notes && (
                      <div className="activity-notes">
                        💭 {activity.notes}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            );
          })}

        {/* Important Contacts */}
        {printOptions.includeContacts && (
          <div className="contacts-section">
            <div className="section-header">Important Contacts</div>
            
            {itineraryDetails.activities
              .filter(a => a.activity?.phone_number || a.activity?.website_url)
              .map((activity, index) => (
                <div key={index} className="contact-item">
                  <div style={{ fontWeight: 'bold', fontSize: '11pt' }}>
                    {activity.activity?.name || 'Unnamed Activity'}
                  </div>
                  {activity.activity?.phone_number && (
                    <div style={{ fontSize: '10pt' }}>
                      📞 {activity.activity.phone_number}
                    </div>
                  )}
                  {activity.activity?.website_url && (
                    <div style={{ fontSize: '10pt' }}>
                      🌐 {activity.activity.website_url}
                    </div>
                  )}
                  {activity.activity?.address && (
                    <div style={{ fontSize: '10pt', color: '#666' }}>
                      📍 {activity.activity.address}
                    </div>
                  )}
                </div>
              ))}
          </div>
        )}

        {/* Footer */}
        <div style={{ 
          marginTop: '30pt', 
          paddingTop: '10pt', 
          borderTop: '1px solid #ccc', 
          textAlign: 'center', 
          fontSize: '9pt', 
          color: '#666' 
        }}>
          Generated on {format(new Date(), 'PPP')} • Yugi Travel Planner
        </div>
      </div>
    </div>
  );
}
