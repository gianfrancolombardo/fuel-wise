import { LocationPoint, NominatimResult, RouteResult } from '../types';

const NOMINATIM_BASE = "https://nominatim.openstreetmap.org";
const OSRM_BASE = "https://router.project-osrm.org";

/**
 * Searches for a location using OpenStreetMap Nominatim API.
 */
export const searchLocation = async (query: string): Promise<LocationPoint[]> => {
  if (!query || query.length < 3) return [];

  try {
    const response = await fetch(
      `${NOMINATIM_BASE}/search?format=json&q=${encodeURIComponent(query)}&addressdetails=1&limit=5`,
      {
        headers: {
          // It is polite to send a User-Agent to OSM
          "User-Agent": "FuelWise-App/1.0"
        }
      }
    );

    if (!response.ok) throw new Error("Error en la búsqueda");

    const data: NominatimResult[] = await response.json();
    
    return data.map((item) => ({
      lat: parseFloat(item.lat),
      lon: parseFloat(item.lon),
      label: item.display_name,
    }));
  } catch (error) {
    console.error("Geocoding error:", error);
    return [];
  }
};

/**
 * Reverse geocoding to get address from coords.
 */
export const reverseGeocode = async (lat: number, lon: number): Promise<string> => {
  try {
    const response = await fetch(
      `${NOMINATIM_BASE}/reverse?format=json&lat=${lat}&lon=${lon}`,
      {
        headers: { "User-Agent": "FuelWise-App/1.0" }
      }
    );
    if (!response.ok) throw new Error("Fallo en geocodificación inversa");
    const data = await response.json();
    return data.display_name || `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
  } catch (error) {
    return `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
  }
};

/**
 * Calculates a route between two points using OSRM.
 */
export const calculateRoute = async (start: LocationPoint, end: LocationPoint): Promise<RouteResult | null> => {
  try {
    // OSRM expects lon,lat;lon,lat
    const coords = `${start.lon},${start.lat};${end.lon},${end.lat}`;
    const url = `${OSRM_BASE}/route/v1/driving/${coords}?overview=full&geometries=geojson`;
    
    const response = await fetch(url);
    if (!response.ok) throw new Error("Fallo en el cálculo de ruta");

    const data = await response.json();

    if (data.code !== "Ok" || !data.routes || data.routes.length === 0) {
      throw new Error("No se encontró ruta");
    }

    const route = data.routes[0];
    return {
      distanceKm: route.distance / 1000,
      durationMin: route.duration / 60,
      geometry: JSON.stringify(route.geometry), // Storing geojson geometry
    };
  } catch (error) {
    console.error("Routing error:", error);
    return null;
  }
};

/**
 * Mocks fetching fuel price. 
 * Real APIs for this usually require paid keys (e.g., GlobalPetrolPrices).
 */
export const fetchFuelPrice = async (): Promise<number> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      // Simulate a fluctuating market price around 1.55 - 1.70
      const randomPrice = 1.55 + Math.random() * 0.15;
      resolve(parseFloat(randomPrice.toFixed(3)));
    }, 1000);
  });
};