import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Building2, TrendingUp, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import { QualityCircle } from '@/components/QualityCircle';
import { StatCard } from '@/components/StatCard';
import { StatusBadge } from '@/components/StatusBadge';
import { mockBranches, summaryStats } from '@/data/mockData';
import { format } from 'date-fns';

export default function ExecutiveDashboard() {
  const navigate = useNavigate();

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Executive Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Real-time quality monitoring across all branches
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="w-4 h-4" />
          Last updated: {format(new Date(), 'MMM d, yyyy h:mm a')}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Branches"
          value={summaryStats.totalBranches}
          subtitle="Active locations"
          icon={Building2}
        />
        <StatCard
          title="Average Score"
          value={`${summaryStats.averageScore}%`}
          subtitle="Across all branches"
          icon={TrendingUp}
          trend={{ value: 2.5, isPositive: true }}
          variant="good"
        />
        <StatCard
          title="Open Findings"
          value={summaryStats.openFindings}
          subtitle="Require attention"
          icon={AlertTriangle}
          variant={summaryStats.openFindings > 0 ? 'average' : 'excellent'}
        />
        <StatCard
          title="Overdue Actions"
          value={summaryStats.overdueActions}
          subtitle="Past due date"
          icon={CheckCircle2}
          variant={summaryStats.overdueActions > 0 ? 'critical' : 'excellent'}
        />
      </div>

      {/* Score Distribution */}
      <div className="glass-card p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">Score Distribution</h2>
        <div className="flex flex-wrap gap-4 justify-center md:justify-start">
          {[
            { label: 'Excellent', count: summaryStats.excellentBranches, status: 'excellent' as const },
            { label: 'Good', count: summaryStats.goodBranches, status: 'good' as const },
            { label: 'Average', count: summaryStats.averageBranches, status: 'average' as const },
            { label: 'Weak', count: summaryStats.weakBranches, status: 'weak' as const },
            { label: 'Critical', count: summaryStats.criticalBranches, status: 'critical' as const },
          ].map((item) => (
            <div
              key={item.status}
              className="flex items-center gap-3 px-4 py-3 rounded-lg bg-muted/50"
            >
              <div
                className={`w-4 h-4 rounded-full ${
                  item.status === 'excellent'
                    ? 'bg-score-excellent'
                    : item.status === 'good'
                    ? 'bg-score-good'
                    : item.status === 'average'
                    ? 'bg-score-average'
                    : item.status === 'weak'
                    ? 'bg-score-weak'
                    : 'bg-score-critical'
                }`}
              />
              <div>
                <p className="text-sm font-medium text-foreground">{item.label}</p>
                <p className="text-2xl font-bold text-foreground">{item.count}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Branch Circles Grid */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-foreground">All Branches</h2>
          <button
            onClick={() => navigate('/branches')}
            className="text-sm text-primary hover:underline"
          >
            View Details →
          </button>
        </div>
        <motion.div
          initial="hidden"
          animate="visible"
          variants={{
            hidden: {},
            visible: {
              transition: { staggerChildren: 0.05 },
            },
          }}
          className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6"
        >
          {mockBranches.map((branch, index) => (
            <motion.div
              key={branch.id}
              variants={{
                hidden: { opacity: 0, y: 20 },
                visible: { opacity: 1, y: 0 },
              }}
              className="flex flex-col items-center text-center"
            >
              <QualityCircle
                score={branch.overallScore}
                status={branch.status}
                size="lg"
                onClick={() => navigate(`/branches/${branch.id}`)}
              />
              <h3 className="mt-3 text-sm font-medium text-foreground line-clamp-1">
                {branch.name}
              </h3>
              <p className="text-xs text-muted-foreground">{branch.city}</p>
              <StatusBadge status={branch.status} size="sm" className="mt-2" />
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* Recent Evaluations Table */}
      <div className="glass-card overflow-hidden">
        <div className="p-6 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">Recent Evaluations</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-6 py-3 text-sm font-medium text-muted-foreground">
                  Branch
                </th>
                <th className="text-left px-6 py-3 text-sm font-medium text-muted-foreground">
                  Region
                </th>
                <th className="text-center px-6 py-3 text-sm font-medium text-muted-foreground">
                  Score
                </th>
                <th className="text-center px-6 py-3 text-sm font-medium text-muted-foreground">
                  Status
                </th>
                <th className="text-left px-6 py-3 text-sm font-medium text-muted-foreground">
                  Last Evaluation
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {mockBranches.slice(0, 5).map((branch) => (
                <tr
                  key={branch.id}
                  onClick={() => navigate(`/branches/${branch.id}`)}
                  className="hover:bg-muted/30 cursor-pointer transition-colors"
                >
                  <td className="px-6 py-4">
                    <div className="font-medium text-foreground">{branch.name}</div>
                    <div className="text-sm text-muted-foreground">{branch.city}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">{branch.region}</td>
                  <td className="px-6 py-4 text-center">
                    <span
                      className={`text-lg font-bold ${
                        branch.status === 'excellent'
                          ? 'text-score-excellent'
                          : branch.status === 'good'
                          ? 'text-score-good'
                          : branch.status === 'average'
                          ? 'text-score-average'
                          : branch.status === 'weak'
                          ? 'text-score-weak'
                          : 'text-score-critical'
                      }`}
                    >
                      {branch.overallScore}%
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <StatusBadge status={branch.status} size="sm" />
                  </td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">
                    {format(new Date(branch.lastEvaluationDate), 'MMM d, yyyy')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
