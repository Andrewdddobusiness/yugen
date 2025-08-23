// PDF export settings component
import React from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { QrCode, Clock, DollarSign, Phone } from 'lucide-react';
import { ExportOptions } from '../types';

interface PDFSettingsProps {
  options: ExportOptions;
  onUpdate: <K extends keyof ExportOptions>(key: K, value: ExportOptions[K]) => void;
}

export const PDFSettings: React.FC<PDFSettingsProps> = ({ options, onUpdate }) => (
  <div className="space-y-4">
    <h3 className="text-lg font-semibold">PDF Export Settings</h3>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="space-y-3">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="pdf-qr-codes"
            checked={options.pdfIncludeQRCodes}
            onCheckedChange={(checked) => onUpdate('pdfIncludeQRCodes', checked as boolean)}
          />
          <label htmlFor="pdf-qr-codes" className="text-sm flex items-center gap-1">
            <QrCode className="h-3 w-3" />
            Include QR codes for locations
          </label>
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox
            id="pdf-travel-times"
            checked={options.pdfIncludeTravelTimes}
            onCheckedChange={(checked) => onUpdate('pdfIncludeTravelTimes', checked as boolean)}
          />
          <label htmlFor="pdf-travel-times" className="text-sm flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Include travel time estimates
          </label>
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox
            id="pdf-expenses"
            checked={options.pdfIncludeExpenses}
            onCheckedChange={(checked) => onUpdate('pdfIncludeExpenses', checked as boolean)}
          />
          <label htmlFor="pdf-expenses" className="text-sm flex items-center gap-1">
            <DollarSign className="h-3 w-3" />
            Include expense summary
          </label>
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox
            id="pdf-contacts"
            checked={options.pdfIncludeContacts}
            onCheckedChange={(checked) => onUpdate('pdfIncludeContacts', checked as boolean)}
          />
          <label htmlFor="pdf-contacts" className="text-sm flex items-center gap-1">
            <Phone className="h-3 w-3" />
            Include contact information
          </label>
        </div>
      </div>
      <div className="space-y-3">
        <div>
          <label className="text-sm font-medium">Paper Size</label>
          <Select 
            value={options.pdfPaperSize} 
            onValueChange={(value) => onUpdate('pdfPaperSize', value as 'a4' | 'letter')}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="a4">A4</SelectItem>
              <SelectItem value="letter">Letter</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-sm font-medium">Orientation</label>
          <Select 
            value={options.pdfOrientation} 
            onValueChange={(value) => onUpdate('pdfOrientation', value as 'portrait' | 'landscape')}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="portrait">Portrait</SelectItem>
              <SelectItem value="landscape">Landscape</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-sm font-medium">Theme</label>
          <Select 
            value={options.pdfTheme} 
            onValueChange={(value) => onUpdate('pdfTheme', value as 'default' | 'minimal' | 'colorful')}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="default">Default</SelectItem>
              <SelectItem value="minimal">Minimal</SelectItem>
              <SelectItem value="colorful">Colorful</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  </div>
);