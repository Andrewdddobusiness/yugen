import { TableCell, TableRow } from "@/components/ui/table";

interface ItineraryTableDateHeaderProps {
  date: string;
  formatDate: (date: string) => string;
}

export function ItineraryTableDateHeader({ date, formatDate }: ItineraryTableDateHeaderProps) {
  return (
    <TableRow key={`header-${date}`} className="flex w-full bg-gray-50">
      <TableCell colSpan={7} className="py-2 font-semibold text-gray-700 text-md">
        {formatDate(date)}
      </TableCell>
    </TableRow>
  );
}
