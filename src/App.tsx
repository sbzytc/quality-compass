import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { MainLayout } from "@/layouts/MainLayout";
import CEODashboard from "@/pages/dashboards/CEODashboard";
import BranchManagerDashboard from "@/pages/dashboards/BranchManagerDashboard";
import OperationsDashboard from "@/pages/dashboards/OperationsDashboard";
import AuditorDashboard from "@/pages/dashboards/AuditorDashboard";
import BranchesList from "@/pages/BranchesList";
import BranchDetail from "@/pages/BranchDetail";
import EvaluationForm from "@/pages/EvaluationForm";
import TemplatesPage from "@/pages/TemplatesPage";
import UsersPage from "@/pages/UsersPage";
import SettingsPage from "@/pages/SettingsPage";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <LanguageProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route element={<MainLayout />}>
              <Route path="/" element={<Navigate to="/dashboard/ceo" replace />} />
              <Route path="/dashboard/ceo" element={<CEODashboard />} />
              <Route path="/dashboard/branch-manager" element={<BranchManagerDashboard />} />
              <Route path="/dashboard/operations" element={<OperationsDashboard />} />
              <Route path="/dashboard/auditor" element={<AuditorDashboard />} />
              <Route path="/branches" element={<BranchesList />} />
              <Route path="/branches/:branchId" element={<BranchDetail />} />
              <Route path="/evaluations" element={<EvaluationForm />} />
              <Route path="/findings" element={<CEODashboard />} />
              <Route path="/users" element={<UsersPage />} />
              <Route path="/templates" element={<TemplatesPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </LanguageProvider>
  </QueryClientProvider>
);

export default App;
