import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';

export function SuperAdminHeader() {
  const navigate = useNavigate();
  const { signOut, profile } = useAuth();
  const { language, direction } = useLanguage();
  const isRTL = direction === 'rtl';

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div className="flex flex-col gap-2 min-w-0">
      {profile && (
        <div className={`flex flex-col text-sm min-w-0 ${isRTL ? 'items-end text-end' : 'items-start text-start'}`}>
          <span className="font-semibold leading-tight sa-ink truncate max-w-full">
            {profile.full_name}
          </span>
          <span className="text-[11px] sa-ink-muted truncate max-w-full" dir="ltr">
            {profile.email}
          </span>
        </div>
      )}
      <Button
        variant="outline"
        size="sm"
        onClick={handleSignOut}
        className="gap-1.5 h-9 w-full justify-center whitespace-nowrap bg-white/70 hover:bg-white border-[#e8dbc9] sa-ink"
      >
        <LogOut className="w-4 h-4 shrink-0" />
        <span className="truncate">{isRTL ? 'تسجيل الخروج' : 'Sign Out'}</span>
      </Button>
    </div>
  );
}
