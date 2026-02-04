import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Calendar, User, MapPin, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import { QualityCircle } from '@/components/QualityCircle';
import { CategoryProgressBar } from '@/components/CategoryProgressBar';
import { StatusBadge, ActionStatusBadge, PriorityBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { mockBranches, mockNonConformities, mockCorrectiveActions } from '@/data/mockData';
import { format } from 'date-fns';

export default function BranchDetail() {
  const { branchId } = useParams();
  const navigate = useNavigate();

  const branch = mockBranches.find((b) => b.id === branchId);
  const findings = mockNonConformities.filter((nc) => nc.branchId === branchId);
  const actions = mockCorrectiveActions.filter((ca) =>
    findings.some((f) => f.id === ca.nonConformityId)
  );

  if (!branch) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <h2 className="text-xl font-semibold text-foreground">Branch not found</h2>
        <Button onClick={() => navigate('/')} className="mt-4">
          Back to Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
        <div className="flex items-start gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate(-1)}
            className="mt-1"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">{branch.name}</h1>
            <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                {branch.city}, {branch.region}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                Last evaluation: {format(new Date(branch.lastEvaluationDate), 'MMM d, yyyy')}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <QualityCircle
            score={branch.overallScore}
            status={branch.status}
            size="xl"
            showLabel
          />
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <AlertTriangle className="w-4 h-4" />
            <span className="text-sm">Open Findings</span>
          </div>
          <p className="text-2xl font-bold text-foreground mt-1">
            {findings.filter((f) => f.status === 'open').length}
          </p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="w-4 h-4" />
            <span className="text-sm">In Progress</span>
          </div>
          <p className="text-2xl font-bold text-foreground mt-1">
            {findings.filter((f) => f.status === 'in_progress').length}
          </p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <CheckCircle2 className="w-4 h-4" />
            <span className="text-sm">Resolved</span>
          </div>
          <p className="text-2xl font-bold text-foreground mt-1">
            {findings.filter((f) => f.status === 'resolved').length}
          </p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center gap-2 text-score-critical">
            <AlertTriangle className="w-4 h-4" />
            <span className="text-sm">Overdue Actions</span>
          </div>
          <p className="text-2xl font-bold text-score-critical mt-1">
            {actions.filter((a) => a.status === 'overdue').length}
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Category Scores */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-xl border border-border p-6"
        >
          <h2 className="text-lg font-semibold text-foreground mb-6">Category Breakdown</h2>
          <div className="space-y-5">
            {branch.categoryScores.map((category) => (
              <CategoryProgressBar
                key={category.id}
                name={category.name}
                percentage={category.percentage}
                status={category.status}
                failedCriteria={category.failedCriteria}
              />
            ))}
          </div>
        </motion.div>

        {/* Findings List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-card rounded-xl border border-border p-6"
        >
          <h2 className="text-lg font-semibold text-foreground mb-6">Recent Findings</h2>
          {findings.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-score-excellent" />
              <p>No findings for this branch</p>
            </div>
          ) : (
            <div className="space-y-4">
              {findings.map((finding) => (
                <div
                  key={finding.id}
                  className="p-4 rounded-lg bg-muted/30 border border-border"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-medium text-foreground">
                        {finding.criterionName}
                      </h3>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {finding.categoryName}
                      </p>
                    </div>
                    <StatusBadge
                      status={
                        finding.score <= 2
                          ? 'critical'
                          : finding.score <= 3
                          ? 'weak'
                          : 'average'
                      }
                      size="sm"
                    />
                  </div>
                  <p className="text-sm text-muted-foreground mt-3">
                    {finding.assessorNotes}
                  </p>
                  <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      Assessor
                    </span>
                    <span>
                      Score: {finding.score}/{finding.maxScore}
                    </span>
                    <span>{format(new Date(finding.createdAt), 'MMM d')}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>

      {/* Corrective Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-card rounded-xl border border-border overflow-hidden"
      >
        <div className="p-6 border-b border-border flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Corrective Actions</h2>
          <Button size="sm">Add Action</Button>
        </div>
        {actions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No corrective actions recorded</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-6 py-3 text-sm font-medium text-muted-foreground">
                    Action
                  </th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-muted-foreground">
                    Owner
                  </th>
                  <th className="text-center px-6 py-3 text-sm font-medium text-muted-foreground">
                    Priority
                  </th>
                  <th className="text-center px-6 py-3 text-sm font-medium text-muted-foreground">
                    Status
                  </th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-muted-foreground">
                    Due Date
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {actions.map((action) => (
                  <tr key={action.id} className="hover:bg-muted/30">
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-foreground line-clamp-2">
                        {action.description}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-muted-foreground">{action.owner}</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <PriorityBadge priority={action.priority} size="sm" />
                    </td>
                    <td className="px-6 py-4 text-center">
                      <ActionStatusBadge status={action.status} size="sm" />
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`text-sm ${
                          action.status === 'overdue'
                            ? 'text-score-critical font-medium'
                            : 'text-muted-foreground'
                        }`}
                      >
                        {format(new Date(action.dueDate), 'MMM d, yyyy')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>
    </div>
  );
}
