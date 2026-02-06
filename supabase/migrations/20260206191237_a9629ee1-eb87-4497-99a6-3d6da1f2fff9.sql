-- Regions table
CREATE TABLE public.regions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  name_ar TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Branches table
CREATE TABLE public.branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  name_ar TEXT,
  region_id UUID REFERENCES public.regions(id),
  city TEXT,
  address TEXT,
  manager_id UUID,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Evaluation Templates
CREATE TABLE public.evaluation_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  name_ar TEXT,
  description TEXT,
  version TEXT NOT NULL DEFAULT '1.0',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Template Categories
CREATE TABLE public.template_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.evaluation_templates(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  name_ar TEXT,
  weight DECIMAL(5,2) NOT NULL DEFAULT 1.0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Template Criteria
CREATE TABLE public.template_criteria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES public.template_categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  name_ar TEXT,
  description TEXT,
  max_score INTEGER NOT NULL DEFAULT 5,
  weight DECIMAL(5,2) NOT NULL DEFAULT 1.0,
  is_critical BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Evaluations
CREATE TABLE public.evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL REFERENCES public.branches(id),
  template_id UUID NOT NULL REFERENCES public.evaluation_templates(id),
  assessor_id UUID NOT NULL,
  overall_score DECIMAL(5,2),
  overall_percentage DECIMAL(5,2),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved')),
  notes TEXT,
  submitted_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  approved_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Evaluation Category Scores
CREATE TABLE public.evaluation_category_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evaluation_id UUID NOT NULL REFERENCES public.evaluations(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.template_categories(id),
  score DECIMAL(5,2) NOT NULL DEFAULT 0,
  max_score DECIMAL(5,2) NOT NULL,
  percentage DECIMAL(5,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Evaluation Criterion Scores
CREATE TABLE public.evaluation_criterion_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evaluation_id UUID NOT NULL REFERENCES public.evaluations(id) ON DELETE CASCADE,
  criterion_id UUID NOT NULL REFERENCES public.template_criteria(id),
  score INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  attachments TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Non-Conformities (Findings)
CREATE TABLE public.non_conformities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evaluation_id UUID NOT NULL REFERENCES public.evaluations(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES public.branches(id),
  criterion_id UUID NOT NULL REFERENCES public.template_criteria(id),
  score INTEGER NOT NULL,
  max_score INTEGER NOT NULL,
  assessor_notes TEXT,
  attachments TEXT[],
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved')),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Corrective Actions
CREATE TABLE public.corrective_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  non_conformity_id UUID NOT NULL REFERENCES public.non_conformities(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  owner_id UUID,
  due_date DATE,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'overdue')),
  evidence TEXT[],
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.regions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluation_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_criteria ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluation_category_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluation_criterion_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.non_conformities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.corrective_actions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for regions (read by all authenticated, write by admin)
CREATE POLICY "Authenticated users can view regions" ON public.regions
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage regions" ON public.regions
  FOR ALL USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for branches
CREATE POLICY "Authenticated users can view branches" ON public.branches
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage branches" ON public.branches
  FOR ALL USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Branch managers can update their branch" ON public.branches
  FOR UPDATE USING (
    has_role(auth.uid(), 'branch_manager') AND 
    manager_id = auth.uid()
  );

-- RLS Policies for templates (read by all, write by admin)
CREATE POLICY "Authenticated users can view templates" ON public.evaluation_templates
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage templates" ON public.evaluation_templates
  FOR ALL USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for template categories
CREATE POLICY "Authenticated users can view categories" ON public.template_categories
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage categories" ON public.template_categories
  FOR ALL USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for template criteria
CREATE POLICY "Authenticated users can view criteria" ON public.template_criteria
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage criteria" ON public.template_criteria
  FOR ALL USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for evaluations
CREATE POLICY "Users can view evaluations based on role" ON public.evaluations
  FOR SELECT TO authenticated USING (
    has_role(auth.uid(), 'admin') OR
    has_role(auth.uid(), 'executive') OR
    assessor_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.branches b 
      WHERE b.id = branch_id AND b.manager_id = auth.uid()
    )
  );

CREATE POLICY "Assessors can create evaluations" ON public.evaluations
  FOR INSERT TO authenticated WITH CHECK (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'assessor')
  );

CREATE POLICY "Assessors can update own evaluations" ON public.evaluations
  FOR UPDATE TO authenticated USING (
    has_role(auth.uid(), 'admin') OR 
    (assessor_id = auth.uid() AND status = 'draft')
  );

-- RLS for evaluation scores
CREATE POLICY "Users can view evaluation scores" ON public.evaluation_category_scores
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.evaluations e 
      WHERE e.id = evaluation_id AND (
        has_role(auth.uid(), 'admin') OR
        has_role(auth.uid(), 'executive') OR
        e.assessor_id = auth.uid() OR
        EXISTS (SELECT 1 FROM public.branches b WHERE b.id = e.branch_id AND b.manager_id = auth.uid())
      )
    )
  );

