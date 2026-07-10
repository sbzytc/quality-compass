import { useNavigate, useParams } from 'react-router-dom';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from '@/hooks/use-toast';
import { ArrowLeft, Building2, Utensils, Stethoscope, ChevronRight, FlaskConical, Loader2, Trash2, RotateCcw, AlertTriangle } from 'lucide-react';

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
  const queryClient = useQueryClient();
  const [toDelete, setToDelete] = useState<any>(null);
  const [deleteSummary, setDeleteSummary] = useState<{ branches: number; users: number; evaluations: number; auditLogs: number } | null>(null);

  const { data: companies, isLoading } = useQuery({
    queryKey: ['super-admin-sector-companies', meta.workspace],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('companies')
        .select('id, name, name_ar, slug, status, is_sandbox, logo_url, workspace_type, deleted_at')
        .eq('workspace_type', meta.workspace)
        .order('is_sandbox', { ascending: false })
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  const active = companies?.filter(c => !c.deleted_at) ?? [];
  const deleted = companies?.filter(c => !!c.deleted_at) ?? [];
  const sandbox = active.filter(c => c.is_sandbox);
  const live = active.filter(c => !c.is_sandbox);

  const openDelete = async (c: any) => {
    setToDelete(c);
    setDeleteSummary(null);
    const [b, u, e, a] = await Promise.all([
      supabase.from('branches').select('id', { count: 'exact', head: true }).eq('company_id', c.id),
      supabase.from('company_users').select('id', { count: 'exact', head: true }).eq('company_id', c.id),
      supabase.from('evaluations').select('id', { count: 'exact', head: true }).eq('company_id', c.id),
      supabase.from('audit_logs').select('id', { count: 'exact', head: true }).eq('company_id', c.id),
    ]);
    setDeleteSummary({
      branches: b.count ?? 0,
      users: u.count ?? 0,
      evaluations: e.count ?? 0,
      auditLogs: a.count ?? 0,
    });
  };

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('companies').update({ deleted_at: new Date().toISOString() }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['super-admin-sector-companies', meta.workspace] });
      toast({
        title: isRTL ? 'تم الحذف' : 'Deleted',
        description: isRTL ? 'الشركة قابلة للاسترجاع خلال 15 يوم من سلة المحذوفات.' : 'Recoverable from the recycle bin for 15 days.',
      });
      setToDelete(null);
    },
    onError: (err: any) => toast({ title: isRTL ? 'فشل الحذف' : 'Delete failed', description: err.message, variant: 'destructive' }),
  });

  const restoreMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('companies').update({ deleted_at: null }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['super-admin-sector-companies', meta.workspace] });
      toast({ title: isRTL ? 'تم الاسترجاع' : 'Restored' });
    },
  });

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
                <CompanyCard key={c.id} company={c} onClick={() => navigate(`/super-admin/company/${c.id}`)} onDelete={() => openDelete(c)} index={i} isRTL={isRTL} highlight />
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
              <CompanyCard key={c.id} company={c} onClick={() => navigate(`/super-admin/company/${c.id}`)} onDelete={() => openDelete(c)} index={i} isRTL={isRTL} />
            ))}
          </div>
        </div>

        {deleted.length > 0 && (
          <div className="mt-10">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3 flex items-center gap-2">
              <Trash2 className="w-4 h-4" />
              {isRTL ? 'سلة المحذوفات (قابلة للاسترجاع 15 يوم)' : 'Recycle bin (recoverable for 15 days)'}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {deleted.map(c => {
                const daysLeft = Math.max(0, 15 - Math.floor((Date.now() - new Date(c.deleted_at!).getTime()) / 86400000));
                const expired = daysLeft <= 0;
                return (
                  <Card key={c.id} className="p-4 bg-white/40 border-dashed">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-semibold truncate">{isRTL ? (c.name_ar || c.name) : c.name}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">/{c.slug}</div>
                        <div className={`text-xs mt-2 ${expired ? 'text-destructive' : 'text-muted-foreground'}`}>
                          {expired
                            ? (isRTL ? 'انتهت مدة الاسترجاع' : 'Retention expired')
                            : (isRTL ? `متبقي ${daysLeft} يوم` : `${daysLeft} days left`)}
                        </div>
                      </div>
                      <Button size="sm" variant="outline" className="gap-1.5 shrink-0" onClick={() => restoreMutation.mutate(c.id)} disabled={restoreMutation.isPending}>
                        <RotateCcw className="w-3.5 h-3.5" />
                        {isRTL ? 'استرجاع' : 'Restore'}
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent dir={direction}>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              {isRTL ? 'تأكيد حذف الشركة' : 'Confirm company delete'}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-sm">
                <p>
                  {isRTL ? 'أنت على وشك حذف الشركة:' : 'You are about to delete:'}{' '}
                  <span className="font-semibold text-foreground">
                    {isRTL ? (toDelete?.name_ar || toDelete?.name) : toDelete?.name}
                  </span>
                </p>
                {deleteSummary ? (
                  <div className="rounded-lg border bg-muted/40 p-3 space-y-1.5">
                    <div className="text-xs font-semibold text-foreground mb-1">
                      {isRTL ? 'ملخص البيانات المرتبطة:' : 'Related data summary:'}
                    </div>
                    <Row label={isRTL ? 'الفروع' : 'Branches'} value={deleteSummary.branches} />
                    <Row label={isRTL ? 'المستخدمين' : 'Users'} value={deleteSummary.users} />
                    <Row label={isRTL ? 'التقييمات' : 'Evaluations'} value={deleteSummary.evaluations} />
                    <Row label={isRTL ? 'سجلات التدقيق' : 'Audit logs'} value={deleteSummary.auditLogs} />
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" /> {isRTL ? 'جاري حساب الملخص...' : 'Calculating summary...'}</div>
                )}
                <p className="text-xs text-muted-foreground">
                  {isRTL
                    ? 'الشركة ستُخفى فوراً وتبقى قابلة للاسترجاع من سلة المحذوفات لمدة 15 يوم قبل الحذف النهائي.'
                    : 'The company will be hidden immediately and remain recoverable from the recycle bin for 15 days before permanent removal.'}
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{isRTL ? 'إلغاء' : 'Cancel'}</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); if (toDelete) deleteMutation.mutate(toDelete.id); }}
              disabled={deleteMutation.isPending || !deleteSummary}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending && <Loader2 className="w-4 h-4 animate-spin me-2" />}
              {isRTL ? 'حذف الشركة' : 'Delete company'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Row({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold text-foreground">{value}</span>
    </div>
  );
}

function CompanyCard({ company, onClick, onDelete, index, isRTL, highlight = false }: any) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      whileHover={{ y: -3 }}
      className={`group relative overflow-hidden rounded-2xl backdrop-blur-xl border shadow-md hover:shadow-lg transition-all ${
        highlight ? 'bg-amber-50/60 border-amber-300/60' : 'bg-white/60 border-white/60'
      }`}
    >
      <button onClick={onClick} className="w-full text-start p-5 flex items-start justify-between gap-3">
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
      </button>
      {onDelete && (
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="absolute top-2 end-2 p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors opacity-0 group-hover:opacity-100"
          aria-label={isRTL ? 'حذف' : 'Delete'}
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}
    </motion.div>
  );
}