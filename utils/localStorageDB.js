const STORAGE_KEY = 'APP_DATA_V1';

const read = () => {
  const raw = typeof window !== 'undefined' ? window.localStorage.getItem(STORAGE_KEY) : null;
  if (!raw) return [];
  try {
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
};

const write = (items) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
};

export function getAllItems() {
  return read();
}

export function addItem(item) {
  const items = read();
  items.push(item);
  write(items);
  return items;
}

export function updateItem(id, updatedFields) {
  const items = read();
  const index = items.findIndex((i) => i && i.id === id);
  if (index !== -1) {
    items[index] = { ...items[index], ...updatedFields };
    write(items);
  }
  return items;
}

export function deleteItem(id) {
  const items = read().filter((i) => i && i.id !== id);
  write(items);
  return items;
}

export function replaceAll(items) {
  write(Array.isArray(items) ? items : []);
  return read();
}

export const db = {
  getAllItems,
  addItem,
  updateItem,
  deleteItem,
  replaceAll,
  getAll: getAllItems,
  add: addItem,
  update: updateItem,
  delete: deleteItem,
};
