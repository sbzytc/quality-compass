import { Link, useLocation, useNavigate } from 'react-router-dom';
import rasdahLogo from '@/assets/rasdah-logo.png';
import { cn } from '@/lib/utils';
import { getInitials } from '@/lib/getInitials';
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
  LogOut,
  PlusCircle,
  History,
  Archive,
  ListChecks,
  BarChart3,
  TrendingUp,
  Headset,
  Sparkles,
  Star,
  MessageSquareMore,
  ScrollText,
  Repeat,
  Plug,
} from 'lucide-react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth, AppRole } from '@/contexts/AuthContext';
import { useFindingStats } from '@/hooks/useFindings';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

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
  const { profile, roles, signOut, isAdmin, isExecutive, isBranchManager, isAssessor, isSupportAgent } = useAuth();
  const { data: findingStats } = useFindingStats();

  const openFindingsCount = findingStats?.open || 0;
  const showDashboards = !isAssessor || isAdmin;

  const dashboardSubItems: NavItem[] = showDashboards ? ([
    { labelKey: 'nav.dashboard.ceo', icon: Briefcase, path: '/dashboard/ceo', allowedRoles: ['admin', 'executive'] as AppRole[] },
    { labelKey: 'nav.dashboard.branchManager', icon: UserCircle, path: '/dashboard/branch-manager', allowedRoles: ['admin', 'branch_manager'] as AppRole[] },
    { labelKey: 'nav.dashboard.operations', icon: Wrench, path: '/dashboard/operations', allowedRoles: ['admin', 'branch_manager'] as AppRole[] },
  ] as NavItem[]).filter(item => !item.allowedRoles || item.allowedRoles.some(role => roles.includes(role))) : [];

  const evaluationSubItems: NavItem[] = [
    { labelKey: 'nav.evaluations.new', icon: PlusCircle, path: '/evaluations/new' },
    { labelKey: 'nav.evaluations.previous', icon: History, path: '/evaluations/previous' },
    { labelKey: 'nav.evaluations.archived', icon: Archive, path: '/evaluations/archived' },
  ];

  const branchEvaluationSubItems: NavItem[] = [
    { labelKey: 'nav.evaluations.previous', icon: History, path: '/evaluations/previous' },
    { labelKey: 'nav.evaluations.archived', icon: Archive, path: '/evaluations/archived' },
  ];

  const mainNavItems: NavItem[] = ([
    ...(showDashboards ? [{ labelKey: 'nav.dashboard', icon: LayoutDashboard, path: '/dashboard', children: dashboardSubItems }] : []),
    { labelKey: 'nav.branches', icon: Building2, path: '/branches', allowedRoles: ['admin', 'executive'] as AppRole[] },
    { labelKey: 'nav.evaluations', icon: ClipboardCheck, path: '/evaluations', allowedRoles: ['admin', 'assessor'] as AppRole[], children: evaluationSubItems },
    ...(isBranchManager && !isAdmin && !isAssessor ? [{ labelKey: 'nav.evaluations', icon: ClipboardCheck, path: '/evaluations', children: branchEvaluationSubItems }] : []),
    { labelKey: 'nav.findings', icon: AlertTriangle, path: '/findings', badge: openFindingsCount > 0 ? openFindingsCount : undefined },
    { labelKey: 'nav.recurringProblems', icon: Repeat, path: '/recurring-problems', allowedRoles: ['admin', 'executive', 'branch_manager'] as AppRole[] },
    { labelKey: 'nav.correctiveActions', icon: ListChecks, path: '/corrective-actions', allowedRoles: ['admin', 'executive', 'branch_manager'] as AppRole[] },
    { labelKey: 'nav.reports', icon: BarChart3, path: '/reports', allowedRoles: ['admin', 'executive', 'branch_manager'] as AppRole[] },
    { labelKey: 'nav.branchPerformance', icon: TrendingUp, path: '/branch-performance', allowedRoles: ['admin', 'executive', 'branch_manager'] as AppRole[] },
    {
      labelKey: 'nav.support', icon: Headset, path: '/support',
      children: [
        { labelKey: 'nav.support.myTickets', icon: FileText, path: '/support/my-tickets' },
        ...(isAdmin || isSupportAgent ? [
          { labelKey: 'nav.support.dashboard', icon: LayoutDashboard, path: '/support/dashboard' },
          { labelKey: 'nav.support.archived', icon: Archive, path: '/support/archived' },
        ] : []),
      ],
    },
    ...(() => {
      const feedbackChildren: NavItem[] = [];
      if (isAdmin || profile?.can_view_customer_feedback) feedbackChildren.push({ labelKey: 'nav.customerFeedback.ratings', icon: Star, path: '/customer-feedback' });
      if (isAdmin || profile?.can_view_complaints || profile?.can_view_suggestions) feedbackChildren.push({ labelKey: 'nav.customerFeedback.complaints', icon: MessageSquareMore, path: '/customer-complaints' });
      if (feedbackChildren.length > 0) return [{ labelKey: 'nav.customerFeedback', icon: Star, path: '/customer-feedback', children: feedbackChildren }];
      return [];
    })(),
    { labelKey: 'nav.assistant', icon: Sparkles, path: '/assistant' },
  ] as NavItem[]).filter(item => !item.allowedRoles || item.allowedRoles.some(role => roles.includes(role)));

  const settingsNavItems: NavItem[] = ([
    { labelKey: 'nav.users', icon: Users, path: '/users', allowedRoles: ['admin'] as AppRole[] },
    { labelKey: 'nav.templates', icon: FileText, path: '/templates', allowedRoles: ['admin'] as AppRole[] },
    { labelKey: 'nav.settings', icon: Settings, path: '/settings' },
    { labelKey: 'nav.systemLogs', icon: ScrollText, path: '/system-logs', allowedRoles: ['admin'] as AppRole[] },
    { labelKey: 'nav.integrations', icon: Plug, path: '/integrations', allowedRoles: ['admin'] as AppRole[] },
  ] as NavItem[]).filter(item => !item.allowedRoles || item.allowedRoles.some(role => roles.includes(role)));

  const toggleExpanded = (path: string) => {
    setExpandedItems(prev => prev.includes(path) ? prev.filter(p => p !== path) : [...prev, path]);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const getRoleBadge = () => {
    if (isAdmin) return t('role.admin');
    if (isExecutive) return t('role.executive');
    if (isBranchManager) return t('role.branch_manager');
    if (isAssessor) return t('role.assessor');
    if (isSupportAgent) return t('role.support_agent');
    if (roles.includes('branch_employee')) return direction === 'rtl' ? 'موظف فرع' : 'Branch Employee';
    return '';
  };

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 72 : 260 }}
      transition={{ duration: 0.2, ease: 'easeInOut' }}
      className={cn(
        "h-screen glass-sidebar flex flex-col shrink-0",
        direction === 'rtl' ? 'border-l border-l-[hsl(220_20%_22%)]' : 'border-r border-r-[hsl(220_20%_22%)]'
      )}
    >
      {/* Logo */}
      <div className="h-16 flex items-center px-4 border-b border-[hsl(220_20%_22%)]">
        <div className="flex items-center gap-3">
          <img src={rasdahLogo} alt="Rasdah" className="w-9 h-9 rounded-lg object-contain" />
          <AnimatePresence>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                className="overflow-hidden whitespace-nowrap"
              >
                <span className="font-bold text-[15px] text-white">Rasdah</span>
                <p className="text-[11px] text-[hsl(220_15%_55%)]">
                  {direction === 'rtl' ? 'نظام الجودة' : 'Quality System'}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2.5 space-y-5 overflow-y-auto scrollbar-thin">
        <div className="space-y-0.5">
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
          <div className="space-y-0.5">
            {!collapsed && (
              <p className="text-[10px] font-semibold text-[hsl(220_15%_45%)] px-3 py-2 uppercase tracking-widest">
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
        <div className="p-3 border-t border-[hsl(220_20%_22%)]">
          <div className={cn("flex items-center gap-3 p-2 rounded-lg", collapsed ? "justify-center" : "")}>
            <Avatar className="w-8 h-8 ring-2 ring-[hsl(220_20%_28%)]">
              <AvatarImage src={profile.avatar_url || undefined} />
              <AvatarFallback className="bg-[hsl(217_72%_42%)] text-white text-xs font-semibold">
                {getInitials(profile.full_name)}
              </AvatarFallback>
            </Avatar>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate text-white">{profile.full_name}</p>
                <p className="text-[11px] text-[hsl(220_15%_50%)]">{getRoleBadge()}</p>
              </div>
            )}
          </div>
          <button
            onClick={handleSignOut}
            className={cn(
              "w-full mt-1.5 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-[13px] text-[hsl(220_15%_55%)] hover:bg-[hsl(220_20%_20%)] hover:text-[hsl(0_72%_60%)] transition-colors",
              collapsed ? "px-0" : ""
            )}
          >
            <LogOut className="w-4 h-4" />
            {!collapsed && <span>{direction === 'rtl' ? 'تسجيل الخروج' : 'Sign Out'}</span>}
          </button>
        </div>
      )}

      {/* Collapse button */}
      <div className="p-2.5 border-t border-[hsl(220_20%_22%)]">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-[hsl(220_15%_50%)] hover:bg-[hsl(220_20%_20%)] hover:text-white transition-colors"
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <>
              <ChevronLeft className="w-4 h-4" />
              <span className="text-[13px]">{direction === 'rtl' ? 'طي' : 'Collapse'}</span>
            </>
          )}
        </button>
      </div>
    </motion.aside>
  );
}

