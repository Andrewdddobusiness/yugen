interface Location {
  placeId: string;
  name: string;
}

const MY_MAPS_URL = "https://www.google.com/maps/d/u/0/create";

export const exportToMyMaps = (kmlContent: string, fileName: string) => {
  // First, download the KML file
  const blob = new Blob([kmlContent], { type: "application/vnd.google-earth.kml+xml" });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${fileName}.kml`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);

  // Then open My Maps in a new tab
  window.open(MY_MAPS_URL, "_blank");
};
