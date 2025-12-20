import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { IItineraryActivity } from "@/store/itineraryActivityStore";

interface ItineraryActivity {
  id: string;
  title: string;
  date: Date;
  time?: string;
  endTime?: string;
  duration?: string;
  location?: string;
  description?: string;
  price?: number;
}

interface ItineraryDetails {
  city: string;
  country: string;
  fromDate: Date;
  toDate: Date;
  activities: IItineraryActivity[];
}

// Add helper function for duration calculation
const calculateDuration = (startTime: string, endTime: string): string => {
  const [startHours, startMinutes] = startTime.split(":").map(Number);
  const [endHours, endMinutes] = endTime.split(":").map(Number);

  let diffMinutes = endHours * 60 + endMinutes - (startHours * 60 + startMinutes);
  if (diffMinutes < 0) diffMinutes += 24 * 60; // Handle overnight activities

  const hours = Math.floor(diffMinutes / 60);
  const minutes = diffMinutes % 60;

  if (hours === 0) return `(${minutes} Min)`;
  if (minutes === 0) return `(${hours} Hour${hours > 1 ? "s" : ""})`;
  return `(${hours} Hour${hours > 1 ? "s" : ""}, ${minutes} Min)`;
};

// Update time formatting
const formatTime = (time: string): string => {
  const [hours, minutes] = time.split(":");
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? " PM" : " AM"; // Added space before AM/PM
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minutes}${ampm}`;
};

export const exportToPDF = async (itineraryDetails: ItineraryDetails) => {
  const pdf = new jsPDF("p", "mm", "a4");
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  let yPos = 20;

  // Set the page break threshold to leave some margin at bottom
  const pageBreakThreshold = pageHeight - 20; // Changed from 250 to ~277 (297 - 20)

  // Constants for layout - using columnGap to calculate rightColumnX
  const leftColumnX = 20; // Time column start
  const leftColumnWidth = 45; // Width of left column
  const columnGap = 10; // Gap between columns
  const rightColumnX = leftColumnX + leftColumnWidth + columnGap; // Calculated based on gap

  // Add title
  pdf.setFontSize(20);
  pdf.setTextColor(0, 0, 0);
  pdf.text(`${itineraryDetails.city}, ${itineraryDetails.country}`, pageWidth / 2, yPos, { align: "center" });

  // Add dates
  yPos += 10;
  pdf.setFontSize(12);
  pdf.text(`${formatDate(itineraryDetails.fromDate)} - ${formatDate(itineraryDetails.toDate)}`, pageWidth / 2, yPos, {
    align: "center",
  });

  // Group activities by date
  const groupedActivities = groupActivitiesByDate(
    itineraryDetails.activities
      .filter(activity => activity.date)
      .map((activity) => ({
        id: activity.itinerary_activity_id,
        title: activity.activity?.name || "",
        date: new Date(activity.date as string),
      time: activity.start_time ? formatTime(activity.start_time) : "",
      endTime: activity.end_time ? formatTime(activity.end_time) : "",
      duration:
        activity.start_time && activity.end_time ? calculateDuration(activity.start_time, activity.end_time) : "",
      location: activity.activity?.address,
      description: activity.activity?.description,
    }))
  );

  // Add activities
  for (const [date, activities] of Object.entries(groupedActivities)) {
    if (activities[0].id === itineraryDetails.activities[0].itinerary_activity_id) {
      yPos += 12;
    }
    // Add divider line before each date group (except the first one)
    if (activities[0].id !== itineraryDetails.activities[0].itinerary_activity_id) {
      pdf.setDrawColor(200, 200, 200); // Light gray color
      pdf.setLineWidth(0.2);
      pdf.line(leftColumnX, yPos - 2, pageWidth - 20, yPos - 2);
      yPos += 8;
    }

    // Check if we need a new page
    if (yPos > pageBreakThreshold) {
      pdf.addPage();
      yPos = 20;
    }

    // Add date header - spans both columns
    pdf.setFontSize(14);
    pdf.setTextColor(51, 51, 51);
    pdf.text(formatDate(new Date(date)), leftColumnX, yPos);

    // Add activities for this date
    yPos += 8; // Reduced space after date header
    pdf.setFontSize(12);
    pdf.setTextColor(0, 0, 0);

    activities.forEach((activity) => {
      const startingYPos = yPos;

      // Check if we need a new page
      if (yPos > pageBreakThreshold) {
        pdf.addPage();
        yPos = 20;
      }

      // Left Column: Time and Duration
      if (activity.time) {
        // Time
        pdf.setFont("Helvetica", "normal");
        pdf.setFontSize(10);
        pdf.setTextColor(0, 0, 0);
        const timeText = activity.endTime
          ? `${activity.time} - ${activity.endTime}` // Removed line break
          : activity.time;
        pdf.text(timeText, leftColumnX, yPos);
        yPos += 6; // Reduced from 8

        // Duration
        if (activity.duration) {
          pdf.setTextColor(102, 102, 102);
          pdf.text(activity.duration, leftColumnX, yPos);
          yPos += 4;
        }
      }

      // Reset yPos for right column
      yPos = startingYPos;

      // Right Column: Activity Details
      // Activity title
      pdf.setFont("Helvetica", "bold");
      pdf.setFontSize(12);
      pdf.setTextColor(0, 0, 0);
      pdf.text(activity.title, rightColumnX, yPos);
      yPos += 6;

      // Location
      if (activity.location) {
        pdf.setFont("Helvetica", "normal");
        pdf.setTextColor(102, 102, 102);
        pdf.setFontSize(10);
        pdf.text(activity.location, rightColumnX, yPos);
        yPos += 6;
      }

      // Description - adjusted width calculation using column positions
      if (activity.description) {
        pdf.setFont("Helvetica", "normal");
        pdf.setTextColor(51, 51, 51);
        const descriptionWidth = pageWidth - rightColumnX - 20;
        const lines = pdf.splitTextToSize(activity.description, descriptionWidth);
        lines.forEach((line: string) => {
          if (yPos > pageBreakThreshold) {
            pdf.addPage();
            yPos = 20;
          }
          pdf.text(line, rightColumnX, yPos);
          yPos += 6;
        });
      }

      yPos += 6; // Reduced from 8 for less space between activities
    });
  }

  // Save the PDF
  pdf.save(`${itineraryDetails.city}_itinerary.pdf`);
};

// Helper functions
const formatDate = (date: Date): string => {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(date));
};

const groupActivitiesByDate = (activities: ItineraryActivity[]) => {
  return activities.reduce((groups: { [key: string]: ItineraryActivity[] }, activity) => {
    const date = new Date(activity.date).toDateString();
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(activity);
    return groups;
  }, {});
};
