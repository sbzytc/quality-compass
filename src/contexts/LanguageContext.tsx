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
    'nav.branches': 'Branches',
    'nav.evaluations': 'Evaluations',
    'nav.findings': 'Findings',
    'nav.users': 'Users',
    'nav.templates': 'Templates',
    'nav.settings': 'Settings',
    
    // Dashboard
    'dashboard.title': 'Executive Dashboard',
    'dashboard.subtitle': 'Overview of branch quality performance',
    'dashboard.totalBranches': 'Total Branches',
    'dashboard.averageScore': 'Average Score',
    'dashboard.openFindings': 'Open Findings',
    'dashboard.overdueActions': 'Overdue Actions',
    
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
  },
  ar: {
    // Navigation
    'nav.dashboard': 'لوحة التحكم',
    'nav.branches': 'الفروع',
    'nav.evaluations': 'التقييمات',
    'nav.findings': 'الملاحظات',
    'nav.users': 'المستخدمين',
    'nav.templates': 'القوالب',
    'nav.settings': 'الإعدادات',
    
    // Dashboard
    'dashboard.title': 'لوحة التحكم التنفيذية',
    'dashboard.subtitle': 'نظرة عامة على أداء جودة الفروع',
    'dashboard.totalBranches': 'إجمالي الفروع',
    'dashboard.averageScore': 'متوسط النقاط',
    'dashboard.openFindings': 'الملاحظات المفتوحة',
    'dashboard.overdueActions': 'الإجراءات المتأخرة',
    
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