function SidebarNavItem({
  item, collapsed, isActive, isExpanded, onToggle, currentPath,
}: {
  item: NavItem; collapsed: boolean; isActive: boolean; isExpanded: boolean; onToggle: () => void; currentPath: string;
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
            'w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 text-[13px]',
            isActive
              ? 'glass-nav-active text-white font-medium'
              : 'text-[hsl(220_15%_65%)] glass-nav-hover'
          )}
        >
          <Icon className="w-[18px] h-[18px] flex-shrink-0" />
          <span className="font-medium overflow-hidden whitespace-nowrap flex-1 text-start">
            {t(item.labelKey)}
          </span>
          <ChevronDown className={cn("w-3.5 h-3.5 transition-transform duration-200 opacity-60", isExpanded && "rotate-180")} />
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
              <div className="mt-0.5 ms-4 ps-3 border-s border-[hsl(220_20%_25%)] space-y-0.5">
                {item.children!.map((child) => (
                  <Link
                    key={child.path}
                    to={child.path}
                    className={cn(
                      'flex items-center gap-3 px-3 py-1.5 rounded-lg transition-all duration-200 text-[13px]',
                      currentPath === child.path
                        ? 'text-[hsl(217_72%_65%)] bg-[hsl(217_72%_42%/_0.12)] font-medium'
                        : 'text-[hsl(220_15%_55%)] hover:text-[hsl(220_15%_75%)] hover:bg-[hsl(220_20%_20%)]'
                    )}
                  >
                    <child.icon className="w-4 h-4 flex-shrink-0" />
                    <span className="overflow-hidden whitespace-nowrap">{t(child.labelKey)}</span>
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
        'flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 text-[13px]',
        isActive
          ? 'glass-nav-active text-white font-medium'
          : 'text-[hsl(220_15%_65%)] glass-nav-hover'
      )}
    >
      <Icon className="w-[18px] h-[18px] flex-shrink-0" />
      {!collapsed && (
        <span className="font-medium overflow-hidden whitespace-nowrap flex-1">{t(item.labelKey)}</span>
      )}
      {!collapsed && item.badge && (
        <span className="glass-badge-notification px-1.5 py-0.5 text-[10px] font-bold rounded-full min-w-[20px] text-center">
          {item.badge}
        </span>
      )}
    </Link>
  );
}