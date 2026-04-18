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
            <Stethoscope className="w-6 h-6 text-primary" />
            {ar ? (currentCompany?.name_ar || currentCompany?.name) : currentCompany?.name}
          </h1>
          <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-1">
            <Building2 className="w-3.5 h-3.5" />
            {ar ? 'العيادة › الفروع › الأقسام › الغرف' : 'Clinic › Branches › Departments › Rooms'}
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
        <div className="grid gap-4 md:grid-cols-2">
          {companyBranches.map((b: any) => {
            const branchDepts = depts.filter(d => d.branch_id === b.id);
            const branchRooms = rooms.filter(r => r.branch_id === b.id);
            const available = branchRooms.filter(r => r.status === 'available').length;
            return (
              <Link key={b.id} to={`/clinic/branches/${b.id}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer h-full border-l-4 border-l-primary/40">
                  <CardContent className="p-5 space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-primary shrink-0" />
                          <h3 className="font-semibold text-base truncate">
                            {ar ? (b.name_ar || b.name) : b.name}
                          </h3>
                        </div>
                        {b.city && <p className="text-xs text-muted-foreground mt-0.5 ms-6">{b.city}</p>}
                      </div>
                      <ChevronRight className="w-5 h-5 text-muted-foreground rtl:rotate-180" />
                    </div>

                    <div className="flex items-center gap-3 text-xs">
                      <Badge variant="secondary" className="gap-1">
                        <Layers className="w-3 h-3" />
                        {branchDepts.length} {ar ? 'قسم' : 'depts'}
                      </Badge>
                      <Badge variant="secondary" className="gap-1">
                        <DoorOpen className="w-3 h-3" />
                        {branchRooms.length} {ar ? 'غرفة' : 'rooms'}
                      </Badge>
                      <Badge className="gap-1 bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-emerald-200" variant="outline">
                        {available} {ar ? 'متاحة' : 'available'}
                      </Badge>
                    </div>

                    {branchDepts.length > 0 && (
                      <div className="border-t pt-3 space-y-1.5">
                        <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">
                          {ar ? 'الأقسام' : 'Departments'}
                        </p>
                        {branchDepts.map(d => {
                          const dRooms = branchRooms.filter(r => r.department_id === d.id);
                          return (
                            <div key={d.id} className="flex items-center justify-between text-xs py-1 px-2 rounded-md bg-muted/40">
                              <span className="flex items-center gap-1.5 min-w-0">
                                <Layers className="w-3 h-3 text-indigo-500 shrink-0" />
                                <span className="truncate">{ar ? (d.name_ar || d.name) : d.name}</span>
                              </span>
                              <span className="text-muted-foreground shrink-0 ms-2">
                                {dRooms.length} {ar ? 'غرفة' : 'rooms'}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {branchDepts.length === 0 && (
                      <p className="text-xs text-muted-foreground italic border-t pt-3">
                        {ar ? 'لا توجد أقسام بعد — افتح الفرع لإضافتها' : 'No departments yet — open branch to add'}
                      </p>
                    )}
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
