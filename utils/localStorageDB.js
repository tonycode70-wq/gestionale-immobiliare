const STORAGE_KEY = 'patrimonio_data';
const SELECTION_KEY = 'patrimonio_selection';
const LAST_VALID_KEY = 'patrimonio_last_valid';

const defaultState = () => ({
  version: '2.0',
  meta: {
    current_selection: { propertyId: 'all', unitId: 'all' },
  },
  properties: [],
  units: [],
  leases: [],
  payments: [],
  extra_expenses: [],
  tenants: [],
  lease_parties: [],
  reminders: [],
  cadastral_units: [],
  property_admins: [],
  unit_inventories: [],
  inventory_rooms: [],
  notifications: [],
  notes: [],
});

const REQUIRED_ARRAY_KEYS = [
  'properties',
  'units',
  'leases',
  'payments',
  'extra_expenses',
  'tenants',
  'lease_parties',
  'reminders',
  'cadastral_units',
  'property_admins',
  'unit_inventories',
  'inventory_rooms',
  'notifications',
  'notes',
];

const normalizeState = (raw) => {
  if (!raw || typeof raw !== 'object') return defaultState();
  const base = { ...raw };
  if (!base.meta || typeof base.meta !== 'object') {
    base.meta = {};
  }
  if (!base.meta.current_selection || typeof base.meta.current_selection !== 'object') {
    base.meta.current_selection = { propertyId: 'all', unitId: 'all' };
  } else {
    base.meta.current_selection = {
      propertyId: base.meta.current_selection.propertyId || 'all',
      unitId: base.meta.current_selection.unitId || 'all',
    };
  }
  REQUIRED_ARRAY_KEYS.forEach((k) => {
    if (!Array.isArray(base[k])) base[k] = [];
  });
  base.version = String(base.version || '2.0');
  return base;
};

const inferTable = (it) => {
  if (!it || typeof it !== 'object') return null;
  if (it.__table || it.table || it._table) return it.__table || it.table || it._table;
  if ('competenza_anno' in it && 'competenza_mese' in it) return 'payments';
  if ('unit_id' in it && 'canone_mensile' in it) return 'leases';
  if ('property_id' in it && 'nome_interno' in it) return 'units';
  if ('nome_complesso' in it && !('unit_id' in it)) return 'properties';
  if ('tenant_id' in it && 'lease_id' in it && 'ruolo' in it) return 'lease_parties';
  if ('tipo' in it && 'titolo' in it && 'data_scadenza' in it) return 'reminders';
  if ('categoria_catastale' in it && 'rendita_euro' in it) return 'cadastral_units';
  if ('ragione_sociale' in it && ('telefono_studio' in it || 'email' in it)) return 'property_admins';
  if ('nome_bene' in it && 'quantita' in it) return 'unit_inventories';
  if ('categoria' in it && ('importo_effettivo' in it || 'importo_previsto' in it)) return 'extra_expenses';
  if ('contenuto' in it && 'titolo' in it) return 'notes';
  if ('riferimento_tipo' in it || 'esito' in it) return 'notifications';
  return null;
};

const arrayToState = (items) => {
  const st = defaultState();
  (Array.isArray(items) ? items : []).forEach((it) => {
    let tbl = it && (it.__table || it.table || it._table);
    if (!tbl) {
      tbl = inferTable(it);
      if (tbl) {
        it = { ...it, __table: tbl };
      }
    }
    if (tbl && st[tbl] && Array.isArray(st[tbl])) {
      st[tbl].push(it);
    }
  });
  return st;
};

const readState = () => {
  if (typeof window === 'undefined') return defaultState();
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return defaultState();
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      const st = arrayToState(parsed);
      return normalizeState(st);
    }
    return normalizeState(parsed);
  } catch {
    return defaultState();
  }
};

let cache = readState();
let writeTimer = null;

const writeState = (state) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  try {
    window.localStorage.setItem(LAST_VALID_KEY, JSON.stringify(state));
  } catch {}
  if (typeof window !== 'undefined') {
    window.__patrimonio_sync = 'saved';
    window.dispatchEvent(new CustomEvent('patrimonio_sync', { detail: 'saved' }));
  }
};

export function syncStorage() {
  if (writeTimer) clearTimeout(writeTimer);
  writeTimer = setTimeout(() => {
    if (typeof window !== 'undefined') {
      window.__patrimonio_sync = 'saving';
      window.dispatchEvent(new CustomEvent('patrimonio_sync', { detail: 'saving' }));
    }
    writeState(cache);
    writeTimer = null;
  }, 500);
}

