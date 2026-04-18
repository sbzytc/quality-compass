import { useMemo, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import type { Appointment } from '@/hooks/useAppointments';
import { ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react';
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
  view: 'day' | 'week' | 'month';
  onSelect: (a: Appointment) => void;
  onReschedule: (a: Appointment, newDate: Date) => void;
}

const DAY_START_HOUR = 8;
const DAY_END_HOUR = 20;
const SLOT_MINUTES = 30;
const SLOT_HEIGHT = 28; // px per 30-min slot

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

// Detect overlapping appointments (excluding cancelled/no_show)
function hasConflict(a: Appointment, all: Appointment[]) {
  if (a.status === 'cancelled' || a.status === 'no_show') return false;
  const aStart = new Date(a.scheduled_at).getTime();
  const aEnd = aStart + (a.duration_minutes || 30) * 60000;
  return all.some((b) => {
    if (b.id === a.id) return false;
    if (b.status === 'cancelled' || b.status === 'no_show') return false;
    const bStart = new Date(b.scheduled_at).getTime();
    const bEnd = bStart + (b.duration_minutes || 30) * 60000;
    return aStart < bEnd && bStart < aEnd;
  });
}

export function AppointmentsCalendar({ appointments, view, onSelect, onReschedule }: Props) {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const [cursor, setCursor] = useState(() => new Date());
  const [dragOver, setDragOver] = useState<string | null>(null);

  const days = useMemo(() => {
    if (view === 'day') {
      const x = new Date(cursor); x.setHours(0, 0, 0, 0);
      return [x];
    }
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
    ...(view !== 'month' ? { day: 'numeric' } : {}),
    ...(view === 'day' ? { weekday: 'long' } : {}),
  });

  const weekdayFmt = new Intl.DateTimeFormat(isAr ? 'ar' : 'en', { weekday: 'short' });

  function shift(delta: number) {
    const x = new Date(cursor);
    if (view === 'day') x.setDate(x.getDate() + delta);
    else if (view === 'week') x.setDate(x.getDate() + delta * 7);
    else x.setMonth(x.getMonth() + delta);
    setCursor(x);
  }

  function dayKey(d: Date) {
    return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  }

  function handleDropDay(e: React.DragEvent, day: Date) {
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

  function handleDropSlot(e: React.DragEvent, day: Date, hour: number, minute: number) {
    e.preventDefault();
    setDragOver(null);
    const id = e.dataTransfer.getData('text/plain');
    const appt = appointments.find((a) => a.id === id);
    if (!appt) return;
    const newDate = new Date(day);
    newDate.setHours(hour, minute, 0, 0);
    const original = new Date(appt.scheduled_at);
    if (newDate.getTime() === original.getTime()) return;
    onReschedule(appt, newDate);
  }

  // ============ DAY VIEW ============
  if (view === 'day') {
    const day = days[0];
    const dayItems = (byDay.get(dayKey(day)) || []).slice().sort((a, b) =>
      a.scheduled_at.localeCompare(b.scheduled_at)
    );
    const slots: { hour: number; minute: number }[] = [];
    for (let h = DAY_START_HOUR; h < DAY_END_HOUR; h++) {
      slots.push({ hour: h, minute: 0 });
      slots.push({ hour: h, minute: 30 });
    }

    const totalMinutes = (DAY_END_HOUR - DAY_START_HOUR) * 60;
    const conflictCount = dayItems.filter((a) => hasConflict(a, dayItems)).length;

    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
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
          <div className="text-base font-semibold capitalize">{titleFmt.format(day)}</div>
          {conflictCount > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-red-600 bg-red-50 dark:bg-red-950/30 px-2 py-1 rounded">
              <AlertTriangle className="w-3.5 h-3.5" />
              {isAr ? `${conflictCount} تعارض` : `${conflictCount} conflict${conflictCount > 1 ? 's' : ''}`}
            </div>
          )}
        </div>

        <div className="border rounded-lg overflow-hidden bg-background">
          <div className="grid" style={{ gridTemplateColumns: '64px 1fr' }}>
            {/* Time gutter */}
            <div className="border-e bg-muted/30">
              {slots.map((s, i) => (
                <div
                  key={i}
                  className="text-[10px] text-muted-foreground text-end pe-2 tabular-nums border-b"
                  style={{ height: SLOT_HEIGHT, lineHeight: `${SLOT_HEIGHT}px` }}
                >
                  {s.minute === 0 ? `${String(s.hour).padStart(2, '0')}:00` : ''}
                </div>
              ))}
            </div>

            {/* Slots column with absolute-positioned appointments */}
            <div className="relative">
              {slots.map((s, i) => {
                const slotKey = `${i}`;
                return (
                  <div
                    key={i}
                    onDragOver={(e) => { e.preventDefault(); setDragOver(slotKey); }}
                    onDragLeave={() => setDragOver((curr) => (curr === slotKey ? null : curr))}
                    onDrop={(e) => handleDropSlot(e, day, s.hour, s.minute)}
                    className={cn(
                      'border-b transition-colors',
                      s.minute === 0 ? 'border-border' : 'border-dashed border-border/60',
                      dragOver === slotKey && 'bg-primary/10'
                    )}
                    style={{ height: SLOT_HEIGHT }}
                  />
                );
              })}

              {/* Render appointments overlay */}
              {dayItems.map((a) => {
                const t = new Date(a.scheduled_at);
                const minutesFromStart = (t.getHours() - DAY_START_HOUR) * 60 + t.getMinutes();
                if (minutesFromStart < 0 || minutesFromStart >= totalMinutes) return null;
                const top = (minutesFromStart / SLOT_MINUTES) * SLOT_HEIGHT;
                const height = Math.max(
                  SLOT_HEIGHT - 2,
                  ((a.duration_minutes || 30) / SLOT_MINUTES) * SLOT_HEIGHT - 2
                );
                const conflict = hasConflict(a, dayItems);
                return (
                  <button
                    key={a.id}
                    draggable
                    onDragStart={(e) => e.dataTransfer.setData('text/plain', a.id)}
                    onClick={() => onSelect(a)}
                    className={cn(
                      'absolute start-1 end-1 rounded-md px-2 py-1 text-xs text-start shadow-sm border cursor-grab active:cursor-grabbing overflow-hidden transition-shadow hover:shadow-md',
                      conflict
                        ? 'bg-red-50 border-red-300 dark:bg-red-950/30 dark:border-red-800'
                        : 'bg-primary/5 border-primary/20'
                    )}
                    style={{ top, height }}
                    title={`${a.patient?.full_name || ''} · ${a.doctor_name || ''} · ${a.status}${conflict ? ' · CONFLICT' : ''}`}
                  >
                    <div className="flex items-center gap-1 font-medium tabular-nums">
                      <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', STATUS_DOT[a.status] || 'bg-gray-400')} />
                      {t.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      {conflict && <AlertTriangle className="w-3 h-3 text-red-600 ms-auto" />}
                    </div>
                    <div className="truncate text-muted-foreground">{a.patient?.full_name}</div>
                    {a.doctor_name && height > SLOT_HEIGHT * 1.5 && (
                      <div className="truncate text-[10px] text-muted-foreground">{a.doctor_name}</div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ============ WEEK / MONTH VIEW ============
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
              onDrop={(e) => handleDropDay(e, d)}
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
                    const conflict = hasConflict(a, items);
                    return (
                      <button
                        key={a.id}
                        draggable
                        onDragStart={(e) => e.dataTransfer.setData('text/plain', a.id)}
                        onClick={() => onSelect(a)}
                        className={cn(
                          'w-full text-start text-xs rounded px-1.5 py-1 truncate flex items-center gap-1 cursor-grab active:cursor-grabbing',
                          conflict ? 'bg-red-100 hover:bg-red-200 dark:bg-red-950/40' : 'bg-muted/50 hover:bg-muted'
                        )}
                        title={`${a.patient?.full_name || ''} · ${a.doctor_name || ''} · ${a.status}${conflict ? ' · CONFLICT' : ''}`}
                      >
                        <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', STATUS_DOT[a.status] || 'bg-gray-400')} />
                        <span className="font-medium tabular-nums">
                          {t.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span className="truncate text-muted-foreground">{a.patient?.full_name}</span>
                        {conflict && <AlertTriangle className="w-3 h-3 text-red-600 ms-auto shrink-0" />}
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
