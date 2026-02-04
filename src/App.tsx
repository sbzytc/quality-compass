import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { MainLayout } from "@/layouts/MainLayout";
import ExecutiveDashboard from "@/pages/ExecutiveDashboard";
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
              <Route path="/" element={<ExecutiveDashboard />} />
              <Route path="/branches" element={<BranchesList />} />
              <Route path="/branches/:branchId" element={<BranchDetail />} />
              <Route path="/evaluations" element={<EvaluationForm />} />
              <Route path="/findings" element={<ExecutiveDashboard />} />
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
