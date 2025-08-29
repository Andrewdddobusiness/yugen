// Export button component
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, Download } from 'lucide-react';
import { ExportButtonProps } from './types';

export const ExportButton: React.FC<ExportButtonProps> = ({ 
  format, 
  icon: Icon, 
  title, 
  description, 
  badge, 
  onClick,
  isExporting,
  exportingFormat
}) => (
  <Card className="cursor-pointer hover:shadow-md transition-shadow">
    <CardHeader className="pb-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Icon className="h-5 w-5 text-blue-600" />
          <CardTitle className="text-sm">{title}</CardTitle>
        </div>
        {badge && <Badge variant="secondary" className="text-xs">{badge}</Badge>}
      </div>
      <CardDescription className="text-xs">{description}</CardDescription>
    </CardHeader>
    <CardContent className="pt-0">
      <Button
        size="sm"
        className="w-full"
        onClick={onClick}
        disabled={isExporting}
      >
        {isExporting && exportingFormat === format ? (
          <>
            <Clock className="h-3 w-3 mr-1 animate-spin" />
            Exporting...
          </>
        ) : (
          <>
            <Download className="h-3 w-3 mr-1" />
            Export
          </>
        )}
      </Button>
    </CardContent>
  </Card>
);