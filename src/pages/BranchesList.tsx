import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, Building2, MapPin, Calendar, ArrowLeft } from 'lucide-react';
import { QualityCircle } from '@/components/QualityCircle';
import { StatusBadge } from '@/components/StatusBadge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useBranches } from '@/hooks/useBranches';
import { useLanguage } from '@/contexts/LanguageContext';
import { format } from 'date-fns';
import { ScoreLevel } from '@/types';

export default function BranchesList() {
  const navigate = useNavigate();
  const { t, language, direction } = useLanguage();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ScoreLevel | 'all'>('all');

  const { data: branches, isLoading } = useBranches();

  const filteredBranches = (branches || []).filter((branch) => {
    const matchesSearch =
      branch.name.toLowerCase().includes(search.toLowerCase()) ||
      branch.city.toLowerCase().includes(search.toLowerCase()) ||
      branch.region.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || branch.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const statusOptions: { value: ScoreLevel | 'all'; label: string }[] = [
    { value: 'all', label: t('branches.allStatuses') },
    { value: 'excellent', label: t('status.excellent') },
    { value: 'good', label: t('status.good') },
    { value: 'average', label: t('status.average') },
    { value: 'weak', label: t('status.weak') },
    { value: 'critical', label: t('status.critical') },
  ];

  return (
    <div className="space-y-6">
      {/* Header with Back Button */}
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
          <h1 className="text-3xl font-bold text-foreground">{t('branches.title')}</h1>
          <p className="text-muted-foreground mt-1">
            {t('branches.subtitle')}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={t('branches.search')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="ps-9"
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
        {language === 'ar'
          ? `عرض ${filteredBranches.length} من ${branches?.length || 0} فروع`
          : `Showing ${filteredBranches.length} of ${branches?.length || 0} branches`
        }
      </p>

      {/* Branch Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-xl" />
          ))}
        </div>
      ) : filteredBranches.length > 0 ? (
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
                  <h3 className="font-semibold text-foreground truncate">
                    {language === 'ar' ? branch.nameAr || branch.name : branch.name}
                  </h3>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                    <MapPin className="w-3 h-3" />
                    <span>
                      {branch.city}, {branch.region}
                    </span>
                  </div>
                  {branch.lastEvaluationDate && (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                      <Calendar className="w-3 h-3" />
                      <span>{format(new Date(branch.lastEvaluationDate), 'MMM d, yyyy')}</span>
                    </div>
                  )}
                  <StatusBadge status={branch.status} size="sm" className="mt-3" />
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      ) : (
        <div className="text-center py-12">
          <Building2 className="w-12 h-12 mx-auto text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-medium text-foreground">
            {language === 'ar' ? 'لا توجد فروع' : 'No branches found'}
          </h3>
          <p className="text-muted-foreground mt-1">
            {language === 'ar' 
              ? 'حاول تعديل بحثك أو الفلاتر'
              : 'Try adjusting your search or filters'
            }
          </p>
        </div>
      )}
    </div>
  );
}
