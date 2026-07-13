import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { Loader2, MapPin, FileText, Upload, ImagePlus, X } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  companyId: string;
  branch?: any;
}

const emptyDoc = () => ({ number: '', issued_at: '', expires_at: '', file_path: '' });
const emptyContract = () => ({ provider: '', expires_at: '', file_path: '' });

const initialBranch = () => ({
  name: '',
  name_ar: '',
  code: '',
  city: '',
  district: '',
  address: '',
  gps: '',
  status: 'active',
  activity_type: '',
  opened_at: '',
  manager_name: '',
  manager_phone: '',
  area_m2: '' as any,
  employees_count: '' as any,
  cameras_count: '' as any,
  extinguishers_count: '' as any,
  documents: {
    municipality: emptyDoc(),
    civil_defense: { number: '', expires_at: '', file_path: '' },
    signboard: { has: false, number: '', expires_at: '', file_path: '' },
    pest_control: emptyContract(),
    cameras_contract: emptyContract(),
    filters_contract: emptyContract(),
    photos: [] as string[],
  } as any,
});

export default function AddBranchDialog({ open, onOpenChange, companyId, branch }: Props) {
  const { direction } = useLanguage();
  const isRTL = direction === 'rtl';
  const qc = useQueryClient();
  const [b, setB] = useState<any>(initialBranch());
  const [files, setFiles] = useState<Record<string, File | null>>({});
  const [newPhotos, setNewPhotos] = useState<File[]>([]);
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});
  const isEdit = !!branch;

  const { data: employees = [] } = useQuery({
    queryKey: ['company-employees-for-manager', companyId],
    enabled: open && !!companyId,
    queryFn: async () => {
      const { data: cu, error: e1 } = await supabase
        .from('company_users')
        .select('user_id')
        .eq('company_id', companyId)
        .eq('is_active', true);
      if (e1) throw e1;
      const ids = (cu || []).map((r: any) => r.user_id);
      if (!ids.length) return [];
      const { data: profs, error: e2 } = await supabase
        .from('profiles')
        .select('user_id, full_name, email, phone, branch_id')
        .in('user_id', ids)
        .eq('is_active', true)
        .not('branch_id', 'is', null);
      if (e2) throw e2;
      return profs || [];
    },
  });

  const reset = () => { setB(initialBranch()); setFiles({}); setNewPhotos([]); setPhotoUrls({}); };

  useEffect(() => {
    if (open && branch) {
      const base = initialBranch();
      const docs = { ...base.documents, ...(branch.documents || {}) };
      // ensure nested doc shapes
      docs.municipality = { ...base.documents.municipality, ...(docs.municipality || {}) };
      docs.civil_defense = { ...base.documents.civil_defense, ...(docs.civil_defense || {}) };
      docs.signboard = { ...base.documents.signboard, ...(docs.signboard || {}) };
      docs.pest_control = { ...base.documents.pest_control, ...(docs.pest_control || {}) };
      docs.cameras_contract = { ...base.documents.cameras_contract, ...(docs.cameras_contract || {}) };
      docs.filters_contract = { ...base.documents.filters_contract, ...(docs.filters_contract || {}) };
      docs.photos = Array.isArray(docs.photos) ? docs.photos : [];
      setB({
        name: branch.name || '',
        name_ar: branch.name_ar || '',
        code: branch.code || '',
        city: branch.city || '',
        district: branch.district || '',
        address: branch.address || '',
        gps: branch.gps || '',
        status: branch.status || (branch.is_active ? 'active' : 'closed'),
        activity_type: branch.activity_type || '',
        opened_at: branch.opened_at || '',
        manager_name: branch.manager_name || '',
        manager_phone: branch.manager_phone || '',
        area_m2: branch.area_m2 ?? '',
        employees_count: branch.employees_count ?? '',
        cameras_count: branch.cameras_count ?? '',
        extinguishers_count: branch.extinguishers_count ?? '',
        documents: docs,
      });
      setFiles({});
      setNewPhotos([]);
    } else if (open && !branch) {
      reset();
    }
  }, [open, branch]);

  // Resolve signed URLs for existing branch photos
  useEffect(() => {
    const paths: string[] = b.documents?.photos || [];
    if (!paths.length) { setPhotoUrls({}); return; }
    let cancelled = false;
    (async () => {
      const map: Record<string, string> = {};
      for (const p of paths) {
        const { data } = await supabase.storage.from('company-documents').createSignedUrl(p, 3600);
        if (data?.signedUrl) map[p] = data.signedUrl;
      }
      if (!cancelled) setPhotoUrls(map);
    })();
    return () => { cancelled = true; };
  }, [b.documents?.photos]);

  const uploadFile = async (file: File, folder: string) => {
    const ext = file.name.split('.').pop();
    const path = `${companyId}/branches/${folder}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from('company-documents').upload(path, file);
    if (error) throw error;
    return path;
  };

  const submit = useMutation({
    mutationFn: async () => {
      if (!b.name.trim()) throw new Error(isRTL ? 'اسم الفرع مطلوب' : 'Branch name required');

      const docs = JSON.parse(JSON.stringify(b.documents));
      const existingPhotos: string[] = Array.isArray(docs.photos) ? docs.photos : [];
      for (const key of Object.keys(docs)) {
        if (key === 'photos') continue;
        const f = files[key];
        if (f) docs[key].file_path = await uploadFile(f, key);
      }
      // Upload new photos
      const uploaded: string[] = [];
      for (const pf of newPhotos) {
        uploaded.push(await uploadFile(pf, 'photos'));
      }
      docs.photos = [...existingPhotos, ...uploaded];

      const payload: any = {
        company_id: companyId,
        name: b.name,
        name_ar: b.name_ar || null,
        code: b.code || null,
        city: b.city || null,
        district: b.district || null,
        address: b.address || null,
        gps: b.gps || null,
        status: b.status,
        activity_type: b.activity_type || null,
        opened_at: b.opened_at || null,
        manager_name: b.manager_name || null,
        manager_phone: b.manager_phone || null,
        area_m2: b.area_m2 === '' ? null : Number(b.area_m2),
        employees_count: b.employees_count === '' ? null : Number(b.employees_count),
        cameras_count: b.cameras_count === '' ? null : Number(b.cameras_count),
        extinguishers_count: b.extinguishers_count === '' ? null : Number(b.extinguishers_count),
        documents: docs,
        is_active: b.status === 'active',
      };
      if (isEdit) {
        const { error } = await supabase.from('branches').update(payload).eq('id', branch.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('branches').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['super-admin-company-branches', companyId] });
      toast({ title: isEdit ? (isRTL ? 'تم تحديث الفرع' : 'Branch updated') : (isRTL ? 'تمت إضافة الفرع' : 'Branch added') });
      reset();
      onOpenChange(false);
    },
    onError: (e: any) => toast({ title: isRTL ? 'فشل الإضافة' : 'Failed', description: e.message, variant: 'destructive' }),
  });

  const updDoc = (key: string, patch: any) =>
    setB((prev: any) => ({ ...prev, documents: { ...prev.documents, [key]: { ...prev.documents[key], ...patch } } }));

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" dir={direction}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-primary" />
            {isEdit ? (isRTL ? 'تعديل الفرع' : 'Edit branch') : (isRTL ? 'إضافة فرع جديد' : 'Add new branch')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <F label={isRTL ? 'اسم الفرع (English)' : 'Branch name (English)'} required>
              <Input value={b.name} onChange={e => setB({ ...b, name: e.target.value })} />
            </F>
            <F label={isRTL ? 'اسم الفرع (عربي)' : 'Branch name (Arabic)'}>
              <Input value={b.name_ar} onChange={e => setB({ ...b, name_ar: e.target.value })} />
            </F>
            <F label={isRTL ? 'رقم الفرع' : 'Branch code'}>
              <Input value={b.code} onChange={e => setB({ ...b, code: e.target.value })} />
            </F>
            <F label={isRTL ? 'المدينة' : 'City'}>
              <Input value={b.city} onChange={e => setB({ ...b, city: e.target.value })} />
            </F>
            <F label={isRTL ? 'الحي' : 'District'}>
              <Input value={b.district} onChange={e => setB({ ...b, district: e.target.value })} />
            </F>
            <F label={isRTL ? 'العنوان' : 'Address'}>
              <Input value={b.address} onChange={e => setB({ ...b, address: e.target.value })} />
            </F>
            <F label={isRTL ? 'الموقع الجغرافي' : 'GPS / Maps link'}>
              <Input value={b.gps} onChange={e => setB({ ...b, gps: e.target.value })} placeholder="24.7136, 46.6753" />
            </F>
            <F label={isRTL ? 'حالة الفرع' : 'Branch status'}>
              <Select value={b.status} onValueChange={v => setB({ ...b, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">{isRTL ? 'نشط' : 'Active'}</SelectItem>
                  <SelectItem value="closed">{isRTL ? 'مغلق' : 'Closed'}</SelectItem>
                  <SelectItem value="under_construction">{isRTL ? 'تحت الإنشاء' : 'Under construction'}</SelectItem>
                </SelectContent>
              </Select>
            </F>
            <F label={isRTL ? 'نوع النشاط' : 'Activity type'}>
              <Input value={b.activity_type} onChange={e => setB({ ...b, activity_type: e.target.value })} />
            </F>
            <F label={isRTL ? 'تاريخ الافتتاح' : 'Opening date'}>
              <Input type="date" value={b.opened_at} onChange={e => setB({ ...b, opened_at: e.target.value })} />
            </F>
            <F label={isRTL ? 'مدير الفرع' : 'Branch manager'}>
              <Select
                value={b.manager_name || ''}
                onValueChange={(v) => {
                  const emp: any = employees.find((e: any) => e.full_name === v);
                  setB({ ...b, manager_name: v, manager_phone: emp?.phone || b.manager_phone });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder={isRTL ? 'اختر موظف' : 'Select employee'} />
                </SelectTrigger>
                <SelectContent>
                  {employees.length === 0 && (
                    <div className="px-2 py-1.5 text-xs text-muted-foreground">
                      {isRTL ? 'لا يوجد موظفون معينون على فروع' : 'No employees assigned to branches'}
                    </div>
                  )}
                  {employees.map((e: any) => (
                    <SelectItem key={e.user_id} value={e.full_name || e.email}>
                      {e.full_name || e.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </F>
            <F label={isRTL ? 'رقم مدير الفرع' : 'Manager phone'}>
              <Input value={b.manager_phone} onChange={e => setB({ ...b, manager_phone: e.target.value })} />
            </F>
            <F label={isRTL ? 'مساحة المنشأة (م²)' : 'Area (m²)'}>
              <Input type="number" value={b.area_m2} onChange={e => setB({ ...b, area_m2: e.target.value })} />
            </F>
            <F label={isRTL ? 'عدد العاملين' : 'Employees count'}>
              <Input type="number" value={b.employees_count} onChange={e => setB({ ...b, employees_count: e.target.value })} />
            </F>
            <F label={isRTL ? 'عدد الكاميرات' : 'Cameras count'}>
              <Input type="number" value={b.cameras_count} onChange={e => setB({ ...b, cameras_count: e.target.value })} />
            </F>
            <F label={isRTL ? 'عدد طفايات الحريق' : 'Fire extinguishers count'}>
              <Input type="number" value={b.extinguishers_count} onChange={e => setB({ ...b, extinguishers_count: e.target.value })} />
            </F>
          </div>

          <div className="space-y-3 pt-2 border-t">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <ImagePlus className="w-4 h-4 text-primary" />
              {isRTL ? 'صور الفرع' : 'Branch photos'}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {(b.documents.photos || []).map((path: string) => (
                <div key={path} className="relative group aspect-square rounded-lg border overflow-hidden bg-muted">
                  {photoUrls[path] ? (
                    <img src={photoUrls[path]} alt="branch" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => setB((p: any) => ({ ...p, documents: { ...p.documents, photos: p.documents.photos.filter((x: string) => x !== path) } }))}
                    className="absolute top-1 end-1 p-1 rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              {newPhotos.map((f, i) => (
                <div key={`new-${i}`} className="relative group aspect-square rounded-lg border overflow-hidden bg-muted">
                  <img src={URL.createObjectURL(f)} alt="new" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setNewPhotos(list => list.filter((_, idx) => idx !== i))}
                    className="absolute top-1 end-1 p-1 rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              <label className="aspect-square rounded-lg border-2 border-dashed border-muted-foreground/30 hover:border-primary hover:bg-primary/5 flex flex-col items-center justify-center gap-1 cursor-pointer text-xs text-muted-foreground">
                <ImagePlus className="w-5 h-5" />
                {isRTL ? 'إضافة صور' : 'Add photos'}
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={e => {
                    const list = Array.from(e.target.files || []);
                    if (list.length) setNewPhotos(prev => [...prev, ...list]);
                    e.target.value = '';
                  }}
                />
              </label>
            </div>
          </div>

          <div className="space-y-3 pt-2 border-t">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <FileText className="w-4 h-4 text-primary" />
              {isRTL ? 'الوثائق والعقود' : 'Documents & contracts'}
            </div>

            <DocRow title={isRTL ? 'رخصة البلدية' : 'Municipality license'} data={b.documents.municipality}
              onChange={p => updDoc('municipality', p)} onFile={f => setFiles(s => ({ ...s, municipality: f }))} isRTL={isRTL} showIssued />
            <DocRow title={isRTL ? 'رخصة الدفاع المدني' : 'Civil defense license'} data={b.documents.civil_defense}
              onChange={p => updDoc('civil_defense', p)} onFile={f => setFiles(s => ({ ...s, civil_defense: f }))} isRTL={isRTL} />

            <div className="rounded-lg border p-3 bg-background/50 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{isRTL ? 'اللوحة الإعلانية' : 'Signboard'}</span>
                <label className="flex items-center gap-2 text-xs cursor-pointer">
                  <input type="checkbox" checked={b.documents.signboard.has}
                    onChange={e => updDoc('signboard', { has: e.target.checked })} />
                  {isRTL ? 'يوجد لوحة' : 'Has signboard'}
                </label>
              </div>
              {b.documents.signboard.has && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <Label className="text-[11px] text-muted-foreground">{isRTL ? 'رقم الترخيص' : 'License number'}</Label>
                    <Input placeholder={isRTL ? 'رقم الترخيص' : 'License number'} value={b.documents.signboard.number} onChange={e => updDoc('signboard', { number: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] text-muted-foreground">{isRTL ? 'تاريخ انتهاء الرخصة' : 'Expiry date'}</Label>
                    <Input type="date" value={b.documents.signboard.expires_at} onChange={e => updDoc('signboard', { expires_at: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] text-muted-foreground">{isRTL ? 'المرفق' : 'Attachment'}</Label>
                    <FileInput onFile={f => setFiles(s => ({ ...s, signboard: f }))} />
                  </div>
                </div>
              )}
            </div>

            <ContractRow title={isRTL ? 'عقد مكافحة الحشرات' : 'Pest control contract'} data={b.documents.pest_control}
              onChange={p => updDoc('pest_control', p)} onFile={f => setFiles(s => ({ ...s, pest_control: f }))} isRTL={isRTL} />
            <ContractRow title={isRTL ? 'عقد الكاميرات' : 'Cameras contract'} data={b.documents.cameras_contract}
              onChange={p => updDoc('cameras_contract', p)} onFile={f => setFiles(s => ({ ...s, cameras_contract: f }))} isRTL={isRTL} />
            <ContractRow title={isRTL ? 'عقد الفلاتر' : 'Filters contract'} data={b.documents.filters_contract}
              onChange={p => updDoc('filters_contract', p)} onFile={f => setFiles(s => ({ ...s, filters_contract: f }))} isRTL={isRTL} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submit.isPending}>
            {isRTL ? 'إلغاء' : 'Cancel'}
          </Button>
          <Button onClick={() => submit.mutate()} disabled={submit.isPending || !b.name.trim()}>
            {submit.isPending && <Loader2 className="w-4 h-4 animate-spin me-2" />}
            {isEdit ? (isRTL ? 'حفظ التعديلات' : 'Save changes') : (isRTL ? 'إضافة الفرع' : 'Add branch')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function F({ label, required, children }: any) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium">
        {label} {required && <span className="text-destructive">*</span>}
      </Label>
      {children}
    </div>
  );
}

function FileInput({ onFile }: { onFile: (f: File | null) => void }) {
  return (
    <div className="flex items-center gap-2">
      <Upload className="w-3.5 h-3.5 text-muted-foreground" />
      <Input type="file" className="h-9 text-xs" onChange={e => onFile(e.target.files?.[0] ?? null)} />
    </div>
  );
}

function DocRow({ title, data, onChange, onFile, isRTL, showIssued = false }: any) {
  return (
    <div className="rounded-lg border p-3 bg-background/50 space-y-2">
      <div className="text-sm font-medium">{title}</div>
      <div className={`grid grid-cols-1 md:grid-cols-${showIssued ? 4 : 3} gap-2`}>
        <div className="space-y-1">
          <Label className="text-[11px] text-muted-foreground">{isRTL ? 'رقم الترخيص' : 'License number'}</Label>
          <Input placeholder={isRTL ? 'رقم الترخيص' : 'License number'} value={data.number || ''} onChange={e => onChange({ number: e.target.value })} />
        </div>
        {showIssued && (
          <div className="space-y-1">
            <Label className="text-[11px] text-muted-foreground">{isRTL ? 'تاريخ الإصدار' : 'Issue date'}</Label>
            <Input type="date" value={data.issued_at || ''} onChange={e => onChange({ issued_at: e.target.value })} />
          </div>
        )}
        <div className="space-y-1">
          <Label className="text-[11px] text-muted-foreground">{isRTL ? 'تاريخ انتهاء الرخصة' : 'Expiry date'}</Label>
          <Input type="date" value={data.expires_at || ''} onChange={e => onChange({ expires_at: e.target.value })} />
        </div>
        <div className="space-y-1">
          <Label className="text-[11px] text-muted-foreground">{isRTL ? 'المرفق' : 'Attachment'}</Label>
          <FileInput onFile={onFile} />
        </div>
      </div>
    </div>
  );
}

function ContractRow({ title, data, onChange, onFile, isRTL }: any) {
  return (
    <div className="rounded-lg border p-3 bg-background/50 space-y-2">
      <div className="text-sm font-medium">{title}</div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        <div className="space-y-1">
          <Label className="text-[11px] text-muted-foreground">{isRTL ? 'اسم المزود' : 'Provider name'}</Label>
          <Input placeholder={isRTL ? 'اسم المزود' : 'Provider name'} value={data.provider || ''} onChange={e => onChange({ provider: e.target.value })} />
        </div>
        <div className="space-y-1">
          <Label className="text-[11px] text-muted-foreground">{isRTL ? 'تاريخ انتهاء العقد' : 'Contract expiry date'}</Label>
          <Input type="date" value={data.expires_at || ''} onChange={e => onChange({ expires_at: e.target.value })} />
        </div>
        <div className="space-y-1">
          <Label className="text-[11px] text-muted-foreground">{isRTL ? 'المرفق' : 'Attachment'}</Label>
          <FileInput onFile={onFile} />
        </div>
      </div>
    </div>
  );
}