import React, { useState } from 'react';
import { Vehicle, FuelUnit } from '../types';
import { Button, Input, Modal } from './ui/LayoutComponents';
import { Car, Trash2, Plus, Fuel, Edit2, CheckCircle2, Circle } from 'lucide-react';

interface VehicleManagerProps {
  vehicles: Vehicle[];
  onSave: (vehicle: Vehicle) => void;
  onDelete: (id: string) => void;
  onSelect: (id: string) => void;
  selectedId: string | null;
}

export const VehicleManager: React.FC<VehicleManagerProps> = ({ vehicles, onSave, onDelete, onSelect, selectedId }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  // Allow consumptionValue to be string temporarily for input handling
  const [editingVehicle, setEditingVehicle] = useState<Partial<Vehicle> & { consumptionValue?: number | string }>({});

  const handleAddNew = () => {
    setEditingVehicle({
      id: crypto.randomUUID(),
      name: '',
      fuelType: 'diesel',
      consumptionValue: '', // Initialize as empty string so input shows placeholder
      consumptionUnit: FuelUnit.L_PER_100KM
    });
    setIsModalOpen(true);
  };

  const handleEdit = (v: Vehicle, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingVehicle({ ...v });
    setIsModalOpen(true);
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("¿Estás seguro de que quieres eliminar este vehículo?")) {
      onDelete(id);
    }
  };

  const handleSaveForm = () => {
    if (!editingVehicle.name || editingVehicle.consumptionValue === '' || editingVehicle.consumptionValue === undefined) return;
    
    const finalVehicle: Vehicle = {
      ...editingVehicle as Vehicle,
      consumptionValue: Number(editingVehicle.consumptionValue)
    };
    
    onSave(finalVehicle);
    setIsModalOpen(false);
  };

  const getConvertedPreview = () => {
    const val = Number(editingVehicle.consumptionValue) || 0;
    if (val <= 0) return null;
    if (editingVehicle.consumptionUnit === FuelUnit.L_PER_100KM) {
      return `≈ ${(100 / val).toFixed(1)} km/L`;
    } else {
      return `≈ ${(100 / val).toFixed(1)} L/100km`;
    }
  };

  const translateFuelType = (type: string | undefined) => {
      if (type === 'diesel') return 'Diésel';
      if (type === 'gasoline') return 'Gasolina';
      return type;
  }

  return (
    <div className="space-y-4">
      {vehicles.length === 0 ? (
        <div className="text-center py-10 border border-dashed border-slate-700 rounded-xl bg-slate-800/30">
          <Car className="mx-auto h-12 w-12 text-slate-600 mb-3" />
          <p className="text-slate-400 mb-5 text-sm">No tienes vehículos guardados.</p>
          <Button onClick={handleAddNew} size="sm" variant="outline">Añadir mi primer coche</Button>
        </div>
      ) : (
        <div className="grid gap-3">
          {vehicles.map(v => {
            const isSelected = selectedId === v.id;
            return (
              <div 
                key={v.id}
                onClick={() => onSelect(v.id)}
                className={`group relative flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all duration-200 ${
                  isSelected 
                    ? 'bg-indigo-900/10 border-indigo-500/60 shadow-[0_0_15px_-3px_rgba(99,102,241,0.15)]' 
                    : 'bg-slate-800/40 border-slate-700 hover:border-slate-600 hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center gap-4">
                  {/* Selection Radio Indicator */}
                  <div className={`transition-all duration-300 ${isSelected ? 'text-indigo-400 scale-100' : 'text-slate-600 scale-90 opacity-60 group-hover:opacity-100 group-hover:text-slate-400'}`}>
                    {isSelected ? <CheckCircle2 size={22} className="fill-indigo-500/10" /> : <Circle size={22} />}
                  </div>

                  {/* Icon & Info */}
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-full transition-colors hidden sm:block ${isSelected ? 'bg-indigo-500/10 text-indigo-300' : 'bg-slate-700/30 text-slate-500'}`}>
                      <Car size={18} />
                    </div>
                    <div>
                      <h4 className={`font-semibold text-sm ${isSelected ? 'text-indigo-100' : 'text-slate-200'}`}>{v.name}</h4>
                      <p className="text-[11px] text-slate-400 font-medium mt-0.5 tracking-wide">
                        <span className="capitalize text-slate-500">{translateFuelType(v.fuelType)}</span> • <span className="text-slate-300">{v.consumptionValue}</span> {v.consumptionUnit === FuelUnit.L_PER_100KM ? 'L/100km' : 'km/L'}
                      </p>
                    </div>
                  </div>
                </div>
                
                {/* Actions */}
                <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                   <button onClick={(e) => handleEdit(v, e)} className="p-2 rounded-lg text-slate-400 hover:bg-slate-700 hover:text-indigo-400 transition-colors" title="Editar">
                      <Edit2 size={15} />
                   </button>
                   <button onClick={(e) => handleDelete(v.id, e)} className="p-2 rounded-lg text-slate-400 hover:bg-red-900/20 hover:text-red-400 transition-colors" title="Eliminar">
                      <Trash2 size={15} />
                   </button>
                </div>
              </div>
            );
          })}
          <Button onClick={handleAddNew} variant="secondary" className="w-full mt-2 border-dashed border-slate-600 bg-transparent hover:bg-slate-800 text-xs">
            <Plus size={14} className="mr-2" /> Añadir otro vehículo
          </Button>
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)}
        title={editingVehicle.id && vehicles.find(v => v.id === editingVehicle.id) ? "Editar Vehículo" : "Nuevo Vehículo"}
      >
        <div className="space-y-6">
          <Input 
            label="Nombre del Coche" 
            placeholder="Ej: Seat León 2.0 TDI"
            value={editingVehicle.name || ''}
            onChange={e => setEditingVehicle({...editingVehicle, name: e.target.value})}
          />
          
          <div className="grid grid-cols-2 gap-4">
            <Input 
              label="Consumo Medio" 
              type="number"
              step="0.1"
              min="0.1"
              icon={<Fuel size={14} />}
              placeholder="0.0"
              value={editingVehicle.consumptionValue ?? ''}
              onChange={e => {
                const val = e.target.value;
                // If empty string, keep as empty string, otherwise parse
                setEditingVehicle({
                    ...editingVehicle, 
                    consumptionValue: val === '' ? '' : parseFloat(val)
                })
              }}
            />
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">Unidad</label>
              <select 
                className="w-full bg-slate-900 text-slate-100 rounded-lg border border-slate-700 shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 sm:text-sm px-3 py-2.5"
                value={editingVehicle.consumptionUnit}
                onChange={e => setEditingVehicle({...editingVehicle, consumptionUnit: e.target.value as FuelUnit})}
              >
                <option value={FuelUnit.L_PER_100KM}>L / 100km</option>
                <option value={FuelUnit.KM_PER_L}>km / L</option>
              </select>
            </div>
          </div>
          
          {editingVehicle.consumptionValue && Number(editingVehicle.consumptionValue) > 0 && (
            <div className="p-3 bg-slate-800/50 border border-slate-700/50 rounded-lg flex items-center gap-2 text-sm text-slate-400">
               <Info size={16} className="text-indigo-400" />
               <span>Equivale a <span className="font-semibold text-slate-200">{getConvertedPreview()}</span></span>
            </div>
          )}

          <div className="pt-4 flex justify-end gap-3 border-t border-slate-800 mt-4">
            <Button variant="ghost" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveForm} disabled={!editingVehicle.name || !editingVehicle.consumptionValue}>Guardar</Button>
          </div>
        </div>
      </Modal>
      
    </div>
  );
};

// Helper icon
const Info: React.FC<{size?: number; className?: string}> = ({size, className}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
)
