import { Navigate } from 'react-router-dom';
import { useCurrentCompany } from '@/contexts/CurrentCompanyContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Loader2, Lock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface ModuleGuardProps {
  module: string;
  children: React.ReactNode;
  fallbackTo?: string;
}

export function ModuleGuard({ module, children, fallbackTo }: ModuleGuardProps) {
  const { workspaceType, primaryModule, loading, currentCompany } = useCurrentCompany();
  const { language } = useLanguage();

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!currentCompany) {
    return <Navigate to="/login" replace />;
  }

  // The `module` prop is checked against either the workspace_type (e.g. "medical")
  // or the primary_module (e.g. "medical_clinics") so legacy call sites keep working.
  const matches = workspaceType === module || primaryModule === module;
  if (!matches) {
    if (fallbackTo) return <Navigate to={fallbackTo} replace />;
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center space-y-4">
            <div className="mx-auto w-14 h-14 rounded-full bg-muted flex items-center justify-center">
              <Lock className="w-7 h-7 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-semibold">
              {language === 'ar' ? 'مساحة عمل غير مناسبة' : 'Workspace not compatible'}
            </h2>
            <p className="text-sm text-muted-foreground">
              {language === 'ar'
                ? 'هذه الصفحة لا تتطابق مع نوع مساحة العمل الحالية. بدّل لمساحة عمل من النوع الصحيح.'
                : 'This page does not match the current workspace type. Switch to a workspace of the correct type.'}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
