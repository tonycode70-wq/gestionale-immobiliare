import { useMemo } from 'react';
import { db } from '../../../utils/localStorageDB.js';

function tableOf(x: unknown): string | undefined {
  return (x as { __table?: string }).__table;
}

export function RelationsGraph() {
  const snapshot = useMemo(() => db.getAll(), []);
  const properties = snapshot.filter(x => tableOf(x) === 'properties');
  const admins = snapshot.filter(x => tableOf(x) === 'property_admins');
  const units = snapshot.filter(x => tableOf(x) === 'units');
  const leases = snapshot.filter(x => tableOf(x) === 'leases');
  const expenses = snapshot.filter(x => tableOf(x) === 'extra_expenses');
  const notes = snapshot.filter(x => tableOf(x) === 'notes');

  return (
    <div className="mobile-card">
      <h3 className="font-semibold text-foreground mb-2">Relazioni</h3>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="p-3 rounded bg-muted/40">
          <p className="font-medium mb-1">Immobile → Amministratore</p>
          <p>{properties.length} immobili collegati a {admins.length} amministratori</p>
        </div>
        <div className="p-3 rounded bg-muted/40">
          <p className="font-medium mb-1">Unità → Immobile</p>
          <p>{units.length} unità collegate a {properties.length} immobili</p>
        </div>
        <div className="p-3 rounded bg-muted/40">
          <p className="font-medium mb-1">Contratto → Unità</p>
          <p>{leases.length} contratti collegati</p>
        </div>
        <div className="p-3 rounded bg-muted/40">
          <p className="font-medium mb-1">Note/Spese → Owner</p>
          <p>{notes.length} note • {expenses.length} spese con owner</p>
        </div>
      </div>
      <div className="mt-3 text-xs text-muted-foreground">
        Vista semplificata: i dati vengono puntati via ID (admin_id, property_id, unit_id, owner_id).
      </div>
    </div>
  );
}
