import React from 'react';
import WaterWithdrawalForm from './WaterWithdrawalForm';
import BoilerGeneratorCompressorForm from './BoilerGeneratorCompressorForm';
import NaturalGasDieselVehiclesForm from './NaturalGasDieselVehiclesForm';
import PurchaseElectricitySolarForm from './PurchaseElectricitySolarForm';
import ProductionOperationsForm from './ProductionOperationsForm';
import { 
  Factory, Zap, Flame, BarChart3, Droplets, Trash2, 
  Wind, Beaker, Activity, Shield, Settings, Info,
  ChevronRight, Calendar, MapPin
} from 'lucide-react';

// ============================================================
// TYPES & PROPS
// ============================================================
interface InventoryManagementProps {
  activeSubModule: string;
  selectedUnit: string;
  selectedYear: string;
  userRole: string;
}

// ============================================================
// CONFIGURATION MAP
// ============================================================
const SUB_MODULES_MAP: Record<string, { title: string; icon: React.ElementType; description: string }> = {
  'inv_production_operations': { 
    title: 'Production & Operations', 
    icon: Factory,
    description: 'Manage man power, working days, available hours, and total production output.'
  },
  'inv_electricity_solar': { 
    title: 'Purchase Electricity & Solar', 
    icon: Zap,
    description: 'Track grid electricity consumption (off-peak, peak, flat) and solar generation.'
  },
  'inv_fuel_vehicles': { 
    title: 'Natural Gas, Diesel, Vehicles', 
    icon: Flame,
    description: 'Log natural gas usage, diesel for generators/boilers, and vehicle fuel consumption.'
  },
    'inv_steam_boiler': {
    title: 'Boiler & Generator',
    icon: Flame,
    description: 'Track boiler & generator capacity, fuel consumption, operating hours, and maintenance records.'
  },
  'inv_solid_waste': {
    title: 'Waste Management',
    icon: Factory,
    description: 'Track hazardous, non-hazardous, and recyclable solid waste generation and disposal records.'
  },
  'inv_water_withdrawal': {
    title: 'Water Withdrawal',
    icon: Factory,
    description: 'Track groundwater, surface water, rainwater harvesting, and municipal water withdrawal records.'
  },
  'inv_wastewater_etp': {
    title: 'Wastewater & ETP',
    icon: Factory,
    description: 'Monitor ETP inlet/outlet flow, discharge quality parameters, and wastewater recycling metrics.'
  },
  'inv_air_emission': {
    title: 'Air Emission & Stack Monitoring',
    icon: Flame,
    description: 'Track boiler & generator stack emissions, ambient air quality, and flue gas monitoring results.'
  },
  'inv_refrigerant_ods': {
    title: 'Refrigerant & ODS',
    icon: Factory,
    description: 'Manage chiller, AC refrigerant top-ups, leakage logs, and Ozone Depleting Substances (ODS) inventory.'
  },
  'inv_chemical_zdhc': {
    title: 'Chemical Inventory & ZDHC',
    icon: Factory,
    description: 'Track chemical consumption, ZDHC MRSL conformance, and InCheck performance records.'
  },
  'inv_commuting_logistics': {
    title: 'Employee Commuting & Logistics',
    icon: Factory,
    description: 'Monitor employee transport, company vehicles, and upstream/downstream logistics data.'
  },

  'inv_ghg_emission': { 
    title: 'GHG Emission', 
    icon: BarChart3,
    description: 'Auto-calculated greenhouse gas inventory and KPI summary based on energy data.'
  },
  'inv_water_wastewater': { 
    title: 'Water & Wastewater', 
    icon: Droplets,
    description: 'Monitor water extraction, consumption, and wastewater discharge metrics.'
  },
  'inv_waste_management': { 
    title: 'Waste Management', 
    icon: Trash2,
    description: 'Track hazardous and non-hazardous waste generation, recycling, and disposal.'
  },
  'inv_refrigerant': { 
    title: 'Refrigerant', 
    icon: Wind,
    description: 'Manage refrigerant top-ups, leakage, and recovery for HVAC and cooling systems.'
  },
  'inv_chemical_management': { 
    title: 'Chemical Management', 
    icon: Beaker,
    description: 'Inventory of chemicals used in production, including MSDS tracking and usage.'
  },
  'inv_ppe_inventory': { 
    title: 'PPE Inventory', 
    icon: Shield,
    description: 'Manage stock levels, issuance, and compliance for Personal Protective Equipment.'
  },
  'inv_boiler_gen_comp': { 
    title: 'Boiler, Generator & Compressor', 
    icon: Settings,
    description: 'Maintenance logs, efficiency metrics, and runtime hours for heavy machinery.'
  },
  'inv_utility_info': { 
    title: 'Utility Information', 
    icon: Info,
    description: 'Overall utility breakdown, including energy mix and baseline utility costs.'
  },
};

