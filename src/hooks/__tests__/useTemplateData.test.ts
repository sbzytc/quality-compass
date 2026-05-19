import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// ---- Mock supabase client BEFORE importing the hook ----
const tableResponses: Record<string, any> = {};

function makeBuilder(table: string) {
  const state: any = { table, filters: {} };
  const builder: any = {
    select: vi.fn(() => builder),
    eq: vi.fn((col: string, val: any) => { state.filters[col] = val; return builder; }),
    in: vi.fn((col: string, vals: any[]) => { state.filters[col] = vals; return builder; }),
    order: vi.fn(() => Promise.resolve(tableResponses[table] ?? { data: [], error: null })),
    maybeSingle: vi.fn(() => Promise.resolve(tableResponses[table] ?? { data: null, error: null })),
    then: (resolve: any) => Promise.resolve(tableResponses[table] ?? { data: [], error: null }).then(resolve),
  };
  return builder;
}

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn((table: string) => makeBuilder(table)),
  },
}));

import { useActiveTemplate } from '../useTemplateData';

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return React.createElement(QueryClientProvider, { client: qc }, children);
}

describe('useActiveTemplate – frequency + priority linkage', () => {
  beforeEach(() => {
    for (const k of Object.keys(tableResponses)) delete tableResponses[k];
  });

  it('maps frequencyType and priorityLevel onto criteria through priority_id → frequency_id', async () => {
    tableResponses.evaluation_templates = {
      data: { id: 't1', name: 'T', name_ar: 'ت', description: null, version: '1.0' },
      error: null,
    };
    tableResponses.template_categories = {
      data: [{ id: 'cat1', name: 'Cat', name_ar: 'فئة', weight: 100, sort_order: 0, template_id: 't1' }],
      error: null,
    };
    tableResponses.template_criteria = {
      data: [
        { id: 'cr1', category_id: 'cat1', priority_id: 'p1', name: 'Q1', name_ar: 'س1', description: null, max_score: 5, weight: 1, is_critical: false, sort_order: 0 },
        { id: 'cr2', category_id: 'cat1', priority_id: 'p2', name: 'Q2', name_ar: 'س2', description: null, max_score: 5, weight: 1, is_critical: true, sort_order: 1 },
        { id: 'cr3', category_id: 'cat1', priority_id: null, name: 'Q3', name_ar: 'س3', description: null, max_score: 5, weight: 1, is_critical: false, sort_order: 2 },
      ],
      error: null,
    };
    tableResponses.template_priorities = {
      data: [
        { id: 'p1', priority_level: 'high', frequency_id: 'f1' },
        { id: 'p2', priority_level: 'critical', frequency_id: 'f2' },
      ],
      error: null,
    };
    tableResponses.template_frequencies = {
      data: [
        { id: 'f1', frequency_type: 'monthly' },
        { id: 'f2', frequency_type: 'yearly' },
      ],
      error: null,
    };

    const { result } = renderHook(() => useActiveTemplate(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const criteria = result.current.data!.categories[0].criteria;
    expect(criteria).toHaveLength(3);

    const c1 = criteria.find(c => c.id === 'cr1')!;
    expect(c1.priorityLevel).toBe('high');
    expect(c1.frequencyType).toBe('monthly');

    const c2 = criteria.find(c => c.id === 'cr2')!;
    expect(c2.priorityLevel).toBe('critical');
    expect(c2.frequencyType).toBe('yearly');
    expect(c2.isCritical).toBe(true);

    const c3 = criteria.find(c => c.id === 'cr3')!;
    expect(c3.priorityLevel).toBeNull();
    expect(c3.frequencyType).toBeNull();
  });

  it('returns null criteria metadata when priority hierarchy is missing', async () => {
    tableResponses.evaluation_templates = {
      data: { id: 't1', name: 'T', name_ar: null, description: null, version: '1.0' },
      error: null,
    };
    tableResponses.template_categories = {
      data: [{ id: 'cat1', name: 'Cat', name_ar: null, weight: 100, sort_order: 0 }],
      error: null,
    };
    tableResponses.template_criteria = {
      data: [
        { id: 'cr1', category_id: 'cat1', priority_id: null, name: 'Q1', name_ar: null, description: null, max_score: 5, weight: 1, is_critical: false, sort_order: 0 },
      ],
      error: null,
    };

    const { result } = renderHook(() => useActiveTemplate(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const c = result.current.data!.categories[0].criteria[0];
    expect(c.priorityLevel).toBeNull();
    expect(c.frequencyType).toBeNull();
  });
});
