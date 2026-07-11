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
    <div className="flex items-center justify-end gap-3">
      {profile && (
        <div className="hidden sm:flex flex-col items-end text-sm">
          <span className="font-medium leading-none">{profile.full_name}</span>
          <span className="text-[11px] text-muted-foreground">{profile.email}</span>
        </div>
      )}
      <Button
        variant="outline"
        size="sm"
        onClick={handleSignOut}
        className="gap-1.5 h-9 glass-btn"
      >
        <LogOut className="w-4 h-4" />
        <span>{isRTL ? 'تسجيل الخروج' : 'Sign Out'}</span>
      </Button>
    </div>
  );
}
