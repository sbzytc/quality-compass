import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Utensils, Stethoscope, CreditCard, ShieldCheck, ArrowRight, Loader2, Palette } from 'lucide-react';
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
    {
      key: 'site-theme',
      sector: 'admin' as const,
      title: isRTL ? 'ثيم الموقع التعريفي' : 'Landing Site Theme',
      desc: isRTL ? 'تحكم بألوان وهوية موقع رصدة التعريفي rasdah.com' : 'Control the colors and identity of the public rasdah.com site',
      icon: Palette,
      color: 'from-blue-500/20 to-cyan-500/20',
      iconColor: 'text-blue-600',
      onClick: () => navigate('/super-admin/site-theme'),
      badge: isRTL ? 'الموقع العام' : 'Public site',
    },
  ];

  // Filter sector cards based on this super admin's scope
  const cards = allCards.filter(c => {
    if (c.sector === 'admin') return scope === 'all';
    return scope === 'all' || scope === c.sector;
  });

  return (
    <div className="min-h-screen sa-warm-bg flex items-center justify-center p-6" dir={direction}>
      <div className="w-full max-w-6xl">
        <div className="absolute top-4 end-4 sm:top-6 sm:end-6">
          <SuperAdminHeader />
        </div>
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl md:text-5xl font-bold text-[#1a1410] mb-3 tracking-tight">
            {isRTL ? 'مرحباً بك يا مدير النظام' : 'Welcome, System Admin'}
          </h1>
          <p className="text-[#6b5b4f] text-base">
            {isRTL ? 'اختر الوجهة التي تريد الدخول إليها' : 'Choose where you want to go'}
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {cards.map((card, i) => {
            const Icon = card.icon;
            const isDark = i === 0;
            return (
              <motion.button
                key={card.key}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                whileHover={{ y: -5 }}
                onClick={card.onClick}
                className={`group relative overflow-hidden rounded-3xl p-6 text-start backdrop-blur-xl border transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                  isDark
                    ? 'bg-[#1a1410] border-[#2a2018] text-white shadow-[0_20px_40px_-20px_rgba(26,20,16,0.6)] hover:shadow-[0_30px_50px_-20px_rgba(26,20,16,0.7)]'
                    : 'bg-white/70 border-white/80 shadow-[0_10px_30px_-15px_rgba(120,80,50,0.25)] hover:shadow-[0_20px_40px_-15px_rgba(120,80,50,0.35)]'
                }`}
              >
                {!isDark && (
                  <div className={`absolute inset-0 bg-gradient-to-br ${card.color} opacity-40 group-hover:opacity-70 transition-opacity`} />
                )}
                {isDark && (
                  <div className="absolute -top-16 -end-16 w-48 h-48 rounded-full bg-gradient-to-br from-[#f4a261]/30 to-transparent blur-2xl" />
                )}
                <div className="relative space-y-4">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
                    isDark ? 'bg-white/10 text-[#f4a261]' : `bg-white/90 ${card.iconColor}`
                  }`}>
                    <Icon className="w-7 h-7" />
                  </div>
                  <div>
                    <div className={`text-[11px] font-medium uppercase tracking-wider mb-1.5 ${
                      isDark ? 'text-white/50' : 'text-[#8a7565]'
                    }`}>
                      {card.badge}
                    </div>
                    <h2 className={`text-lg font-bold mb-1.5 leading-snug ${isDark ? 'text-white' : 'text-[#1a1410]'}`}>{card.title}</h2>
                    <p className={`text-sm leading-relaxed ${isDark ? 'text-white/60' : 'text-[#6b5b4f]'}`}>{card.desc}</p>
                  </div>
                  <div className={`flex items-center gap-2 font-medium pt-2 text-sm ${
                    isDark ? 'text-[#f4a261]' : 'text-[#c26b3a]'
                  }`}>
                    <span>{isRTL ? 'دخول' : 'Enter'}</span>
                    <ArrowRight className={`w-4 h-4 transition-transform group-hover:translate-x-1 ${isRTL ? 'rotate-180 group-hover:-translate-x-1 group-hover:translate-x-0' : ''}`} />
                  </div>
                </div>
              </motion.button>
            );
          })}
        </div>

        <div className="text-center mt-10 text-xs text-[#8a7565]">
          {isRTL ? 'اختر قطاعاً لعرض شركاته أو ادخل على الخطط لإدارة الاشتراكات' : 'Choose a sector to view its companies or manage subscription plans'}
        </div>
      </div>
    </div>
  );
}
