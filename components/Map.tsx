import React, { useEffect, useRef } from 'react';
import { LocationPoint } from '../types';

declare global {
  interface Window {
    L: any;
  }
}

interface MapProps {
  origin: LocationPoint | null;
  destination: LocationPoint | null;
  routeGeometry: string | null;
  className?: string;
}

export const Map: React.FC<MapProps> = ({ origin, destination, routeGeometry, className }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const layerGroupRef = useRef<any>(null);

  // Initialize Map
  useEffect(() => {
    if (mapContainerRef.current && !mapInstanceRef.current && window.L) {
      mapInstanceRef.current = window.L.map(mapContainerRef.current, {
        zoomControl: false // We can add custom controls or move them
      }).setView([40.4168, -3.7038], 5);

      // CartoDB Dark Matter Tiles (Free for non-commercial use)
      window.L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 20
      }).addTo(mapInstanceRef.current);

      layerGroupRef.current = window.L.layerGroup().addTo(mapInstanceRef.current);
      
      // Add zoom control to bottom right
      window.L.control.zoom({
        position: 'bottomright'
      }).addTo(mapInstanceRef.current);
    }

    // Cleanup
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update Markers & Route
  useEffect(() => {
    if (!mapInstanceRef.current || !layerGroupRef.current || !window.L) return;

    const L = window.L;
    const layerGroup = layerGroupRef.current;
    const map = mapInstanceRef.current;

    layerGroup.clearLayers();

    const bounds = L.latLngBounds();
    let hasBounds = false;

    // Origin Marker (Green/Teal glow)
    if (origin) {
      const originIcon = L.divIcon({
        className: 'custom-div-icon',
        html: `
          <div class="relative flex h-4 w-4">
            <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span class="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 border-2 border-slate-900"></span>
          </div>`,
        iconSize: [16, 16],
        iconAnchor: [8, 8]
      });
      L.marker([origin.lat, origin.lon], { icon: originIcon }).addTo(layerGroup).bindPopup(`<div class="text-slate-900"><b>From:</b> ${origin.label}</div>`);
      bounds.extend([origin.lat, origin.lon]);
      hasBounds = true;
    }

    // Destination Marker (Red/Rose glow)
    if (destination) {
      const destIcon = L.divIcon({
        className: 'custom-div-icon',
        html: `
          <div class="relative flex h-4 w-4">
            <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
            <span class="relative inline-flex rounded-full h-4 w-4 bg-rose-500 border-2 border-slate-900"></span>
          </div>`,
        iconSize: [16, 16],
        iconAnchor: [8, 8]
      });
      L.marker([destination.lat, destination.lon], { icon: destIcon }).addTo(layerGroup).bindPopup(`<div class="text-slate-900"><b>To:</b> ${destination.label}</div>`);
      bounds.extend([destination.lat, destination.lon]);
      hasBounds = true;
    }

    // Route Polyline (Neon Blue/Indigo)
    if (routeGeometry) {
      const geoJsonData = JSON.parse(routeGeometry);
      
      // Shadow line for depth
      L.geoJSON(geoJsonData, {
        style: { color: '#000', weight: 8, opacity: 0.3 }
      }).addTo(layerGroup);

      // Main Neon Line
      const routeLayer = L.geoJSON(geoJsonData, {
        style: {
          color: '#6366f1', // Indigo-500
          weight: 4,
          opacity: 0.9,
          lineCap: 'round'
        }
      }).addTo(layerGroup);
      
      map.fitBounds(routeLayer.getBounds(), { padding: [50, 50] });
    } else if (hasBounds) {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 13 });
    }
    
    setTimeout(() => {
        map.invalidateSize();
    }, 100);

  }, [origin, destination, routeGeometry]);

  return <div ref={mapContainerRef} className={`w-full h-full bg-slate-900 ${className}`} />;
};