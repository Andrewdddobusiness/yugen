// Text export settings component
import React from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ExportOptions } from '../types';

interface TextSettingsProps {
  options: ExportOptions;
  onUpdate: <K extends keyof ExportOptions>(key: K, value: ExportOptions[K]) => void;
}

export const TextSettings: React.FC<TextSettingsProps> = ({ options, onUpdate }) => (
  <div className="space-y-4">
    <h3 className="text-lg font-semibold">Text Export Settings</h3>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="space-y-3">
        <div>
          <label className="text-sm font-medium">Format</label>
          <Select 
            value={options.textFormat} 
            onValueChange={(value) => onUpdate('textFormat', value as 'markdown' | 'plain' | 'rich')}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="markdown">Markdown (.md)</SelectItem>
              <SelectItem value="plain">Plain Text (.txt)</SelectItem>
              <SelectItem value="rich">Rich Text (.rtf)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-sm font-medium">Bullet Style</label>
          <Select 
            value={options.textBulletStyle} 
            onValueChange={(value) => onUpdate('textBulletStyle', value as 'dash' | 'asterisk' | 'number')}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="dash">Dashes (-)</SelectItem>
              <SelectItem value="asterisk">Asterisks (*)</SelectItem>
              <SelectItem value="number">Numbers (1.)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-3">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="text-metadata"
            checked={options.textIncludeMetadata}
            onCheckedChange={(checked) => onUpdate('textIncludeMetadata', checked as boolean)}
          />
          <label htmlFor="text-metadata" className="text-sm">Include trip metadata</label>
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox
            id="text-contacts"
            checked={options.textIncludeContacts}
            onCheckedChange={(checked) => onUpdate('textIncludeContacts', checked as boolean)}
          />
          <label htmlFor="text-contacts" className="text-sm">Include contact information</label>
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox
            id="text-statistics"
            checked={options.textIncludeStatistics}
            onCheckedChange={(checked) => onUpdate('textIncludeStatistics', checked as boolean)}
          />
          <label htmlFor="text-statistics" className="text-sm">Include activity statistics</label>
        </div>
      </div>
    </div>
  </div>
);