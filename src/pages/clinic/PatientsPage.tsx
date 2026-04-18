import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { usePatients, usePatientMutations, type Patient } from '@/hooks/usePatients';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Pencil, Trash2, Users, Search, Phone, Calendar, ClipboardList } from 'lucide-react';
import { useGoBack } from '@/hooks/useGoBack';
import { Badge } from '@/components/ui/badge';

export default function PatientsPage() {
  const { language } = useLanguage();
  const goBack = useGoBack();
  const { data: patients = [], isLoading } = usePatients();
  const { create, update, remove } = usePatientMutations();
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Patient | null>(null);
  const [open, setOpen] = useState(false);
  const [confirmDel, setConfirmDel] = useState<Patient | null>(null);

  const filtered = patients.filter(p => {
    const q = search.toLowerCase();
    return !q || p.full_name.toLowerCase().includes(q) ||
      p.full_name_ar?.toLowerCase().includes(q) ||
      p.file_number?.toLowerCase().includes(q) ||
      p.phone?.includes(q);
  });

  function openNew() { setEditing(null); setOpen(true); }
  function openEdit(p: Patient) { setEditing(p); setOpen(true); }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const payload: any = {
      full_name: String(fd.get('full_name') || '').trim(),
      full_name_ar: String(fd.get('full_name_ar') || '').trim() || null,
      file_number: String(fd.get('file_number') || '').trim() || null,
      phone: String(fd.get('phone') || '').trim() || null,
      date_of_birth: String(fd.get('date_of_birth') || '') || null,
      gender: String(fd.get('gender') || '') || null,
      address: String(fd.get('address') || '').trim() || null,
      notes: String(fd.get('notes') || '').trim() || null,
    };
    if (!payload.full_name) return;
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
            <Users className="w-6 h-6" />
            {language === 'ar' ? 'المرضى' : 'Patients'}
          </h1>
          <p className="text-sm text-muted-foreground">
            {language === 'ar' ? 'إدارة سجلات المرضى' : 'Manage patient records'}
          </p>
        </div>
        <Button onClick={openNew}>
          <Plus className="w-4 h-4 me-2" />
          {language === 'ar' ? 'مريض جديد' : 'New Patient'}
        </Button>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={language === 'ar' ? 'بحث بالاسم أو الجوال أو رقم الملف...' : 'Search by name, phone, file #...'}
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="ps-10"
            />
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="text-center text-muted-foreground py-12">{language === 'ar' ? 'جاري التحميل...' : 'Loading...'}</div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">
            <Users className="w-10 h-10 mx-auto mb-3 opacity-50" />
            {language === 'ar' ? 'لا يوجد مرضى' : 'No patients yet'}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map(p => (
            <Card key={p.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-start justify-between">
                  <div className="min-w-0">
                    <h3 className="font-semibold truncate">
                      {language === 'ar' && p.full_name_ar ? p.full_name_ar : p.full_name}
                    </h3>
                    {p.file_number && (
                      <Badge variant="secondary" className="mt-1 font-mono text-xs">
                        #{p.file_number}
                      </Badge>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => openEdit(p)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => setConfirmDel(p)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
                {p.phone && (
                  <div className="text-sm text-muted-foreground flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5" />{p.phone}
                  </div>
                )}
                <div className="flex gap-2 pt-2">
                  <Button asChild size="sm" variant="outline" className="flex-1">
                    <Link to={`/clinic/appointments?patient=${p.id}`}>
                      <Calendar className="w-3.5 h-3.5 me-1" />
                      {language === 'ar' ? 'مواعيد' : 'Appts'}
                    </Link>
                  </Button>
                  <Button asChild size="sm" variant="outline" className="flex-1">
                    <Link to={`/clinic/visits?patient=${p.id}`}>
                      <ClipboardList className="w-3.5 h-3.5 me-1" />
                      {language === 'ar' ? 'زيارات' : 'Visits'}
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editing
                ? (language === 'ar' ? 'تعديل مريض' : 'Edit Patient')
                : (language === 'ar' ? 'مريض جديد' : 'New Patient')}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{language === 'ar' ? 'الاسم (إنجليزي)' : 'Name (EN)'} *</Label>
                <Input name="full_name" required defaultValue={editing?.full_name || ''} maxLength={120} />
              </div>
              <div>
                <Label>{language === 'ar' ? 'الاسم (عربي)' : 'Name (AR)'}</Label>
                <Input name="full_name_ar" defaultValue={editing?.full_name_ar || ''} maxLength={120} />
              </div>
              <div>
                <Label>{language === 'ar' ? 'رقم الملف' : 'File #'}</Label>
                <Input name="file_number" defaultValue={editing?.file_number || ''} maxLength={50} />
              </div>
              <div>
                <Label>{language === 'ar' ? 'الجوال' : 'Phone'}</Label>
                <Input name="phone" type="tel" defaultValue={editing?.phone || ''} maxLength={20} />
              </div>
              <div>
                <Label>{language === 'ar' ? 'تاريخ الميلاد' : 'DOB'}</Label>
                <Input name="date_of_birth" type="date" defaultValue={editing?.date_of_birth || ''} />
              </div>
              <div>
                <Label>{language === 'ar' ? 'الجنس' : 'Gender'}</Label>
                <Select name="gender" defaultValue={editing?.gender || undefined}>
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">{language === 'ar' ? 'ذكر' : 'Male'}</SelectItem>
                    <SelectItem value="female">{language === 'ar' ? 'أنثى' : 'Female'}</SelectItem>
                    <SelectItem value="other">{language === 'ar' ? 'آخر' : 'Other'}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>{language === 'ar' ? 'العنوان' : 'Address'}</Label>
              <Input name="address" defaultValue={editing?.address || ''} maxLength={200} />
            </div>
            <div>
              <Label>{language === 'ar' ? 'ملاحظات' : 'Notes'}</Label>
              <Textarea name="notes" defaultValue={editing?.notes || ''} maxLength={1000} rows={3} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                {language === 'ar' ? 'إلغاء' : 'Cancel'}
              </Button>
              <Button type="submit" disabled={create.isPending || update.isPending}>
                {language === 'ar' ? 'حفظ' : 'Save'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!confirmDel} onOpenChange={(o) => !o && setConfirmDel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{language === 'ar' ? 'حذف المريض؟' : 'Delete patient?'}</AlertDialogTitle>
            <AlertDialogDescription>
              {language === 'ar'
                ? 'سيتم حذف المريض وكل مواعيده وزياراته نهائياً.'
                : 'This will permanently delete the patient and all related appointments/visits.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{language === 'ar' ? 'إلغاء' : 'Cancel'}</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (confirmDel) await remove.mutateAsync(confirmDel.id);
                setConfirmDel(null);
              }}
            >
              {language === 'ar' ? 'حذف' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
