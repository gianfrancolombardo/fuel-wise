import React, { useState, useEffect, useRef } from 'react';
import { Card, Button, Input } from './components/ui/LayoutComponents';
import { Map } from './components/Map';
import { VehicleManager } from './components/VehicleManager';
import { Vehicle, LocationPoint, RouteResult, FuelUnit, FuelPriceData, TripCalculation } from './types';
import { searchLocation, reverseGeocode, calculateRoute, fetchFuelPrice } from './services/apiService';
import { getStoredVehicles, saveStoredVehicles, getStoredSelectedVehicleId, saveStoredSelectedVehicleId, getStoredPrice, saveStoredPrice } from './services/storageService';
import { getVehicles, saveVehicle, deleteVehicle } from './services/vehicleService';
import { MapPin, Navigation, LocateFixed, ArrowLeftRight, Settings2, Info, RefreshCcw, ChevronsUp, Car, Route } from 'lucide-react';

// Hook for Debounce
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  return debouncedValue;
}

const App: React.FC = () => {
  // --- State: Vehicles ---
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);

  // --- State: Trip ---
  const [origin, setOrigin] = useState<LocationPoint | null>(null);
  const [destination, setDestination] = useState<LocationPoint | null>(null);
  const [route, setRoute] = useState<RouteResult | null>(null);
  const [isRouting, setIsRouting] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);

  // --- State: Inputs & UI ---
  const [originQuery, setOriginQuery] = useState("");
  const [destQuery, setDestQuery] = useState("");
  const [originSuggestions, setOriginSuggestions] = useState<LocationPoint[]>([]);
  const [destSuggestions, setDestSuggestions] = useState<LocationPoint[]>([]);
  const [isLocatingUser, setIsLocatingUser] = useState(false);
  const [activeTab, setActiveTab] = useState<'trip' | 'vehicle'>('trip'); // Mobile tab switching

  // Debounced Queries
  const debouncedOriginQuery = useDebounce(originQuery, 400);
  const debouncedDestQuery = useDebounce(destQuery, 400);

  // --- State: Fuel Price ---
  const [fuelPrice, setFuelPrice] = useState<FuelPriceData>({
    price: 1.60,
    lastUpdated: new Date().toISOString(),
    isAuto: true
  });
  const [priceLoading, setPriceLoading] = useState(false);

  // --- State: Calculation ---
  const [calculation, setCalculation] = useState<TripCalculation | null>(null);

  // --- Initialization ---
  useEffect(() => {
    const initializeData = async () => {
      // Fetch from Firebase
      try {
        const firebaseVehicles = await getVehicles();
        if (firebaseVehicles.length > 0) {
          setVehicles(firebaseVehicles);
        } else {
          // Fallback to local storage if Firebase is empty (for migration/first time)
          const storedVehicles = getStoredVehicles();
          setVehicles(storedVehicles);
          // Optionally sync local to Firebase if desired, but let's keep it simple
        }
      } catch (error) {
        console.error("Error fetching vehicles from Firebase:", error);
        const storedVehicles = getStoredVehicles();
        setVehicles(storedVehicles);
      }

      const storedId = getStoredSelectedVehicleId();
      // Use vehicles from state since it might have been updated by firebase fetch
      // But since setVehicles is async, we need to be careful.
      // Let's use the local context of vehicles.
    };

    initializeData();

    const storedPrice = getStoredPrice();
    if (storedPrice) {
      setFuelPrice(prev => ({ ...prev, price: storedPrice, isAuto: false }));
    } else {
      refreshFuelPrice();
    }
  }, []);

  // Update selected vehicle after vehicles list is loaded
  useEffect(() => {
    if (vehicles.length > 0 && !selectedVehicleId) {
      const storedId = getStoredSelectedVehicleId();
      if (storedId && vehicles.find(v => v.id === storedId)) {
        setSelectedVehicleId(storedId);
      } else {
        setSelectedVehicleId(vehicles[0].id);
      }
    }
  }, [vehicles, selectedVehicleId]);

  // --- Effects: Persistence ---
  useEffect(() => { saveStoredVehicles(vehicles); }, [vehicles]);
  useEffect(() => { if (selectedVehicleId) saveStoredSelectedVehicleId(selectedVehicleId); }, [selectedVehicleId]);
  useEffect(() => { saveStoredPrice(fuelPrice.price); }, [fuelPrice.price]);

  // --- Effects: Autocomplete ---
  useEffect(() => {
    // If the query matches the selected point label, don't search again (avoids reopening dropdown on selection)
    if (origin && origin.label === debouncedOriginQuery) {
      setOriginSuggestions([]);
      return;
    }
    if (debouncedOriginQuery.length > 2) {
      searchLocation(debouncedOriginQuery).then(setOriginSuggestions);
    } else {
      setOriginSuggestions([]);
    }
  }, [debouncedOriginQuery, origin]);

  useEffect(() => {
    if (destination && destination.label === debouncedDestQuery) {
      setDestSuggestions([]);
      return;
    }
    if (debouncedDestQuery.length > 2) {
      searchLocation(debouncedDestQuery).then(setDestSuggestions);
    } else {
      setDestSuggestions([]);
    }
  }, [debouncedDestQuery, destination]);

  // --- Effects: Routing & Calc ---
  useEffect(() => {
    if (origin && destination) handleCalculateRoute();
  }, [origin, destination]);

  useEffect(() => {
    calculateCost();
  }, [route, selectedVehicleId, fuelPrice]);

  // --- Handlers ---
  const handleSaveVehicle = async (v: Vehicle) => {
    try {
      await saveVehicle(v);
      setVehicles(prev => {
        const idx = prev.findIndex(item => item.id === v.id);
        if (idx >= 0) {
          const updated = [...prev];
          updated[idx] = v;
          return updated;
        }
        return [...prev, v];
      });
      if (!selectedVehicleId) setSelectedVehicleId(v.id);
    } catch (error) {
      console.error("Error saving vehicle to Firebase:", error);
      alert("Error al guardar el vehículo en la nube.");
    }
  };

  const handleDeleteVehicle = async (id: string) => {
    try {
      await deleteVehicle(id);
      setVehicles(prev => prev.filter(v => v.id !== id));
      if (selectedVehicleId === id) setSelectedVehicleId(null);
    } catch (error) {
      console.error("Error deleting vehicle from Firebase:", error);
      alert("Error al eliminar el vehículo de la nube.");
    }
  };

  const handleUserLocation = () => {
    if (!navigator.geolocation) {
      alert("La geolocalización no está soportada en este navegador");
      return;
    }
    setIsLocatingUser(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        const label = await reverseGeocode(latitude, longitude);
        const point = { lat: latitude, lon: longitude, label: label };
        setOrigin(point);
        setOriginQuery(label);
        setIsLocatingUser(false);
      },
      (err) => {
        console.error(err);
        setIsLocatingUser(false);
      }
    );
  };

  const selectSuggestion = (point: LocationPoint, type: 'origin' | 'dest') => {
    if (type === 'origin') {
      setOrigin(point);
      setOriginQuery(point.label);
      setOriginSuggestions([]);
    } else {
      setDestination(point);
      setDestQuery(point.label);
      setDestSuggestions([]);
    }
  };

  const handleSwap = () => {
    const tempPoint = origin;
    const tempQuery = originQuery;
    setOrigin(destination);
    setOriginQuery(destQuery);
    setDestination(tempPoint);
    setDestQuery(tempQuery);
  };

  const handleCalculateRoute = async () => {
    if (!origin || !destination) return;
    setIsRouting(true);
    setRouteError(null);
    const result = await calculateRoute(origin, destination);
    if (result) {
      setRoute(result);
    } else {
      setRouteError("Ruta no encontrada. Intenta puntos más cercanos a carreteras.");
      setRoute(null);
    }
    setIsRouting(false);
  };

  const refreshFuelPrice = async () => {
    setPriceLoading(true);
    try {
      const price = await fetchFuelPrice();
      setFuelPrice({ price, lastUpdated: new Date().toISOString(), isAuto: true });
    } catch { /* ignore */ }
    finally { setPriceLoading(false); }
  };

  const calculateCost = () => {
    if (!route || !selectedVehicleId) {
      setCalculation(null);
      return;
    }
    const vehicle = vehicles.find(v => v.id === selectedVehicleId);
    if (!vehicle) return;

    let lPer100 = vehicle.consumptionValue;
    if (vehicle.consumptionUnit === FuelUnit.KM_PER_L) {
      lPer100 = 100 / vehicle.consumptionValue;
    }
    const litersNeeded = route.distanceKm * (lPer100 / 100);
    const totalCost = litersNeeded * fuelPrice.price;

    setCalculation({
      litersNeeded,
      totalCost,
      costPer100Km: lPer100 * fuelPrice.price
    });
  };

  const selectedVehicle = vehicles.find(v => v.id === selectedVehicleId);

  return (
    <div className="h-[100dvh] md:h-screen flex flex-col md:flex-row bg-slate-950 text-slate-100 overflow-hidden">

      {/* --- Mobile: Tab Switcher (Fixed Top) --- */}
      <div className="md:hidden flex-none z-50 bg-slate-900 border-b border-slate-800 px-4 py-2 flex gap-4 shadow-lg shrink-0">
        <button
          onClick={() => setActiveTab('trip')}
          className={`flex-1 py-2 text-sm font-medium rounded-lg flex items-center justify-center gap-2 transition-colors ${activeTab === 'trip' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
        >
          <Route size={16} /> Planificar
        </button>
        <button
          onClick={() => setActiveTab('vehicle')}
          className={`flex-1 py-2 text-sm font-medium rounded-lg flex items-center justify-center gap-2 transition-colors ${activeTab === 'vehicle' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
        >
          <Car size={16} /> Vehículos
        </button>
      </div>

      {/* --- Sidebar / Controls --- */}
      <div className={`
        bg-slate-950 border-r border-slate-900 shadow-2xl z-20 flex flex-col md:flex-none
        w-full md:w-[420px] 
        ${activeTab === 'vehicle' ? 'flex-1 md:h-full' : 'flex-1 md:h-full'}
        overflow-hidden
        order-2 md:order-1
      `}>

        {/* Desktop Header */}
        <div className="hidden md:flex flex-none px-6 py-5 border-b border-slate-800 items-center justify-between bg-slate-900">
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-indigo-500/20 rounded-lg border border-indigo-500/30">
              <Navigation size={20} className="text-indigo-400" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-white">FuelWise</h1>
          </div>
          <div className="text-[10px] font-bold bg-indigo-500/10 border border-indigo-500/20 px-2 py-1 rounded text-indigo-300">BETA</div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-6 pb-24 md:pb-6 relative">

          {/* Section: Vehicle List (Shown when 'vehicle' is active OR on Desktop) */}
          <div className={`${activeTab === 'vehicle' ? 'block' : 'hidden md:block'}`}>
            <Card title="Mi Garaje" icon={<Car size={16} />}>
              <VehicleManager
                vehicles={vehicles}
                onSave={handleSaveVehicle}
                onDelete={handleDeleteVehicle}
                onSelect={(id) => {
                  setSelectedVehicleId(id);
                  if (window.innerWidth < 768) setActiveTab('trip');
                }}
                selectedId={selectedVehicleId}
              />
            </Card>
          </div>

          {/* Section: Trip Controls (Shown when 'trip' is active OR on Desktop) */}
          <div className={`${activeTab === 'trip' ? 'block' : 'hidden md:block'}`}>

            {/* 
                Z-INDEX FIX: Explicitly set z-30 for the wrapper of this card 
                so its dropdowns float above the next card (Fuel Price).
            */}
            <div className="relative z-30">
              <Card title="Ruta y Destino" icon={<MapPin size={16} />} className="overflow-visible">
                <div className="relative space-y-5">
                  {/* Swap Button */}
                  <button
                    onClick={handleSwap}
                    className="absolute top-[38px] right-3 z-10 p-2 bg-slate-800 border border-slate-700 rounded-full text-slate-400 hover:text-indigo-400 hover:border-indigo-500 hover:bg-slate-700 shadow-lg transition-all"
                    title="Intercambiar origen y destino"
                  >
                    <ArrowLeftRight size={14} />
                  </button>

                  {/* Origin Input */}
                  <div className="relative z-20">
                    <Input
                      label="Origen"
                      icon={<div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />}
                      placeholder="Ubicación actual..."
                      value={originQuery}
                      onChange={(e) => setOriginQuery(e.target.value)}
                      rightElement={
                        !originQuery ? (
                          <button onClick={handleUserLocation} className="p-1 text-indigo-400 hover:text-indigo-300 transition-colors" title="Usar GPS">
                            {isLocatingUser ? <span className="animate-spin block">↻</span> : <LocateFixed size={16} />}
                          </button>
                        ) : (
                          <button onClick={() => { setOriginQuery(''); setOrigin(null); }} className="p-1 text-slate-500 hover:text-slate-300">
                            ×
                          </button>
                        )
                      }
                    />
                    {/* Suggestions */}
                    {originSuggestions.length > 0 && (
                      <ul className="absolute z-50 w-full bg-slate-900 border border-slate-700 rounded-lg shadow-2xl mt-1 max-h-56 overflow-auto">
                        {originSuggestions.map((s, i) => (
                          <li key={i} onClick={() => selectSuggestion(s, 'origin')} className="px-4 py-3 hover:bg-slate-800 cursor-pointer text-sm text-slate-300 border-b border-slate-800 last:border-0 flex items-center gap-2">
                            <MapPin size={12} className="text-slate-500" /> <span className="truncate">{s.label}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {/* Destination Input */}
                  <div className="relative z-10">
                    <Input
                      label="Destino"
                      icon={<div className="h-2 w-2 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]" />}
                      placeholder="Ciudad, dirección..."
                      value={destQuery}
                      onChange={(e) => setDestQuery(e.target.value)}
                      rightElement={destQuery && (
                        <button onClick={() => { setDestQuery(''); setDestination(null); }} className="p-1 text-slate-500 hover:text-slate-300">
                          ×
                        </button>
                      )}
                    />
                    {/* Suggestions */}
                    {destSuggestions.length > 0 && (
                      <ul className="absolute z-50 w-full bg-slate-900 border border-slate-700 rounded-lg shadow-2xl mt-1 max-h-56 overflow-auto">
                        {destSuggestions.map((s, i) => (
                          <li key={i} onClick={() => selectSuggestion(s, 'dest')} className="px-4 py-3 hover:bg-slate-800 cursor-pointer text-sm text-slate-300 border-b border-slate-800 last:border-0 flex items-center gap-2">
                            <MapPin size={12} className="text-slate-500" /> <span className="truncate">{s.label}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {/* Route Info */}
                  {isRouting && (
                    <div className="flex items-center gap-3 p-3 bg-slate-900/50 rounded-lg border border-indigo-500/20">
                      <div className="animate-spin h-4 w-4 border-2 border-indigo-500 rounded-full border-t-transparent"></div>
                      <span className="text-xs text-indigo-300">Calculando mejor ruta...</span>
                    </div>
                  )}

                  {routeError && (
                    <div className="p-3 bg-red-500/10 text-red-400 text-xs rounded-lg border border-red-500/20 flex items-center gap-2">
                      <Info size={14} /> {routeError}
                    </div>
                  )}

                  {route && !isRouting && (
                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700 text-center">
                        <span className="block text-[10px] text-slate-500 uppercase font-bold tracking-wider">Distancia</span>
                        <span className="text-lg font-bold text-slate-200">{route.distanceKm.toFixed(1)} <span className="text-sm font-normal text-slate-500">km</span></span>
                      </div>
                      <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700 text-center">
                        <span className="block text-[10px] text-slate-500 uppercase font-bold tracking-wider">Tiempo</span>
                        <span className="text-lg font-bold text-slate-200">{Math.round(route.durationMin)} <span className="text-sm font-normal text-slate-500">min</span></span>
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            </div>

            {/* Section: Fuel Price (Shown when 'trip' is active OR on Desktop) */}
            {/* Z-INDEX FIX: z-20 (lower than above) so it stays under dropdowns */}
            <div className={`mt-6 relative z-20 ${activeTab === 'trip' ? 'block' : 'hidden md:block'}`}>
              <Card title="Configuración de Combustible" icon={<Settings2 size={16} />}>

                {/* Header Layout for Label + Badge */}
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider">Precio por Litro (€)</label>

                  {/* Badge moved here for better alignment and cleanliness */}
                  <div className={`text-[10px] font-bold px-2 py-0.5 rounded border ${fuelPrice.isAuto ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'}`}>
                    {fuelPrice.isAuto ? 'AUTO' : 'MANUAL'}
                  </div>
                </div>

                <Input
                  type="number"
                  step="0.001"
                  value={fuelPrice.price}
                  onChange={(e) => setFuelPrice({ ...fuelPrice, price: parseFloat(e.target.value), isAuto: false })}
                  // Professional Refresh Button: Animation applies to Icon only
                  rightElement={
                    <button
                      onClick={refreshFuelPrice}
                      className={`p-2 mr-[-8px] rounded-lg hover:bg-slate-800 text-slate-500 hover:text-indigo-400 transition-colors group`}
                      title="Actualizar precio automático"
                    >
                      <RefreshCcw size={16} className={`transition-transform duration-700 ${priceLoading ? 'animate-spin' : 'group-hover:rotate-180'}`} />
                    </button>
                  }
                />

                <div className="mt-3 flex items-center justify-between text-[10px] text-slate-500">
                  <span>Actualizado: {new Date(fuelPrice.lastUpdated).toLocaleDateString()}</span>
                  {fuelPrice.isAuto && <span className="flex items-center gap-1"><Info size={10} /> Media Mercado</span>}
                </div>
              </Card>
            </div>
          </div>
        </div>

        {/* Footer: Result (Sticky at bottom of sidebar container) */}
        <div className="flex-none bg-slate-900 border-t border-indigo-500/30 p-4 md:p-6 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.5)] z-30">
          {!selectedVehicle ? (
            <div className="flex items-center justify-between text-slate-400 text-sm">
              <span>Selecciona un vehículo</span>
              <Button size="sm" variant="secondary" onClick={() => {
                if (window.innerWidth < 768) setActiveTab('vehicle');
              }}>Seleccionar</Button>
            </div>
          ) : !route ? (
            <div className="text-center text-slate-500 text-sm italic">Introduce origen y destino</div>
          ) : calculation ? (
            <div className="flex justify-between items-center">
              <div>
                <p className="text-indigo-400 text-[10px] font-bold uppercase tracking-wider mb-0.5">Coste Estimado</p>
                <div className="text-3xl font-bold text-white tracking-tight leading-none">
                  {calculation.totalCost.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  <span className="text-slate-300">{calculation.litersNeeded.toFixed(1)} L</span> necesarios
                </p>
              </div>
              <div className="text-right pl-4 border-l border-slate-800">
                <div className="text-[10px] text-slate-500 uppercase font-medium">Coste / 100km</div>
                <div className="font-mono text-lg text-emerald-400 font-medium">
                  {calculation.costPer100Km.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center text-sm text-slate-400">Calculando...</div>
          )}
        </div>
      </div>

      {/* --- Map View --- */}
      {/* On Mobile: Order 1 (Top). On Desktop: Order 2 (Right) */}
      <div className={`
         bg-slate-950 relative
         ${activeTab === 'vehicle' ? 'hidden md:block h-0 md:h-full' : 'h-[40vh] md:h-full w-full flex-none md:flex-1'}
         order-1 md:order-2
         transition-all duration-300
      `}>
        <Map
          origin={origin}
          destination={destination}
          routeGeometry={route ? route.geometry : null}
        />
        {/* Overlay Gradients for smooth blending */}
        <div className="pointer-events-none absolute top-0 left-0 right-0 h-12 bg-gradient-to-b from-slate-950/80 to-transparent z-[400] md:hidden"></div>
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-slate-950 to-transparent z-[400] md:hidden"></div>
      </div>
    </div>
  );
};

export default App;