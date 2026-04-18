import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useGoBack } from '@/hooks/useGoBack';
import { useBranches } from '@/hooks/useBranches';
import { useClinicDepartments, useUpsertDepartment, useDeleteDepartment, type ClinicDepartment } from '@/hooks/useClinicDepartments';
import { useClinicRooms, useUpsertRoom, useDeleteRoom, type ClinicRoom, type RoomStatus } from '@/hooks/useClinicRooms';
import { useCurrentCompany } from '@/contexts/CurrentCompanyContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Building2, DoorOpen, Plus, Pencil, Trash2, Layers } from 'lucide-react';

const DEPT_CODES = [
  { code: 'reception', en: 'Reception', ar: 'الاستقبال' },
  { code: 'exam', en: 'Examination Rooms', ar: 'غرف الفحص' },
  { code: 'operation', en: 'Operation Rooms', ar: 'غرف العمليات' },
  { code: 'lab', en: 'Laboratory', ar: 'المختبر' },
  { code: 'radiology', en: 'Radiology', ar: 'الأشعة' },
  { code: 'pharmacy', en: 'Pharmacy', ar: 'الصيدلية' },
  { code: 'other', en: 'Other', ar: 'أخرى' },
];

const ROOM_TYPES = [
  { code: 'consultation', en: 'Consultation', ar: 'استشارة' },
  { code: 'operation', en: 'Operation', ar: 'عمليات' },
  { code: 'recovery', en: 'Recovery', ar: 'إفاقة' },
  { code: 'imaging', en: 'Imaging', ar: 'تصوير' },
  { code: 'triage', en: 'Triage', ar: 'فرز' },
  { code: 'reception', en: 'Reception', ar: 'استقبال' },
  { code: 'pharmacy', en: 'Pharmacy', ar: 'صيدلية' },
  { code: 'lab', en: 'Lab', ar: 'مختبر' },
  { code: 'other', en: 'Other', ar: 'أخرى' },
];

const STATUS_STYLES: Record<RoomStatus, string> = {
  available: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  occupied: 'bg-amber-100 text-amber-700 border-amber-200',
  maintenance: 'bg-gray-200 text-gray-700 border-gray-300',
};

