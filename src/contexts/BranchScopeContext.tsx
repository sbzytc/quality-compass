import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useCurrentCompany } from '@/contexts/CurrentCompanyContext';
import { useBranches, BranchWithScore } from '@/hooks/useBranches';
import { useAccessibleBranchIds } from '@/hooks/useAccessibleBranchIds';

interface BranchScopeContextValue {
  /** Currently selected branch id — always a single branch when the user has any accessible branches. */
  selectedBranchId: string | null;
  setSelectedBranchId: (id: string | null) => void;
  /** Branches this user is allowed to view/switch between. */
  accessibleBranches: BranchWithScore[];
  /** True if the user can switch between more than one branch. */
  hasChoice: boolean;
  /** True when we know user has zero accessible branches. */
  isEmpty: boolean;
  loading: boolean;
}

const BranchScopeContext = createContext<BranchScopeContextValue | undefined>(undefined);

const STORAGE_KEY = 'rasdah.selectedBranchId';

export function BranchScopeProvider({ children }: { children: ReactNode }) {
  const { profile, isAdmin, isExecutive, roles, loading: authLoading } = useAuth();
  const { currentCompany } = useCurrentCompany();
  const { data: allBranches, isLoading: branchesLoading } = useBranches();
  const { branchIds: accessibleIds } = useAccessibleBranchIds();
  const isSuperAdmin = roles.includes('super_admin');
  const unrestricted = isAdmin || isExecutive || isSuperAdmin;

  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedBranchId, setSelectedBranchIdState] = useState<string | null>(() => {
    return searchParams.get('branch') || localStorage.getItem(STORAGE_KEY);
  });

  const accessibleBranches = useMemo<BranchWithScore[]>(() => {
    const active = (allBranches || []).filter(b => b.isActive);
    if (unrestricted) return active;
    if (accessibleIds === null) return active;
    return active.filter(b => accessibleIds.includes(b.id));
  }, [allBranches, accessibleIds, unrestricted]);

  // Auto-select a default branch when nothing is selected or selection is no longer valid.
  useEffect(() => {
    if (branchesLoading || authLoading) return;
    if (accessibleBranches.length === 0) return;
    const isValid = selectedBranchId && accessibleBranches.some(b => b.id === selectedBranchId);
    if (isValid) return;

    // Prefer profile.branch_id if it is accessible
    const preferred = profile?.branch_id && accessibleBranches.find(b => b.id === profile.branch_id);
    const next = preferred?.id ?? accessibleBranches[0].id;
    setSelectedBranchIdState(next);
  }, [accessibleBranches, selectedBranchId, profile?.branch_id, branchesLoading, authLoading]);

  // Reset selection when the workspace/company changes
  useEffect(() => {
    setSelectedBranchIdState(null);
  }, [currentCompany?.id]);

  const setSelectedBranchId = (id: string | null) => {
    setSelectedBranchIdState(id);
    if (id) {
      localStorage.setItem(STORAGE_KEY, id);
      const next = new URLSearchParams(searchParams);
      next.set('branch', id);
      setSearchParams(next, { replace: true });
    } else {
      localStorage.removeItem(STORAGE_KEY);
      const next = new URLSearchParams(searchParams);
      next.delete('branch');
      setSearchParams(next, { replace: true });
    }
  };

  const value: BranchScopeContextValue = {
    selectedBranchId,
    setSelectedBranchId,
    accessibleBranches,
    hasChoice: accessibleBranches.length > 1,
    isEmpty: !branchesLoading && accessibleBranches.length === 0,
    loading: branchesLoading || authLoading,
  };

  return <BranchScopeContext.Provider value={value}>{children}</BranchScopeContext.Provider>;
}

export function useBranchScope() {
  const ctx = useContext(BranchScopeContext);
  if (!ctx) throw new Error('useBranchScope must be used within BranchScopeProvider');
  return ctx;
}

/** Convenience: returns just the active branch id (or null). */
export function useScopedBranchId(): string | null {
  return useBranchScope().selectedBranchId;
}