CREATE POLICY "Assessors can manage evaluation scores" ON public.evaluation_category_scores
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.evaluations e 
      WHERE e.id = evaluation_id AND (
        has_role(auth.uid(), 'admin') OR 
        (e.assessor_id = auth.uid() AND e.status = 'draft')
      )
    )
  );

CREATE POLICY "Users can view criterion scores" ON public.evaluation_criterion_scores
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.evaluations e 
      WHERE e.id = evaluation_id AND (
        has_role(auth.uid(), 'admin') OR
        has_role(auth.uid(), 'executive') OR
        e.assessor_id = auth.uid() OR
        EXISTS (SELECT 1 FROM public.branches b WHERE b.id = e.branch_id AND b.manager_id = auth.uid())
      )
    )
  );

CREATE POLICY "Assessors can manage criterion scores" ON public.evaluation_criterion_scores
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.evaluations e 
      WHERE e.id = evaluation_id AND (
        has_role(auth.uid(), 'admin') OR 
        (e.assessor_id = auth.uid() AND e.status = 'draft')
      )
    )
  );

-- RLS for non-conformities
CREATE POLICY "Users can view non-conformities" ON public.non_conformities
  FOR SELECT TO authenticated USING (
    has_role(auth.uid(), 'admin') OR
    has_role(auth.uid(), 'executive') OR
    EXISTS (SELECT 1 FROM public.evaluations e WHERE e.id = evaluation_id AND e.assessor_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.branches b WHERE b.id = branch_id AND b.manager_id = auth.uid())
  );

CREATE POLICY "Assessors can create non-conformities" ON public.non_conformities
  FOR INSERT TO authenticated WITH CHECK (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'assessor')
  );

CREATE POLICY "Users can update non-conformities" ON public.non_conformities
  FOR UPDATE TO authenticated USING (
    has_role(auth.uid(), 'admin') OR
    EXISTS (SELECT 1 FROM public.evaluations e WHERE e.id = evaluation_id AND e.assessor_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.branches b WHERE b.id = branch_id AND b.manager_id = auth.uid())
  );

-- RLS for corrective actions
CREATE POLICY "Users can view corrective actions" ON public.corrective_actions
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.non_conformities nc
      WHERE nc.id = non_conformity_id AND (
        has_role(auth.uid(), 'admin') OR
        has_role(auth.uid(), 'executive') OR
        EXISTS (SELECT 1 FROM public.evaluations e WHERE e.id = nc.evaluation_id AND e.assessor_id = auth.uid()) OR
        EXISTS (SELECT 1 FROM public.branches b WHERE b.id = nc.branch_id AND b.manager_id = auth.uid())
      )
    )
  );

CREATE POLICY "Users can manage corrective actions" ON public.corrective_actions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.non_conformities nc
      WHERE nc.id = non_conformity_id AND (
        has_role(auth.uid(), 'admin') OR
        owner_id = auth.uid() OR
        EXISTS (SELECT 1 FROM public.branches b WHERE b.id = nc.branch_id AND b.manager_id = auth.uid())
      )
    )
  );

-- Update triggers for updated_at
CREATE TRIGGER update_regions_updated_at BEFORE UPDATE ON public.regions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_branches_updated_at BEFORE UPDATE ON public.branches
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_templates_updated_at BEFORE UPDATE ON public.evaluation_templates
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_evaluations_updated_at BEFORE UPDATE ON public.evaluations
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_non_conformities_updated_at BEFORE UPDATE ON public.non_conformities
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_corrective_actions_updated_at BEFORE UPDATE ON public.corrective_actions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Indexes for performance
CREATE INDEX idx_branches_region ON public.branches(region_id);
CREATE INDEX idx_branches_manager ON public.branches(manager_id);
CREATE INDEX idx_evaluations_branch ON public.evaluations(branch_id);
CREATE INDEX idx_evaluations_assessor ON public.evaluations(assessor_id);
CREATE INDEX idx_evaluations_status ON public.evaluations(status);
CREATE INDEX idx_non_conformities_branch ON public.non_conformities(branch_id);
CREATE INDEX idx_non_conformities_status ON public.non_conformities(status);
CREATE INDEX idx_corrective_actions_status ON public.corrective_actions(status);