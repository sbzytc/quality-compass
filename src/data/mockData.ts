import { Branch, CategoryScore, NonConformity, CorrectiveAction, getScoreLevel } from '@/types';

// Mock category names for restaurant evaluations
const categoryNames = [
  'Building Condition',
  'Customer Area',
  'Overall Appearance',
  'Cashier Area',
  'Food Quality',
  'Administration',
  'Dining Hall',
  'Kitchen & Back Area',
  'Storage & Receiving',
  'Delivery Vehicles',
];

function generateCategoryScores(): CategoryScore[] {
  return categoryNames.map((name, index) => {
    const percentage = Math.floor(Math.random() * 40) + 60; // 60-100
    return {
      id: `cat-${index + 1}`,
      name,
      score: Math.floor((percentage / 100) * 100),
      maxScore: 100,
      percentage,
      status: getScoreLevel(percentage),
      criteriaCount: Math.floor(Math.random() * 10) + 5,
      failedCriteria: percentage < 80 ? Math.floor(Math.random() * 3) + 1 : 0,
    };
  });
}

function calculateOverallScore(categories: CategoryScore[]): number {
  const total = categories.reduce((sum, cat) => sum + cat.percentage, 0);
  return Math.round(total / categories.length);
}

// Generate mock branches
export const mockBranches: Branch[] = [
  { id: '1', name: 'Downtown Central', region: 'Central', city: 'Riyadh' },
  { id: '2', name: 'Mall of Arabia', region: 'West', city: 'Jeddah' },
  { id: '3', name: 'King Fahd Road', region: 'Central', city: 'Riyadh' },
  { id: '4', name: 'Corniche Plaza', region: 'East', city: 'Dammam' },
  { id: '5', name: 'Al Nakheel Mall', region: 'Central', city: 'Riyadh' },
  { id: '6', name: 'Red Sea Mall', region: 'West', city: 'Jeddah' },
  { id: '7', name: 'Panorama Mall', region: 'Central', city: 'Riyadh' },
  { id: '8', name: 'Dhahran Mall', region: 'East', city: 'Dhahran' },
  { id: '9', name: 'Granada Center', region: 'Central', city: 'Riyadh' },
  { id: '10', name: 'Al Rashid Mall', region: 'East', city: 'Khobar' },
  { id: '11', name: 'Hayat Mall', region: 'Central', city: 'Riyadh' },
  { id: '12', name: 'Al Andalus Mall', region: 'West', city: 'Jeddah' },
].map(branch => {
  const categoryScores = generateCategoryScores();
  const overallScore = calculateOverallScore(categoryScores);
  return {
    ...branch,
    categoryScores,
    overallScore,
    status: getScoreLevel(overallScore),
    lastEvaluationDate: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
  };
});

// Mock non-conformities
export const mockNonConformities: NonConformity[] = [
  {
    id: 'nc-1',
    criterionId: 'crit-1',
    criterionName: 'Floor Cleanliness',
    categoryName: 'Customer Area',
    branchId: '1',
    branchName: 'Downtown Central',
    evaluationId: 'eval-1',
    score: 2,
    maxScore: 5,
    assessorNotes: 'Visible stains near entrance. Floor needs deep cleaning.',
    attachments: [],
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'open',
  },
  {
    id: 'nc-2',
    criterionId: 'crit-2',
    criterionName: 'Food Temperature',
    categoryName: 'Food Quality',
    branchId: '1',
    branchName: 'Downtown Central',
    evaluationId: 'eval-1',
    score: 1,
    maxScore: 5,
    assessorNotes: 'Hot food measured at 52°C, below required 63°C minimum.',
    attachments: [],
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'in_progress',
  },
  {
    id: 'nc-3',
    criterionId: 'crit-3',
    criterionName: 'Staff Uniforms',
    categoryName: 'Overall Appearance',
    branchId: '3',
    branchName: 'King Fahd Road',
    evaluationId: 'eval-2',
    score: 3,
    maxScore: 5,
    assessorNotes: 'Two staff members missing name badges.',
    attachments: [],
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'open',
  },
];

// Mock corrective actions
export const mockCorrectiveActions: CorrectiveAction[] = [
  {
    id: 'ca-1',
    nonConformityId: 'nc-1',
    description: 'Schedule deep cleaning service for entrance area',
    owner: 'Ahmed Hassan',
    dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    priority: 'high',
    status: 'in_progress',
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'ca-2',
    nonConformityId: 'nc-2',
    description: 'Calibrate hot holding equipment and train staff on temperature monitoring',
    owner: 'Fatima Al-Rashid',
    dueDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
    priority: 'critical',
    status: 'pending',
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'ca-3',
    nonConformityId: 'nc-3',
    description: 'Order replacement name badges and conduct uniform compliance briefing',
    owner: 'Mohammed Saleh',
    dueDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    priority: 'medium',
    status: 'overdue',
    createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

// Summary stats
export const summaryStats = {
  totalBranches: mockBranches.length,
  excellentBranches: mockBranches.filter(b => b.status === 'excellent').length,
  goodBranches: mockBranches.filter(b => b.status === 'good').length,
  averageBranches: mockBranches.filter(b => b.status === 'average').length,
  weakBranches: mockBranches.filter(b => b.status === 'weak').length,
  criticalBranches: mockBranches.filter(b => b.status === 'critical').length,
  averageScore: Math.round(mockBranches.reduce((sum, b) => sum + b.overallScore, 0) / mockBranches.length),
  openFindings: mockNonConformities.filter(nc => nc.status === 'open').length,
  overdueActions: mockCorrectiveActions.filter(ca => ca.status === 'overdue').length,
};
