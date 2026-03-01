import { useEffect, useState } from 'react';

declare global {
  interface Window {
    __patrimonio_sync?: string;
  }
}

export function SyncIndicator() {
  const [status, setStatus] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return window.__patrimonio_sync || 'saved';
    }
    return 'saved';
  });
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<string>).detail;
      setStatus(detail || 'saved');
    };
    window.addEventListener('patrimonio_sync', handler);
    return () => window.removeEventListener('patrimonio_sync', handler);
  }, []);
  const label = status === 'saving' ? 'Salvataggio in corso...' : 'Sincronizzato';
  const cls = status === 'saving' ? 'text-yellow-500' : 'text-green-500';
  return <span className={`text-xs ${cls}`}>{label}</span>;
}
