import { useMemo, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import type { Appointment } from '@/hooks/useAppointments';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const STATUS_DOT: Record<string, string> = {
  scheduled: 'bg-blue-500',
  confirmed: 'bg-emerald-500',
  completed: 'bg-green-600',
  cancelled: 'bg-gray-400',
  no_show: 'bg-red-500',
};

interface Props {
  appointments: Appointment[];
  view: 'week' | 'month';
  onSelect: (a: Appointment) => void;
  onReschedule: (a: Appointment, newDate: Date) => void;
}

function startOfWeek(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - x.getDay());
  return x;
}

function startOfMonthGrid(d: Date) {
  const first = new Date(d.getFullYear(), d.getMonth(), 1);
  return startOfWeek(first);
}

function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function AppointmentsCalendar({ appointments, view, onSelect, onReschedule }: Props) {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const [cursor, setCursor] = useState(() => new Date());
  const [dragOver, setDragOver] = useState<string | null>(null);

  const days = useMemo(() => {
    if (view === 'week') {
      const start = startOfWeek(cursor);
      return Array.from({ length: 7 }, (_, i) => addDays(start, i));
    }
    const start = startOfMonthGrid(cursor);
    return Array.from({ length: 42 }, (_, i) => addDays(start, i));
  }, [cursor, view]);

  const byDay = useMemo(() => {
    const map = new Map<string, Appointment[]>();
    for (const a of appointments) {
      const d = new Date(a.scheduled_at);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      const arr = map.get(key) || [];
      arr.push(a);
      map.set(key, arr);
    }
    return map;
  }, [appointments]);

  const titleFmt = new Intl.DateTimeFormat(isAr ? 'ar' : 'en', {
    month: 'long',
    year: 'numeric',
    ...(view === 'week' ? { day: 'numeric' } : {}),
  });

  const weekdayFmt = new Intl.DateTimeFormat(isAr ? 'ar' : 'en', { weekday: 'short' });

  function shift(delta: number) {
    const x = new Date(cursor);
    if (view === 'week') x.setDate(x.getDate() + delta * 7);
    else x.setMonth(x.getMonth() + delta);
    setCursor(x);
  }

  function dayKey(d: Date) {
    return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  }

  function handleDrop(e: React.DragEvent, day: Date) {
    e.preventDefault();
    setDragOver(null);
    const id = e.dataTransfer.getData('text/plain');
    const appt = appointments.find((a) => a.id === id);
    if (!appt) return;
    const original = new Date(appt.scheduled_at);
    if (sameDay(original, day)) return;
    const newDate = new Date(day);
    newDate.setHours(original.getHours(), original.getMinutes(), 0, 0);
    onReschedule(appt, newDate);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => shift(-1)} aria-label="Previous">
            <ChevronLeft className="w-4 h-4 rtl:rotate-180" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setCursor(new Date())}>
            {isAr ? 'اليوم' : 'Today'}
          </Button>
          <Button variant="outline" size="icon" onClick={() => shift(1)} aria-label="Next">
            <ChevronRight className="w-4 h-4 rtl:rotate-180" />
          </Button>
        </div>
        <div className="text-base font-semibold capitalize">
          {titleFmt.format(view === 'week' ? days[0] : cursor)}
          {view === 'week' && <> – {new Intl.DateTimeFormat(isAr ? 'ar' : 'en', { day: 'numeric', month: 'short' }).format(days[6])}</>}
        </div>
      </div>

      <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden border">
        {days.slice(0, 7).map((d) => (
          <div key={'h' + d.toISOString()} className="bg-muted/40 text-center text-xs font-medium py-2 text-muted-foreground">
            {weekdayFmt.format(d)}
          </div>
        ))}
        {days.map((d) => {
          const k = dayKey(d);
          const items = byDay.get(k) || [];
          const isToday = sameDay(d, new Date());
          const isOtherMonth = view === 'month' && d.getMonth() !== cursor.getMonth();
          return (
            <div
              key={k}
              onDragOver={(e) => { e.preventDefault(); setDragOver(k); }}
              onDragLeave={() => setDragOver((curr) => (curr === k ? null : curr))}
              onDrop={(e) => handleDrop(e, d)}
              className={cn(
                'bg-background p-1.5 transition-colors',
                view === 'week' ? 'min-h-[260px]' : 'min-h-[110px]',
                isOtherMonth && 'bg-muted/20 text-muted-foreground',
                dragOver === k && 'bg-primary/10 ring-2 ring-primary/40 ring-inset'
              )}
            >
              <div className={cn('text-xs font-medium mb-1 flex items-center justify-end', isToday && 'text-primary')}>
                <span className={cn('inline-flex items-center justify-center w-5 h-5 rounded-full', isToday && 'bg-primary text-primary-foreground')}>
                  {d.getDate()}
                </span>
              </div>
              <div className="space-y-1">
                {items
                  .sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at))
                  .map((a) => {
                    const t = new Date(a.scheduled_at);
                    return (
                      <button
                        key={a.id}
                        draggable
                        onDragStart={(e) => e.dataTransfer.setData('text/plain', a.id)}
                        onClick={() => onSelect(a)}
                        className="w-full text-start text-xs bg-muted/50 hover:bg-muted rounded px-1.5 py-1 truncate flex items-center gap-1 cursor-grab active:cursor-grabbing"
                        title={`${a.patient?.full_name || ''} · ${a.doctor_name || ''} · ${a.status}`}
                      >
                        <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', STATUS_DOT[a.status] || 'bg-gray-400')} />
                        <span className="font-medium tabular-nums">
                          {t.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span className="truncate text-muted-foreground">{a.patient?.full_name}</span>
                      </button>
                    );
                  })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
