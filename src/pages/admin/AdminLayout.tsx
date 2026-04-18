import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Building2, Package, CreditCard, Activity, LogOut, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const items = [
  { to: '/admin/companies', icon: Building2, label: 'Companies', labelAr: 'الشركات' },
  { to: '/admin/modules', icon: Package, label: 'Modules', labelAr: 'الموديولات' },
  { to: '/admin/plans', icon: CreditCard, label: 'Plans', labelAr: 'الخطط' },
  { to: '/admin/audit-logs', icon: Activity, label: 'Audit Logs', labelAr: 'سجلات التدقيق' },
];

export default function AdminLayout() {
  const { signOut, profile } = useAuth();
  const { language } = useLanguage();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-[hsl(var(--background))] to-[hsl(var(--muted))]">
      <aside className="w-64 border-e border-border/60 bg-card/50 backdrop-blur-xl p-4 flex flex-col gap-2">
        <div className="px-2 py-3 mb-2">
          <div className="text-lg font-bold text-primary">Rasdah Admin</div>
          <div className="text-xs text-muted-foreground">Super Admin Panel</div>
        </div>
        {items.map(it => (
          <NavLink
            key={it.to}
            to={it.to}
            className={({ isActive }) => cn(
              'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
              isActive ? 'bg-primary/10 text-primary font-medium' : 'text-foreground/70 hover:bg-muted'
            )}
          >
            <it.icon className="w-4 h-4" />
            <span>{language === 'ar' ? it.labelAr : it.label}</span>
          </NavLink>
        ))}
        <div className="mt-auto flex flex-col gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard/ceo')} className="justify-start gap-2">
            <ArrowLeft className="w-4 h-4" />
            {language === 'ar' ? 'العودة للتطبيق' : 'Back to app'}
          </Button>
          <Button variant="ghost" size="sm" onClick={signOut} className="justify-start gap-2 text-destructive">
            <LogOut className="w-4 h-4" />
            {language === 'ar' ? 'تسجيل الخروج' : 'Sign out'}
          </Button>
          <div className="text-xs text-muted-foreground px-2 truncate">{profile?.email}</div>
        </div>
      </aside>
      <main className="flex-1 p-6 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
