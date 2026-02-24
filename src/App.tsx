import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect } from "react";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { GlobalPropertyProvider } from "@/hooks/useGlobalProperty";
import { supabase } from "@/integrations/supabase/client";
import { db } from "../utils/localStorageDB.js";
import HomePage from "./pages/HomePage";
import RegistroPage from "./pages/RegistroPage";
import FinanzePage from "./pages/FinanzePage";
import LeggiPage from "./pages/LeggiPage";
import DatiPage from "./pages/DatiPage";
import AuthPage from "./pages/AuthPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Caricamento...</div>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/auth" replace />;
  }
  
  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Caricamento...</div>
      </div>
    );
  }
  
  if (user) {
    return <Navigate to="/" replace />;
  }
  
  return <>{children}</>;
}

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
  const migrateData = async () => {
    if (typeof window === "undefined") return;
    const done = window.localStorage.getItem("MIGRATION_DONE");
    if (done) return;
    try {
      const tables = [
        "properties",
        "units",
        "tenants",
        "leases",
        "lease_parties",
        "payments",
        "notifications",
        "extra_expenses",
        "cadastral_units",
        "reminders",
        "property_admins",
        "unit_inventories",
        "inventory_rooms",
      ];
      const results = await Promise.all(
        tables.map((t) => supabase.from(t).select("*"))
      );
      const all = [];
      results.forEach((res, idx) => {
        const rows = (res && res.data) ? res.data : [];
        const name = tables[idx];
        rows.forEach((r) => all.push({ __table: name, ...r }));
      });
      db.replaceAll(all);
      window.localStorage.setItem("MIGRATION_DONE", "true");
      window.alert("Migrazione completata");
    } catch (e) {
      console.error(e);
    }
  };
  useEffect(() => {
    migrateData();
  }, []);
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <GlobalPropertyProvider>
              <AppRoutes />
            </GlobalPropertyProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
