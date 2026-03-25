import { Link, useLocation, useNavigate } from 'react-router-dom';
import rasdahLogo from '@/assets/rasdah-logo.png';
import { cn } from '@/lib/utils';
import { getInitials } from '@/lib/getInitials';
import {
  LayoutDashboard, Building2, ClipboardCheck, AlertTriangle, Settings, Users, FileText,
  ChevronLeft, ChevronRight, ChevronDown, Briefcase, UserCircle, Wrench, LogOut,
  PlusCircle, History, Archive, ListChecks, BarChart3, TrendingUp, Headset, Sparkles,
  Star, MessageSquareMore, ScrollText, Repeat, Plug,
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
      animate={{ width: collapsed ? 72 : 290 }}
      transition={{ duration: 0.2, ease: 'easeInOut' }}
      className="h-screen shrink-0 p-3 flex flex-col"
      style={{ direction }}
    >
      <div className={cn(
        "glass-sidebar flex-1 min-h-0 overflow-hidden",
        direction === 'rtl' && 'border-r-0'
      )}>
        {/* Logo */}
        <div className="flex items-center px-2 pb-2 border-b border-[rgba(255,255,255,0.12)]">
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
                  <span className="font-bold text-[15px]" style={{ color: '#2d3d57' }}>Rasdah</span>
                  <p className="text-[11px]" style={{ color: 'rgba(0,0,0,0.4)' }}>
                    {direction === 'rtl' ? 'نظام الجودة' : 'Quality System'}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto scrollbar-thin py-2 px-1">
          <div className="glass-menu">
            {mainNavItems.map((item, index) => (
              <div key={item.path}>
                {index > 0 && <div className="glass-item-divider" />}
                <SidebarNavItem
                  item={item}
                  collapsed={collapsed}
                  isActive={location.pathname === item.path || location.pathname.startsWith(item.path + '/')}
                  isExpanded={expandedItems.includes(item.path)}
                  onToggle={() => toggleExpanded(item.path)}
                  currentPath={location.pathname}
                />
              </div>
            ))}
          </div>

          {settingsNavItems.length > 0 && <>
            <div className="glass-section-divider" />
            <div className="glass-menu">
              {!collapsed && (
                <p className="text-[10px] font-semibold px-4 py-2 uppercase tracking-widest" style={{ color: 'rgba(0,0,0,0.30)' }}>
                  {t('nav.settings')}
                </p>
              )}
              {settingsNavItems.map((item, index) => (
                <div key={item.path}>
                  {index > 0 && <div className="glass-item-divider" />}
                  <SidebarNavItem
                    item={item}
                    collapsed={collapsed}
                    isActive={location.pathname === item.path}
                    isExpanded={false}
                    onToggle={() => {}}
                    currentPath={location.pathname}
                  />
                </div>
              ))}
            </div>
          </>}
        </nav>

        {/* User Profile & Logout */}
        {profile && (
          <div className="pt-2 border-t border-[rgba(255,255,255,0.12)] px-1">
            <div className={cn("flex items-center gap-3 p-3 rounded-[20px]", collapsed ? "justify-center" : "")}>
              <Avatar className="w-9 h-9 ring-2 ring-[rgba(45,103,178,0.25)]">
                <AvatarImage src={profile.avatar_url || undefined} />
                <AvatarFallback className="bg-[#2d4a7c] text-white text-xs font-bold">
                  {getInitials(profile.full_name)}
                </AvatarFallback>
              </Avatar>
              {!collapsed && (
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-semibold truncate" style={{ color: '#2d3d57' }}>{profile.full_name}</p>
                  <p className="text-[11px] font-medium" style={{ color: 'rgba(0,0,0,0.38)' }}>{getRoleBadge()}</p>
                </div>
              )}
            </div>
            <button
              onClick={handleSignOut}
              className={cn(
                "glass-menu-item w-full mt-1 text-[13px] justify-center border-b-0",
                collapsed ? "px-0" : ""
              )}
            >
              <LogOut className="icon w-4 h-4" />
              {!collapsed && <span className="label text-center">{direction === 'rtl' ? 'تسجيل الخروج' : 'Sign Out'}</span>}
            </button>
          </div>
        )}
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
          className={cn("glass-menu-item w-full text-[14px]", isActive && "active")}
        >
          <Icon className="icon w-[20px] h-[20px] flex-shrink-0" />
          <span className="label overflow-hidden whitespace-nowrap text-start">
            {t(item.labelKey)}
          </span>
          <ChevronDown className={cn("w-4 h-4 transition-transform duration-200 opacity-50", isExpanded && "rotate-180")} />
        </button>
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1, overflow: 'visible' }}
              exit={{ height: 0, opacity: 0, overflow: 'hidden' }}
              transition={{ duration: 0.2 }}
              style={{ overflow: 'visible' }}
            >
              <div className="glass-submenu mt-1">
                {item.children!.map((child, idx) => {
                  const isChildActive = currentPath === child.path;
                  return (
                    <div key={child.path}>
                      {idx > 0 && <div className="glass-item-divider" />}
                      <Link
                        to={child.path}
                        className={cn("glass-menu-item text-[13px]", isChildActive && "active")}
                      >
                        <child.icon className="icon w-[18px] h-[18px] flex-shrink-0" />
                        <span className="label overflow-hidden whitespace-nowrap">{t(child.labelKey)}</span>
                        {isChildActive && <span className="glass-corner-glow" />}
                        {isChildActive && <span className="glass-corner-glow-pink" />}
                        {isChildActive && <span className="glass-bottom-light" />}
                      </Link>
                    </div>
                  );
                })}
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
        className={cn("glass-menu-item text-[14px]", isActive && "active")}
      >
        <Icon className="icon w-[20px] h-[20px] flex-shrink-0" />
        {!collapsed && (
          <span className="label overflow-hidden whitespace-nowrap">{t(item.labelKey)}</span>
        )}
        {!collapsed && item.badge && (
          <span className="glass-badge">
            {item.badge}
          </span>
        )}
        {isActive && <span className="glass-corner-glow" />}
        {isActive && <span className="glass-corner-glow-pink" />}
        {isActive && <span className="glass-bottom-light" />}
      </Link>
  );
}