// ============================================================
// COMPONENT
// ============================================================
const InventoryManagement: React.FC<InventoryManagementProps> = ({ 
  activeSubModule, 
  selectedUnit, 
  selectedYear, 
  userRole 
}) => {
  // Fallback if the ID doesn't match
  const currentModule = SUB_MODULES_MAP[activeSubModule] || {
    title: 'Unknown Module',
    icon: Info,
    description: 'Module details not found.'
  };

  const Icon = currentModule.icon;
  if (activeSubModule === 'inv_production_operations') {
    return <ProductionOperationsForm selectedUnit={selectedUnit} selectedYear={selectedYear} userRole={userRole} />;
  }
if (activeSubModule === 'inv_electricity_solar') {
  return <PurchaseElectricitySolarForm selectedUnit={selectedUnit} selectedYear={selectedYear} userRole={userRole} />;
}
  if (activeSubModule === 'inv_fuel_vehicles') {
    return <NaturalGasDieselVehiclesForm selectedUnit={selectedUnit} selectedYear={selectedYear} userRole={userRole} />;
  }
  if (activeSubModule === 'inv_steam_boiler') {
    return <BoilerGeneratorCompressorForm selectedUnit={selectedUnit} selectedYear={selectedYear} userRole={userRole} />;
  }
  if (activeSubModule === 'inv_water_withdrawal') {
    return <WaterWithdrawalForm selectedUnit={selectedUnit} selectedYear={selectedYear}  />;
  }

  return (
    <div className="space-y-6">
      {/* HEADER SECTION */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0 border border-emerald-100">
              <Icon className="text-emerald-600" size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 mb-1 uppercase tracking-wide">
                <span>Inventory Management</span>
                <ChevronRight size={12} />
                <span>{currentModule.title}</span>
              </div>
              <h2 className="text-xl font-bold text-gray-800">{currentModule.title}</h2>
              <p className="text-sm text-gray-500 mt-1 max-w-2xl">{currentModule.description}</p>
            </div>
          </div>

          {/* CONTEXT BADGES */}
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
              <MapPin size={16} className="text-emerald-600" />
              <div>
                <p className="text-[10px] text-gray-500 uppercase font-semibold leading-tight">Unit</p>
                <p className="text-sm font-bold text-gray-800 leading-tight">{selectedUnit}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
              <Calendar size={16} className="text-emerald-600" />
              <div>
                <p className="text-[10px] text-gray-500 uppercase font-semibold leading-tight">Year</p>
                <p className="text-sm font-bold text-gray-800 leading-tight">{selectedYear}</p>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* WORKSPACE PLACEHOLDER */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm min-h-[400px] flex flex-col items-center justify-center p-8 text-center border-dashed">
        <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center mb-4">
          <Icon className="text-gray-300" size={32} />
        </div>
        <h3 className="text-lg font-bold text-gray-700 mb-2">Data Entry Workspace</h3>
        <p className="text-sm text-gray-500 max-w-md mb-6">
          The form, tables, and analytics for <b>{currentModule.title}</b> will be built here.
        </p>
        
        <div className="flex flex-wrap justify-center gap-2">
          <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-100">
            {userRole.replace('_', ' ').toUpperCase()}
          </span>
          <span className="px-3 py-1 rounded-full bg-gray-100 text-gray-600 text-xs font-semibold border border-gray-200 font-mono">
            ID: {activeSubModule}
          </span>
        </div>
      </div>
    </div>
  );
};

export default InventoryManagement;
