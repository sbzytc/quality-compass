import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Building2, Stethoscope, ShieldCheck, ArrowRight, Loader2 } from 'lucide-react';
import { useCurrentCompany } from '@/contexts/CurrentCompanyContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';

export default function SuperAdminLanding() {
  const navigate = useNavigate();
  const { language, direction } = useLanguage();
  const { roles, loading: authLoading } = useAuth();
  const { companies, switchCompany, loading } = useCurrentCompany();
  const isRTL = direction === 'rtl';

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!roles.includes('super_admin')) {
    return <Navigate to="/" replace />;
  }

  // Find workspaces by sector
  const clinicWs = companies.find(c => c.sector_type === 'clinic');
  const defaultWs = companies.find(c => c.sector_type !== 'clinic') || companies[0];

  const enterWorkspace = async (companyId: string, route: string) => {
    await switchCompany(companyId);
    navigate(route);
  };

  const cards = [
    {
      key: 'default',
      title: isRTL ? 'رصدة الافتراضية' : 'Rasdah Default',
      desc: isRTL ? 'الدخول لمساحة العمل الافتراضية (مطاعم/خدمات)' : 'Enter the default workspace (F&B / Services)',
      icon: Building2,
      color: 'from-blue-500/20 to-indigo-500/20',
      iconColor: 'text-blue-600',
      disabled: !defaultWs,
      onClick: () => defaultWs && enterWorkspace(defaultWs.id, '/dashboard/ceo'),
      badge: defaultWs ? (isRTL ? defaultWs.name_ar || defaultWs.name : defaultWs.name) : (isRTL ? 'غير متاح' : 'Unavailable'),
    },
    {
      key: 'clinic',
      title: isRTL ? 'قطاع العيادات' : 'Clinics Sector',
      desc: isRTL ? 'الدخول لمساحة عمل العيادات (مرضى، مواعيد، غرف)' : 'Enter the clinics workspace (patients, appointments, rooms)',
      icon: Stethoscope,
      color: 'from-emerald-500/20 to-teal-500/20',
      iconColor: 'text-emerald-600',
      disabled: !clinicWs,
      onClick: () => clinicWs && enterWorkspace(clinicWs.id, '/clinic/dashboard'),
      badge: clinicWs ? (isRTL ? clinicWs.name_ar || clinicWs.name : clinicWs.name) : (isRTL ? 'غير متاح' : 'Unavailable'),
    },
    {
      key: 'admin',
      title: isRTL ? 'لوحة مدير النظام' : 'System Admin Panel',
      desc: isRTL ? 'إدارة كل الشركات، الموديولات، الخطط، وسجلات التدقيق' : 'Manage all companies, modules, plans, and audit logs',
      icon: ShieldCheck,
      color: 'from-purple-500/20 to-pink-500/20',
      iconColor: 'text-purple-600',
      disabled: false,
      onClick: () => navigate('/admin/companies'),
      badge: isRTL ? 'كل الشركات' : 'All Companies',
    },
  ];

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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {cards.map((card, i) => {
            const Icon = card.icon;
            return (
              <motion.button
                key={card.key}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                whileHover={{ y: -4 }}
                disabled={card.disabled}
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
          {isRTL ? 'يمكنك التبديل بين هذه الوجهات لاحقاً من الهيدر' : 'You can switch between these destinations later from the header'}
        </div>
      </div>
    </div>
  );
}
