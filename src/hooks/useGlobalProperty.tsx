import { createContext, useContext, useEffect, useMemo, useState } from 'react';

type GlobalPropertyContextValue = {
  selectedPropertyId: string;
  setSelectedPropertyId: (id: string) => void;
};

const GlobalPropertyContext = createContext<GlobalPropertyContextValue | undefined>(undefined);

export function GlobalPropertyProvider({ children }: { children: React.ReactNode }) {
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>(() => {
    const saved = localStorage.getItem('global_property_filter');
    return saved || 'all';
  });

  useEffect(() => {
    localStorage.setItem('global_property_filter', selectedPropertyId);
  }, [selectedPropertyId]);

  const value = useMemo(() => ({ selectedPropertyId, setSelectedPropertyId }), [selectedPropertyId]);

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
