export enum FuelUnit {
  L_PER_100KM = "L_PER_100KM",
  KM_PER_L = "KM_PER_L"
}

export interface Vehicle {
  id: string;
  name: string;
  fuelType: "diesel" | "gasoline";
  consumptionValue: number;
  consumptionUnit: FuelUnit;
}

export interface LocationPoint {
  lat: number;
  lon: number;
  label: string;
}

export interface RouteResult {
  distanceKm: number;
  durationMin: number;
  geometry: string; // encoded polyline
}

export interface NominatimResult {
  place_id: number;
  lat: string;
  lon: string;
  display_name: string;
}

export interface FuelPriceData {
  price: number;
  lastUpdated: string;
  isAuto: boolean;
}

export interface TripCalculation {
  litersNeeded: number;
  totalCost: number;
  costPer100Km: number;
}
