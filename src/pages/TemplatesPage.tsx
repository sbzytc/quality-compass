import { useState } from 'react';
import { motion } from 'framer-motion';
import { FileText, Plus, CheckCircle2, ChevronRight, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';

interface TemplateCriterion {
  id: string;
  name: string;
  description: string;
  maxScore: number;
  weight: number;
  isCritical: boolean;
}

interface TemplateCategory {
  id: string;
  name: string;
  weight: number;
  criteria: TemplateCriterion[];
}

interface Template {
  id: string;
  name: string;
  version: string;
  categories: TemplateCategory[];
  isActive: boolean;
  lastUpdated: string;
}

const mockTemplates: Template[] = [
  {
    id: '1',
    name: 'Restaurant Evaluation',
    version: 'v1.0',
    isActive: true,
    lastUpdated: '2026-01-15',
    categories: [
      {
        id: 'cat-1',
        name: 'Building Condition',
        weight: 10,
        criteria: [
          { id: 'c1', name: 'Exterior Signage', description: 'Brand signage is clean, illuminated, and undamaged', maxScore: 5, weight: 2, isCritical: false },
          { id: 'c2', name: 'Parking Area', description: 'Parking lot is clean, well-lit, and properly marked', maxScore: 5, weight: 2, isCritical: false },
          { id: 'c3', name: 'Building Exterior', description: 'Walls, windows, and doors are clean and in good repair', maxScore: 5, weight: 3, isCritical: false },
          { id: 'c4', name: 'Entrance Area', description: 'Entrance is clean, accessible, and welcoming', maxScore: 5, weight: 3, isCritical: false },
        ],
      },
      {
        id: 'cat-2',
        name: 'Customer Area',
        weight: 15,
        criteria: [
          { id: 'c5', name: 'Floor Cleanliness', description: 'Floors are clean, dry, and free of debris', maxScore: 5, weight: 3, isCritical: false },
          { id: 'c6', name: 'Table Condition', description: 'Tables are clean, stable, and undamaged', maxScore: 5, weight: 3, isCritical: false },
          { id: 'c7', name: 'Seating Condition', description: 'Chairs/booths are clean and in good repair', maxScore: 5, weight: 2, isCritical: false },
          { id: 'c8', name: 'Restroom Cleanliness', description: 'Restrooms are clean, stocked, and odor-free', maxScore: 5, weight: 4, isCritical: true },
          { id: 'c9', name: 'Air Quality', description: 'Temperature is comfortable, no unpleasant odors', maxScore: 5, weight: 3, isCritical: false },
        ],
      },
      {
        id: 'cat-3',
        name: 'Food Quality',
        weight: 25,
        criteria: [
          { id: 'c10', name: 'Food Temperature', description: 'Hot food ≥63°C, cold food ≤5°C', maxScore: 5, weight: 5, isCritical: true },
          { id: 'c11', name: 'Food Freshness', description: 'All items are fresh and within expiry', maxScore: 5, weight: 5, isCritical: true },
          { id: 'c12', name: 'Portion Accuracy', description: 'Portions match standard specifications', maxScore: 5, weight: 3, isCritical: false },
          { id: 'c13', name: 'Presentation', description: 'Food is presented according to brand standards', maxScore: 5, weight: 3, isCritical: false },
          { id: 'c14', name: 'Taste Quality', description: 'Food taste meets brand standards', maxScore: 5, weight: 4, isCritical: false },
        ],
      },
      {
        id: 'cat-4',
        name: 'Kitchen & Back Area',
        weight: 20,
        criteria: [
          { id: 'c15', name: 'Equipment Cleanliness', description: 'All cooking equipment is clean and sanitized', maxScore: 5, weight: 4, isCritical: true },
          { id: 'c16', name: 'Food Storage', description: 'FIFO system followed, proper labeling', maxScore: 5, weight: 4, isCritical: true },
          { id: 'c17', name: 'Waste Management', description: 'Waste bins are covered and emptied regularly', maxScore: 5, weight: 3, isCritical: false },
          { id: 'c18', name: 'Pest Control', description: 'No evidence of pests, traps in place', maxScore: 5, weight: 5, isCritical: true },
        ],
      },
      {
        id: 'cat-5',
        name: 'Staff & Service',
        weight: 15,
        criteria: [
          { id: 'c19', name: 'Uniform Standards', description: 'Staff in complete, clean uniform with name badge', maxScore: 5, weight: 3, isCritical: false },
          { id: 'c20', name: 'Personal Hygiene', description: 'Hair covered, nails trimmed, no jewelry', maxScore: 5, weight: 4, isCritical: true },
          { id: 'c21', name: 'Customer Service', description: 'Staff is friendly, attentive, and knowledgeable', maxScore: 5, weight: 4, isCritical: false },
          { id: 'c22', name: 'Order Accuracy', description: 'Orders are correct and complete', maxScore: 5, weight: 4, isCritical: false },
        ],
      },
      {
        id: 'cat-6',
        name: 'Administration',
        weight: 15,
        criteria: [
          { id: 'c23', name: 'Health Certificates', description: 'All required health certificates are current', maxScore: 5, weight: 5, isCritical: true },
          { id: 'c24', name: 'Training Records', description: 'Staff training records are up to date', maxScore: 5, weight: 3, isCritical: false },
          { id: 'c25', name: 'Temperature Logs', description: 'Daily temperature logs are maintained', maxScore: 5, weight: 4, isCritical: true },
          { id: 'c26', name: 'Incident Reports', description: 'Incident reporting system in place', maxScore: 5, weight: 3, isCritical: false },
        ],
      },
    ],
  },
  {
    id: '2',
    name: 'Factory Safety Audit',
    version: 'v1.0',
    isActive: false,
    lastUpdated: '2026-01-10',
    categories: [
      {
        id: 'cat-f1',
        name: 'Personal Protective Equipment',
        weight: 20,
        criteria: [
          { id: 'f1', name: 'PPE Availability', description: 'Required PPE is available for all workers', maxScore: 5, weight: 5, isCritical: true },
          { id: 'f2', name: 'PPE Condition', description: 'PPE is in good condition and properly maintained', maxScore: 5, weight: 4, isCritical: false },
          { id: 'f3', name: 'PPE Usage', description: 'Workers are using PPE correctly', maxScore: 5, weight: 5, isCritical: true },
        ],
      },
      {
        id: 'cat-f2',
        name: 'Emergency Preparedness',
        weight: 25,
        criteria: [
          { id: 'f4', name: 'Fire Extinguishers', description: 'Fire extinguishers are accessible and inspected', maxScore: 5, weight: 5, isCritical: true },
          { id: 'f5', name: 'Emergency Exits', description: 'Exits are clearly marked and unobstructed', maxScore: 5, weight: 5, isCritical: true },
          { id: 'f6', name: 'First Aid Kits', description: 'First aid kits are stocked and accessible', maxScore: 5, weight: 4, isCritical: false },
          { id: 'f7', name: 'Evacuation Plan', description: 'Evacuation plan is posted and understood', maxScore: 5, weight: 4, isCritical: false },
        ],
      },
      {
        id: 'cat-f3',
        name: 'Machine Safety',
        weight: 30,
        criteria: [
          { id: 'f8', name: 'Machine Guards', description: 'All machine guards are in place and functional', maxScore: 5, weight: 5, isCritical: true },
          { id: 'f9', name: 'Lockout/Tagout', description: 'LOTO procedures are followed correctly', maxScore: 5, weight: 5, isCritical: true },
          { id: 'f10', name: 'Machine Maintenance', description: 'Machines are properly maintained', maxScore: 5, weight: 4, isCritical: false },
        ],
      },
      {
        id: 'cat-f4',
        name: 'Housekeeping',
        weight: 15,
        criteria: [
          { id: 'f11', name: 'Floor Condition', description: 'Floors are clean, dry, and free of hazards', maxScore: 5, weight: 4, isCritical: false },
          { id: 'f12', name: 'Storage Organization', description: 'Materials are stored safely and organized', maxScore: 5, weight: 3, isCritical: false },
          { id: 'f13', name: 'Waste Disposal', description: 'Waste is disposed of properly', maxScore: 5, weight: 3, isCritical: false },
        ],
      },
      {
        id: 'cat-f5',
        name: 'Documentation',
        weight: 10,
        criteria: [
          { id: 'f14', name: 'Safety Training Records', description: 'Training records are current', maxScore: 5, weight: 3, isCritical: false },
          { id: 'f15', name: 'Incident Reports', description: 'Incidents are properly documented', maxScore: 5, weight: 4, isCritical: false },
        ],
      },
    ],
  },
  {
    id: '3',
    name: 'Hotel Quality Check',
    version: 'v1.0',
    isActive: false,
    lastUpdated: '2026-01-08',
    categories: [
      {
        id: 'cat-h1',
        name: 'Front Desk',
        weight: 15,
        criteria: [
          { id: 'h1', name: 'Staff Appearance', description: 'Staff is well-groomed and in proper uniform', maxScore: 5, weight: 3, isCritical: false },
          { id: 'h2', name: 'Check-in Process', description: 'Check-in is efficient and welcoming', maxScore: 5, weight: 4, isCritical: false },
          { id: 'h3', name: 'Problem Resolution', description: 'Issues are handled professionally', maxScore: 5, weight: 4, isCritical: false },
        ],
      },
      {
        id: 'cat-h2',
        name: 'Guest Rooms',
        weight: 30,
        criteria: [
          { id: 'h4', name: 'Bed Quality', description: 'Bed is properly made with clean linens', maxScore: 5, weight: 5, isCritical: false },
          { id: 'h5', name: 'Bathroom Cleanliness', description: 'Bathroom is spotless and well-stocked', maxScore: 5, weight: 5, isCritical: true },
          { id: 'h6', name: 'Room Amenities', description: 'All amenities are present and functional', maxScore: 5, weight: 4, isCritical: false },
          { id: 'h7', name: 'Air Quality', description: 'Room is fresh-smelling and well-ventilated', maxScore: 5, weight: 3, isCritical: false },
        ],
      },
      {
        id: 'cat-h3',
        name: 'Common Areas',
        weight: 20,
        criteria: [
          { id: 'h8', name: 'Lobby Cleanliness', description: 'Lobby is clean and well-maintained', maxScore: 5, weight: 4, isCritical: false },
          { id: 'h9', name: 'Elevator Condition', description: 'Elevators are clean and functional', maxScore: 5, weight: 3, isCritical: false },
          { id: 'h10', name: 'Pool/Gym', description: 'Facilities are clean and properly maintained', maxScore: 5, weight: 4, isCritical: false },
        ],
      },
      {
        id: 'cat-h4',
        name: 'Food & Beverage',
        weight: 20,
        criteria: [
          { id: 'h11', name: 'Restaurant Cleanliness', description: 'Dining areas are clean', maxScore: 5, weight: 4, isCritical: false },
          { id: 'h12', name: 'Food Quality', description: 'Food meets quality standards', maxScore: 5, weight: 5, isCritical: true },
          { id: 'h13', name: 'Service Quality', description: 'Service is prompt and professional', maxScore: 5, weight: 4, isCritical: false },
        ],
      },
      {
        id: 'cat-h5',
        name: 'Safety & Security',
        weight: 15,
        criteria: [
          { id: 'h14', name: 'Fire Safety', description: 'Fire safety equipment is in place', maxScore: 5, weight: 5, isCritical: true },
          { id: 'h15', name: 'Security Measures', description: 'Security protocols are followed', maxScore: 5, weight: 4, isCritical: false },
          { id: 'h16', name: 'Emergency Procedures', description: 'Staff knows emergency procedures', maxScore: 5, weight: 4, isCritical: false },
        ],
      },
    ],
  },
];

export default function TemplatesPage() {
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);

  const getTotalCriteria = (template: Template) => 
    template.categories.reduce((sum, cat) => sum + cat.criteria.length, 0);

  const getCriticalCount = (template: Template) =>
    template.categories.reduce((sum, cat) => 
      sum + cat.criteria.filter(c => c.isCritical).length, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Evaluation Templates</h1>
          <p className="text-muted-foreground mt-1">
            Manage evaluation templates for different industries
          </p>
        </div>
        <Button className="gap-2">
          <Plus className="w-4 h-4" />
          Create Template
        </Button>
      </div>

      {/* Templates Grid */}
      <motion.div
        initial="hidden"
        animate="visible"
        variants={{
          hidden: {},
          visible: { transition: { staggerChildren: 0.05 } },
        }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
      >
        {mockTemplates.map((template) => (
          <motion.div
            key={template.id}
            variants={{
              hidden: { opacity: 0, y: 20 },
              visible: { opacity: 1, y: 0 },
            }}
            whileHover={{ y: -4 }}
            onClick={() => setSelectedTemplate(template)}
            className="bg-card rounded-xl border border-border p-6 cursor-pointer hover:shadow-lg hover:border-primary/30 transition-all"
          >
            <div className="flex items-start justify-between">
              <div className="p-3 rounded-xl bg-primary/10">
                <FileText className="w-6 h-6 text-primary" />
              </div>
              {template.isActive && (
                <span className="flex items-center gap-1 px-2 py-1 text-xs font-medium bg-score-excellent/10 text-score-excellent rounded-full">
                  <CheckCircle2 className="w-3 h-3" />
                  Active
                </span>
              )}
            </div>

            <div className="flex items-center justify-between mt-4">
              <div>
                <h3 className="font-semibold text-foreground">{template.name}</h3>
                <p className="text-sm text-muted-foreground mt-1">Version {template.version}</p>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </div>

            <div className="flex gap-4 mt-4 pt-4 border-t border-border">
              <div>
                <p className="text-2xl font-bold text-foreground">{template.categories.length}</p>
                <p className="text-xs text-muted-foreground">Categories</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{getTotalCriteria(template)}</p>
                <p className="text-xs text-muted-foreground">Criteria</p>
              </div>
            </div>

            <p className="text-xs text-muted-foreground mt-4">
              Last updated: {template.lastUpdated}
            </p>
          </motion.div>
        ))}
      </motion.div>

      {/* Template Detail Sheet */}
      <Sheet open={!!selectedTemplate} onOpenChange={(open) => !open && setSelectedTemplate(null)}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          {selectedTemplate && (
            <>
              <SheetHeader className="pb-4 border-b border-border">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-primary/10">
                    <FileText className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <SheetTitle className="text-xl">{selectedTemplate.name}</SheetTitle>
                    <p className="text-sm text-muted-foreground">
                      Version {selectedTemplate.version} • {selectedTemplate.categories.length} categories • {getTotalCriteria(selectedTemplate)} criteria
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  {selectedTemplate.isActive && (
                    <Badge variant="outline" className="bg-score-excellent/10 text-score-excellent border-score-excellent/30">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Active Template
                    </Badge>
                  )}
                  <Badge variant="outline" className="bg-score-critical/10 text-score-critical border-score-critical/30">
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    {getCriticalCount(selectedTemplate)} Critical Criteria
                  </Badge>
                </div>
              </SheetHeader>

              <div className="py-4">
                <h3 className="font-semibold text-foreground mb-3">Categories & Criteria</h3>
                <Accordion type="multiple" className="space-y-2">
                  {selectedTemplate.categories.map((category) => (
                    <AccordionItem
                      key={category.id}
                      value={category.id}
                      className="border border-border rounded-lg px-4 data-[state=open]:bg-muted/30"
                    >
                      <AccordionTrigger className="hover:no-underline py-3">
                        <div className="flex items-center justify-between w-full pr-2">
                          <span className="font-medium text-foreground">{category.name}</span>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="text-xs">
                              {category.criteria.length} criteria
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {category.weight}%
                            </Badge>
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-2 pb-2">
                          {category.criteria.map((criterion) => (
                            <div
                              key={criterion.id}
                              className={`p-3 rounded-lg border ${
                                criterion.isCritical
                                  ? 'border-score-critical/30 bg-score-critical/5'
                                  : 'border-border bg-background'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium text-sm text-foreground">
                                      {criterion.name}
                                    </span>
                                    {criterion.isCritical && (
                                      <Badge variant="destructive" className="text-xs py-0">
                                        Critical
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {criterion.description}
                                  </p>
                                </div>
                                <div className="text-right shrink-0">
                                  <p className="text-sm font-semibold text-foreground">
                                    0-{criterion.maxScore}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    Weight: {criterion.weight}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
