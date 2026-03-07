import { Link, useLocation, useNavigate } from 'react-router-dom';
import rasdahLogo from '@/assets/rasdah-logo.png';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Building2,
  ClipboardCheck,
  AlertTriangle,
  Settings,
  Users,
  FileText,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Briefcase,
  UserCircle,
  Wrench,
  ClipboardList,
  LogOut,
  PlusCircle,
  History,
  Archive,
  ListChecks,
  BarChart3,
  CalendarDays,
  CalendarRange,
  TrendingUp,
} from 'lucide-react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth, AppRole } from '@/contexts/AuthContext';
import { useFindingStats } from '@/hooks/useFindings';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';

interface NavItem {
  labelKey: string;
  icon: React.ElementType;
  path: string;
  badge?: number;
  children?: NavItem[];
  allowedRoles?: AppRole[];
}

export function AppSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [expandedItems, setExpandedItems] = useState<string[]>(['/dashboard']);
  const location = useLocation();
  const navigate = useNavigate();
  const { t, direction } = useLanguage();
  const { profile, roles, signOut, isAdmin, isExecutive, isBranchManager, isAssessor } = useAuth();
  const { data: findingStats } = useFindingStats();

  // Get open findings count for badge
  const openFindingsCount = findingStats?.open || 0;

  // Assessors should not see any dashboards
  const showDashboards = !isAssessor || isAdmin;

  // Filter dashboard sub-items based on role
  const dashboardSubItems: NavItem[] = showDashboards ? ([
    { 
      labelKey: 'nav.dashboard.ceo', 
      icon: Briefcase, 
      path: '/dashboard/ceo',
      allowedRoles: ['admin', 'executive'] as AppRole[]
    },
    { 
      labelKey: 'nav.dashboard.branchManager', 
      icon: UserCircle, 
      path: '/dashboard/branch-manager',
      allowedRoles: ['admin', 'branch_manager'] as AppRole[]
    },
    { 
      labelKey: 'nav.dashboard.operations', 
      icon: Wrench, 
      path: '/dashboard/operations',
      allowedRoles: ['admin', 'branch_manager'] as AppRole[]
    },
  ] as NavItem[]).filter(item => !item.allowedRoles || item.allowedRoles.some(role => roles.includes(role))) : [];

  // Evaluation sub-items for assessors
  const evaluationSubItems: NavItem[] = [
    { 
      labelKey: 'nav.evaluations.new', 
      icon: PlusCircle, 
      path: '/evaluations/new',
    },
    { 
      labelKey: 'nav.evaluations.weekly', 
      icon: CalendarDays, 
      path: '/evaluations/period?period=weekly',
    },
    { 
      labelKey: 'nav.evaluations.monthly', 
      icon: CalendarRange, 
      path: '/evaluations/period?period=monthly',
    },
    { 
      labelKey: 'nav.evaluations.previous', 
      icon: History, 
      path: '/evaluations/previous',
    },
    { 
      labelKey: 'nav.evaluations.archived', 
      icon: Archive, 
      path: '/evaluations/archived',
    },
  ];

  // Evaluation history sub-items for branch managers (view only, no create)
  const branchEvaluationSubItems: NavItem[] = [
    { 
      labelKey: 'nav.evaluations.previous', 
      icon: History, 
      path: '/evaluations/previous',
    },
    { 
      labelKey: 'nav.evaluations.archived', 
      icon: Archive, 
      path: '/evaluations/archived',
    },
  ];

  const mainNavItems: NavItem[] = ([
    // Only show dashboard menu if user should see dashboards
    ...(showDashboards ? [{ 
      labelKey: 'nav.dashboard', 
      icon: LayoutDashboard, 
      path: '/dashboard', 
      children: dashboardSubItems 
    }] : []),
    { 
      labelKey: 'nav.branches', 
      icon: Building2, 
      path: '/branches',
      allowedRoles: ['admin', 'executive'] as AppRole[]
    },
    { 
      labelKey: 'nav.evaluations', 
      icon: ClipboardCheck, 
      path: '/evaluations',
      allowedRoles: ['admin', 'assessor'] as AppRole[],
      children: evaluationSubItems
    },
    // Branch manager: evaluation history (view only)
    ...(isBranchManager && !isAdmin && !isAssessor ? [{ 
      labelKey: 'nav.evaluations', 
      icon: ClipboardCheck, 
      path: '/evaluations',
      children: branchEvaluationSubItems
    }] : []),
    { 
      labelKey: 'nav.findings', 
      icon: AlertTriangle, 
      path: '/findings', 
      badge: openFindingsCount > 0 ? openFindingsCount : undefined 
    },
    { 
      labelKey: 'nav.correctiveActions', 
      icon: ListChecks, 
      path: '/corrective-actions',
    },
    { 
      labelKey: 'nav.reports', 
      icon: BarChart3, 
      path: '/reports',
      allowedRoles: ['admin', 'executive', 'branch_manager'] as AppRole[]
    },
    { 
      labelKey: 'nav.branchPerformance', 
      icon: TrendingUp, 
      path: '/branch-performance',
      allowedRoles: ['admin', 'executive', 'branch_manager'] as AppRole[]
    },
  ] as NavItem[]).filter(item => !item.allowedRoles || item.allowedRoles.some(role => roles.includes(role)));

  const settingsNavItems: NavItem[] = ([
    { 
      labelKey: 'nav.users', 
      icon: Users, 
      path: '/users',
      allowedRoles: ['admin'] as AppRole[]
    },
    { 
      labelKey: 'nav.templates', 
      icon: FileText, 
      path: '/templates',
      allowedRoles: ['admin'] as AppRole[]
    },
    { 
      labelKey: 'nav.settings', 
      icon: Settings, 
      path: '/settings' 
    },
  ] as NavItem[]).filter(item => !item.allowedRoles || item.allowedRoles.some(role => roles.includes(role)));

  const toggleExpanded = (path: string) => {
    setExpandedItems(prev => 
      prev.includes(path) 
        ? prev.filter(p => p !== path)
        : [...prev, path]
    );
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const getRoleBadge = () => {
    if (isAdmin) return direction === 'rtl' ? 'مدير النظام' : 'Admin';
    if (isExecutive) return direction === 'rtl' ? 'تنفيذي' : 'Executive';
    if (isBranchManager) return direction === 'rtl' ? 'مدير الفرع' : 'Branch Manager';
    if (isAssessor) return direction === 'rtl' ? 'مقيّم' : 'Assessor';
    return '';
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 72 : 256 }}
      transition={{ duration: 0.2, ease: 'easeInOut' }}
      className={cn(
        "h-screen bg-sidebar text-sidebar-foreground flex flex-col border-sidebar-border",
        direction === 'rtl' ? 'border-l' : 'border-r'
      )}
    >
      {/* Logo */}
      <div className="h-16 flex items-center px-4 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <img src={rasdahLogo} alt="Rasdah" className="w-10 h-10 rounded-xl object-contain" />
          <AnimatePresence>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                className="overflow-hidden whitespace-nowrap"
              >
                <span className="font-bold text-lg">Rasdah</span>
                <p className="text-xs text-sidebar-foreground/60">
                  {direction === 'rtl' ? 'نظام الجودة' : 'Quality System'}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-6 overflow-y-auto">
        <div className="space-y-1">
          {mainNavItems.map((item) => (
            <SidebarNavItem
              key={item.path}
              item={item}
              collapsed={collapsed}
              isActive={location.pathname === item.path || location.pathname.startsWith(item.path + '/')}
              isExpanded={expandedItems.includes(item.path)}
              onToggle={() => toggleExpanded(item.path)}
              currentPath={location.pathname}
            />
          ))}
        </div>

        {settingsNavItems.length > 0 && (
          <div className="space-y-1">
            {!collapsed && (
              <p className="text-xs font-medium text-sidebar-foreground/50 px-3 py-2 uppercase tracking-wider">
                {t('nav.settings')}
              </p>
            )}
            {settingsNavItems.map((item) => (
              <SidebarNavItem
                key={item.path}
                item={item}
                collapsed={collapsed}
                isActive={location.pathname === item.path}
                isExpanded={false}
                onToggle={() => {}}
                currentPath={location.pathname}
              />
            ))}
          </div>
        )}
      </nav>

      {/* User Profile & Logout */}
      {profile && (
        <div className="p-3 border-t border-sidebar-border">
          <div className={cn(
            "flex items-center gap-3 p-2 rounded-lg",
            collapsed ? "justify-center" : ""
          )}>
            <Avatar className="w-9 h-9">
              <AvatarImage src={profile.avatar_url || undefined} />
              <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground text-sm">
                {getInitials(profile.full_name)}
              </AvatarFallback>
            </Avatar>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{profile.full_name}</p>
                <p className="text-xs text-sidebar-foreground/60">{getRoleBadge()}</p>
              </div>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSignOut}
            className={cn(
              "w-full mt-2 text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground",
              collapsed ? "px-0" : ""
            )}
          >
            <LogOut className="w-4 h-4" />
            {!collapsed && <span className="ms-2">{direction === 'rtl' ? 'تسجيل الخروج' : 'Sign Out'}</span>}
          </Button>
        </div>
      )}

      {/* Collapse button */}
      <div className="p-3 border-t border-sidebar-border">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors"
        >
          {collapsed ? (
            <ChevronRight className="w-5 h-5" />
          ) : (
            <>
              <ChevronLeft className="w-5 h-5" />
              <span className="text-sm">{direction === 'rtl' ? 'طي' : 'Collapse'}</span>
            </>
          )}
        </button>
      </div>
    </motion.aside>
  );
}

