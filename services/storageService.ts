import { Vehicle } from '../types';

const KEYS = {
  VEHICLES: 'fuelwise_vehicles',
  SELECTED_VEHICLE_ID: 'fuelwise_selected_vehicle_id',
  LAST_PRICE: 'fuelwise_last_price'
};

export const getStoredVehicles = (): Vehicle[] => {
  try {
    const data = localStorage.getItem(KEYS.VEHICLES);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error("Failed to load vehicles", e);
    return [];
  }
};

export const saveStoredVehicles = (vehicles: Vehicle[]) => {
  localStorage.setItem(KEYS.VEHICLES, JSON.stringify(vehicles));
};

export const getStoredSelectedVehicleId = (): string | null => {
  return localStorage.getItem(KEYS.SELECTED_VEHICLE_ID);
};

export const saveStoredSelectedVehicleId = (id: string) => {
  localStorage.setItem(KEYS.SELECTED_VEHICLE_ID, id);
};

export const getStoredPrice = (): number | null => {
  const data = localStorage.getItem(KEYS.LAST_PRICE);
  return data ? parseFloat(data) : null;
};

export const saveStoredPrice = (price: number) => {
  localStorage.setItem(KEYS.LAST_PRICE, price.toString());
};
