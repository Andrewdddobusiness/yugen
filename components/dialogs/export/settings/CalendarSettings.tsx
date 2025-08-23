// Calendar export settings component
import React from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ExportOptions } from '../types';
import { timeZoneOptions } from '../constants';

interface CalendarSettingsProps {
  options: ExportOptions;
  onUpdate: <K extends keyof ExportOptions>(key: K, value: ExportOptions[K]) => void;
}

export const CalendarSettings: React.FC<CalendarSettingsProps> = ({ options, onUpdate }) => (
  <div className="space-y-4">
    <h3 className="text-lg font-semibold">Calendar Export Settings</h3>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="space-y-3">
        <div>
          <label className="text-sm font-medium">Time Zone</label>
          <Select 
            value={options.calendarTimeZone} 
            onValueChange={(value) => onUpdate('calendarTimeZone', value)}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {timeZoneOptions.map((tz) => (
                <SelectItem key={tz.value} value={tz.value}>
                  {tz.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox
            id="calendar-alarms"
            checked={options.calendarIncludeAlarms}
            onCheckedChange={(checked) => onUpdate('calendarIncludeAlarms', checked as boolean)}
          />
          <label htmlFor="calendar-alarms" className="text-sm">Include reminders/alarms</label>
        </div>
      </div>
      <div className="space-y-3">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="calendar-location"
            checked={options.calendarIncludeLocation}
            onCheckedChange={(checked) => onUpdate('calendarIncludeLocation', checked as boolean)}
          />
          <label htmlFor="calendar-location" className="text-sm">Include location data</label>
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox
            id="calendar-description"
            checked={options.calendarIncludeDescription}
            onCheckedChange={(checked) => onUpdate('calendarIncludeDescription', checked as boolean)}
          />
          <label htmlFor="calendar-description" className="text-sm">Include detailed descriptions</label>
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox
            id="calendar-url"
            checked={options.calendarIncludeUrl}
            onCheckedChange={(checked) => onUpdate('calendarIncludeUrl', checked as boolean)}
          />
          <label htmlFor="calendar-url" className="text-sm">Include website URLs</label>
        </div>
      </div>
    </div>
  </div>
);