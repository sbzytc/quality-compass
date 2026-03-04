import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ProtectedRoute, getDefaultDashboard } from "@/components/ProtectedRoute";
import { MainLayout } from "@/layouts/MainLayout";
import LoginPage from "@/pages/LoginPage";
import CEODashboard from "@/pages/dashboards/CEODashboard";
import BranchManagerDashboard from "@/pages/dashboards/BranchManagerDashboard";
import OperationsDashboard from "@/pages/dashboards/OperationsDashboard";
import AuditorDashboard from "@/pages/dashboards/AuditorDashboard";
import BranchesList from "@/pages/BranchesList";
import BranchDetail from "@/pages/BranchDetail";
import EvaluationForm from "@/pages/EvaluationForm";
import PreviousEvaluationsPage from "@/pages/PreviousEvaluationsPage";
import ArchivedEvaluationsPage from "@/pages/ArchivedEvaluationsPage";
import EvaluationViewPage from "@/pages/EvaluationViewPage";
import TemplatesPage from "@/pages/TemplatesPage";
import UsersPage from "@/pages/UsersPage";
import SettingsPage from "@/pages/SettingsPage";
import ScoreAnalysisPage from "@/pages/ScoreAnalysisPage";
import FindingsPage from "@/pages/FindingsPage";
import CorrectiveActionsPage from "@/pages/CorrectiveActionsPage";
import PeriodEvaluationForm from "@/pages/PeriodEvaluationForm";
import ReportsPage from "@/pages/ReportsPage";
import BranchPerformanceReport from "@/pages/BranchPerformanceReport";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

// Component to handle default redirect based on role
function DefaultRedirect() {
  const { roles, loading } = useAuth();
  
  if (loading) {
    return null;
  }
  
  return <Navigate to={getDefaultDashboard(roles)} replace />;
}

const AppRoutes = () => (
  <Routes>
    {/* Public route */}
    <Route path="/login" element={<LoginPage />} />
    
    {/* Protected routes */}
    <Route element={
      <ProtectedRoute>
        <MainLayout />
      </ProtectedRoute>
    }>
      <Route path="/" element={<DefaultRedirect />} />
      
      {/* CEO/Executive Dashboard - Admin and Executive only */}
      <Route path="/dashboard/ceo" element={
        <ProtectedRoute allowedRoles={['admin', 'executive']}>
          <CEODashboard />
        </ProtectedRoute>
      } />
      
      {/* Branch Manager Dashboard - Admin, Executive, and Branch Manager */}
      <Route path="/dashboard/branch-manager" element={
        <ProtectedRoute allowedRoles={['admin', 'executive', 'branch_manager']}>
          <BranchManagerDashboard />
        </ProtectedRoute>
      } />
      
      {/* Operations Dashboard - Admin, Executive, Branch Manager */}
      <Route path="/dashboard/operations" element={
        <ProtectedRoute allowedRoles={['admin', 'executive', 'branch_manager']}>
          <OperationsDashboard />
        </ProtectedRoute>
      } />
      
      {/* Auditor Dashboard - Admin and Assessor */}
      <Route path="/dashboard/auditor" element={
        <ProtectedRoute allowedRoles={['admin', 'assessor']}>
          <AuditorDashboard />
        </ProtectedRoute>
      } />
      
      {/* Branches - Admin, Executive, Branch Manager */}
      <Route path="/branches" element={
        <ProtectedRoute allowedRoles={['admin', 'executive', 'branch_manager']}>
          <BranchesList />
        </ProtectedRoute>
      } />
      <Route path="/branches/:branchId" element={
        <ProtectedRoute allowedRoles={['admin', 'executive', 'branch_manager']}>
          <BranchDetail />
        </ProtectedRoute>
      } />
      
      {/* Score Analysis - Admin and Executive */}
      <Route path="/score-analysis" element={
        <ProtectedRoute allowedRoles={['admin', 'executive']}>
          <ScoreAnalysisPage />
        </ProtectedRoute>
      } />
      
      {/* Evaluations - Admin and Assessor */}
      <Route path="/evaluations" element={
        <ProtectedRoute allowedRoles={['admin', 'assessor']}>
          <Navigate to="/evaluations/new" replace />
        </ProtectedRoute>
      } />
      <Route path="/evaluations/new" element={
        <ProtectedRoute allowedRoles={['admin', 'assessor']}>
          <EvaluationForm />
        </ProtectedRoute>
      } />
      <Route path="/evaluations/previous" element={
        <ProtectedRoute allowedRoles={['admin', 'assessor']}>
          <PreviousEvaluationsPage />
        </ProtectedRoute>
      } />
      <Route path="/evaluations/archived" element={
        <ProtectedRoute allowedRoles={['admin', 'assessor']}>
          <ArchivedEvaluationsPage />
        </ProtectedRoute>
      } />
      <Route path="/evaluations/:evaluationId" element={
        <ProtectedRoute allowedRoles={['admin', 'assessor']}>
          <EvaluationViewPage />
        </ProtectedRoute>
      } />
      
      {/* Period Evaluations - Admin and Assessor */}
      <Route path="/evaluations/period" element={
        <ProtectedRoute allowedRoles={['admin', 'assessor']}>
          <PeriodEvaluationForm />
        </ProtectedRoute>
      } />

      {/* Reports - Admin, Executive, Branch Manager */}
      <Route path="/reports" element={
        <ProtectedRoute allowedRoles={['admin', 'executive', 'branch_manager']}>
          <ReportsPage />
        </ProtectedRoute>
      } />

      {/* Branch Performance Report - Branch Manager */}
      <Route path="/branch-performance" element={
        <ProtectedRoute allowedRoles={['admin', 'executive', 'branch_manager']}>
          <BranchPerformanceReport />
        </ProtectedRoute>
      } />

      {/* Findings - All authenticated users */}
      <Route path="/findings" element={<FindingsPage />} />
      
      {/* Corrective Actions - All authenticated users */}
      <Route path="/corrective-actions" element={<CorrectiveActionsPage />} />
      
      {/* Users - Admin only */}
      <Route path="/users" element={
        <ProtectedRoute allowedRoles={['admin']}>
          <UsersPage />
        </ProtectedRoute>
      } />
      
      {/* Templates - Admin only */}
      <Route path="/templates" element={
        <ProtectedRoute allowedRoles={['admin']}>
          <TemplatesPage />
        </ProtectedRoute>
      } />
      
      {/* Settings - All authenticated users */}
      <Route path="/settings" element={<SettingsPage />} />
    </Route>
    
    <Route path="*" element={<NotFound />} />
  </Routes>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <LanguageProvider>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </LanguageProvider>
  </QueryClientProvider>
);

export default App;
