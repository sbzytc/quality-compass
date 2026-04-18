import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useGoBack } from '@/hooks/useGoBack';
import { useBranches } from '@/hooks/useBranches';
import { useCurrentCompany } from '@/contexts/CurrentCompanyContext';
import { useClinicDepartments } from '@/hooks/useClinicDepartments';
import { useClinicRooms, type RoomStatus } from '@/hooks/useClinicRooms';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import {
  Stethoscope, Building2, Layers, DoorOpen, ChevronRight, AlertCircle, Plus,
} from 'lucide-react';

const STATUS_STYLES: Record<RoomStatus, string> = {
  available: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  occupied: 'bg-amber-100 text-amber-700 border-amber-200',
  maintenance: 'bg-gray-200 text-gray-700 border-gray-300',
};

export default function ClinicDashboard() {
  const { language, direction } = useLanguage();
  const goBack = useGoBack();
  const ar = language === 'ar';
  const { currentCompany } = useCurrentCompany();
  const { data: branches = [], isLoading: lb } = useBranches();
  const { data: depts = [], isLoading: ld } = useClinicDepartments();
  const { data: rooms = [], isLoading: lr } = useClinicRooms();

  const isLoading = lb || ld || lr;
  const companyBranches = useMemo(
    () => branches.filter((b: any) => b.company_id === currentCompany?.id),
    [branches, currentCompany?.id]
  );

  const totals = useMemo(() => ({
    branches: companyBranches.length,
    depts: depts.length,
    rooms: rooms.length,
    available: rooms.filter(r => r.status === 'available').length,
    occupied: rooms.filter(r => r.status === 'occupied').length,
    maintenance: rooms.filter(r => r.status === 'maintenance').length,
  }), [companyBranches, depts, rooms]);

  const statusLabel = (s: RoomStatus) => ({
    available: ar ? 'متاحة' : 'Available',
    occupied: ar ? 'مشغولة' : 'Occupied',
    maintenance: ar ? 'صيانة' : 'Maintenance',
  })[s];

  const companyName = ar ? (currentCompany?.name_ar || currentCompany?.name) : currentCompany?.name;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto" style={{ direction }}>
      {/* Header with workspace context */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={goBack}>←</Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold flex items-center gap-2 truncate">
            <Stethoscope className="w-6 h-6 shrink-0 text-primary" />
            {companyName || (ar ? 'العيادة' : 'Clinic')}
          </h1>
          <p className="text-sm text-muted-foreground">
            {ar ? 'الهيكل الكامل: الفروع ← الأقسام ← الغرف' : 'Full structure: Branches → Departments → Rooms'}
          </p>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <KpiCard icon={Building2} label={ar ? 'الفروع' : 'Branches'} value={totals.branches} tone="blue" />
        <KpiCard icon={Layers} label={ar ? 'الأقسام' : 'Departments'} value={totals.depts} tone="indigo" />
        <KpiCard icon={DoorOpen} label={ar ? 'إجمالي الغرف' : 'Total Rooms'} value={totals.rooms} tone="violet" />
        <KpiCard icon={DoorOpen} label={ar ? 'متاحة' : 'Available'} value={totals.available} tone="emerald" />
        <KpiCard icon={DoorOpen} label={ar ? 'مشغولة / صيانة' : 'Busy / Maint.'} value={`${totals.occupied} / ${totals.maintenance}`} tone="amber" />
      </div>

      {/* Hierarchy tree */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            {ar ? 'هيكل العيادة' : 'Clinic Structure'}
          </CardTitle>
          <Link to="/clinic/branches">
            <Button variant="outline" size="sm" className="gap-1">
              {ar ? 'إدارة الفروع' : 'Manage Branches'} <ChevronRight className="w-4 h-4 rtl:rotate-180" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-12 text-center text-muted-foreground">{ar ? 'جارِ التحميل...' : 'Loading...'}</div>
          ) : companyBranches.length === 0 ? (
            <EmptyState
              icon={AlertCircle}
              title={ar ? 'لا توجد فروع لهذه العيادة' : 'No branches for this clinic yet'}
              description={ar
                ? 'أضف أول فرع للعيادة من صفحة إدارة الفروع.'
                : 'Add your first branch from the branches management page.'}
              action={
                <Link to="/clinic/branches">
                  <Button size="sm" className="gap-1"><Plus className="w-4 h-4" /> {ar ? 'إضافة فرع' : 'Add Branch'}</Button>
                </Link>
              }
            />
          ) : (
            <Accordion
              type="multiple"
              defaultValue={companyBranches.map((b: any) => b.id)}
              className="space-y-2"
            >
              {companyBranches.map((b: any) => {
                const branchDepts = depts.filter(d => d.branch_id === b.id);
                const branchRooms = rooms.filter(r => r.branch_id === b.id);
                const bAvailable = branchRooms.filter(r => r.status === 'available').length;
                return (
                  <AccordionItem key={b.id} value={b.id} className="border rounded-xl px-4 bg-card/50">
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center gap-3 flex-1 text-start">
                        <Building2 className="w-4 h-4 text-blue-500" />
                        <span className="font-semibold">{ar ? (b.name_ar || b.name) : b.name}</span>
                        {b.city && <span className="text-xs text-muted-foreground">· {b.city}</span>}
                        <div className="ms-auto me-2 flex items-center gap-2">
                          <Badge variant="secondary" className="text-[10px]">
                            <Layers className="w-3 h-3 me-1" /> {branchDepts.length}
                          </Badge>
                          <Badge variant="secondary" className="text-[10px] bg-emerald-100 text-emerald-700">
                            <DoorOpen className="w-3 h-3 me-1" /> {bAvailable} / {branchRooms.length}
                          </Badge>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-3 pb-2">
                        {branchDepts.length === 0 ? (
                          <EmptyState
                            small
                            icon={Layers}
                            title={ar ? 'لا توجد أقسام في هذا الفرع' : 'No departments in this branch'}
                            description={ar ? 'افتح الفرع لإضافة الأقسام والغرف.' : 'Open the branch to add departments and rooms.'}
                            action={
                              <Link to={`/clinic/branches/${b.id}`}>
                                <Button size="sm" variant="outline">{ar ? 'فتح الفرع' : 'Open branch'}</Button>
                              </Link>
                            }
                          />
                        ) : (
                          <div className="space-y-2">
                            {branchDepts.map(dept => {
                              const deptRooms = branchRooms.filter(r => r.department_id === dept.id);
                              return (
                                <div key={dept.id} className="border rounded-lg p-3 bg-background">
                                  <div className="flex items-center gap-2 mb-2">
                                    <Layers className="w-4 h-4 text-indigo-500" />
                                    <span className="font-medium text-sm">{ar ? (dept.name_ar || dept.name) : dept.name}</span>
                                    <Badge variant="outline" className="text-[10px]">{deptRooms.length} {ar ? 'غرفة' : 'rooms'}</Badge>
                                  </div>
                                  {deptRooms.length === 0 ? (
                                    <p className="text-xs text-muted-foreground py-2 ps-6">
                                      {ar ? 'لا توجد غرف في هذا القسم' : 'No rooms in this department'}
                                    </p>
                                  ) : (
                                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 ps-6">
                                      {deptRooms.map(room => (
                                        <div key={room.id} className="border rounded-md p-2 text-xs flex items-start justify-between gap-2 bg-muted/30">
                                          <div className="min-w-0">
                                            <div className="flex items-center gap-1.5 font-medium truncate">
                                              <DoorOpen className="w-3 h-3 shrink-0" />
                                              <span className="truncate">{ar ? (room.name_ar || room.name) : room.name}</span>
                                            </div>
                                            {room.room_number && (
                                              <div className="text-[10px] text-muted-foreground mt-0.5">#{room.room_number}</div>
                                            )}
                                          </div>
                                          <Badge className={`${STATUS_STYLES[room.status]} text-[9px] px-1.5 py-0 shrink-0`} variant="outline">
                                            {statusLabel(room.status)}
                                          </Badge>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                        <div className="flex justify-end pt-1">
                          <Link to={`/clinic/branches/${b.id}`}>
                            <Button size="sm" variant="outline" className="gap-1">
                              {ar ? 'إدارة الفرع' : 'Manage Branch'} <ChevronRight className="w-3.5 h-3.5 rtl:rotate-180" />
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function KpiCard({
  icon: Icon, label, value, tone,
}: { icon: React.ElementType; label: string; value: any; tone: string }) {
  const tones: Record<string, string> = {
    blue: 'text-blue-600 bg-blue-50',
    emerald: 'text-emerald-600 bg-emerald-50',
    indigo: 'text-indigo-600 bg-indigo-50',
    violet: 'text-violet-600 bg-violet-50',
    amber: 'text-amber-600 bg-amber-50',
  };
  return (
    <Card>
      <CardContent className="p-3 flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${tones[tone]}`}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <div className="text-[11px] text-muted-foreground truncate">{label}</div>
          <div className="text-lg font-bold leading-tight">{value}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyState({
  icon: Icon, title, description, action, small,
}: { icon: React.ElementType; title: string; description?: string; action?: React.ReactNode; small?: boolean }) {
  return (
    <div className={`text-center ${small ? 'py-6' : 'py-10'} space-y-2`}>
      <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center">
        <Icon className="w-5 h-5 text-muted-foreground" />
      </div>
      <div className="font-medium text-sm">{title}</div>
      {description && <p className="text-xs text-muted-foreground max-w-md mx-auto">{description}</p>}
      {action && <div className="pt-2">{action}</div>}
    </div>
  );
}
