// Excel export settings component
import React from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { ExportOptions } from '../types';

interface ExcelSettingsProps {
  options: ExportOptions;
  onUpdate: <K extends keyof ExportOptions>(key: K, value: ExportOptions[K]) => void;
}

export const ExcelSettings: React.FC<ExcelSettingsProps> = ({ options, onUpdate }) => (
  <div className="space-y-4">
    <h3 className="text-lg font-semibold">Excel Export Settings</h3>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="space-y-3">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="excel-expenses"
            checked={options.excelIncludeExpenses}
            onCheckedChange={(checked) => onUpdate('excelIncludeExpenses', checked as boolean)}
          />
          <label htmlFor="excel-expenses" className="text-sm">Include expense analysis sheet</label>
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox
            id="excel-travel-times"
            checked={options.excelIncludeTravelTimes}
            onCheckedChange={(checked) => onUpdate('excelIncludeTravelTimes', checked as boolean)}
          />
          <label htmlFor="excel-travel-times" className="text-sm">Include travel times analysis</label>
        </div>
      </div>
      <div className="space-y-3">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="excel-statistics"
            checked={options.excelIncludeStatistics}
            onCheckedChange={(checked) => onUpdate('excelIncludeStatistics', checked as boolean)}
          />
          <label htmlFor="excel-statistics" className="text-sm">Include statistics sheet</label>
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox
            id="excel-separate-sheets"
            checked={options.excelSeparateSheets}
            onCheckedChange={(checked) => onUpdate('excelSeparateSheets', checked as boolean)}
          />
          <label htmlFor="excel-separate-sheets" className="text-sm">Create separate daily sheets</label>
        </div>
      </div>
    </div>
  </div>
);