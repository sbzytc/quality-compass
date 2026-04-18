import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useGoBack } from '@/hooks/useGoBack';
import { usePatients } from '@/hooks/usePatients';
import { useAppointments } from '@/hooks/useAppointments';
import { useVisits } from '@/hooks/useVisits';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Stethoscope, Users, Calendar as CalendarIcon, ClipboardList,
  TrendingUp, AlertTriangle, ArrowRight,
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from 'recharts';

function startOfDay(d: Date) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
function endOfDay(d: Date) { const x = new Date(d); x.setHours(23, 59, 59, 999); return x; }

export default function ClinicDashboard() {
  const { language, direction } = useLanguage();
  const goBack = useGoBack();
  const { data: patients = [], isLoading: lp } = usePatients();
  const { data: appts = [], isLoading: la } = useAppointments();
  const { data: visits = [], isLoading: lv } = useVisits();

  const isLoading = lp || la || lv;
  const ar = language === 'ar';

  const stats = useMemo(() => {
    const now = new Date();
    const today0 = startOfDay(now);
    const today1 = endOfDay(now);
    const next7 = new Date(today0); next7.setDate(next7.getDate() + 7);
    const last30 = new Date(today0); last30.setDate(last30.getDate() - 30);

    const todayAppts = appts.filter(a => {
      const d = new Date(a.scheduled_at);
      return d >= today0 && d <= today1;
    });
    const upcoming = appts.filter(a => {
      const d = new Date(a.scheduled_at);
      return d > today1 && d <= next7 && a.status !== 'cancelled';
    });
    const finished30 = appts.filter(a => {
      const d = new Date(a.scheduled_at);
      return d >= last30 && d < today0;
    });
    const noShow30 = finished30.filter(a => a.status === 'no_show').length;
    const noShowRate = finished30.length > 0 ? Math.round((noShow30 / finished30.length) * 100) : 0;

    const visits30 = visits.filter(v => new Date(v.visit_date) >= last30).length;

    return {
      patientsCount: patients.length,
      todayCount: todayAppts.length,
      upcomingCount: upcoming.length,
      noShowRate,
      noShow30,
      visits30,
    };
  }, [patients, appts, visits]);

  // Build weekly chart data: counts per day for next 7 days starting today
  const weekData = useMemo(() => {
    const days: { label: string; date: Date; count: number; isToday: boolean }[] = [];
    const today0 = startOfDay(new Date());
    for (let i = 0; i < 7; i++) {
      const d = new Date(today0); d.setDate(d.getDate() + i);
      days.push({
        label: d.toLocaleDateString(ar ? 'ar' : 'en', { weekday: 'short', day: 'numeric' }),
        date: d,
        count: 0,
        isToday: i === 0,
      });
    }
    appts.forEach(a => {
      const d = startOfDay(new Date(a.scheduled_at));
      const idx = days.findIndex(x => x.date.getTime() === d.getTime());
      if (idx >= 0 && a.status !== 'cancelled') days[idx].count += 1;
    });
    return days;
  }, [appts, ar]);

  const recentVisits = useMemo(
    () => [...visits].sort((a, b) => +new Date(b.visit_date) - +new Date(a.visit_date)).slice(0, 5),
    [visits]
  );

  const todayList = useMemo(() => {
    const today0 = startOfDay(new Date());
    const today1 = endOfDay(new Date());
    return appts
      .filter(a => { const d = new Date(a.scheduled_at); return d >= today0 && d <= today1; })
      .sort((a, b) => +new Date(a.scheduled_at) - +new Date(b.scheduled_at));
  }, [appts]);

  const STATUS_COLORS: Record<string, string> = {
    scheduled: 'bg-blue-100 text-blue-700',
    confirmed: 'bg-emerald-100 text-emerald-700',
    completed: 'bg-green-100 text-green-700',
    cancelled: 'bg-gray-200 text-gray-700',
    no_show: 'bg-red-100 text-red-700',
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto" style={{ direction }}>
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={goBack}>←</Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Stethoscope className="w-6 h-6" />
            {ar ? 'لوحة العيادة' : 'Clinic Dashboard'}
          </h1>
          <p className="text-sm text-muted-foreground">
            {ar ? 'نظرة عامة على نشاط العيادة والمواعيد' : 'Overview of clinic activity and appointments'}
          </p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard
          icon={Users}
          label={ar ? 'إجمالي المرضى' : 'Total Patients'}
          value={isLoading ? '—' : String(stats.patientsCount)}
          tone="blue"
        />
        <KpiCard
          icon={CalendarIcon}
          label={ar ? 'مواعيد اليوم' : "Today's Appointments"}
          value={isLoading ? '—' : String(stats.todayCount)}
          tone="emerald"
        />
        <KpiCard
          icon={TrendingUp}
          label={ar ? 'مواعيد قادمة (7 أيام)' : 'Upcoming (7 days)'}
          value={isLoading ? '—' : String(stats.upcomingCount)}
          tone="indigo"
        />
        <KpiCard
          icon={AlertTriangle}
          label={ar ? 'نسبة عدم الحضور (30 يوم)' : 'No-show Rate (30d)'}
          value={isLoading ? '—' : `${stats.noShowRate}%`}
          sub={ar ? `${stats.noShow30} حالة` : `${stats.noShow30} cases`}
          tone={stats.noShowRate > 15 ? 'red' : 'amber'}
        />
      </div>

      {/* Weekly chart */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">
            {ar ? 'المواعيد للأسبوع القادم' : 'Appointments – Next 7 Days'}
          </CardTitle>
          <Link to="/clinic/appointments">
            <Button variant="ghost" size="sm" className="gap-1">
              {ar ? 'عرض الكل' : 'View all'} <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weekData} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="label" fontSize={12} />
                <YAxis allowDecimals={false} fontSize={12} />
                <Tooltip
                  contentStyle={{ borderRadius: 8, border: '1px solid hsl(var(--border))' }}
                  formatter={(v: number) => [v, ar ? 'مواعيد' : 'Appointments']}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {weekData.map((d, i) => (
                    <Cell key={i} fill={d.isToday ? 'hsl(var(--primary))' : 'hsl(var(--primary) / 0.45)'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Today's appointments */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarIcon className="w-4 h-4" />
              {ar ? 'مواعيد اليوم' : "Today's Schedule"}
            </CardTitle>
            <Badge variant="secondary">{todayList.length}</Badge>
          </CardHeader>
          <CardContent className="p-0 divide-y max-h-80 overflow-y-auto">
            {todayList.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                {ar ? 'لا توجد مواعيد اليوم' : 'No appointments today'}
              </div>
            ) : todayList.map(a => {
              const d = new Date(a.scheduled_at);
              return (
                <div key={a.id} className="p-3 flex items-center gap-3 hover:bg-muted/40">
                  <div className="text-xs font-mono w-12 shrink-0 text-center">
                    {d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{a.patient?.full_name || '—'}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {a.doctor_name || (ar ? 'بدون طبيب' : 'No doctor')} · {a.appointment_type}
                    </div>
                  </div>
                  <Badge className={STATUS_COLORS[a.status]}>{a.status}</Badge>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Recent visits */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <ClipboardList className="w-4 h-4" />
              {ar ? 'آخر الزيارات' : 'Recent Visits'}
            </CardTitle>
            <Link to="/clinic/visits">
              <Button variant="ghost" size="sm" className="gap-1">
                {ar ? 'الكل' : 'All'} <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="p-0 divide-y max-h-80 overflow-y-auto">
            {recentVisits.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                {ar ? 'لا توجد زيارات بعد' : 'No visits yet'}
              </div>
            ) : recentVisits.map(v => (
              <div key={v.id} className="p-3 hover:bg-muted/40">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-medium text-sm truncate">{v.patient?.full_name || '—'}</div>
                  <div className="text-xs text-muted-foreground shrink-0">
                    {new Date(v.visit_date).toLocaleDateString(ar ? 'ar' : 'en', { day: '2-digit', month: 'short' })}
                  </div>
                </div>
                <div className="text-xs text-muted-foreground truncate mt-0.5">
                  {v.diagnosis || v.chief_complaint || (ar ? 'بدون تشخيص' : 'No diagnosis')}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function KpiCard({
  icon: Icon, label, value, sub, tone,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
  tone: 'blue' | 'emerald' | 'indigo' | 'amber' | 'red';
}) {
  const tones: Record<string, string> = {
    blue: 'text-blue-600 bg-blue-50',
    emerald: 'text-emerald-600 bg-emerald-50',
    indigo: 'text-indigo-600 bg-indigo-50',
    amber: 'text-amber-600 bg-amber-50',
    red: 'text-red-600 bg-red-50',
  };
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${tones[tone]}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <div className="text-xs text-muted-foreground truncate">{label}</div>
          <div className="text-xl font-bold leading-tight">{value}</div>
          {sub && <div className="text-[11px] text-muted-foreground">{sub}</div>}
        </div>
      </CardContent>
    </Card>
  );
}
