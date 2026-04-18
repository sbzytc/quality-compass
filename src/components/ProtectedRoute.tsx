import { Navigate } from 'react-router-dom';
import { useAuth, AppRole } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: AppRole[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, roles, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Super admin bypasses role checks (can view all tenant pages for support/QA)
  const isSuperAdmin = roles.includes('super_admin');

  // If specific roles are required, check if user has at least one
  if (allowedRoles && allowedRoles.length > 0 && !isSuperAdmin) {
    const hasAllowedRole = allowedRoles.some(role => roles.includes(role));
    
    if (!hasAllowedRole) {
      // Redirect to their appropriate dashboard based on their actual role
      if (roles.includes('admin') || roles.includes('executive')) {
        return <Navigate to="/dashboard/ceo" replace />;
      } else if (roles.includes('branch_manager')) {
        return <Navigate to="/dashboard/branch-manager" replace />;
      } else if (roles.includes('assessor')) {
        return <Navigate to="/dashboard/auditor" replace />;
      } else if (roles.includes('branch_employee')) {
        return <Navigate to="/findings" replace />;
      }
      return <Navigate to="/login" replace />;
    }
  }

  return <>{children}</>;
}

// Helper to determine default dashboard route based on role
export function getDefaultDashboard(roles: AppRole[]): string {
  if (roles.includes('super_admin')) {
    return '/admin/companies';
  }
  if (roles.includes('admin') || roles.includes('executive')) {
    return '/dashboard/ceo';
  } else if (roles.includes('branch_manager')) {
    return '/dashboard/branch-manager';
  } else if (roles.includes('assessor')) {
    return '/evaluations';
  } else if (roles.includes('branch_employee')) {
    return '/findings';
  }
  return '/login';
}
