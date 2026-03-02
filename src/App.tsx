import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect } from "react";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { GlobalPropertyProvider } from "@/hooks/useGlobalProperty";
import { db } from "../utils/localStorageDB.js";
import HomePage from "./pages/HomePage";
import RegistroPage from "./pages/RegistroPage";
import FinanzePage from "./pages/FinanzePage";
import LeggiPage from "./pages/LeggiPage";
import DatiPage from "./pages/DatiPage";
import AuthPage from "./pages/AuthPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// Componenti di protezione rotte
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex h-screen items-center justify-center">Caricamento...</div>;
  if (!user) return <Navigate to="/auth" replace />;
  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex h-screen items-center justify-center">Caricamento...</div>;
  if (user) return <Navigate to="/" replace />;
  return <>{children}</>;
}

// Definizione delle rotte
const AppRoutes = () => (
  <Routes>
    <Route path="/auth" element={<PublicRoute><AuthPage /></PublicRoute>} />
    <Route path="/" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
    <Route path="/registro" element={<ProtectedRoute><RegistroPage /></ProtectedRoute>} />
    <Route path="/finanze" element={<ProtectedRoute><FinanzePage /></ProtectedRoute>} />
    <Route path="/leggi" element={<ProtectedRoute><LeggiPage /></ProtectedRoute>} />
    <Route path="/dati" element={<ProtectedRoute><DatiPage /></ProtectedRoute>} />
    <Route path="*" element={<NotFound />} />
  </Routes>
);

const App = () => {
  useEffect(() => {
    // Inizializza il DB locale
    try {
      db.healthCheck();
    } catch (e) {
      console.error("DB init error", e);
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        
        {/* Router configurato correttamente */}
        <HashRouter>
          <AuthProvider>
            <GlobalPropertyProvider>
              <div className="min-h-screen bg-background font-sans antialiased">
                <AppRoutes />
              </div>
            </GlobalPropertyProvider>
          </AuthProvider>
        </HashRouter>

      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;