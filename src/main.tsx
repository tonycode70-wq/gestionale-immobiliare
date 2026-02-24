import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// 1. Importa il nuovo componente (controlla se il percorso è giusto per te)
import { BackupManager } from "./components/BackupManager.tsx"; 

createRoot(document.getElementById("root")!).render(
  <>
    {/* La tua App normale */}
    <App />
    
    {/* Il pannello di Backup che starà sempre in basso a destra */}
    <BackupManager />
  </>
);
