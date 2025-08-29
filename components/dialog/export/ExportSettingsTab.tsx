// Export settings tab component
import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PDFSettings } from './settings/PDFSettings';
import { ExcelSettings } from './settings/ExcelSettings';
import { TextSettings } from './settings/TextSettings';
import { CalendarSettings } from './settings/CalendarSettings';
import { ExportOptions } from './types';

interface ExportSettingsTabProps {
  options: ExportOptions;
  onUpdate: <K extends keyof ExportOptions>(key: K, value: ExportOptions[K]) => void;
}

export const ExportSettingsTab: React.FC<ExportSettingsTabProps> = ({
  options,
  onUpdate,
}) => (
  <div className="space-y-6">
    <Tabs defaultValue="pdf" className="w-full">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="pdf">PDF</TabsTrigger>
        <TabsTrigger value="excel">Excel</TabsTrigger>
        <TabsTrigger value="text">Text</TabsTrigger>
        <TabsTrigger value="calendar">Calendar</TabsTrigger>
      </TabsList>

      <TabsContent value="pdf">
        <PDFSettings options={options} onUpdate={onUpdate} />
      </TabsContent>

      <TabsContent value="excel">
        <ExcelSettings options={options} onUpdate={onUpdate} />
      </TabsContent>

      <TabsContent value="text">
        <TextSettings options={options} onUpdate={onUpdate} />
      </TabsContent>

      <TabsContent value="calendar">
        <CalendarSettings options={options} onUpdate={onUpdate} />
      </TabsContent>
    </Tabs>
  </div>
);