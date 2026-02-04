import { Link, useLocation } from 'react-router-dom';
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
} from 'lucide-react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';

interface NavItem {
  labelKey: string;
  icon: React.ElementType;
  path: string;
  badge?: number;
}

const mainNavItems: NavItem[] = [
  { labelKey: 'nav.dashboard', icon: LayoutDashboard, path: '/' },
  { labelKey: 'nav.branches', icon: Building2, path: '/branches' },
  { labelKey: 'nav.evaluations', icon: ClipboardCheck, path: '/evaluations' },
  { labelKey: 'nav.findings', icon: AlertTriangle, path: '/findings', badge: 3 },
];

const settingsNavItems: NavItem[] = [
  { labelKey: 'nav.users', icon: Users, path: '/users' },
  { labelKey: 'nav.templates', icon: FileText, path: '/templates' },
  { labelKey: 'nav.settings', icon: Settings, path: '/settings' },
];

export function AppSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const { t, direction } = useLanguage();

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
          <div className="w-10 h-10 rounded-xl bg-sidebar-primary flex items-center justify-center">
            <span className="text-sidebar-primary-foreground font-bold text-lg">Q</span>
          </div>
          <AnimatePresence>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                className="overflow-hidden whitespace-nowrap"
              >
                <span className="font-bold text-lg">SQCS</span>
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
              isActive={location.pathname === item.path}
            />
          ))}
        </div>

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
            />
          ))}
        </div>
      </nav>

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
}: {
  item: NavItem;
  collapsed: boolean;
  isActive: boolean;
}) {
  const Icon = item.icon;
  const { t } = useLanguage();
  
  return (
    <Link
      to={item.path}
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