export function healthCheck() {
  try {
    const raw = typeof window !== 'undefined' ? window.localStorage.getItem(STORAGE_KEY) : null;
    if (!raw || raw === '[]' || raw === '{}' || raw === 'null') {
      const last = typeof window !== 'undefined' ? window.localStorage.getItem(LAST_VALID_KEY) : null;
      if (last) {
        window.localStorage.setItem(STORAGE_KEY, last);
        return true;
      }
      return false;
    }
    JSON.parse(raw);
    return true;
  } catch {
    const last = typeof window !== 'undefined' ? window.localStorage.getItem(LAST_VALID_KEY) : null;
    if (last) {
      window.localStorage.setItem(STORAGE_KEY, last);
      return true;
    }
    return false;
  }
}

export function verifyItem(id) {
  try {
    const raw = typeof window !== 'undefined' ? window.localStorage.getItem(STORAGE_KEY) : null;
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    const state = Array.isArray(parsed) ? arrayToState(parsed) : parsed;
    const all = flattenAll(state);
    return all.some((x) => x && x.id === id);
  } catch {
    return false;
  }
}

export function cleanupOrphans() {
  cache = readState();
  const unitIds = new Set(cache.units.map(u => u.id));
  const propertyIds = new Set(cache.properties.map(p => p.id));
  cache.extra_expenses = cache.extra_expenses.filter(e => {
    const owner = e.owner_id;
    const type = e.owner_type;
    if (!owner || !type) return false;
    if (type === 'unit') return unitIds.has(owner);
    if (type === 'property') return propertyIds.has(owner);
    return false;
  });
  cache.notes = cache.notes.filter(n => {
    const uid = n.unit_id;
    const pid = n.property_id;
    if (uid) return unitIds.has(uid);
    if (pid) return propertyIds.has(pid);
    return false;
  });
  writeState(cache);
  return true;
}

export function getState() {
  return readState();
}

export function replaceState(next) {
  const st = Array.isArray(next)
    ? arrayToState(next)
    : next && typeof next === 'object'
      ? next
      : defaultState();
  cache = normalizeState(st);
  syncStorage();
  return cache;
}

export function commitNow() {
  writeState(cache);
  return flattenAll(cache);
}

const flattenAll = (state) => {
  const all = [];
  Object.keys(state).forEach((k) => {
    if (Array.isArray(state[k])) {
      state[k].forEach((item) => {
        if (item && typeof item === 'object') {
          const withTable = item.__table ? item : { ...item, __table: k };
          all.push(withTable);
        }
      });
    }
  });
  return all;
};

export function getAllItems() {
  cache = readState();
  return flattenAll(cache);
}

export function addItem(item) {
  cache = readState();
  const tbl = item && item.__table;
  if (!tbl || !Array.isArray(cache[tbl])) {
    throw new Error('Item missing __table or table not supported');
  }
  cache[tbl].push(item);
  writeState(cache);
  return flattenAll(cache);
}

export function updateItem(id, updatedFields) {
  cache = readState();
  let updated = false;
  Object.keys(cache).forEach((k) => {
    if (Array.isArray(cache[k])) {
      const idx = cache[k].findIndex((i) => i && i.id === id);
      if (idx !== -1) {
        cache[k][idx] = { ...cache[k][idx], ...updatedFields };
        updated = true;
      }
    }
  });
  if (updated) writeState(cache);
  return flattenAll(cache);
}

export function deleteItem(id) {
  cache = readState();
  Object.keys(cache).forEach((k) => {
    if (Array.isArray(cache[k])) {
      cache[k] = cache[k].filter((i) => i && i.id !== id);
    }
  });
  writeState(cache);
  return flattenAll(cache);
}

export function replaceAll(items) {
  const st = arrayToState(items);
  cache = normalizeState(st);
  syncStorage();
  return flattenAll(cache);
}

export function getSelection() {
  cache = readState();
  const sel = cache.meta?.current_selection || { propertyId: 'all', unitId: 'all' };
  try {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(SELECTION_KEY, JSON.stringify(sel));
    }
  } catch {}
  return sel;
}

export function setSelection(sel) {
  cache = readState();
  cache.meta = cache.meta || {};
  cache.meta.current_selection = {
    propertyId: sel?.propertyId || 'all',
    unitId: sel?.unitId || 'all',
  };
  try {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(SELECTION_KEY, JSON.stringify(cache.meta.current_selection));
    }
  } catch {}
  syncStorage();
  return cache.meta.current_selection;
}

export const db = {
  syncStorage,
  getState,
  replaceState,
  commitNow,
  healthCheck,
  verifyItem,
  cleanupOrphans,
  getAllItems,
  addItem,
  updateItem,
  deleteItem,
  replaceAll,
  getAll: getAllItems,
  add: addItem,
  update: updateItem,
  delete: deleteItem,
  getSelection,
  setSelection,
};
