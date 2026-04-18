import { Outlet, useNavigate } from 'react-router-dom';
import { AppSidebar } from '@/components/AppSidebar';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LogOut, Settings, Languages } from 'lucide-react';
import { getInitials } from '@/lib/getInitials';
import { AIAssistantButton } from '@/components/AIAssistant/AIAssistantButton';
import { WorkspaceSwitcher } from '@/components/WorkspaceSwitcher';

export function MainLayout() {
  const { language, setLanguage, direction, t } = useLanguage();
  const { profile, signOut, isAdmin, isExecutive, isBranchManager, isAssessor } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const getRoleBadge = () => {
    if (isAdmin) return t('role.admin');
    if (isExecutive) return t('role.executive');
    if (isBranchManager) return t('role.branch_manager');
    if (isAssessor) return t('role.assessor');
    return '';
  };

  const roleBadge = getRoleBadge();

  return (
    <div className="flex h-screen overflow-hidden glass-app">
      <AppSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-14 border-b glass-surface flex items-center justify-end px-5 gap-2">
          {/* Workspace Switcher */}
          <WorkspaceSwitcher />

          {/* Language Toggle */}
          <Button
            variant="outline"
            size="sm"
            className="h-8 px-3 gap-1.5 text-[13px] font-medium glass-btn"
            onClick={() => setLanguage(language === 'en' ? 'ar' : 'en')}
            title={language === 'en' ? 'العربية' : 'English'}
          >
            <Languages className="h-3.5 w-3.5" />
            <span>{language === 'en' ? 'العربية' : 'English'}</span>
          </Button>

          {/* User Profile Dropdown */}
          {profile && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-9 gap-2 px-2 hover:bg-transparent">
                  <Avatar className="h-7 w-7">
                    <AvatarImage src={profile.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                      {getInitials(profile.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden md:flex flex-col items-start text-sm">
                    <span className="font-medium leading-none" style={{ color: 'var(--text-primary)' }}>{profile.full_name}</span>
                    {roleBadge && <span className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>{roleBadge}</span>}
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => navigate('/settings')}>
                  <Settings className="me-2 h-4 w-4" />
                  {direction === 'rtl' ? 'الإعدادات' : 'Settings'}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                  <LogOut className="me-2 h-4 w-4" />
                  {direction === 'rtl' ? 'تسجيل الخروج' : 'Sign Out'}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-6 lg:p-8">
            <Outlet />
          </div>
        </main>
      </div>
      <AIAssistantButton />
    </div>
  );
}
