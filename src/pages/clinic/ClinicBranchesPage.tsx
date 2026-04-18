import { Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useGoBack } from '@/hooks/useGoBack';
import { useBranches } from '@/hooks/useBranches';
import { useCurrentCompany } from '@/contexts/CurrentCompanyContext';
import { useClinicDepartments } from '@/hooks/useClinicDepartments';
import { useClinicRooms } from '@/hooks/useClinicRooms';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Building2, ChevronRight, DoorOpen, Layers, Stethoscope } from 'lucide-react';

export default function ClinicBranchesPage() {
  const { language, direction } = useLanguage();
  const goBack = useGoBack();
  const ar = language === 'ar';
  const { currentCompany } = useCurrentCompany();
  const { data: branches = [], isLoading } = useBranches();
  const { data: depts = [] } = useClinicDepartments();
  const { data: rooms = [] } = useClinicRooms();

  const companyBranches = branches.filter((b: any) => b.company_id === currentCompany?.id || !b.company_id);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto" style={{ direction }}>
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={goBack}>←</Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Building2 className="w-6 h-6" />
            {ar ? 'فروع العيادة' : 'Clinic Branches'}
          </h1>
          <p className="text-sm text-muted-foreground">
            {ar ? 'كل فرع يحتوي على أقسام وغرف' : 'Each branch contains departments and rooms'}
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center text-muted-foreground py-12">{ar ? 'جارِ التحميل...' : 'Loading...'}</div>
      ) : companyBranches.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">
          {ar ? 'لا توجد فروع بعد' : 'No branches yet'}
        </CardContent></Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {companyBranches.map((b: any) => {
            const branchDepts = depts.filter(d => d.branch_id === b.id);
            const branchRooms = rooms.filter(r => r.branch_id === b.id);
            const available = branchRooms.filter(r => r.status === 'available').length;
            return (
              <Link key={b.id} to={`/clinic/branches/${b.id}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                  <CardContent className="p-5 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="min-w-0">
                        <h3 className="font-semibold text-base truncate">
                          {ar ? (b.name_ar || b.name) : b.name}
                        </h3>
                        {b.city && <p className="text-xs text-muted-foreground">{b.city}</p>}
                      </div>
                      <ChevronRight className="w-5 h-5 text-muted-foreground rtl:rotate-180" />
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                      <span className="flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-indigo-500" />
                        <span className="font-medium">{branchDepts.length}</span>
                        <span className="text-muted-foreground">{ar ? 'قسم' : 'depts'}</span>
                      </span>
                      <span className="flex items-center gap-1.5">
                        <DoorOpen className="w-3.5 h-3.5 text-emerald-500" />
                        <span className="font-medium">{branchRooms.length}</span>
                        <span className="text-muted-foreground">{ar ? 'غرفة' : 'rooms'}</span>
                      </span>
                    </div>
                    <Badge variant="secondary" className="bg-emerald-100 text-emerald-700">
                      {available} {ar ? 'متاحة' : 'available'}
                    </Badge>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