export default function ClinicBranchDetailPage() {
  const { id: branchId } = useParams<{ id: string }>();
  const { language, direction } = useLanguage();
  const goBack = useGoBack();
  const ar = language === 'ar';
  const { isCompanyAdmin } = useCurrentCompany();
  const { data: branches = [] } = useBranches();
  const branch: any = branches.find((b: any) => b.id === branchId);
  const { data: depts = [], isLoading: ld } = useClinicDepartments(branchId);
  const { data: rooms = [], isLoading: lr } = useClinicRooms({ branchId });

  if (!branch) {
    return (
      <div className="p-6 max-w-7xl mx-auto" style={{ direction }}>
        <Button variant="ghost" onClick={goBack}>← {ar ? 'رجوع' : 'Back'}</Button>
        <p className="mt-4 text-muted-foreground">{ar ? 'الفرع غير موجود' : 'Branch not found'}</p>
      </div>
    );
  }

  const branchName = ar ? (branch.name_ar || branch.name) : branch.name;
  const totalRooms = rooms.length;
  const available = rooms.filter(r => r.status === 'available').length;
  const occupied = rooms.filter(r => r.status === 'occupied').length;
  const maintenance = rooms.filter(r => r.status === 'maintenance').length;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto" style={{ direction }}>
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={goBack}>←</Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold flex items-center gap-2 truncate">
            <Building2 className="w-6 h-6 shrink-0" />
            {branchName}
          </h1>
          {branch.city && <p className="text-sm text-muted-foreground">{branch.city}</p>}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatBox label={ar ? 'الأقسام' : 'Departments'} value={depts.length} icon={Layers} tone="indigo" />
        <StatBox label={ar ? 'إجمالي الغرف' : 'Total Rooms'} value={totalRooms} icon={DoorOpen} tone="blue" />
        <StatBox label={ar ? 'متاحة' : 'Available'} value={available} icon={DoorOpen} tone="emerald" />
        <StatBox label={ar ? 'مشغولة / صيانة' : 'Occupied / Maint.'} value={`${occupied} / ${maintenance}`} icon={DoorOpen} tone="amber" />
      </div>

      <Tabs defaultValue="rooms">
        <TabsList>
          <TabsTrigger value="rooms">{ar ? 'الأقسام والغرف' : 'Departments & Rooms'}</TabsTrigger>
          <TabsTrigger value="overview">{ar ? 'نظرة عامة' : 'Overview'}</TabsTrigger>
        </TabsList>

        <TabsContent value="rooms" className="space-y-4">
          {isCompanyAdmin && (
            <div className="flex justify-end">
              <DepartmentDialog branchId={branchId!} ar={ar} />
            </div>
          )}

          {(ld || lr) ? (
            <div className="text-center py-12 text-muted-foreground">{ar ? 'جارِ التحميل...' : 'Loading...'}</div>
          ) : depts.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">
              {ar ? 'لا توجد أقسام بعد. أضف قسماً للبدء.' : 'No departments yet. Add one to start.'}
            </CardContent></Card>
          ) : (
            <Accordion type="multiple" defaultValue={depts.map(d => d.id)} className="space-y-2">
              {depts.map(dept => {
                const deptRooms = rooms.filter(r => r.department_id === dept.id);
                return (
                  <AccordionItem key={dept.id} value={dept.id} className="border rounded-xl px-4 bg-card">
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center gap-3 flex-1 text-start">
                        <Layers className="w-4 h-4 text-indigo-500" />
                        <span className="font-semibold">{ar ? (dept.name_ar || dept.name) : dept.name}</span>
                        <Badge variant="secondary">{deptRooms.length}</Badge>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-3">
                        {isCompanyAdmin && (
                          <DepartmentActions branchId={branchId!} dept={dept} ar={ar} />
                        )}
                        {deptRooms.length === 0 ? (
                          <p className="text-sm text-muted-foreground py-4 text-center">
                            {ar ? 'لا توجد غرف في هذا القسم' : 'No rooms in this department'}
                          </p>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {deptRooms.map(room => (
                              <RoomCard key={room.id} room={room} ar={ar} canEdit={isCompanyAdmin} branchId={branchId!} />
                            ))}
                          </div>
                        )}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          )}
        </TabsContent>

        <TabsContent value="overview">
          <Card><CardContent className="py-8 text-center text-muted-foreground">
            {ar ? 'سيتم إضافة المزيد من المعلومات قريباً' : 'More information coming soon'}
          </CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function DepartmentActions({ branchId, dept, ar }: { branchId: string; dept: ClinicDepartment; ar: boolean }) {
  const deleteDept = useDeleteDepartment();
  return (
    <div className="flex flex-wrap items-center gap-2 justify-end">
      <DepartmentDialog branchId={branchId} ar={ar} existing={dept} />
      <DeleteConfirm
        ar={ar}
        title={ar ? 'حذف القسم؟' : 'Delete department?'}
        description={ar ? 'سيتم حذف جميع الغرف داخل هذا القسم.' : 'All rooms inside will also be deleted.'}
        onConfirm={() => deleteDept.mutate(dept.id)}
      />
      <RoomDialog branchId={branchId} departmentId={dept.id} ar={ar} />
    </div>
  );
}

function StatBox({ label, value, icon: Icon, tone }: { label: string; value: any; icon: any; tone: string }) {
  const tones: Record<string, string> = {
    blue: 'text-blue-600 bg-blue-50',
    emerald: 'text-emerald-600 bg-emerald-50',
    indigo: 'text-indigo-600 bg-indigo-50',
    amber: 'text-amber-600 bg-amber-50',
  };
  return (
    <Card><CardContent className="p-4 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${tones[tone]}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="text-lg font-bold leading-tight">{value}</div>
      </div>
    </CardContent></Card>
  );
}

function RoomCard({ room, ar, canEdit, branchId }: { room: ClinicRoom; ar: boolean; canEdit: boolean; branchId: string }) {
  const deleteRoom = useDeleteRoom();
  const upsertRoom = useUpsertRoom();
  const statusLabels: Record<RoomStatus, string> = {
    available: ar ? 'متاحة' : 'Available',
    occupied: ar ? 'مشغولة' : 'Occupied',
    maintenance: ar ? 'صيانة' : 'Maintenance',
  };

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <DoorOpen className="w-4 h-4 text-muted-foreground" />
              <span className="font-semibold text-sm truncate">{ar ? (room.name_ar || room.name) : room.name}</span>
            </div>
            {room.room_number && <div className="text-xs text-muted-foreground mt-0.5">#{room.room_number}</div>}
          </div>
          <Badge className={STATUS_STYLES[room.status]} variant="outline">{statusLabels[room.status]}</Badge>
        </div>
        <div className="text-xs text-muted-foreground">
          {ar ? 'السعة' : 'Capacity'}: {room.capacity}
        </div>
        {canEdit && (
          <div className="flex items-center gap-1.5">
            <Select
              value={room.status}
              onValueChange={(v) => upsertRoom.mutate({ id: room.id, department_id: room.department_id, branch_id: branchId, name: room.name, status: v as RoomStatus })}
            >
              <SelectTrigger className="h-8 text-xs flex-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="available">{statusLabels.available}</SelectItem>
                <SelectItem value="occupied">{statusLabels.occupied}</SelectItem>
                <SelectItem value="maintenance">{statusLabels.maintenance}</SelectItem>
              </SelectContent>
            </Select>
            <RoomDialog branchId={branchId} departmentId={room.department_id} ar={ar} existing={room} iconOnly />
            <DeleteConfirm
              ar={ar}
              title={ar ? 'حذف الغرفة؟' : 'Delete room?'}
              description={ar ? 'لا يمكن التراجع عن هذا الإجراء.' : 'This action cannot be undone.'}
              onConfirm={() => deleteRoom.mutate(room.id)}
              iconOnly
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function DepartmentDialog({ branchId, ar, existing }: { branchId: string; ar: boolean; existing?: ClinicDepartment }) {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState(existing?.code || 'exam');
  const [name, setName] = useState(existing?.name || '');
  const [nameAr, setNameAr] = useState(existing?.name_ar || '');
  const upsert = useUpsertDepartment();

  const handleSave = async () => {
    await upsert.mutateAsync({
      id: existing?.id,
      branch_id: branchId,
      code,
      name: name || DEPT_CODES.find(d => d.code === code)?.en || code,
      name_ar: nameAr || DEPT_CODES.find(d => d.code === code)?.ar || null,
    });
    setOpen(false);
    if (!existing) { setName(''); setNameAr(''); }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {existing
          ? <Button variant="outline" size="sm"><Pencil className="w-3.5 h-3.5 me-1" />{ar ? 'تعديل القسم' : 'Edit Dept'}</Button>
          : <Button size="sm"><Plus className="w-4 h-4 me-1" />{ar ? 'إضافة قسم' : 'Add Department'}</Button>}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>{existing ? (ar ? 'تعديل قسم' : 'Edit Department') : (ar ? 'قسم جديد' : 'New Department')}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>{ar ? 'النوع' : 'Type'}</Label>
            <Select value={code} onValueChange={setCode}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {DEPT_CODES.map(d => <SelectItem key={d.code} value={d.code}>{ar ? d.ar : d.en}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>{ar ? 'الاسم (إنجليزي)' : 'Name (English)'}</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder={DEPT_CODES.find(d => d.code === code)?.en} />
          </div>
          <div>
            <Label>{ar ? 'الاسم (عربي)' : 'Name (Arabic)'}</Label>
            <Input value={nameAr} onChange={e => setNameAr(e.target.value)} placeholder={DEPT_CODES.find(d => d.code === code)?.ar} dir="rtl" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>{ar ? 'إلغاء' : 'Cancel'}</Button>
          <Button onClick={handleSave} disabled={upsert.isPending}>{ar ? 'حفظ' : 'Save'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RoomDialog({ branchId, departmentId, ar, existing, iconOnly }: { branchId: string; departmentId: string; ar: boolean; existing?: ClinicRoom; iconOnly?: boolean }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(existing?.name || '');
  const [nameAr, setNameAr] = useState(existing?.name_ar || '');
  const [roomNumber, setRoomNumber] = useState(existing?.room_number || '');
  const [roomType, setRoomType] = useState(existing?.room_type || 'consultation');
  const [capacity, setCapacity] = useState(existing?.capacity || 1);
  const [status, setStatus] = useState<RoomStatus>(existing?.status || 'available');
  const upsert = useUpsertRoom();

  const handleSave = async () => {
    if (!name.trim()) return;
    await upsert.mutateAsync({
      id: existing?.id,
      department_id: departmentId,
      branch_id: branchId,
      name,
      name_ar: nameAr || null,
      room_number: roomNumber || null,
      room_type: roomType,
      capacity: Number(capacity) || 1,
      status,
    });
    setOpen(false);
    if (!existing) { setName(''); setNameAr(''); setRoomNumber(''); }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {iconOnly
          ? <Button variant="ghost" size="icon" className="h-8 w-8"><Pencil className="w-3.5 h-3.5" /></Button>
          : (existing
            ? <Button variant="outline" size="sm"><Pencil className="w-3.5 h-3.5 me-1" />{ar ? 'تعديل' : 'Edit'}</Button>
            : <Button size="sm" variant="secondary"><Plus className="w-4 h-4 me-1" />{ar ? 'إضافة غرفة' : 'Add Room'}</Button>)
        }
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>{existing ? (ar ? 'تعديل غرفة' : 'Edit Room') : (ar ? 'غرفة جديدة' : 'New Room')}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div><Label>{ar ? 'رقم الغرفة' : 'Room #'}</Label>
              <Input value={roomNumber} onChange={e => setRoomNumber(e.target.value)} placeholder="E-01" /></div>
            <div><Label>{ar ? 'السعة' : 'Capacity'}</Label>
              <Input type="number" min={1} value={capacity} onChange={e => setCapacity(Number(e.target.value))} /></div>
          </div>
          <div><Label>{ar ? 'الاسم (إنجليزي)' : 'Name (English)'}</Label>
            <Input value={name} onChange={e => setName(e.target.value)} required /></div>
          <div><Label>{ar ? 'الاسم (عربي)' : 'Name (Arabic)'}</Label>
            <Input value={nameAr} onChange={e => setNameAr(e.target.value)} dir="rtl" /></div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label>{ar ? 'النوع' : 'Type'}</Label>
              <Select value={roomType} onValueChange={setRoomType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{ROOM_TYPES.map(t => <SelectItem key={t.code} value={t.code}>{ar ? t.ar : t.en}</SelectItem>)}</SelectContent>
              </Select></div>
            <div><Label>{ar ? 'الحالة' : 'Status'}</Label>
              <Select value={status} onValueChange={v => setStatus(v as RoomStatus)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="available">{ar ? 'متاحة' : 'Available'}</SelectItem>
                  <SelectItem value="occupied">{ar ? 'مشغولة' : 'Occupied'}</SelectItem>
                  <SelectItem value="maintenance">{ar ? 'صيانة' : 'Maintenance'}</SelectItem>
                </SelectContent>
              </Select></div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>{ar ? 'إلغاء' : 'Cancel'}</Button>
          <Button onClick={handleSave} disabled={upsert.isPending || !name.trim()}>{ar ? 'حفظ' : 'Save'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DeleteConfirm({ ar, title, description, onConfirm, iconOnly }: { ar: boolean; title: string; description: string; onConfirm: () => void; iconOnly?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        {iconOnly
          ? <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive"><Trash2 className="w-3.5 h-3.5" /></Button>
          : <Button variant="outline" size="sm" className="text-destructive"><Trash2 className="w-3.5 h-3.5 me-1" />{ar ? 'حذف' : 'Delete'}</Button>}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{ar ? 'إلغاء' : 'Cancel'}</AlertDialogCancel>
          <AlertDialogAction onClick={() => { onConfirm(); setOpen(false); }} className="bg-destructive hover:bg-destructive/90">
            {ar ? 'حذف' : 'Delete'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
