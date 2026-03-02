import { describe, it, expect, beforeEach } from "vitest";

// Import JS module from project root
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { db } from "../../utils/localStorageDB.js";

const STORAGE_KEY = "patrimonio_data";
const LAST_VALID_KEY = "patrimonio_last_valid";

describe("Backup/Restore localStorageDB", () => {
  beforeEach(() => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(LAST_VALID_KEY);
  });

  it("normalizes state on replaceState with missing arrays", () => {
    const partial = {
      version: "1.0",
      meta: { current_selection: { propertyId: "all", unitId: "all" } },
      properties: [{ id: "p1", nome_complesso: "Test", __table: "properties" }],
      units: [{ id: "u1", property_id: "p1", nome_interno: "A", __table: "units" }],
    };
    db.replaceState(partial);
    db.commitNow();
    const st = db.getState();
    expect(Array.isArray(st.properties)).toBe(true);
    expect(st.properties.length).toBe(1);
    expect(Array.isArray(st.units)).toBe(true);
    expect(st.units.length).toBe(1);
    // Newly required arrays should exist as empty arrays
    expect(Array.isArray(st.inventory_rooms)).toBe(true);
    expect(Array.isArray(st.notifications)).toBe(true);
    expect(Array.isArray(st.notes)).toBe(true);
  });

  it("rebuilds full state from flat array with replaceAll", () => {
    const items = [
      { __table: "properties", id: "p2", nome_complesso: "Complesso 2" },
      { __table: "units", id: "u2", property_id: "p2", nome_interno: "B" },
      { __table: "leases", id: "l2", unit_id: "u2", stato_contratto: "attivo" },
    ];
    db.replaceAll(items);
    db.commitNow();
    const st = db.getState();
    expect(st.properties.find((p) => p.id === "p2")).toBeTruthy();
    expect(st.units.find((u) => u.id === "u2" && u.property_id === "p2")).toBeTruthy();
    expect(st.leases.find((l) => l.id === "l2" && l.unit_id === "u2")).toBeTruthy();
  });
});
