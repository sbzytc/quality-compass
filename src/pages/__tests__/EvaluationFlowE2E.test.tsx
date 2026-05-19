import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React, { useMemo, useState } from 'react';

// ---------------- Supabase mock (hierarchy fixture) ----------------
const tableResponses: Record<string, any> = {};
function makeBuilder(table: string) {
  const resolve = () => Promise.resolve(tableResponses[table] ?? { data: [], error: null });
  const builder: any = {};
  builder.select = vi.fn(() => builder);
  builder.eq = vi.fn(() => builder);
  builder.in = vi.fn(() => builder);
  builder.limit = vi.fn(() => builder);
  builder.order = vi.fn(() => builder);
  builder.maybeSingle = vi.fn(() => resolve());
  builder.then = (onF: any, onR: any) => resolve().then(onF, onR);
  builder.catch = (onR: any) => resolve().catch(onR);
  return builder;
}
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: vi.fn((t: string) => makeBuilder(t)) },
}));

import { useTemplateHierarchy } from '@/hooks/useTemplateHierarchy';

// Mini flow component mirroring EvaluationForm's branch → domain → frequency → questions logic.
function EvaluationFlow({ branches }: { branches: { id: string; nameAr: string }[] }) {
  const { data: hierarchy, isLoading } = useTemplateHierarchy();
  const [branchId, setBranchId] = useState<string | null>(null);
  const [domainId, setDomainId] = useState<string | null>(null);
  const [frequencyId, setFrequencyId] = useState<string | null>(null);

  const domain = useMemo(() => hierarchy?.domains.find(d => d.id === domainId) || null, [hierarchy, domainId]);
  const frequency = useMemo(() => domain?.frequencies.find(f => f.id === frequencyId) || null, [domain, frequencyId]);

  // Same synthesis as EvaluationForm.tsx
  const categories = useMemo(() => {
    if (!domain || !frequency) return null;
    const arLabel: any = { critical: 'حرجة', high: 'عالية', medium: 'متوسطة', low: 'منخفضة' };
    return frequency.priorities.map(p => ({
      id: p.id,
      nameAr: `${domain.nameAr || domain.name} — ${arLabel[p.priorityLevel]}`,
      criteria: p.criteria.map(c => ({ ...c, priorityLevel: p.priorityLevel, frequencyType: frequency.frequencyType })),
    }));
  }, [domain, frequency]);

  if (isLoading) return <div>loading</div>;

  if (!branchId) {
    return (
      <div>
        <h2>اختر الفرع</h2>
        {branches.map(b => (
          <button key={b.id} onClick={() => setBranchId(b.id)}>{b.nameAr}</button>
        ))}
      </div>
    );
  }
  if (!domainId) {
    return (
      <div>
        <h2>اختر المجال</h2>
        {hierarchy?.domains.map(d => (
          <button key={d.id} onClick={() => setDomainId(d.id)}>{d.nameAr || d.name}</button>
        ))}
      </div>
    );
  }
  if (!frequencyId) {
    return (
      <div>
        <h2>اختر التكرار</h2>
        {domain?.frequencies.map(f => (
          <button key={f.id} onClick={() => setFrequencyId(f.id)}>{f.frequencyType}</button>
        ))}
      </div>
    );
  }

  const arPrio: any = { critical: 'حرجة', high: 'عالية', medium: 'متوسطة', low: 'منخفضة' };
  const arFreq: any = { daily: 'يومي', weekly: 'أسبوعي', monthly: 'شهري', quarterly: 'ربعي', semi_annual: 'نصف سنوي', yearly: 'سنوي' };

  return (
    <div>
      <h2 data-testid="questions-header">الأسئلة</h2>
      {categories?.map(cat => (
        <section key={cat.id} data-testid={`cat-${cat.id}`}>
          <h3>{cat.nameAr}</h3>
          {cat.criteria.map((c: any) => (
            <div key={c.id} data-testid={`q-${c.id}`}>
              <span data-testid={`q-${c.id}-name`}>{c.nameAr}</span>
              {c.isCritical ? (
                <span data-testid={`q-${c.id}-critical`}>حرج</span>
              ) : (
                <span data-testid={`q-${c.id}-priority`}>{arPrio[c.priorityLevel]}</span>
              )}
              <span data-testid={`q-${c.id}-freq`}>{arFreq[c.frequencyType]}</span>
              {c.violationValue != null && (
                <span data-testid={`q-${c.id}-violation`}>قيمة المخالفة: {c.violationValue} ر.س</span>
              )}
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

// ---------------- Fixture ----------------
function seed() {
  tableResponses['evaluation_templates'] = {
    data: { id: 't1', name: 'Food', name_ar: 'الأغذية', description: null, version: '1.0' },
    error: null,
  };
  tableResponses['template_domains'] = {
    data: [
      { id: 'd1', template_id: 't1', name: 'Hygiene', name_ar: 'النظافة الشخصية', sort_order: 1 },
      { id: 'd2', template_id: 't1', name: 'Licensing', name_ar: 'التراخيص', sort_order: 2 },
    ],
    error: null,
  };
  tableResponses['template_frequencies'] = {
    data: [
      { id: 'f1', domain_id: 'd1', frequency_type: 'daily', sort_order: 1 },
      { id: 'f2', domain_id: 'd1', frequency_type: 'monthly', sort_order: 2 },
      { id: 'f3', domain_id: 'd2', frequency_type: 'yearly', sort_order: 1 },
    ],
    error: null,
  };
  tableResponses['template_priorities'] = {
    data: [
      { id: 'p1', frequency_id: 'f1', priority_level: 'critical', weight: 50, sort_order: 1 },
      { id: 'p2', frequency_id: 'f1', priority_level: 'high', weight: 30, sort_order: 2 },
      { id: 'p3', frequency_id: 'f1', priority_level: 'low', weight: 5, sort_order: 4 },
      { id: 'p4', frequency_id: 'f2', priority_level: 'medium', weight: 15, sort_order: 3 },
    ],
    error: null,
  };
  tableResponses['template_criteria'] = {
    data: [
      { id: 'c1', priority_id: 'p1', name: 'Wash hands', name_ar: 'غسل اليدين', description: null, max_score: 5, weight: 1, is_critical: true, sort_order: 1, violation_value: 500 },
      { id: 'c2', priority_id: 'p2', name: 'Hair net', name_ar: 'شبكة الشعر', description: null, max_score: 5, weight: 1, is_critical: false, sort_order: 2, violation_value: 200 },
      { id: 'c3', priority_id: 'p3', name: 'Uniform color', name_ar: 'لون الزي', description: null, max_score: 5, weight: 1, is_critical: false, sort_order: 3, violation_value: null },
      { id: 'c4', priority_id: 'p4', name: 'Monthly audit', name_ar: 'مراجعة شهرية', description: null, max_score: 5, weight: 1, is_critical: false, sort_order: 1, violation_value: 100 },
    ],
    error: null,
  };
}

describe('E2E: New Evaluation flow (Branch → Domain → Frequency → Questions)', () => {
  beforeEach(() => {
    for (const k of Object.keys(tableResponses)) delete tableResponses[k];
    seed();
  });

  it('walks the full flow and renders questions with correct priority + violation badges', async () => {
    render(<EvaluationFlow branches={[{ id: 'b1', nameAr: 'فرع الرياض' }]} />, { wrapper });

    // Step 1: Branch
    await waitFor(() => expect(screen.getByText('اختر الفرع')).toBeInTheDocument());
    fireEvent.click(screen.getByText('فرع الرياض'));

    // Step 2: Domain (must list both domains from hierarchy)
    await waitFor(() => expect(screen.getByText('اختر المجال')).toBeInTheDocument());
    expect(screen.getByText('النظافة الشخصية')).toBeInTheDocument();
    expect(screen.getByText('التراخيص')).toBeInTheDocument();
    fireEvent.click(screen.getByText('النظافة الشخصية'));

    // Step 3: Frequency — only frequencies of selected domain (daily + monthly, NOT yearly)
    await waitFor(() => expect(screen.getByText('اختر التكرار')).toBeInTheDocument());
    expect(screen.getByText('daily')).toBeInTheDocument();
    expect(screen.getByText('monthly')).toBeInTheDocument();
    expect(screen.queryByText('yearly')).toBeNull();
    fireEvent.click(screen.getByText('daily'));

    // Step 4: Questions — only daily-priority questions, with correct badges
    await waitFor(() => expect(screen.getByTestId('questions-header')).toBeInTheDocument());

    // c1: critical + daily + violation 500
    expect(screen.getByTestId('q-c1-name')).toHaveTextContent('غسل اليدين');
    expect(screen.getByTestId('q-c1-critical')).toHaveTextContent('حرج');
    expect(screen.getByTestId('q-c1-freq')).toHaveTextContent('يومي');
    expect(screen.getByTestId('q-c1-violation')).toHaveTextContent('500');

    // c2: high + daily + violation 200 (no critical badge)
    expect(screen.getByTestId('q-c2-priority')).toHaveTextContent('عالية');
    expect(screen.getByTestId('q-c2-freq')).toHaveTextContent('يومي');
    expect(screen.getByTestId('q-c2-violation')).toHaveTextContent('200');

    // c3: low + daily + NO violation badge
    expect(screen.getByTestId('q-c3-priority')).toHaveTextContent('منخفضة');
    expect(screen.getByTestId('q-c3-freq')).toHaveTextContent('يومي');
    expect(screen.queryByTestId('q-c3-violation')).toBeNull();

    // c4 belongs to monthly frequency — must NOT appear under daily
    expect(screen.queryByTestId('q-c4')).toBeNull();
  });

  it('shows only the selected frequency\'s questions when the user picks monthly instead', async () => {
    render(<EvaluationFlow branches={[{ id: 'b1', nameAr: 'فرع جدة' }]} />, { wrapper });
    await waitFor(() => screen.getByText('اختر الفرع'));
    fireEvent.click(screen.getByText('فرع جدة'));
    await waitFor(() => screen.getByText('اختر المجال'));
    fireEvent.click(screen.getByText('النظافة الشخصية'));
    await waitFor(() => screen.getByText('اختر التكرار'));
    fireEvent.click(screen.getByText('monthly'));

    await waitFor(() => expect(screen.getByTestId('q-c4-name')).toBeInTheDocument());
    expect(screen.getByTestId('q-c4-priority')).toHaveTextContent('متوسطة');
    expect(screen.getByTestId('q-c4-freq')).toHaveTextContent('شهري');
    expect(screen.getByTestId('q-c4-violation')).toHaveTextContent('100');
    // Daily questions must NOT appear
    expect(screen.queryByTestId('q-c1')).toBeNull();
    expect(screen.queryByTestId('q-c2')).toBeNull();
  });
});