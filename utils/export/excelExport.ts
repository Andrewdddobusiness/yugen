import * as XLSX from "xlsx";
import { format } from "date-fns";
import { IItineraryActivity } from "@/store/itineraryActivityStore";

interface ItineraryDetails {
  city: string;
  country: string;
  fromDate: Date;
  toDate: Date;
  activities: IItineraryActivity[];
}

export const exportToExcel = (itineraryDetails: ItineraryDetails) => {
  const workbook = XLSX.utils.book_new();

  // Transform activities into rows
  const rows = itineraryDetails.activities
    .filter((activity) => !activity.deleted_at)
    .map((activity) => ({
      Date: activity.date ? format(new Date(activity.date), "yyyy-MM-dd") : "",
      "Start Time": activity.start_time || "",
      "End Time": activity.end_time || "",
      Name: activity.activity?.name || "",
      Description: activity.activity?.description || "",
      Address: activity.activity?.address || "",
      "Phone Number": activity.activity?.phone_number || "",
      Rating: activity.activity?.rating || "",
      "Price Level": activity.activity?.price_level || "",
      "Google Maps URL": activity.activity?.google_maps_url || "",
      Website: activity.activity?.website_url || "",
    }));

  // Create worksheet
  const worksheet = XLSX.utils.json_to_sheet([]);

  // Add header information
  XLSX.utils.sheet_add_aoa(
    worksheet,
    [
      [`${itineraryDetails.city}, ${itineraryDetails.country} Itinerary`],
      [`From: ${format(itineraryDetails.fromDate, "PPP")} To: ${format(itineraryDetails.toDate, "PPP")}`],
      [], // Empty row for spacing
    ],
    { origin: "A1" }
  );

  // Add the data starting after the header
  XLSX.utils.sheet_add_json(worksheet, rows, {
    origin: "A4",
    skipHeader: false,
  });

  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(workbook, worksheet, "Itinerary");

  // Save the workbook
  XLSX.writeFile(workbook, `${itineraryDetails.city}_itinerary.xlsx`);
};
