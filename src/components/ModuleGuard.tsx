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
  const { hasModule, loading, currentCompany } = useCurrentCompany();
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

  if (!hasModule(module)) {
    if (fallbackTo) return <Navigate to={fallbackTo} replace />;
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center space-y-4">
            <div className="mx-auto w-14 h-14 rounded-full bg-muted flex items-center justify-center">
              <Lock className="w-7 h-7 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-semibold">
              {language === 'ar' ? 'الموديول غير مفعّل' : 'Module not enabled'}
            </h2>
            <p className="text-sm text-muted-foreground">
              {language === 'ar'
                ? 'هذه الميزة غير متاحة في مساحة العمل الحالية. تواصل مع المسؤول لتفعيلها.'
                : 'This feature is not available in the current workspace. Contact your admin to enable it.'}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
