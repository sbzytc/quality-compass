import { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useVisits, useVisitMutations, type Visit } from '@/hooks/useVisits';
import { usePatients } from '@/hooks/usePatients';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Pencil, Trash2, ClipboardList } from 'lucide-react';
import { useGoBack } from '@/hooks/useGoBack';

export default function VisitsPage() {
  const { language } = useLanguage();
  const goBack = useGoBack();
  const [params] = useSearchParams();
  const filterPatient = params.get('patient');

  const { data: visits = [], isLoading } = useVisits();
  const { data: patients = [] } = usePatients();
  const { create, update, remove } = useVisitMutations();

  const [editing, setEditing] = useState<Visit | null>(null);
  const [open, setOpen] = useState(false);
  const [confirmDel, setConfirmDel] = useState<Visit | null>(null);

  const filtered = useMemo(
    () => filterPatient ? visits.filter(v => v.patient_id === filterPatient) : visits,
    [visits, filterPatient]
  );

  function openNew() { setEditing(null); setOpen(true); }
  function openEdit(v: Visit) { setEditing(v); setOpen(true); }

  function fmtLocal(iso: string) {
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const payload: any = {
      patient_id: String(fd.get('patient_id') || ''),
      visit_date: new Date(String(fd.get('visit_date'))).toISOString(),
      doctor_name: String(fd.get('doctor_name') || '').trim() || null,
      chief_complaint: String(fd.get('chief_complaint') || '').trim() || null,
      diagnosis: String(fd.get('diagnosis') || '').trim() || null,
      treatment: String(fd.get('treatment') || '').trim() || null,
      prescription: String(fd.get('prescription') || '').trim() || null,
      notes: String(fd.get('notes') || '').trim() || null,
    };
    if (!payload.patient_id) return;
    if (editing) await update.mutateAsync({ id: editing.id, ...payload });
    else await create.mutateAsync(payload);
    setOpen(false);
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={goBack}>←</Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ClipboardList className="w-6 h-6" />
            {language === 'ar' ? 'الزيارات' : 'Visits'}
          </h1>
          <p className="text-sm text-muted-foreground">
            {language === 'ar' ? 'سجل الزيارات الطبية والتشخيصات' : 'Medical visit records and diagnoses'}
          </p>
        </div>
        <Button onClick={openNew} disabled={patients.length === 0}>
          <Plus className="w-4 h-4 me-2" />
          {language === 'ar' ? 'زيارة جديدة' : 'New Visit'}
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center text-muted-foreground py-12">{language === 'ar' ? 'جاري التحميل...' : 'Loading...'}</div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">
            <ClipboardList className="w-10 h-10 mx-auto mb-3 opacity-50" />
            {language === 'ar' ? 'لا توجد زيارات' : 'No visits yet'}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(v => (
            <Card key={v.id}>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-semibold">{v.patient?.full_name || '—'}</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(v.visit_date).toLocaleString()}
                      {v.doctor_name ? ` · ${v.doctor_name}` : ''}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => openEdit(v)}><Pencil className="w-4 h-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => setConfirmDel(v)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                  </div>
                </div>
                {v.chief_complaint && <div className="text-sm"><span className="font-medium">{language === 'ar' ? 'الشكوى:' : 'Complaint:'}</span> {v.chief_complaint}</div>}
                {v.diagnosis && <div className="text-sm"><span className="font-medium">{language === 'ar' ? 'التشخيص:' : 'Diagnosis:'}</span> {v.diagnosis}</div>}
                {v.treatment && <div className="text-sm"><span className="font-medium">{language === 'ar' ? 'العلاج:' : 'Treatment:'}</span> {v.treatment}</div>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editing ? (language === 'ar' ? 'تعديل زيارة' : 'Edit Visit')
                : (language === 'ar' ? 'زيارة جديدة' : 'New Visit')}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label>{language === 'ar' ? 'المريض' : 'Patient'} *</Label>
                <Select name="patient_id" defaultValue={editing?.patient_id || filterPatient || undefined} required>
                  <SelectTrigger><SelectValue placeholder={language === 'ar' ? 'اختر مريضاً' : 'Select patient'} /></SelectTrigger>
                  <SelectContent>
                    {patients.map(p => (
                      <SelectItem key={p.id} value={p.id}>
                        {language === 'ar' && p.full_name_ar ? p.full_name_ar : p.full_name}
                        {p.file_number ? ` · #${p.file_number}` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{language === 'ar' ? 'تاريخ الزيارة' : 'Visit Date'} *</Label>
                <Input name="visit_date" type="datetime-local" required
                  defaultValue={editing ? fmtLocal(editing.visit_date) : fmtLocal(new Date().toISOString())} />
              </div>
              <div>
                <Label>{language === 'ar' ? 'الطبيب' : 'Doctor'}</Label>
                <Input name="doctor_name" defaultValue={editing?.doctor_name || ''} maxLength={100} />
              </div>
            </div>
            <div>
              <Label>{language === 'ar' ? 'الشكوى الرئيسية' : 'Chief Complaint'}</Label>
              <Textarea name="chief_complaint" defaultValue={editing?.chief_complaint || ''} maxLength={500} rows={2} />
            </div>
            <div>
              <Label>{language === 'ar' ? 'التشخيص' : 'Diagnosis'}</Label>
              <Textarea name="diagnosis" defaultValue={editing?.diagnosis || ''} maxLength={500} rows={2} />
            </div>
            <div>
              <Label>{language === 'ar' ? 'العلاج' : 'Treatment'}</Label>
              <Textarea name="treatment" defaultValue={editing?.treatment || ''} maxLength={500} rows={2} />
            </div>
            <div>
              <Label>{language === 'ar' ? 'الوصفة' : 'Prescription'}</Label>
              <Textarea name="prescription" defaultValue={editing?.prescription || ''} maxLength={1000} rows={2} />
            </div>
            <div>
              <Label>{language === 'ar' ? 'ملاحظات' : 'Notes'}</Label>
              <Textarea name="notes" defaultValue={editing?.notes || ''} maxLength={1000} rows={2} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>{language === 'ar' ? 'إلغاء' : 'Cancel'}</Button>
              <Button type="submit" disabled={create.isPending || update.isPending}>{language === 'ar' ? 'حفظ' : 'Save'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!confirmDel} onOpenChange={(o) => !o && setConfirmDel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{language === 'ar' ? 'حذف الزيارة؟' : 'Delete visit?'}</AlertDialogTitle>
            <AlertDialogDescription>
              {language === 'ar' ? 'لا يمكن التراجع عن هذا الإجراء.' : 'This action cannot be undone.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{language === 'ar' ? 'إلغاء' : 'Cancel'}</AlertDialogCancel>
            <AlertDialogAction onClick={async () => { if (confirmDel) await remove.mutateAsync(confirmDel.id); setConfirmDel(null); }}>
              {language === 'ar' ? 'حذف' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
