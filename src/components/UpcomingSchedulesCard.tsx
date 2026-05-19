import { useEffect, useState } from 'react';
import { CalendarClock, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCurrentCompany } from '@/contexts/CurrentCompanyContext';
import { supabase } from '@/integrations/supabase/client';

interface ScheduleRow {
  id: string;
  branch_id: string;
  frequency_id: string;
  first_evaluation_date: string;
  next_due_date: string | null;
  last_completed_at: string | null;
  branch_name?: string;
  frequency_type?: string;
}

const FREQ_AR: Record<string, string> = {
  daily: 'يومي', weekly: 'أسبوعي', monthly: 'شهري',
  quarterly: 'ربعي', semi_annual: 'نصف سنوي', yearly: 'سنوي',
};

export default function UpcomingSchedulesCard() {
  const { language } = useLanguage();
  const { currentCompany } = useCurrentCompany();
  const [rows, setRows] = useState<ScheduleRow[]>([]);
  const [loading, setLoading] = useState(false);
  const isAr = language === 'ar';

  useEffect(() => {
    if (!currentCompany) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from('evaluation_schedules')
        .select('*')
        .eq('company_id', currentCompany.id)
        .order('next_due_date', { ascending: true });
      const schedules = (data || []) as ScheduleRow[];
      const branchIds = Array.from(new Set(schedules.map(s => s.branch_id)));
      const freqIds = Array.from(new Set(schedules.map(s => s.frequency_id)));
      const [{ data: branches }, { data: freqs }] = await Promise.all([
        branchIds.length
          ? supabase.from('branches').select('id, name, name_ar').in('id', branchIds)
          : Promise.resolve({ data: [] as any[] }),
        freqIds.length
          ? supabase.from('template_frequencies').select('id, frequency_type').in('id', freqIds)
          : Promise.resolve({ data: [] as any[] }),
      ]);
      const bMap: Record<string, any> = {};
      (branches || []).forEach((b: any) => { bMap[b.id] = b; });
      const fMap: Record<string, string> = {};
      (freqs || []).forEach((f: any) => { fMap[f.id] = f.frequency_type; });
      if (cancelled) return;
      setRows(schedules.map(s => ({
        ...s,
        branch_name: isAr ? (bMap[s.branch_id]?.name_ar || bMap[s.branch_id]?.name) : bMap[s.branch_id]?.name,
        frequency_type: fMap[s.frequency_id],
      })));
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [currentCompany?.id, isAr]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarClock className="w-5 h-5 text-primary" />
          {isAr ? 'مواعيد التقييمات القادمة' : 'Upcoming Evaluation Schedules'}
        </CardTitle>
        <CardDescription>
          {isAr ? 'تتولد تلقائياً عند تسليم أول تقييم لكل تكرار' : 'Auto-generated when the first evaluation of each frequency is submitted'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
        {!loading && rows.length === 0 && (
          <p className="text-sm text-muted-foreground">
            {isAr ? 'لا توجد جداول بعد. أرسل تقييماً لبدء الجدولة.' : 'No schedules yet. Submit an evaluation to start.'}
          </p>
        )}
        <div className="space-y-2">
          {rows.map(r => (
            <div key={r.id} className="flex items-center justify-between gap-3 p-3 rounded-lg border bg-card flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium">{r.branch_name || '—'}</span>
                <Badge variant="outline" className="text-xs">
                  {r.frequency_type ? (isAr ? FREQ_AR[r.frequency_type] : r.frequency_type.replace('_', ' ')) : '—'}
                </Badge>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span>{isAr ? 'بدأ:' : 'Started:'} {r.first_evaluation_date}</span>
                {r.next_due_date && (
                  <Badge className="bg-primary/10 text-primary border-primary/30">
                    {isAr ? 'التالي:' : 'Next:'} {r.next_due_date}
                  </Badge>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}