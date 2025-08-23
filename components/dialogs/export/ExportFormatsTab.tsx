// Export formats tab component
import React from 'react';
import { Separator } from '@/components/ui/separator';
import { FileText, Map, Calendar } from 'lucide-react';
import { ExportButton } from './ExportButton';
import { exportFormats } from './constants';
import { ExportFormat } from './types';

interface ExportFormatsTabProps {
  onExport: (format: string) => void;
  isExporting: boolean;
  exportingFormat: string;
}

export const ExportFormatsTab: React.FC<ExportFormatsTabProps> = ({
  onExport,
  isExporting,
  exportingFormat,
}) => {
  const formatsByCategory = Object.values(exportFormats).reduce((acc, format) => {
    if (!acc[format.category]) {
      acc[format.category] = [];
    }
    acc[format.category].push(format);
    return acc;
  }, {} as Record<string, ExportFormat[]>);

  const categoryIcons = {
    document: FileText,
    map: Map,
    calendar: Calendar,
  };

  const categoryTitles = {
    document: 'Document Formats',
    map: 'Map Formats',
    calendar: 'Calendar Formats',
  };

  return (
    <div className="space-y-6">
      {Object.entries(formatsByCategory).map(([category, formats], index) => {
        const Icon = categoryIcons[category as keyof typeof categoryIcons];
        const title = categoryTitles[category as keyof typeof categoryTitles];

        return (
          <React.Fragment key={category}>
            {index > 0 && <Separator />}
            <div>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Icon className="h-4 w-4" />
                {title}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {formats.map((format) => (
                  <ExportButton
                    key={format.id}
                    format={format.id}
                    icon={format.icon}
                    title={format.title}
                    description={format.description}
                    badge={format.badge}
                    onClick={() => onExport(format.id)}
                    isExporting={isExporting}
                    exportingFormat={exportingFormat}
                  />
                ))}
              </div>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
};