function SidebarNavItem({
  item,
  collapsed,
  isActive,
  isExpanded,
  onToggle,
  currentPath,
}: {
  item: NavItem;
  collapsed: boolean;
  isActive: boolean;
  isExpanded: boolean;
  onToggle: () => void;
  currentPath: string;
}) {
  const Icon = item.icon;
  const { t } = useLanguage();
  const hasChildren = item.children && item.children.length > 0;
  
  if (hasChildren && !collapsed) {
    return (
      <div>
        <button
          onClick={onToggle}
          className={cn(
            'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200',
            isActive
              ? 'bg-sidebar-accent text-sidebar-foreground'
              : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'
          )}
        >
          <Icon className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm font-medium overflow-hidden whitespace-nowrap flex-1 text-start">
            {t(item.labelKey)}
          </span>
          <ChevronDown className={cn(
            "w-4 h-4 transition-transform duration-200",
            isExpanded && "rotate-180"
          )} />
        </button>
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="mt-1 ms-4 ps-3 border-s border-sidebar-border space-y-1">
                {item.children!.map((child) => (
                  <Link
                    key={child.path}
                    to={child.path}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 text-sm',
                      currentPath === child.path
                        ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                        : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'
                    )}
                  >
                    <child.icon className="w-4 h-4 flex-shrink-0" />
                    <span className="overflow-hidden whitespace-nowrap">
                      {t(child.labelKey)}
                    </span>
                  </Link>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }
  
  return (
    <Link
      to={hasChildren ? item.children![0].path : item.path}
      className={cn(
        'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200',
        isActive
          ? 'bg-sidebar-primary text-sidebar-primary-foreground'
          : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'
      )}
    >
      <Icon className="w-5 h-5 flex-shrink-0" />
      {!collapsed && (
        <span className="text-sm font-medium overflow-hidden whitespace-nowrap flex-1">
          {t(item.labelKey)}
        </span>
      )}
      {!collapsed && item.badge && (
        <span className="px-2 py-0.5 text-xs font-medium bg-score-critical text-white rounded-full">
          {item.badge}
        </span>
      )}
    </Link>
  );
}
