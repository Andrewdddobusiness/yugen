// Main export dialog component - refactored for maintainability
'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Share2, Settings } from 'lucide-react';
import { ExportFormatsTab } from './ExportFormatsTab';
import { ExportSettingsTab } from './ExportSettingsTab';
import { useExportHandlers } from './useExportHandlers';
import { ExportDialogProps, ExportOptions } from './types';
import { defaultExportOptions } from './constants';

export const ExportDialog: React.FC<ExportDialogProps> = ({ 
  children, 
  itineraryDetails 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [exportOptions, setExportOptions] = useState<ExportOptions>(defaultExportOptions);

  const updateOption = <K extends keyof ExportOptions>(key: K, value: ExportOptions[K]) => {
    setExportOptions(prev => ({ ...prev, [key]: value }));
  };

  const { handleExport, isExporting, exportingFormat } = useExportHandlers({
    itineraryDetails,
    exportOptions,
    onExportComplete: () => setIsOpen(false),
  });

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Export Itinerary
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="formats" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="formats">Export Formats</TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-1">
              <Settings className="h-3 w-3" />
              Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="formats" className="space-y-6">
            <ExportFormatsTab
              onExport={handleExport}
              isExporting={isExporting}
              exportingFormat={exportingFormat}
            />
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <ExportSettingsTab
              options={exportOptions}
              onUpdate={updateOption}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};