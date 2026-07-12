import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { Loader2, Plus, Trash2, Upload, Building2, MapPin, FileText } from 'lucide-react';

type Workspace = 'food' | 'medical';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  workspace: Workspace;
}

const emptyDoc = () => ({ number: '', issued_at: '', expires_at: '', file_path: '' });
const emptyContract = () => ({ provider: '', expires_at: '', file_path: '' });

const emptyBranch = () => ({
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
  },
});

function slugify(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 40) || `co-${Date.now()}`;
}

export default function AddCompanyDialog({ open, onOpenChange, workspace }: Props) {
  const { language, direction } = useLanguage();
  const isRTL = direction === 'rtl';
  const qc = useQueryClient();
  const [tab, setTab] = useState('company');
  const [logoFile, setLogoFile] = useState<File | null>(null);

  const [company, setCompany] = useState({
    name: '',
    name_ar: '',
    brand_name: '',
    brand_name_ar: '',
    cr_number: '',
    cr_expires_at: '',
    unified_number: '',
    main_activity: '',
    city: '',
    main_address: '',
    contact_person: '',
    email: '',
    phone: '',
  });

  const [branches, setBranches] = useState<any[]>([emptyBranch()]);

  const reset = () => {
    setCompany({ name: '', name_ar: '', brand_name: '', brand_name_ar: '', cr_number: '', cr_expires_at: '', unified_number: '', main_activity: '', city: '', main_address: '', contact_person: '', email: '', phone: '' });
    setBranches([emptyBranch()]);
    setLogoFile(null);
    setTab('company');
  };

  const uploadFile = async (companyId: string, file: File, folder: string) => {
    const ext = file.name.split('.').pop();
    const path = `${companyId}/${folder}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from('company-documents').upload(path, file);
    if (error) throw error;
    return path;
  };

  const submit = useMutation({
    mutationFn: async () => {
      if (!company.name.trim()) throw new Error(isRTL ? 'اسم الشركة مطلوب' : 'Company name is required');

      const slug = slugify(company.name);
      const details = {
        cr_number: company.cr_number,
        cr_expires_at: company.cr_expires_at,
        unified_number: company.unified_number,
        main_activity: company.main_activity,
        city: company.city,
        main_address: company.main_address,
        contact_person: company.contact_person,
        email: company.email,
        phone: company.phone,
      };

      const { data: created, error: cErr } = await supabase
        .from('companies')
        .insert({
          name: company.name,
          name_ar: company.name_ar || null,
          slug,
          workspace_type: workspace,
          sector_type: workspace === 'food' ? 'fnb' : 'clinic',
          primary_module: workspace === 'food' ? 'food_restaurants' : 'medical_clinics',
          status: 'active',
          details,
        })
        .select('id')
        .single();
      if (cErr) throw cErr;

      const companyId = created.id;

      if (logoFile) {
        const logoPath = await uploadFile(companyId, logoFile, 'logo');
        await supabase.from('companies').update({ logo_url: logoPath }).eq('id', companyId);
      }

      // Insert branches
      for (const b of branches) {
        if (!b.name.trim()) continue;

        // Upload docs
        const docs = JSON.parse(JSON.stringify(b.documents));
        for (const key of Object.keys(docs)) {
          const f = (b as any)[`_file_${key}`] as File | undefined;
          if (f) docs[key].file_path = await uploadFile(companyId, f, `branches/${key}`);
        }

        await supabase.from('branches').insert({
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
        });
      }

      return companyId;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['super-admin-sector-companies', workspace] });
      toast({ title: isRTL ? 'تمت إضافة الشركة' : 'Company added' });
      reset();
      onOpenChange(false);
    },
    onError: (e: any) => toast({ title: isRTL ? 'فشل الإضافة' : 'Failed', description: e.message, variant: 'destructive' }),
  });

  const updateBranch = (i: number, patch: any) =>
    setBranches(prev => prev.map((b, idx) => (idx === i ? { ...b, ...patch } : b)));

  const updateBranchDoc = (i: number, key: string, patch: any) =>
    setBranches(prev => prev.map((b, idx) => idx === i ? { ...b, documents: { ...b.documents, [key]: { ...b.documents[key], ...patch } } } : b));

  const setBranchFile = (i: number, key: string, file: File | null) =>
    setBranches(prev => prev.map((b, idx) => idx === i ? { ...b, [`_file_${key}`]: file } : b));

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" dir={direction}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            {isRTL ? 'إضافة شركة جديدة' : 'Add new company'}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={tab} onValueChange={setTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="company">{isRTL ? 'بيانات الشركة' : 'Company info'}</TabsTrigger>
            <TabsTrigger value="branches">{isRTL ? `الفروع (${branches.length})` : `Branches (${branches.length})`}</TabsTrigger>
          </TabsList>

          <TabsContent value="company" className="space-y-4 pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field label={isRTL ? 'اسم الشركة (English)' : 'Company name (English)'} required>
                <Input value={company.name} onChange={e => setCompany({ ...company, name: e.target.value })} />
              </Field>
              <Field label={isRTL ? 'اسم الشركة (عربي)' : 'Company name (Arabic)'}>
                <Input value={company.name_ar} onChange={e => setCompany({ ...company, name_ar: e.target.value })} />
              </Field>
              <Field label={isRTL ? 'رقم السجل التجاري' : 'CR number'}>
                <Input value={company.cr_number} onChange={e => setCompany({ ...company, cr_number: e.target.value })} />
              </Field>
              <Field label={isRTL ? 'تاريخ انتهاء السجل التجاري' : 'CR expiry date'}>
                <Input type="date" value={company.cr_expires_at} onChange={e => setCompany({ ...company, cr_expires_at: e.target.value })} />
              </Field>
              <Field label={isRTL ? 'الرقم الموحد' : 'Unified number'}>
                <Input value={company.unified_number} onChange={e => setCompany({ ...company, unified_number: e.target.value })} />
              </Field>
              <Field label={isRTL ? 'النشاط الرئيسي' : 'Main activity'}>
                <Input value={company.main_activity} onChange={e => setCompany({ ...company, main_activity: e.target.value })} />
              </Field>
              <Field label={isRTL ? 'المدينة' : 'City'}>
                <Input value={company.city} onChange={e => setCompany({ ...company, city: e.target.value })} />
              </Field>
              <Field label={isRTL ? 'العنوان الرئيسي' : 'Main address'}>
                <Input value={company.main_address} onChange={e => setCompany({ ...company, main_address: e.target.value })} />
              </Field>
              <Field label={isRTL ? 'الشخص المسؤول' : 'Contact person'}>
                <Input value={company.contact_person} onChange={e => setCompany({ ...company, contact_person: e.target.value })} />
              </Field>
              <Field label={isRTL ? 'البريد الإلكتروني' : 'Email'}>
                <Input type="email" value={company.email} onChange={e => setCompany({ ...company, email: e.target.value })} />
              </Field>
              <Field label={isRTL ? 'رقم الجوال' : 'Phone'}>
                <Input value={company.phone} onChange={e => setCompany({ ...company, phone: e.target.value })} />
              </Field>
              <Field label={isRTL ? 'شعار الشركة' : 'Company logo'}>
                <Input type="file" accept="image/*" onChange={e => setLogoFile(e.target.files?.[0] ?? null)} />
              </Field>
            </div>
          </TabsContent>

          <TabsContent value="branches" className="space-y-4 pt-4">
            {branches.map((b, i) => (
              <Card key={i} className="p-4 space-y-4 bg-muted/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-semibold">
                    <MapPin className="w-4 h-4 text-primary" />
                    {isRTL ? `الفرع ${i + 1}` : `Branch ${i + 1}`}
                  </div>
                  {branches.length > 1 && (
                    <Button variant="ghost" size="sm" onClick={() => setBranches(branches.filter((_, idx) => idx !== i))}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Field label={isRTL ? 'اسم الفرع' : 'Branch name'} required>
                    <Input value={b.name} onChange={e => updateBranch(i, { name: e.target.value })} />
                  </Field>
                  <Field label={isRTL ? 'رقم الفرع' : 'Branch code'}>
                    <Input value={b.code} onChange={e => updateBranch(i, { code: e.target.value })} />
                  </Field>
                  <Field label={isRTL ? 'المدينة' : 'City'}>
                    <Input value={b.city} onChange={e => updateBranch(i, { city: e.target.value })} />
                  </Field>
                  <Field label={isRTL ? 'الحي' : 'District'}>
                    <Input value={b.district} onChange={e => updateBranch(i, { district: e.target.value })} />
                  </Field>
                  <Field label={isRTL ? 'العنوان' : 'Address'}>
                    <Input value={b.address} onChange={e => updateBranch(i, { address: e.target.value })} />
                  </Field>
                  <Field label={isRTL ? 'الموقع الجغرافي (GPS/Maps)' : 'GPS / Google Maps link'}>
                    <Input value={b.gps} onChange={e => updateBranch(i, { gps: e.target.value })} placeholder="24.7136, 46.6753" />
                  </Field>
                  <Field label={isRTL ? 'حالة الفرع' : 'Branch status'}>
                    <Select value={b.status} onValueChange={v => updateBranch(i, { status: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">{isRTL ? 'نشط' : 'Active'}</SelectItem>
                        <SelectItem value="closed">{isRTL ? 'مغلق' : 'Closed'}</SelectItem>
                        <SelectItem value="under_construction">{isRTL ? 'تحت الإنشاء' : 'Under construction'}</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label={isRTL ? 'نوع النشاط' : 'Activity type'}>
                    <Input value={b.activity_type} onChange={e => updateBranch(i, { activity_type: e.target.value })} />
                  </Field>
                  <Field label={isRTL ? 'تاريخ الافتتاح' : 'Opening date'}>
                    <Input type="date" value={b.opened_at} onChange={e => updateBranch(i, { opened_at: e.target.value })} />
                  </Field>
                  <Field label={isRTL ? 'مدير الفرع' : 'Branch manager'}>
                    <Input value={b.manager_name} onChange={e => updateBranch(i, { manager_name: e.target.value })} />
                  </Field>
                  <Field label={isRTL ? 'رقم مدير الفرع' : 'Manager phone'}>
                    <Input value={b.manager_phone} onChange={e => updateBranch(i, { manager_phone: e.target.value })} />
                  </Field>
                  <Field label={isRTL ? 'مساحة المنشأة (م²)' : 'Area (m²)'}>
                    <Input type="number" value={b.area_m2} onChange={e => updateBranch(i, { area_m2: e.target.value })} />
                  </Field>
                  <Field label={isRTL ? 'عدد العاملين' : 'Employees count'}>
                    <Input type="number" value={b.employees_count} onChange={e => updateBranch(i, { employees_count: e.target.value })} />
                  </Field>
                  <Field label={isRTL ? 'عدد الكاميرات' : 'Cameras count'}>
                    <Input type="number" value={b.cameras_count} onChange={e => updateBranch(i, { cameras_count: e.target.value })} />
                  </Field>
                  <Field label={isRTL ? 'عدد طفايات الحريق' : 'Fire extinguishers count'}>
                    <Input type="number" value={b.extinguishers_count} onChange={e => updateBranch(i, { extinguishers_count: e.target.value })} />
                  </Field>
                </div>

                {/* Documents */}
                <div className="space-y-3 pt-2 border-t">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <FileText className="w-4 h-4 text-primary" />
                    {isRTL ? 'الوثائق والعقود' : 'Documents & contracts'}
                  </div>

                  <DocRow
                    title={isRTL ? 'رخصة البلدية' : 'Municipality license'}
                    data={b.documents.municipality}
                    onChange={(p) => updateBranchDoc(i, 'municipality', p)}
                    onFile={(f) => setBranchFile(i, 'municipality', f)}
                    isRTL={isRTL}
                    showIssued
                  />
                  <DocRow
                    title={isRTL ? 'رخصة الدفاع المدني' : 'Civil defense license'}
                    data={b.documents.civil_defense}
                    onChange={(p) => updateBranchDoc(i, 'civil_defense', p)}
                    onFile={(f) => setBranchFile(i, 'civil_defense', f)}
                    isRTL={isRTL}
                  />

                  <div className="rounded-lg border p-3 bg-background/50 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{isRTL ? 'اللوحة الإعلانية' : 'Signboard'}</span>
                      <label className="flex items-center gap-2 text-xs cursor-pointer">
                        <input type="checkbox" checked={b.documents.signboard.has}
                          onChange={e => updateBranchDoc(i, 'signboard', { has: e.target.checked })} />
                        {isRTL ? 'يوجد لوحة' : 'Has signboard'}
                      </label>
                    </div>
                    {b.documents.signboard.has && (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                        <Input placeholder={isRTL ? 'رقم الترخيص' : 'License number'} value={b.documents.signboard.number} onChange={e => updateBranchDoc(i, 'signboard', { number: e.target.value })} />
                        <Input type="date" value={b.documents.signboard.expires_at} onChange={e => updateBranchDoc(i, 'signboard', { expires_at: e.target.value })} />
                        <FileInput onFile={(f) => setBranchFile(i, 'signboard', f)} isRTL={isRTL} />
                      </div>
                    )}
                  </div>

                  <ContractRow
                    title={isRTL ? 'عقد مكافحة الحشرات' : 'Pest control contract'}
                    data={b.documents.pest_control}
                    onChange={(p) => updateBranchDoc(i, 'pest_control', p)}
                    onFile={(f) => setBranchFile(i, 'pest_control', f)}
                    isRTL={isRTL}
                  />
                  <ContractRow
                    title={isRTL ? 'عقد الكاميرات' : 'Cameras contract'}
                    data={b.documents.cameras_contract}
                    onChange={(p) => updateBranchDoc(i, 'cameras_contract', p)}
                    onFile={(f) => setBranchFile(i, 'cameras_contract', f)}
                    isRTL={isRTL}
                  />
                  <ContractRow
                    title={isRTL ? 'عقد الفلاتر' : 'Filters contract'}
                    data={b.documents.filters_contract}
                    onChange={(p) => updateBranchDoc(i, 'filters_contract', p)}
                    onFile={(f) => setBranchFile(i, 'filters_contract', f)}
                    isRTL={isRTL}
                  />
                </div>
              </Card>
            ))}

            <Button variant="outline" onClick={() => setBranches([...branches, emptyBranch()])} className="w-full gap-2">
              <Plus className="w-4 h-4" />
              {isRTL ? 'إضافة فرع آخر' : 'Add another branch'}
            </Button>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submit.isPending}>
            {isRTL ? 'إلغاء' : 'Cancel'}
          </Button>
          <Button onClick={() => submit.mutate()} disabled={submit.isPending || !company.name.trim()}>
            {submit.isPending && <Loader2 className="w-4 h-4 animate-spin me-2" />}
            {isRTL ? 'إنشاء الشركة' : 'Create company'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, required, children }: any) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium">
        {label} {required && <span className="text-destructive">*</span>}
      </Label>
      {children}
    </div>
  );
}

function FileInput({ onFile, isRTL }: { onFile: (f: File | null) => void; isRTL: boolean }) {
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
        <Input placeholder={isRTL ? 'رقم الترخيص' : 'License number'} value={data.number || ''} onChange={e => onChange({ number: e.target.value })} />
        {showIssued && <Input type="date" placeholder={isRTL ? 'تاريخ الإصدار' : 'Issue date'} value={data.issued_at || ''} onChange={e => onChange({ issued_at: e.target.value })} />}
        <Input type="date" placeholder={isRTL ? 'تاريخ الانتهاء' : 'Expiry date'} value={data.expires_at || ''} onChange={e => onChange({ expires_at: e.target.value })} />
        <FileInput onFile={onFile} isRTL={isRTL} />
      </div>
    </div>
  );
}

function ContractRow({ title, data, onChange, onFile, isRTL }: any) {
  return (
    <div className="rounded-lg border p-3 bg-background/50 space-y-2">
      <div className="text-sm font-medium">{title}</div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        <Input placeholder={isRTL ? 'اسم المزود' : 'Provider name'} value={data.provider || ''} onChange={e => onChange({ provider: e.target.value })} />
        <Input type="date" placeholder={isRTL ? 'تاريخ انتهاء العقد' : 'Contract expiry'} value={data.expires_at || ''} onChange={e => onChange({ expires_at: e.target.value })} />
        <FileInput onFile={onFile} isRTL={isRTL} />
      </div>
    </div>
  );
}