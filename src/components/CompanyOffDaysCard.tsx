import { useEffect, useState } from 'react';
import { Calendar, Plus, Trash2, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCurrentCompany } from '@/contexts/CurrentCompanyContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface OffDay {
  id: string;
  day_of_week: number | null;
  specific_date: string | null;
  label: string | null;
}

const DAYS_EN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAYS_AR = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

export default function CompanyOffDaysCard() {
  const { language } = useLanguage();
  const { currentCompany } = useCurrentCompany();
  const [items, setItems] = useState<OffDay[]>([]);
  const [loading, setLoading] = useState(false);
  const [newDate, setNewDate] = useState('');
  const [newLabel, setNewLabel] = useState('');

  const days = language === 'ar' ? DAYS_AR : DAYS_EN;

  const load = async () => {
    if (!currentCompany) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('company_off_days')
      .select('*')
      .eq('company_id', currentCompany.id)
      .order('day_of_week', { ascending: true });
    if (!error) setItems((data || []) as OffDay[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentCompany?.id]);

  const weeklySet = new Set(items.filter(i => i.day_of_week !== null).map(i => i.day_of_week!));

  const toggleWeekly = async (dow: number) => {
    if (!currentCompany) return;
    const existing = items.find(i => i.day_of_week === dow);
    if (existing) {
      const { error } = await supabase.from('company_off_days').delete().eq('id', existing.id);
      if (error) return toast.error(error.message);
    } else {
      const { error } = await supabase
        .from('company_off_days')
        .insert({ company_id: currentCompany.id, day_of_week: dow });
      if (error) return toast.error(error.message);
    }
    load();
  };

  const addSpecificDate = async () => {
    if (!currentCompany || !newDate) return;
    const { error } = await supabase.from('company_off_days').insert({
      company_id: currentCompany.id,
      specific_date: newDate,
      label: newLabel.trim() || null,
    });
    if (error) return toast.error(error.message);
    setNewDate('');
    setNewLabel('');
    load();
  };

  const removeSpecific = async (id: string) => {
    const { error } = await supabase.from('company_off_days').delete().eq('id', id);
    if (error) return toast.error(error.message);
    load();
  };

  const specifics = items.filter(i => i.specific_date !== null);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-primary" />
          {language === 'ar' ? 'أيام الإجازة' : 'Off Days'}
        </CardTitle>
        <CardDescription>
          {language === 'ar'
            ? 'تستخدم لتخطي تواريخ التقييمات المجدولة تلقائياً'
            : 'Used to skip auto-scheduled evaluation dates'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <Label className="text-sm font-medium">
            {language === 'ar' ? 'الإجازات الأسبوعية' : 'Weekly off days'}
          </Label>
          <div className="flex flex-wrap gap-2 mt-2">
            {days.map((d, idx) => {
              const active = weeklySet.has(idx);
              return (
                <Button
                  key={idx}
                  type="button"
                  variant={active ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => toggleWeekly(idx)}
                  disabled={loading}
                >
                  {d}
                </Button>
              );
            })}
          </div>
        </div>

        <Separator />

        <div>
          <Label className="text-sm font-medium">
            {language === 'ar' ? 'تواريخ إجازة محددة' : 'Specific holiday dates'}
          </Label>
          <div className="flex flex-col sm:flex-row gap-2 mt-2">
            <Input type="date" value={newDate} onChange={e => setNewDate(e.target.value)} className="sm:w-48" />
            <Input
              placeholder={language === 'ar' ? 'مسمى (اختياري)' : 'Label (optional)'}
              value={newLabel}
              onChange={e => setNewLabel(e.target.value)}
            />
            <Button onClick={addSpecificDate} disabled={!newDate || loading} className="gap-1">
              <Plus className="w-4 h-4" />
              {language === 'ar' ? 'إضافة' : 'Add'}
            </Button>
          </div>

          <div className="flex flex-wrap gap-2 mt-3">
            {loading && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
            {specifics.length === 0 && !loading && (
              <p className="text-sm text-muted-foreground">
                {language === 'ar' ? 'لا توجد تواريخ مضافة' : 'No dates added yet'}
              </p>
            )}
            {specifics.map(s => (
              <Badge key={s.id} variant="secondary" className="gap-2 py-1.5 ps-3">
                <span>{s.specific_date}</span>
                {s.label && <span className="text-muted-foreground">— {s.label}</span>}
                <button
                  type="button"
                  onClick={() => removeSpecific(s.id)}
                  className="ms-1 text-destructive hover:opacity-80"
                  aria-label="remove"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </Badge>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}