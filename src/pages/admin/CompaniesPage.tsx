import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '@/contexts/LanguageContext';

const SECTORS = ['fnb', 'clinic', 'retail', 'factory', 'other'] as const;

export default function CompaniesPage() {
  const qc = useQueryClient();
  const { language } = useLanguage();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', name_ar: '', slug: '', sector_type: 'clinic' as typeof SECTORS[number] });

  const { data: companies, isLoading } = useQuery({
    queryKey: ['admin-companies'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('companies')
        .select('*, company_users(count)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const createCompany = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('companies').insert({
        name: form.name,
        name_ar: form.name_ar || null,
        slug: form.slug.toLowerCase().replace(/\s+/g, '-'),
        sector_type: form.sector_type,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(language === 'ar' ? 'تم إنشاء الشركة' : 'Company created');
      qc.invalidateQueries({ queryKey: ['admin-companies'] });
      setOpen(false);
      setForm({ name: '', name_ar: '', slug: '', sector_type: 'clinic' });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Building2 className="w-6 h-6 text-primary" />
            {language === 'ar' ? 'الشركات' : 'Companies'}
          </h1>
          <p className="text-sm text-muted-foreground">
            {language === 'ar' ? 'إدارة كل الشركات (Workspaces) في المنصة' : 'Manage all tenant workspaces'}
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 me-2" />{language === 'ar' ? 'إضافة شركة' : 'New Company'}</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{language === 'ar' ? 'شركة جديدة' : 'New Company'}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Name (EN)</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
              <div><Label>الاسم (AR)</Label><Input value={form.name_ar} onChange={e => setForm({ ...form, name_ar: e.target.value })} /></div>
              <div><Label>Slug</Label><Input value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value })} placeholder="acme-clinics" /></div>
              <div>
                <Label>Sector</Label>
                <Select value={form.sector_type} onValueChange={(v: any) => setForm({ ...form, sector_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{SECTORS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => createCompany.mutate()} disabled={!form.name || !form.slug || createCompany.isPending}>
                {language === 'ar' ? 'إنشاء' : 'Create'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-3">
        {isLoading && <div className="text-muted-foreground">Loading…</div>}
        {companies?.map((c: any) => (
          <Card key={c.id} className="p-4 flex items-center justify-between">
            <div>
              <div className="font-medium">{c.name} {c.name_ar && <span className="text-muted-foreground">— {c.name_ar}</span>}</div>
              <div className="text-xs text-muted-foreground">/{c.slug} · {c.sector_type}</div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={c.status === 'active' ? 'default' : 'secondary'}>{c.status}</Badge>
            </div>
          </Card>
        ))}
        {companies?.length === 0 && <div className="text-muted-foreground text-sm">No companies yet.</div>}
      </div>
    </div>
  );
}
