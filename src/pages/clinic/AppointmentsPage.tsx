import { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAppointments, useAppointmentMutations, type Appointment } from '@/hooks/useAppointments';
import { usePatients } from '@/hooks/usePatients';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Pencil, Trash2, Calendar, List, CalendarDays, CalendarRange, Clock } from 'lucide-react';
import { useGoBack } from '@/hooks/useGoBack';
import { AppointmentsCalendar } from '@/components/clinic/AppointmentsCalendar';

const STATUS_COLORS: Record<string, string> = {
  scheduled: 'bg-blue-100 text-blue-700',
  confirmed: 'bg-emerald-100 text-emerald-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-gray-200 text-gray-700',
  no_show: 'bg-red-100 text-red-700',
};

const STATUS_OPTIONS = ['scheduled', 'confirmed', 'completed', 'cancelled', 'no_show'] as const;

export default function AppointmentsPage() {
  const { language } = useLanguage();
  const goBack = useGoBack();
  const [params] = useSearchParams();
  const filterPatient = params.get('patient');

  const { data: appts = [], isLoading } = useAppointments();
  const { data: patients = [] } = usePatients();
  const { create, update, remove } = useAppointmentMutations();

  const [editing, setEditing] = useState<Appointment | null>(null);
  const [open, setOpen] = useState(false);
  const [confirmDel, setConfirmDel] = useState<Appointment | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'day' | 'week' | 'month'>('list');
  const [doctorFilter, setDoctorFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const doctors = useMemo(() => {
    const set = new Set<string>();
    appts.forEach((a) => a.doctor_name && set.add(a.doctor_name));
    return Array.from(set).sort();
  }, [appts]);

  const filtered = useMemo(() => {
    return appts.filter((a) => {
      if (filterPatient && a.patient_id !== filterPatient) return false;
      if (doctorFilter !== 'all' && (a.doctor_name || '') !== doctorFilter) return false;
      if (statusFilter !== 'all' && a.status !== statusFilter) return false;
      return true;
    });
  }, [appts, filterPatient, doctorFilter, statusFilter]);

  function openNew() { setEditing(null); setOpen(true); }
  function openEdit(a: Appointment) { setEditing(a); setOpen(true); }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const payload: any = {
      patient_id: String(fd.get('patient_id') || ''),
      doctor_name: String(fd.get('doctor_name') || '').trim() || null,
      scheduled_at: new Date(String(fd.get('scheduled_at'))).toISOString(),
      duration_minutes: Number(fd.get('duration_minutes') || 30),
      appointment_type: String(fd.get('appointment_type') || 'consultation'),
      status: String(fd.get('status') || 'scheduled'),
      notes: String(fd.get('notes') || '').trim() || null,
    };
    if (!payload.patient_id) return;
    if (editing) await update.mutateAsync({ id: editing.id, ...payload });
    else await create.mutateAsync(payload);
    setOpen(false);
  }

  function fmtLocal(iso: string) {
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  async function handleReschedule(a: Appointment, newDate: Date) {
    await update.mutateAsync({ id: a.id, scheduled_at: newDate.toISOString() });
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={goBack}>←</Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Calendar className="w-6 h-6" />
            {language === 'ar' ? 'المواعيد' : 'Appointments'}
          </h1>
          <p className="text-sm text-muted-foreground">
            {language === 'ar' ? 'جدولة وإدارة مواعيد المرضى' : 'Schedule and manage patient appointments'}
          </p>
        </div>
        <Button onClick={openNew} disabled={patients.length === 0}>
          <Plus className="w-4 h-4 me-2" />
          {language === 'ar' ? 'موعد جديد' : 'New Appointment'}
        </Button>
      </div>

      {/* Toolbar: view tabs + filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as any)}>
          <TabsList>
            <TabsTrigger value="list"><List className="w-4 h-4 me-1" />{language === 'ar' ? 'قائمة' : 'List'}</TabsTrigger>
            <TabsTrigger value="day"><Clock className="w-4 h-4 me-1" />{language === 'ar' ? 'يوم' : 'Day'}</TabsTrigger>
            <TabsTrigger value="week"><CalendarDays className="w-4 h-4 me-1" />{language === 'ar' ? 'أسبوع' : 'Week'}</TabsTrigger>
            <TabsTrigger value="month"><CalendarRange className="w-4 h-4 me-1" />{language === 'ar' ? 'شهر' : 'Month'}</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex items-center gap-2 ms-auto">
          <Select value={doctorFilter} onValueChange={setDoctorFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder={language === 'ar' ? 'الطبيب' : 'Doctor'} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{language === 'ar' ? 'كل الأطباء' : 'All doctors'}</SelectItem>
              {doctors.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder={language === 'ar' ? 'الحالة' : 'Status'} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{language === 'ar' ? 'كل الحالات' : 'All statuses'}</SelectItem>
              {STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center text-muted-foreground py-12">{language === 'ar' ? 'جاري التحميل...' : 'Loading...'}</div>
      ) : viewMode === 'list' ? (
        filtered.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center text-muted-foreground">
              <Calendar className="w-10 h-10 mx-auto mb-3 opacity-50" />
              {language === 'ar' ? 'لا توجد مواعيد' : 'No appointments yet'}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0 divide-y">
              {filtered.map(a => {
                const d = new Date(a.scheduled_at);
                return (
                  <div key={a.id} className="p-4 flex items-center gap-4 hover:bg-muted/40">
                    <div className="text-center w-16 shrink-0">
                      <div className="text-xs text-muted-foreground">{d.toLocaleDateString(undefined, { month: 'short' })}</div>
                      <div className="text-2xl font-bold">{d.getDate()}</div>
                      <div className="text-xs">{d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold">{a.patient?.full_name || '—'}</div>
                      <div className="text-sm text-muted-foreground truncate">
                        {a.doctor_name || (language === 'ar' ? 'بدون طبيب محدد' : 'No doctor')} · {a.appointment_type} · {a.duration_minutes}m
                      </div>
                    </div>
                    <Badge className={STATUS_COLORS[a.status]}>{a.status}</Badge>
                    <Button size="icon" variant="ghost" onClick={() => openEdit(a)}><Pencil className="w-4 h-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => setConfirmDel(a)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )
      ) : (
        <Card>
          <CardContent className="p-4">
            <AppointmentsCalendar
              appointments={filtered}
              view={viewMode}
              onSelect={openEdit}
              onReschedule={handleReschedule}
            />
            <p className="text-xs text-muted-foreground mt-3 text-center">
              {language === 'ar'
                ? (viewMode === 'day' ? 'اسحب الموعد لتغيير الوقت · المواعيد المتعارضة بالأحمر' : 'اسحب الموعد لتغيير اليوم · انقر للتعديل')
                : (viewMode === 'day' ? 'Drag to change time · Conflicts highlighted in red' : 'Drag an appointment to reschedule · Click to edit')}
            </p>
          </CardContent>
        </Card>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editing ? (language === 'ar' ? 'تعديل موعد' : 'Edit Appointment')
                : (language === 'ar' ? 'موعد جديد' : 'New Appointment')}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
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
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{language === 'ar' ? 'التاريخ والوقت' : 'Date & Time'} *</Label>
                <Input name="scheduled_at" type="datetime-local" required
                  defaultValue={editing ? fmtLocal(editing.scheduled_at) : fmtLocal(new Date().toISOString())} />
              </div>
              <div>
                <Label>{language === 'ar' ? 'المدة (د)' : 'Duration (min)'}</Label>
                <Input name="duration_minutes" type="number" min={5} max={480} defaultValue={editing?.duration_minutes || 30} />
              </div>
              <div>
                <Label>{language === 'ar' ? 'الطبيب' : 'Doctor'}</Label>
                <Input name="doctor_name" defaultValue={editing?.doctor_name || ''} maxLength={100} />
              </div>
              <div>
                <Label>{language === 'ar' ? 'النوع' : 'Type'}</Label>
                <Input name="appointment_type" defaultValue={editing?.appointment_type || 'consultation'} maxLength={50} />
              </div>
              <div className="col-span-2">
                <Label>{language === 'ar' ? 'الحالة' : 'Status'}</Label>
                <Select name="status" defaultValue={editing?.status || 'scheduled'}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>{language === 'ar' ? 'ملاحظات' : 'Notes'}</Label>
              <Textarea name="notes" defaultValue={editing?.notes || ''} maxLength={1000} rows={3} />
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
            <AlertDialogTitle>{language === 'ar' ? 'حذف الموعد؟' : 'Delete appointment?'}</AlertDialogTitle>
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
