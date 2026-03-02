import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { db } from "../../utils/localStorageDB.js";

export function BackupManager() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const summarize = (data: any) => {
    const asArray: any[] = Array.isArray(data) ? data : [];
    const asObj: Record<string, any[]> = !Array.isArray(data) && data && typeof data === 'object' ? data : {};
    const countFromArray = (tbl: string) => asArray.filter(it => (it?.__table || it?.table || it?._table) === tbl).length;
    const countFromObj = (tbl: string) => Array.isArray(asObj[tbl]) ? asObj[tbl].length : 0;
    const get = (tbl: string) => Array.isArray(data) ? countFromArray(tbl) : countFromObj(tbl);
    return {
      properties: get('properties'),
      units: get('units'),
      leases: get('leases'),
      tenants: get('tenants'),
      payments: get('payments'),
      extra_expenses: get('extra_expenses'),
      lease_parties: get('lease_parties'),
      reminders: get('reminders'),
      cadastral_units: get('cadastral_units'),
      property_admins: get('property_admins'),
      unit_inventories: get('unit_inventories'),
      inventory_rooms: get('inventory_rooms'),
      notifications: get('notifications'),
      notes: get('notes'),
    };
  };

  const handleDownload = () => {
    const fullState = db.getState();
    const blob = new Blob([JSON.stringify(fullState, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const ts = new Date();
    const name = `backup_APP_DATA_V1_${ts.getFullYear()}${String(ts.getMonth() + 1).padStart(2, "0")}${String(ts.getDate()).padStart(2, "0")}_${String(ts.getHours()).padStart(2, "0")}${String(ts.getMinutes()).padStart(2, "0")}${String(ts.getSeconds()).padStart(2, "0")}.json`;
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const handleRestoreClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onerror = () => {
      console.error("Errore lettura file di backup");
      alert("Errore durante la lettura del file. Riprova.");
      e.target.value = "";
    };
    reader.onabort = () => {
      console.error("Lettura file annullata");
      alert("Lettura annullata.");
      e.target.value = "";
    };
    reader.onload = () => {
      try {
        const text = String(reader.result || "");
        const parsed = JSON.parse(text);
        try {
          // Svuota lo storage prima del ripristino per evitare merge indesiderati
          if (typeof window !== "undefined") {
            window.localStorage.removeItem("patrimonio_data");
            window.localStorage.removeItem("patrimonio_last_valid");
          }
        } catch {}
        const summary = summarize(parsed);
        const sizeKB = Math.round((text.length / 1024) * 100) / 100;
        if (Array.isArray(parsed)) {
          db.replaceAll(parsed);
        } else {
          db.replaceState(parsed);
        }
        try {
          const sel = db.getSelection();
          localStorage.setItem("active_unit_id", sel.unitId || "all");
        } catch {}
        db.commitNow();
        // Verifica post-scrittura
        const after = db.getState();
        const afterText = JSON.stringify(after);
        const afterSizeKB = Math.round((afterText.length / 1024) * 100) / 100;
        const afterSummary = summarize(after);
        const keysWritten = ["patrimonio_data", "patrimonio_last_valid"];
        const mismatch =
          summary.properties !== afterSummary.properties ||
          summary.units !== afterSummary.units ||
          summary.leases !== afterSummary.leases ||
          summary.payments !== afterSummary.payments;
        alert(
          [
            "Ripristino completato.",
            `Dimensione JSON (file): ~${sizeKB} KB`,
            `Dimensione JSON (salvato): ~${afterSizeKB} KB`,
            `Chiavi scritte: ${keysWritten.join(", ")}`,
            "Conteggio record per entità (file → salvato):",
            `- properties: ${summary.properties} → ${afterSummary.properties}`,
            `- units: ${summary.units} → ${afterSummary.units}`,
            `- leases: ${summary.leases} → ${afterSummary.leases}`,
            `- payments: ${summary.payments} → ${afterSummary.payments}`,
            `- tenants: ${summary.tenants} → ${afterSummary.tenants}`,
            `- extra_expenses: ${summary.extra_expenses} → ${afterSummary.extra_expenses}`,
            `- lease_parties: ${summary.lease_parties} → ${afterSummary.lease_parties}`,
            `- reminders: ${summary.reminders} → ${afterSummary.reminders}`,
            `- cadastral_units: ${summary.cadastral_units} → ${afterSummary.cadastral_units}`,
            `- property_admins: ${summary.property_admins} → ${afterSummary.property_admins}`,
            `- unit_inventories: ${summary.unit_inventories} → ${afterSummary.unit_inventories}`,
            `- inventory_rooms: ${summary.inventory_rooms} → ${afterSummary.inventory_rooms}`,
            `- notifications: ${summary.notifications} → ${afterSummary.notifications}`,
            `- notes: ${summary.notes} → ${afterSummary.notes}`,
            mismatch ? "\nATTENZIONE: rilevata discrepanza. Provo seconda scrittura..." : "\nOK: dati coerenti. Ricarico l'app..."
          ].join("\n")
        );
        if (mismatch) {
          // Seconda scrittura forzata
          if (Array.isArray(parsed)) {
            db.replaceAll(parsed);
          } else {
            db.replaceState(parsed);
          }
          db.commitNow();
        }
        setTimeout(() => window.location.reload(), 100);
      } catch (err) {
        console.error("Backup non valido:", err);
        alert("File di backup non valido. Controlla formato JSON.");
      } finally {
        e.target.value = "";
      }
    };
    reader.readAsText(file, "utf-8");
  };

  return (
    <div className="flex items-center gap-2">
      <Button size="sm" onClick={handleDownload}>Scarica Backup</Button>
      <Button size="sm" variant="secondary" onClick={handleRestoreClick}>Ripristina Backup</Button>
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
}
