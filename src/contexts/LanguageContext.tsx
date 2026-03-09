import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Language = 'en' | 'ar';
type Direction = 'ltr' | 'rtl';

interface LanguageContextType {
  language: Language;
  direction: Direction;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const translations: Record<Language, Record<string, string>> = {
  en: {
    // Navigation
    'nav.dashboard': 'Dashboard',
    'nav.dashboard.ceo': 'CEO / GM',
    'nav.dashboard.branchManager': 'Branch',
    'nav.dashboard.operations': 'Operations Team',
    'nav.dashboard.auditor': 'Quality Auditor',
    'nav.branches': 'Branches',
    'nav.evaluations': 'Evaluations',
    'nav.evaluations.new': 'New Evaluation',
    'nav.evaluations.previous': 'Previous Evaluations',
    'nav.evaluations.archived': 'Archived',
    'nav.findings': 'Findings',
    'nav.correctiveActions': 'Corrective Actions',
    'nav.reports': 'Reports',
    'nav.branchPerformance': 'Branch Performance',
    'nav.evaluations.weekly': 'Weekly Evaluation',
    'nav.evaluations.monthly': 'Monthly Evaluation',
    'nav.users': 'Users',
    'nav.templates': 'Templates',
    'nav.settings': 'Settings',
    
    // CEO Dashboard
    'dashboard.ceo.title': 'Executive Dashboard',
    'dashboard.ceo.subtitle': 'Real-time quality monitoring across all branches',
    'dashboard.scoreDistribution': 'Score Distribution',
    'dashboard.allBranches': 'All Branches',
    'dashboard.regionalSummary': 'Regional Summary',
    'dashboard.branchCount': 'Branches',
    'dashboard.avgScore': 'Avg Score',
    'dashboard.trend': 'Trend',
    
    // Branch Manager Dashboard
    'dashboard.branchManager.title': 'Branch Manager Dashboard',
    'dashboard.currentScore': 'Current Score',
    'dashboard.lastEvaluation': 'Last Evaluation',
    'dashboard.pendingActions': 'Pending Actions',
    'dashboard.actionItems': 'action items',
    'dashboard.completedThisMonth': 'Completed This Month',
    'dashboard.actionsCompleted': 'actions completed',
    'dashboard.teamMembers': 'Team Members',
    'dashboard.activeStaff': 'active staff',
    'dashboard.nextEvaluation': 'Next Evaluation',
    'dashboard.scheduled': 'scheduled',
    'dashboard.categoryBreakdown': 'Category Breakdown',
    'dashboard.scoreTrend': 'Score Trend',
    'dashboard.vsLastMonth': 'vs last month',
    'dashboard.consistentImprovement': 'Consistent improvement over the last 3 months',
    
    // Operations Dashboard
    'dashboard.operations.title': 'Operations Dashboard',
    'dashboard.operations.subtitle': 'Manage daily operations and compliance tasks',
    'dashboard.operations.openTasks': 'Open Tasks',
    'dashboard.operations.requiresAction': 'requires action',
    'dashboard.operations.completedToday': 'Completed Today',
    'dashboard.operations.tasksCompleted': 'tasks completed',
    'dashboard.operations.upcomingInspections': 'Upcoming Inspections',
    'dashboard.operations.thisMonth': 'this month',
    'dashboard.operations.openFindings': 'Open Findings',
    'dashboard.operations.fromLastAudit': 'from last audit',
    'dashboard.operations.taskList': 'Task List',
    'dashboard.operations.addTask': 'Add Task',
    
    // Auditor Dashboard
    'dashboard.auditor.title': 'Quality Auditor Dashboard',
    'dashboard.auditor.subtitle': 'Track your audits and findings',
    'dashboard.auditor.startNewAudit': 'Start New Audit',
    'dashboard.auditor.auditsThisMonth': 'Audits This Month',
    'dashboard.auditor.completed': 'completed',
    'dashboard.auditor.avgScoreGiven': 'Avg Score Given',
    'dashboard.auditor.thisMonth': 'this month',
    'dashboard.auditor.findingsRaised': 'Findings Raised',
    'dashboard.auditor.fromAllAudits': 'from all audits',
    'dashboard.auditor.scheduledAudits': 'Scheduled Audits',
    'dashboard.auditor.upcoming': 'upcoming',
    'dashboard.auditor.lastAuditResults': 'Last Audit Results',
    'dashboard.auditor.findingsFromLastAudit': 'Findings from Last Audit',
    'dashboard.auditor.recentAudits': 'Recent Audits',
    'dashboard.auditor.upcomingSchedule': 'Upcoming Schedule',
    
    // Shared Dashboard
    'dashboard.totalBranches': 'Total Branches',
    'dashboard.activeLocations': 'active locations',
    'dashboard.averageScore': 'Average Score',
    'dashboard.acrossAllBranches': 'across all branches',
    'dashboard.openFindings': 'Open Findings',
    'dashboard.requireAttention': 'require attention',
    'dashboard.overdueActions': 'Overdue Actions',
    'dashboard.pastDueDate': 'past due date',
    
    // Branches
    'branches.title': 'Branches',
    'branches.subtitle': 'Monitor quality scores across all branches',
    'branches.search': 'Search branches...',
    'branches.allStatuses': 'All Statuses',
    
    // Evaluations
    'evaluations.title': 'New Evaluation',
    'evaluations.selectBranch': 'Select Branch',
    'evaluations.selectTemplate': 'Select Template',
    'evaluations.start': 'Start Evaluation',
    'evaluations.submit': 'Submit Evaluation',
    'evaluations.saveDraft': 'Save Draft',
    'evaluations.previous.title': 'Previous Evaluations',
    'evaluations.previous.subtitle': 'View and manage all previous evaluations',
    
    // Templates
    'templates.title': 'Evaluation Templates',
    'templates.subtitle': 'Manage evaluation templates for different industries',
    'templates.create': 'Create Template',
    'templates.categories': 'Categories',
    'templates.criteria': 'Criteria',
    
    // Users
    'users.title': 'User Management',
    'users.subtitle': 'Manage users, roles, and access permissions',
    'users.invite': 'Invite User',
    'users.search': 'Search users...',
    'users.resetPassword': 'Reset Password',
    'users.deactivate': 'Deactivate User',
    'users.activate': 'Activate User',
    
    // Roles
    'role.admin': 'Admin',
    'role.executive': 'Executive',
    'role.branch_manager': 'Branch Manager',
    'role.assessor': 'Assessor',
    'role.branch_employee': 'Branch Employee',
    'role.support_agent': 'Support Agent',

    // Support
    'nav.support': 'Technical Support',
    'nav.support.dashboard': 'Support Dashboard',
    'nav.support.myTickets': 'My Tickets',
    'nav.support.archived': 'Archived Tickets',

    // AI Assistant
    'nav.assistant': 'AI Assistant',

    // Settings
    'settings.title': 'Settings',
    'settings.subtitle': 'Configure application settings',
    'settings.language': 'Language',
    'settings.languageDesc': 'Choose your preferred language',
    'settings.english': 'English',
    'settings.arabic': 'العربية',
    'settings.theme': 'Theme',
    'settings.themeDesc': 'Choose between light and dark mode',
    'settings.notifications': 'Notifications',
    'settings.notificationsDesc': 'Configure notification preferences',
    'settings.email': 'Email Notifications',
    'settings.push': 'Push Notifications',
    
    // Status
    'status.excellent': 'Excellent',
    'status.good': 'Good',
    'status.average': 'Average',
    'status.weak': 'Weak',
    'status.critical': 'Very Weak',
    'status.active': 'Active',
    'status.inactive': 'Inactive',
    'status.completed': 'Completed',
    'status.inProgress': 'In Progress',
    'status.pending': 'Pending',

    // Priorities
    'priority.low': 'Low',
    'priority.medium': 'Medium',
    'priority.high': 'High',
    'priority.critical': 'Critical',

    // Action status
    'action_status.pending': 'Pending',
    'action_status.in_progress': 'In Progress',
    'action_status.completed': 'Completed',
    'action_status.overdue': 'Overdue',

    // Auth
    'auth.signIn': 'Sign In',
    'auth.signOut': 'Sign Out',
    'auth.email': 'Email',
    'auth.password': 'Password',
    'auth.emailPlaceholder': 'Enter your email',
    'auth.passwordPlaceholder': 'Enter your password',
    'auth.loginTitle': 'Sign in to your account',
    'auth.loginSuccess': 'Login successful!',
    'auth.loginError': 'Login failed. Please check your credentials.',
    
    // Common
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
    'common.view': 'View',
    'common.search': 'Search',
    'common.filter': 'Filter',
    'common.all': 'All',
    'common.loading': 'Loading...',
    'common.noData': 'No data available',
    'common.lastUpdated': 'Last updated',
    'common.viewDetails': 'View Details',
    'common.viewAll': 'View All',
    'common.dueDate': 'Due Date',
    'common.region': 'Region',
    'common.task': 'Task',
    'common.assignee': 'Assignee',
    'common.status': 'Status',
    'common.findings': 'findings',
  },
  ar: {
    // Navigation
    'nav.dashboard': 'لوحة التحكم',
    'nav.dashboard.ceo': 'المدير التنفيذي',
    'nav.dashboard.branchManager': 'الفرع',
    'nav.dashboard.operations': 'فريق العمليات',
    'nav.dashboard.auditor': 'مراجع الجودة',
    'nav.branches': 'الفروع',
    'nav.evaluations': 'التقييمات',
    'nav.evaluations.new': 'تقييم جديد',
    'nav.evaluations.previous': 'التقييمات السابقة',
    'nav.evaluations.archived': 'الأرشيف',
    'nav.findings': 'الملاحظات',
    'nav.correctiveActions': 'الإجراءات التصحيحية',
    'nav.reports': 'التقارير',
    'nav.branchPerformance': 'أداء الفرع',
    'nav.evaluations.weekly': 'تقييم أسبوعي',
    'nav.evaluations.monthly': 'تقييم شهري',
    'nav.users': 'المستخدمين',
    'nav.templates': 'القوالب',
    'nav.settings': 'الإعدادات',
    
    // CEO Dashboard
    'dashboard.ceo.title': 'لوحة التحكم التنفيذية',
    'dashboard.ceo.subtitle': 'مراقبة الجودة في الوقت الفعلي عبر جميع الفروع',
    'dashboard.scoreDistribution': 'توزيع الدرجات',
    'dashboard.allBranches': 'جميع الفروع',
    'dashboard.regionalSummary': 'ملخص المناطق',
    'dashboard.branchCount': 'الفروع',
    'dashboard.avgScore': 'متوسط الدرجة',
    'dashboard.trend': 'الاتجاه',
    
    // Branch Manager Dashboard
    'dashboard.branchManager.title': 'لوحة تحكم مدير الفرع',
    'dashboard.currentScore': 'الدرجة الحالية',
    'dashboard.lastEvaluation': 'آخر تقييم',
    'dashboard.pendingActions': 'الإجراءات المعلقة',
    'dashboard.actionItems': 'عناصر العمل',
    'dashboard.completedThisMonth': 'المكتمل هذا الشهر',
    'dashboard.actionsCompleted': 'إجراءات مكتملة',
    'dashboard.teamMembers': 'أعضاء الفريق',
    'dashboard.activeStaff': 'موظفين نشطين',
    'dashboard.nextEvaluation': 'التقييم القادم',
    'dashboard.scheduled': 'مجدول',
    'dashboard.categoryBreakdown': 'تفصيل الفئات',
    'dashboard.scoreTrend': 'اتجاه الدرجات',
    'dashboard.vsLastMonth': 'مقارنة بالشهر الماضي',
    'dashboard.consistentImprovement': 'تحسن مستمر خلال الـ 3 أشهر الماضية',
    
    // Operations Dashboard
    'dashboard.operations.title': 'لوحة تحكم العمليات',
    'dashboard.operations.subtitle': 'إدارة العمليات اليومية ومهام الامتثال',
    'dashboard.operations.openTasks': 'المهام المفتوحة',
    'dashboard.operations.requiresAction': 'تتطلب إجراء',
    'dashboard.operations.completedToday': 'المكتمل اليوم',
    'dashboard.operations.tasksCompleted': 'مهام مكتملة',
    'dashboard.operations.upcomingInspections': 'التفتيشات القادمة',
    'dashboard.operations.thisMonth': 'هذا الشهر',
    'dashboard.operations.openFindings': 'الملاحظات المفتوحة',
    'dashboard.operations.fromLastAudit': 'من آخر مراجعة',
    'dashboard.operations.taskList': 'قائمة المهام',
    'dashboard.operations.addTask': 'إضافة مهمة',
    
    // Auditor Dashboard
    'dashboard.auditor.title': 'لوحة تحكم مراجع الجودة',
    'dashboard.auditor.subtitle': 'تتبع مراجعاتك وملاحظاتك',
    'dashboard.auditor.startNewAudit': 'بدء مراجعة جديدة',
    'dashboard.auditor.auditsThisMonth': 'المراجعات هذا الشهر',
    'dashboard.auditor.completed': 'مكتملة',
    'dashboard.auditor.avgScoreGiven': 'متوسط الدرجة المعطاة',
    'dashboard.auditor.thisMonth': 'هذا الشهر',
    'dashboard.auditor.findingsRaised': 'الملاحظات المرفوعة',
    'dashboard.auditor.fromAllAudits': 'من جميع المراجعات',
    'dashboard.auditor.scheduledAudits': 'المراجعات المجدولة',
    'dashboard.auditor.upcoming': 'قادمة',
    'dashboard.auditor.lastAuditResults': 'نتائج آخر مراجعة',
    'dashboard.auditor.findingsFromLastAudit': 'الملاحظات من آخر مراجعة',
    'dashboard.auditor.recentAudits': 'المراجعات الأخيرة',
    'dashboard.auditor.upcomingSchedule': 'الجدول القادم',
    
    // Shared Dashboard
    'dashboard.totalBranches': 'إجمالي الفروع',
    'dashboard.activeLocations': 'مواقع نشطة',
    'dashboard.averageScore': 'متوسط النقاط',
    'dashboard.acrossAllBranches': 'عبر جميع الفروع',
    'dashboard.openFindings': 'الملاحظات المفتوحة',
    'dashboard.requireAttention': 'تتطلب انتباه',
    'dashboard.overdueActions': 'الإجراءات المتأخرة',
    'dashboard.pastDueDate': 'تجاوزت الموعد',
    
    // Branches
    'branches.title': 'الفروع',
    'branches.subtitle': 'مراقبة درجات الجودة عبر جميع الفروع',
    'branches.search': 'البحث في الفروع...',
    'branches.allStatuses': 'جميع الحالات',
    
    // Evaluations
    'evaluations.title': 'تقييم جديد',
    'evaluations.selectBranch': 'اختر الفرع',
    'evaluations.selectTemplate': 'اختر القالب',
    'evaluations.start': 'بدء التقييم',
    'evaluations.submit': 'إرسال التقييم',
    'evaluations.saveDraft': 'حفظ كمسودة',
    'evaluations.previous.title': 'التقييمات السابقة',
    'evaluations.previous.subtitle': 'عرض وإدارة جميع التقييمات السابقة',
    
    // Templates
    'templates.title': 'قوالب التقييم',
    'templates.subtitle': 'إدارة قوالب التقييم للصناعات المختلفة',
    'templates.create': 'إنشاء قالب',
    'templates.categories': 'الفئات',
    'templates.criteria': 'المعايير',
    
    // Users
    'users.title': 'إدارة المستخدمين',
    'users.subtitle': 'إدارة المستخدمين والأدوار والصلاحيات',
    'users.invite': 'دعوة مستخدم',
    'users.search': 'البحث في المستخدمين...',
    'users.resetPassword': 'إعادة تعيين كلمة المرور',
    'users.deactivate': 'تعطيل المستخدم',
    'users.activate': 'تفعيل المستخدم',
    
    // Roles
    'role.admin': 'مدير النظام',
    'role.executive': 'تنفيذي',
    'role.branch_manager': 'مدير الفرع',
    'role.assessor': 'مقيّم',
    'role.branch_employee': 'موظف فرع',
    'role.support_agent': 'موظف دعم فني',

    // Support
    'nav.support': 'الدعم الفني',
    'nav.support.dashboard': 'لوحة تحكم الدعم',
    'nav.support.myTickets': 'تذاكري',
    'nav.support.archived': 'الأرشيف',

    // Settings
    'settings.title': 'الإعدادات',
    'settings.subtitle': 'تكوين إعدادات التطبيق',
    'settings.language': 'اللغة',
    'settings.languageDesc': 'اختر لغتك المفضلة',
    'settings.english': 'English',
    'settings.arabic': 'العربية',
    'settings.theme': 'المظهر',
    'settings.themeDesc': 'اختر بين الوضع الفاتح والداكن',
    'settings.notifications': 'الإشعارات',
    'settings.notificationsDesc': 'تكوين تفضيلات الإشعارات',
    'settings.email': 'إشعارات البريد الإلكتروني',
    'settings.push': 'إشعارات الدفع',
    
    // Status
    'status.excellent': 'ممتاز',
    'status.good': 'جيد',
    'status.average': 'متوسط',
    'status.weak': 'ضعيف',
    'status.critical': 'ضعيف جداً',
    'status.active': 'نشط',
    'status.inactive': 'غير نشط',
    'status.completed': 'مكتمل',
    'status.inProgress': 'قيد التنفيذ',
    'status.pending': 'معلق',

    // Priorities
    'priority.low': 'منخفض',
    'priority.medium': 'متوسط',
    'priority.high': 'مرتفع',
    'priority.critical': 'حرج',

    // Action status
    'action_status.pending': 'معلق',
    'action_status.in_progress': 'قيد التنفيذ',
    'action_status.completed': 'مكتمل',
    'action_status.overdue': 'متأخر',

    // Auth
    'auth.signIn': 'تسجيل الدخول',
    'auth.signOut': 'تسجيل الخروج',
    'auth.email': 'البريد الإلكتروني',
    'auth.password': 'كلمة المرور',
    'auth.emailPlaceholder': 'أدخل بريدك الإلكتروني',
    'auth.passwordPlaceholder': 'أدخل كلمة المرور',
    'auth.loginTitle': 'تسجيل الدخول إلى حسابك',
    'auth.loginSuccess': 'تم تسجيل الدخول بنجاح!',
    'auth.loginError': 'خطأ في تسجيل الدخول. يرجى التحقق من بياناتك.',
    
    // Common
    'common.save': 'حفظ',
    'common.cancel': 'إلغاء',
    'common.delete': 'حذف',
    'common.edit': 'تعديل',
    'common.view': 'عرض',
    'common.search': 'بحث',
    'common.filter': 'تصفية',
    'common.all': 'الكل',
    'common.loading': 'جاري التحميل...',
    'common.noData': 'لا توجد بيانات',
    'common.lastUpdated': 'آخر تحديث',
    'common.viewDetails': 'عرض التفاصيل',
    'common.viewAll': 'عرض الكل',
    'common.dueDate': 'تاريخ الاستحقاق',
    'common.region': 'المنطقة',
    'common.task': 'المهمة',
    'common.assignee': 'المسؤول',
    'common.status': 'الحالة',
    'common.findings': 'ملاحظات',
  },
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('sqcs-language');
    return (saved as Language) || 'en';
  });

  const direction: Direction = language === 'ar' ? 'rtl' : 'ltr';

  useEffect(() => {
    localStorage.setItem('sqcs-language', language);
    document.documentElement.setAttribute('dir', direction);
    document.documentElement.setAttribute('lang', language);
  }, [language, direction]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
  };

  const t = (key: string): string => {
    return translations[language][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, direction, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
