import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { db } from "../../utils/localStorageDB.js";

export function BackupManager() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleDownload = () => {
    const data = db.getAll();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
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
    reader.onload = () => {
      try {
        const text = String(reader.result || "");
        const parsed = JSON.parse(text);
        db.replaceAll(Array.isArray(parsed) ? parsed : []);
        window.location.reload();
      } catch {
        alert("File di backup non valido");
      } finally {
        e.target.value = "";
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="flex items-center gap-2">
      <Button size="sm" onClick={handleDownload}>Scarica Backup</Button>
      <Button size="sm" variant="secondary" onClick={handleRestoreClick}>Ripristina Backup</Button>
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
}
