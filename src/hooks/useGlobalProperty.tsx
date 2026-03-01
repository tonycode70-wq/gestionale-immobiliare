import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { db } from '../../utils/localStorageDB.js';

type GlobalPropertyContextValue = {
  selectedPropertyId: string;
  selectedUnitId: string;
  setSelectedPropertyId: (id: string) => void;
  setSelectedUnitId: (id: string) => void;
  setSelection: (propertyId: string, unitId: string) => void;
};

const GlobalPropertyContext = createContext<GlobalPropertyContextValue | undefined>(undefined);

export function GlobalPropertyProvider({ children }: { children: React.ReactNode }) {
  db.healthCheck();
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>(() => {
    try {
      const sel = db.getSelection();
      return sel.propertyId || 'all';
    } catch {
      const saved = localStorage.getItem('global_property_filter');
      return saved || 'all';
    }
  });
  const [selectedUnitId, setSelectedUnitId] = useState<string>(() => {
    try {
      const sel = db.getSelection();
      return sel.unitId || 'all';
    } catch {
      return 'all';
    }
  });

  useEffect(() => {
    localStorage.setItem('global_property_filter', selectedPropertyId);
    db.setSelection({ propertyId: selectedPropertyId, unitId: selectedUnitId });
  }, [selectedPropertyId, selectedUnitId]);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'patrimonio_selection' && e.newValue) {
        try {
          const sel = JSON.parse(e.newValue);
          if (sel && typeof sel === 'object') {
            setSelectedPropertyId(sel.propertyId || 'all');
            setSelectedUnitId(sel.unitId || 'all');
          }
        } catch {
          setSelectedPropertyId('all');
          setSelectedUnitId('all');
        }
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const setSelection = (propertyId: string, unitId: string) => {
    setSelectedPropertyId(propertyId || 'all');
    setSelectedUnitId(unitId || 'all');
    db.setSelection({ propertyId, unitId });
    localStorage.setItem('active_unit_id', unitId || 'all');
  };

  const value = useMemo(() => ({ selectedPropertyId, selectedUnitId, setSelectedPropertyId, setSelectedUnitId, setSelection }), [selectedPropertyId, selectedUnitId]);

  return (
    <GlobalPropertyContext.Provider value={value}>
      {children}
    </GlobalPropertyContext.Provider>
  );
}

export function useGlobalProperty() {
  const ctx = useContext(GlobalPropertyContext);
  if (!ctx) throw new Error('useGlobalProperty must be used within GlobalPropertyProvider');
  return ctx;
}
