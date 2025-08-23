import { useEffect, useState } from "react";
import { useMap } from "@vis.gl/react-google-maps";
import LoadingSpinner from "@/components/loading/LoadingSpinner";

interface DeckGLOverlayProps {
  data: GeoJSON.FeatureCollection;
  onAreaClick: (properties: any) => void;
}

export function DeckGLOverlay({ data, onAreaClick }: DeckGLOverlayProps) {
  const map = useMap("map-instance");
  const [hoveredArea, setHoveredArea] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!map || !data) return;

    const dataLayer = new google.maps.Data();
    dataLayer.addGeoJson(data);

    // Create the styles object with transitions
    const styles = {
      default: {
        fillColor: "#9ECAE1",
        fillOpacity: 0.2,
        strokeColor: "#3A86FF",
        strokeWeight: 2,
        strokeOpacity: 0.8,
        transition: "all 0.3s ease-in-out",
      },
      hovered: {
        fillColor: "#9ECAE1",
        fillOpacity: 0.4,
        strokeColor: "#3A86FF",
        strokeWeight: 3,
        strokeOpacity: 1,
        transition: "all 0.3s ease-in-out",
      },
    };

    // Set the styling with transitions
    dataLayer.setStyle((feature: any) => {
      const isHovered = feature.getProperty("name") === hoveredArea;
      const style = isHovered ? styles.hovered : styles.default;

      return {
        ...style,
        // Add animation styling
        animation: isHovered ? "fadeIn 0.3s ease-in-out" : undefined,
      };
    });

    // Add event listeners
    dataLayer.addListener("mouseover", (event: any) => {
      const feature = event.feature;
      setHoveredArea(feature.getProperty("name"));

      // Apply hover styling immediately
      dataLayer.overrideStyle(feature, styles.hovered);
    });

    dataLayer.addListener("mouseout", (event: any) => {
      const feature = event.feature;
      setHoveredArea(null);

      // Reset to default styling
      dataLayer.revertStyle(feature);
    });

    dataLayer.addListener("click", (event: any) => {
      setIsLoading(true);
      onAreaClick({
        name: event.feature.getProperty("name"),
        city: event.feature.getProperty("city"),
      });
      setIsLoading(false);
    });

    // Set the layer onto the map
    dataLayer.setMap(map);

    // Add CSS animation to the document
    const style = document.createElement("style");
    style.textContent = `
      @keyframes fadeIn {
        from {
          fillOpacity: 0.2;
          strokeOpacity: 0.8;
        }
        to {
          fillOpacity: 0.4;
          strokeOpacity: 1;
        }
      }
    `;
    document.head.appendChild(style);

    // Cleanup
    return () => {
      dataLayer.setMap(null);
      document.head.removeChild(style);
    };
  }, [map, data, hoveredArea, onAreaClick]);

  return (
    <>
      {hoveredArea && (
        <div
          className="absolute top-0 left-0 bg-white/80 p-2 m-2 rounded-md shadow-sm z-50"
          style={{
            transition: "opacity 0.3s ease-in-out",
          }}
        >
          {hoveredArea}
        </div>
      )}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/20">
          <LoadingSpinner />
        </div>
      )}
    </>
  );
}
