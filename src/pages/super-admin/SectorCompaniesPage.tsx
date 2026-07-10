import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Building2, Utensils, Stethoscope, ChevronRight, FlaskConical, Loader2 } from 'lucide-react';

const SECTOR_META: Record<string, { workspace: 'food' | 'medical'; titleEn: string; titleAr: string; icon: any; gradient: string }> = {
  food: { workspace: 'food', titleEn: 'Food / Restaurants', titleAr: 'الأغذية / المطاعم', icon: Utensils, gradient: 'from-orange-500/20 to-amber-500/20' },
  medical: { workspace: 'medical', titleEn: 'Medical / Clinics', titleAr: 'الطبي / العيادات', icon: Stethoscope, gradient: 'from-emerald-500/20 to-teal-500/20' },
};

export default function SectorCompaniesPage() {
  const { sector = 'food' } = useParams();
  const navigate = useNavigate();
  const { language, direction } = useLanguage();
  const isRTL = direction === 'rtl';
  const meta = SECTOR_META[sector] ?? SECTOR_META.food;
  const SectorIcon = meta.icon;

  const { data: companies, isLoading } = useQuery({
    queryKey: ['super-admin-sector-companies', meta.workspace],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('companies')
        .select('id, name, name_ar, slug, status, is_sandbox, logo_url, workspace_type')
        .eq('workspace_type', meta.workspace)
        .order('is_sandbox', { ascending: false })
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  const sandbox = companies?.filter(c => c.is_sandbox) ?? [];
  const live = companies?.filter(c => !c.is_sandbox) ?? [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#edf3ff] to-[#e8eff9] p-6" dir={direction}>
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="sm" onClick={() => navigate('/super-admin')} className="gap-2">
            <ArrowLeft className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
            {isRTL ? 'الرجوع' : 'Back'}
          </Button>
        </div>

        <div className="flex items-center gap-4 mb-8">
          <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${meta.gradient} flex items-center justify-center`}>
            <SectorIcon className="w-7 h-7 text-foreground" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">{isRTL ? meta.titleAr : meta.titleEn}</h1>
            <p className="text-sm text-muted-foreground">
              {isRTL ? 'اختر شركة للدخول على لوحة السوبر ادمن الخاصة بها' : 'Pick a company to open its Super Admin panel'}
            </p>
          </div>
        </div>

        {isLoading && (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        )}

        {sandbox.length > 0 && (
          <div className="mb-8">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3 flex items-center gap-2">
              <FlaskConical className="w-4 h-4" />
              {isRTL ? 'الشركة التجريبية' : 'Sandbox company'}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sandbox.map((c, i) => (
                <CompanyCard key={c.id} company={c} onClick={() => navigate(`/super-admin/company/${c.id}`)} index={i} isRTL={isRTL} highlight />
              ))}
            </div>
          </div>
        )}

        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3 flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            {isRTL ? 'الشركات الحية' : 'Live companies'}
          </h2>
          {live.length === 0 && !isLoading && (
            <div className="text-sm text-muted-foreground bg-white/40 rounded-xl p-6 text-center">
              {isRTL ? 'لا توجد شركات في هذا القطاع بعد.' : 'No companies in this sector yet.'}
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {live.map((c, i) => (
              <CompanyCard key={c.id} company={c} onClick={() => navigate(`/super-admin/company/${c.id}`)} index={i} isRTL={isRTL} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function CompanyCard({ company, onClick, index, isRTL, highlight = false }: any) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      whileHover={{ y: -3 }}
      onClick={onClick}
      className={`group relative overflow-hidden rounded-2xl p-5 text-start backdrop-blur-xl border shadow-md hover:shadow-lg transition-all ${
        highlight ? 'bg-amber-50/60 border-amber-300/60' : 'bg-white/60 border-white/60'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-foreground truncate">
            {isRTL ? (company.name_ar || company.name) : company.name}
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">/{company.slug}</div>
          <div className="flex gap-1.5 mt-3 flex-wrap">
            <Badge variant={company.status === 'active' ? 'default' : 'secondary'} className="text-[10px]">
              {company.status}
            </Badge>
            {highlight && (
              <Badge className="text-[10px] bg-amber-500 hover:bg-amber-500 text-white">
                {isRTL ? 'تجريبية' : 'Sandbox'}
              </Badge>
            )}
          </div>
        </div>
        <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 ${isRTL ? 'rotate-180 group-hover:-translate-x-0.5 group-hover:translate-x-0' : ''}`} />
      </div>
    </motion.button>
  );
}