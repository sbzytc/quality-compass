import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Utensils, Stethoscope, CreditCard, ShieldCheck, ArrowRight, Loader2 } from 'lucide-react';
import { useCurrentCompany } from '@/contexts/CurrentCompanyContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useSuperAdminScope } from '@/hooks/useSuperAdminScope';
import { Navigate } from 'react-router-dom';
import { SuperAdminHeader } from '@/components/SuperAdminHeader';

export default function SuperAdminLanding() {
  const navigate = useNavigate();
  const { language, direction } = useLanguage();
  const { roles, loading: authLoading } = useAuth();
  const { loading } = useCurrentCompany();
  const { scope, loading: scopeLoading } = useSuperAdminScope();
  const isRTL = direction === 'rtl';

  if (authLoading || loading || scopeLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!roles.includes('super_admin')) {
    return <Navigate to="/" replace />;
  }

  const allCards = [
    {
      key: 'food',
      sector: 'food' as const,
      title: isRTL ? 'موديول الأغذية / المطاعم' : 'Food / Restaurants Module',
      desc: isRTL ? 'كل الشركات ضمن قطاع المطاعم والأغذية' : 'All companies in the F&B sector',
      icon: Utensils,
      color: 'from-orange-500/20 to-amber-500/20',
      iconColor: 'text-orange-600',
      onClick: () => navigate('/super-admin/sector/food'),
      badge: isRTL ? 'قطاع' : 'Sector',
    },
    {
      key: 'medical',
      sector: 'medical' as const,
      title: isRTL ? 'موديول الطبي / العيادات' : 'Medical / Clinics Module',
      desc: isRTL ? 'كل الشركات ضمن قطاع العيادات والمراكز الطبية' : 'All companies in the clinics sector',
      icon: Stethoscope,
      color: 'from-emerald-500/20 to-teal-500/20',
      iconColor: 'text-emerald-600',
      onClick: () => navigate('/super-admin/sector/medical'),
      badge: isRTL ? 'قطاع' : 'Sector',
    },
    {
      key: 'plans',
      sector: 'admin' as const,
      title: isRTL ? 'الخطط' : 'Plans',
      desc: isRTL ? 'إدارة باقات الاشتراك المتاحة للشركات' : 'Manage subscription plans available to companies',
      icon: CreditCard,
      color: 'from-purple-500/20 to-pink-500/20',
      iconColor: 'text-purple-600',
      onClick: () => navigate('/admin/plans'),
      badge: isRTL ? 'إعدادات' : 'Settings',
    },
    {
      key: 'accounts',
      sector: 'admin' as const,
      title: isRTL ? 'حسابات السوبر ادمن' : 'Super Admin Accounts',
      desc: isRTL ? 'إدارة السوبر ادمنز، تعديل بياناتهم وتحديد نطاق كل منهم' : 'Manage super admin accounts, edit their info and scope',
      icon: ShieldCheck,
      color: 'from-slate-500/20 to-zinc-500/20',
      iconColor: 'text-slate-700',
      onClick: () => navigate('/super-admin/accounts'),
      badge: isRTL ? 'إدارة' : 'Management',
    },
  ];

  // Filter sector cards based on this super admin's scope
  const cards = allCards.filter(c => {
    if (c.sector === 'admin') return scope === 'all';
    return scope === 'all' || scope === c.sector;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#edf3ff] to-[#e8eff9] flex items-center justify-center p-6" dir={direction}>
      <div className="w-full max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <h1 className="text-4xl font-bold text-foreground mb-2">
            {isRTL ? 'مرحباً بك يا مدير النظام' : 'Welcome, System Admin'}
          </h1>
          <p className="text-muted-foreground">
            {isRTL ? 'اختر الوجهة التي تريد الدخول إليها' : 'Choose where you want to go'}
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {cards.map((card, i) => {
            const Icon = card.icon;
            return (
              <motion.button
                key={card.key}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                whileHover={{ y: -4 }}
                onClick={card.onClick}
                className={`group relative overflow-hidden rounded-2xl p-6 text-start backdrop-blur-xl bg-white/60 border border-white/60 shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${card.color} opacity-50 group-hover:opacity-80 transition-opacity`} />
                <div className="relative space-y-4">
                  <div className={`w-14 h-14 rounded-2xl bg-white/80 flex items-center justify-center ${card.iconColor}`}>
                    <Icon className="w-7 h-7" />
                  </div>
                  <div>
                    <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                      {card.badge}
                    </div>
                    <h2 className="text-xl font-bold text-foreground mb-1">{card.title}</h2>
                    <p className="text-sm text-muted-foreground">{card.desc}</p>
                  </div>
                  <div className="flex items-center gap-2 text-primary font-medium pt-2">
                    <span>{isRTL ? 'دخول' : 'Enter'}</span>
                    <ArrowRight className={`w-4 h-4 transition-transform group-hover:translate-x-1 ${isRTL ? 'rotate-180 group-hover:-translate-x-1 group-hover:translate-x-0' : ''}`} />
                  </div>
                </div>
              </motion.button>
            );
          })}
        </div>

        <div className="text-center mt-8 text-xs text-muted-foreground">
          {isRTL ? 'اختر قطاعاً لعرض شركاته أو ادخل على الخطط لإدارة الاشتراكات' : 'Choose a sector to view its companies or manage subscription plans'}
        </div>
      </div>
    </div>
  );
}
