import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, Filter, Building2, MapPin, Calendar } from 'lucide-react';
import { QualityCircle } from '@/components/QualityCircle';
import { StatusBadge } from '@/components/StatusBadge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { mockBranches } from '@/data/mockData';
import { format } from 'date-fns';
import { ScoreLevel } from '@/types';

export default function BranchesList() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ScoreLevel | 'all'>('all');

  const filteredBranches = mockBranches.filter((branch) => {
    const matchesSearch =
      branch.name.toLowerCase().includes(search.toLowerCase()) ||
      branch.city.toLowerCase().includes(search.toLowerCase()) ||
      branch.region.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || branch.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const statusOptions: { value: ScoreLevel | 'all'; label: string }[] = [
    { value: 'all', label: 'All Status' },
    { value: 'excellent', label: 'Excellent' },
    { value: 'good', label: 'Good' },
    { value: 'average', label: 'Average' },
    { value: 'weak', label: 'Weak' },
    { value: 'critical', label: 'Critical' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Branches</h1>
        <p className="text-muted-foreground mt-1">
          Manage and monitor all branch locations
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search branches..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {statusOptions.map((option) => (
            <Button
              key={option.value}
              variant={statusFilter === option.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter(option.value)}
              className="text-sm"
            >
              {option.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Results count */}
      <p className="text-sm text-muted-foreground">
        Showing {filteredBranches.length} of {mockBranches.length} branches
      </p>

      {/* Branch Grid */}
      <motion.div
        initial="hidden"
        animate="visible"
        variants={{
          hidden: {},
          visible: {
            transition: { staggerChildren: 0.03 },
          },
        }}
        className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
      >
        {filteredBranches.map((branch) => (
          <motion.div
            key={branch.id}
            variants={{
              hidden: { opacity: 0, y: 20 },
              visible: { opacity: 1, y: 0 },
            }}
            whileHover={{ y: -4 }}
            onClick={() => navigate(`/branches/${branch.id}`)}
            className="bg-card rounded-xl border border-border p-6 cursor-pointer hover:shadow-lg transition-shadow"
          >
            <div className="flex items-start gap-4">
              <QualityCircle
                score={branch.overallScore}
                status={branch.status}
                size="md"
                animate={false}
              />
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-foreground truncate">{branch.name}</h3>
                <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                  <MapPin className="w-3 h-3" />
                  <span>
                    {branch.city}, {branch.region}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                  <Calendar className="w-3 h-3" />
                  <span>{format(new Date(branch.lastEvaluationDate), 'MMM d, yyyy')}</span>
                </div>
                <StatusBadge status={branch.status} size="sm" className="mt-3" />
              </div>
            </div>

            {/* Category preview */}
            <div className="mt-4 pt-4 border-t border-border">
              <div className="flex gap-1">
                {branch.categoryScores.slice(0, 10).map((cat) => (
                  <div
                    key={cat.id}
                    title={`${cat.name}: ${cat.percentage}%`}
                    className={`h-2 flex-1 rounded-full ${
                      cat.status === 'excellent'
                        ? 'bg-score-excellent'
                        : cat.status === 'good'
                        ? 'bg-score-good'
                        : cat.status === 'average'
                        ? 'bg-score-average'
                        : cat.status === 'weak'
                        ? 'bg-score-weak'
                        : 'bg-score-critical'
                    }`}
                  />
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {branch.categoryScores.filter((c) => c.failedCriteria > 0).length} categories with issues
              </p>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {filteredBranches.length === 0 && (
        <div className="text-center py-12">
          <Building2 className="w-12 h-12 mx-auto text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-medium text-foreground">No branches found</h3>
          <p className="text-muted-foreground mt-1">Try adjusting your search or filters</p>
        </div>
      )}
    </div>
  );
}
