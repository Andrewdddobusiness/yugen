// Define exact mappings between zoom levels and radius values
export const zoomRadiusMap = {
  10: 75000, // City level
  11: 40000,
  12: 20000,
  13: 10000,
  14: 5000,
  15: 2500,
  16: 1250,
  17: 600, // Street level
} as const;

// Helper functions
export const getRadiusForZoom = (zoom: number): number => {
  // Round to nearest zoom level
  const nearestZoom = Math.round(zoom);

  // Clamp zoom to our defined range
  if (nearestZoom <= 10) return zoomRadiusMap[10];
  if (nearestZoom >= 17) return zoomRadiusMap[17];

  // Get the two closest zoom levels
  const lowerZoom = Math.floor(zoom);
  const upperZoom = Math.ceil(zoom);

  // Linear interpolation between the two radius values
  const zoomFraction = zoom - lowerZoom;
  const lowerRadius = zoomRadiusMap[lowerZoom as keyof typeof zoomRadiusMap];
  const upperRadius = zoomRadiusMap[upperZoom as keyof typeof zoomRadiusMap];

  return Math.round(lowerRadius + (upperRadius - lowerRadius) * zoomFraction);
};
