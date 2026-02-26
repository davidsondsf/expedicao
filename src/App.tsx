import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";

const Login = lazy(() => import("./pages/Login"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Items = lazy(() => import("./pages/Items"));
const ItemDetail = lazy(() => import("./pages/ItemDetail"));
const Categories = lazy(() => import("./pages/Categories"));
const Movements = lazy(() => import("./pages/Movements"));
const AdminUsers = lazy(() => import("./pages/AdminUsers"));
const AuditLogs = lazy(() => import("./pages/AuditLogs"));
const Maletas = lazy(() => import("./pages/Maletas"));
const MaletaDetail = lazy(() => import("./pages/MaletaDetail"));
const MaletaCreate = lazy(() => import("./pages/MaletaCreate"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

const RouteLoader = () => (
  <div className="flex min-h-screen items-center justify-center bg-background">
    <div className="text-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto mb-3" />
      <p className="text-sm text-muted-foreground">Carregando pagina...</p>
    </div>
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <Suspense fallback={<RouteLoader />}>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/items" element={<ProtectedRoute><Items /></ProtectedRoute>} />
              <Route path="/items/:id" element={<ProtectedRoute><ItemDetail /></ProtectedRoute>} />
              <Route path="/categories" element={<ProtectedRoute><Categories /></ProtectedRoute>} />
              <Route path="/movements" element={<ProtectedRoute><Movements /></ProtectedRoute>} />
              <Route path="/maletas" element={<ProtectedRoute><Maletas /></ProtectedRoute>} />
              <Route path="/maletas/new" element={<ProtectedRoute requiredRoles={['ADMIN', 'OPERATOR']}><MaletaCreate /></ProtectedRoute>} />
              <Route path="/maletas/:id" element={<ProtectedRoute><MaletaDetail /></ProtectedRoute>} />
              <Route path="/admin/users" element={<ProtectedRoute requiredRoles={['ADMIN']}><AdminUsers /></ProtectedRoute>} />
              <Route path="/admin/audit" element={<ProtectedRoute requiredRoles={['ADMIN']}><AuditLogs /></ProtectedRoute>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
