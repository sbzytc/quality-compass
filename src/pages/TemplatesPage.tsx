import { motion } from 'framer-motion';
import { FileText, Plus, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

const mockTemplates = [
  {
    id: '1',
    name: 'Restaurant Evaluation',
    version: 'v1.0',
    categories: 10,
    criteria: 45,
    isActive: true,
    lastUpdated: '2026-01-15',
  },
  {
    id: '2',
    name: 'Factory Safety Audit',
    version: 'v1.0',
    categories: 8,
    criteria: 32,
    isActive: false,
    lastUpdated: '2026-01-10',
  },
  {
    id: '3',
    name: 'Hotel Quality Check',
    version: 'v1.0',
    categories: 12,
    criteria: 52,
    isActive: false,
    lastUpdated: '2026-01-08',
  },
];

export default function TemplatesPage() {
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
            className="bg-card rounded-xl border border-border p-6 cursor-pointer hover:shadow-lg transition-shadow"
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

            <h3 className="font-semibold text-foreground mt-4">{template.name}</h3>
            <p className="text-sm text-muted-foreground mt-1">Version {template.version}</p>

            <div className="flex gap-4 mt-4 pt-4 border-t border-border">
              <div>
                <p className="text-2xl font-bold text-foreground">{template.categories}</p>
                <p className="text-xs text-muted-foreground">Categories</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{template.criteria}</p>
                <p className="text-xs text-muted-foreground">Criteria</p>
              </div>
            </div>

            <p className="text-xs text-muted-foreground mt-4">
              Last updated: {template.lastUpdated}
            </p>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
