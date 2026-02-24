import { db } from './utils/localstorageDB.js'; // Assicurati che il percorso sia giusto!

export function initBackupControls() {
  // 1. Crea il contenitore dei bottoni
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.bottom = '20px';
  container.style.right = '20px';
  container.style.backgroundColor = 'white';
  container.style.padding = '15px';
  container.style.borderRadius = '8px';
  container.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)';
  container.style.zIndex = '9999';
  container.style.display = 'flex';
  container.style.gap = '10px';
  container.style.flexDirection = 'column';

  // 2. HTML interno
  container.innerHTML = `
    <strong style="font-family: sans-serif; text-align: center; display: block; margin-bottom: 5px;">Backup Dati</strong>
    <button id="btn-download" style="padding: 8px 12px; cursor: pointer; background: #4CAF50; color: white; border: none; border-radius: 4px;">⬇️ Scarica JSON</button>
    <button id="btn-upload-trigger" style="padding: 8px 12px; cursor: pointer; background: #FF9800; color: white; border: none; border-radius: 4px;">⬆️ Ripristina</button>
    <input type="file" id="inp-upload" accept=".json" style="display: none;" />
  `;

  // 3. Aggiungilo alla pagina
  document.body.appendChild(container);

  // 4. LOGICA: Download
  document.getElementById('btn-download').onclick = () => {
    const data = db.getAll(); // Usa la funzione del tuo file
    if (!data || data.length === 0) {
      alert("Il database è vuoto, niente da salvare.");
      return;
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `backup_${new Date().toISOString().slice(0,10)}.json`;
    link.click();
  };

  // 5. LOGICA: Trigger Upload
  document.getElementById('btn-upload-trigger').onclick = () => {
    document.getElementById('inp-upload').click();
  };

  // 6. LOGICA: Gestione File Upload
  document.getElementById('inp-upload').onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const json = JSON.parse(ev.target.result);
        if (confirm(`Trovati ${json.length} elementi. Vuoi sovrascrivere i dati attuali?`)) {
          db.replaceAll(json); // Usa la funzione del tuo file
          alert("Ripristino completato!");
          location.reload();
        }
      } catch (err) {
        alert("Errore: File JSON non valido.");
      }
    };
    reader.readAsText(file);
  };
}