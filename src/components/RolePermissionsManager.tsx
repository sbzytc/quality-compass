import { useState } from 'react';
import { Shield, Check, X, Save, Pencil } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from 'sonner';

type RoleKey = 'admin' | 'executive' | 'branch_manager' | 'assessor' | 'operations' | 'branch_employee';

interface Permission {
  key: string;
  label: string;
  labelAr: string;
  category: string;
  categoryAr: string;
}

const PERMISSIONS: Permission[] = [
  // Dashboards
  { key: 'dashboard_ceo', label: 'CEO / GM Dashboard', labelAr: 'لوحة المدير العام', category: 'Dashboards', categoryAr: 'لوحات التحكم' },
  { key: 'dashboard_branch', label: 'Branch Manager Dashboard', labelAr: 'لوحة مدير الفرع', category: 'Dashboards', categoryAr: 'لوحات التحكم' },
  { key: 'dashboard_auditor', label: 'Quality Auditor Dashboard', labelAr: 'لوحة المراجع', category: 'Dashboards', categoryAr: 'لوحات التحكم' },
  { key: 'dashboard_operations', label: 'Operations Dashboard', labelAr: 'لوحة العمليات', category: 'Dashboards', categoryAr: 'لوحات التحكم' },
  // Branches
  { key: 'branches_view', label: 'View Branches', labelAr: 'عرض الفروع', category: 'Branches', categoryAr: 'الفروع' },
  { key: 'branches_create', label: 'Create Branches', labelAr: 'إنشاء الفروع', category: 'Branches', categoryAr: 'الفروع' },
  { key: 'branches_edit', label: 'Edit Branches', labelAr: 'تعديل الفروع', category: 'Branches', categoryAr: 'الفروع' },
  { key: 'branches_delete', label: 'Delete Branches', labelAr: 'حذف الفروع', category: 'Branches', categoryAr: 'الفروع' },
  // Evaluations
  { key: 'evaluations_view', label: 'View Evaluations', labelAr: 'عرض التقييمات', category: 'Evaluations', categoryAr: 'التقييمات' },
  { key: 'evaluations_create', label: 'Create Evaluations', labelAr: 'إنشاء التقييمات', category: 'Evaluations', categoryAr: 'التقييمات' },
  { key: 'evaluations_edit_own', label: 'Edit Own Evaluations', labelAr: 'تعديل تقييماتي', category: 'Evaluations', categoryAr: 'التقييمات' },
  { key: 'evaluations_edit_all', label: 'Edit All Evaluations', labelAr: 'تعديل جميع التقييمات', category: 'Evaluations', categoryAr: 'التقييمات' },
  { key: 'evaluations_delete', label: 'Delete Evaluations', labelAr: 'حذف التقييمات', category: 'Evaluations', categoryAr: 'التقييمات' },
  // Templates
  { key: 'templates_view', label: 'View Templates', labelAr: 'عرض القوالب', category: 'Templates', categoryAr: 'القوالب' },
  { key: 'templates_manage', label: 'Manage Templates', labelAr: 'إدارة القوالب', category: 'Templates', categoryAr: 'القوالب' },
  // Users
  { key: 'users_view', label: 'View Users', labelAr: 'عرض المستخدمين', category: 'Users', categoryAr: 'المستخدمون' },
  { key: 'users_manage', label: 'Manage Users', labelAr: 'إدارة المستخدمين', category: 'Users', categoryAr: 'المستخدمون' },
  // Findings
  { key: 'findings_view', label: 'View Findings', labelAr: 'عرض الملاحظات', category: 'Findings', categoryAr: 'الملاحظات' },
  { key: 'findings_manage', label: 'Manage Findings', labelAr: 'إدارة الملاحظات', category: 'Findings', categoryAr: 'الملاحظات' },
  // Regions
  { key: 'regions_view', label: 'View Regions', labelAr: 'عرض المناطق', category: 'Regions', categoryAr: 'المناطق' },
  { key: 'regions_manage', label: 'Manage Regions', labelAr: 'إدارة المناطق', category: 'Regions', categoryAr: 'المناطق' },
  // Settings
  { key: 'settings_profile', label: 'Profile Settings', labelAr: 'إعدادات الملف الشخصي', category: 'Settings', categoryAr: 'الإعدادات' },
  { key: 'settings_system', label: 'System Settings', labelAr: 'إعدادات النظام', category: 'Settings', categoryAr: 'الإعدادات' },
  // Score Analysis
  { key: 'score_analysis', label: 'Score Analysis', labelAr: 'تحليل النتائج', category: 'Analytics', categoryAr: 'التحليلات' },
];

const ROLES: { key: RoleKey; label: string; labelAr: string }[] = [
  { key: 'admin', label: 'Admin', labelAr: 'مسؤول النظام' },
  { key: 'executive', label: 'Executive (GM)', labelAr: 'المدير العام' },
  { key: 'branch_manager', label: 'Branch Manager', labelAr: 'مدير الفرع' },
  { key: 'assessor', label: 'Quality Auditor', labelAr: 'مراجع الجودة' },
  { key: 'operations', label: 'Operations', labelAr: 'فريق العمليات' },
  { key: 'branch_employee', label: 'Branch Employee', labelAr: 'موظف فرع' },
];

// Default permission matrix
const DEFAULT_PERMISSIONS: Record<RoleKey, string[]> = {
  admin: PERMISSIONS.map(p => p.key), // Admin has all
  executive: [
    'dashboard_ceo', 'branches_view', 'evaluations_view',
    'templates_view', 'findings_view', 'regions_view',
    'settings_profile', 'score_analysis',
  ],
  branch_manager: [
    'dashboard_branch', 'branches_view', 'evaluations_view',
    'findings_view', 'findings_manage', 'regions_view',
    'settings_profile',
  ],
  assessor: [
    'dashboard_auditor', 'branches_view', 'evaluations_view',
    'evaluations_create', 'evaluations_edit_own',
    'findings_view', 'findings_manage', 'templates_view',
    'settings_profile',
  ],
  operations: [
    'dashboard_operations', 'findings_view', 'settings_profile',
  ],
  branch_employee: [
    'dashboard_operations', 'findings_view', 'settings_profile',
  ],
};

export default function RolePermissionsManager() {
  const { direction } = useLanguage();
  const [editing, setEditing] = useState(false);
  const [permissions, setPermissions] = useState<Record<RoleKey, string[]>>(() => {
    const saved = localStorage.getItem('role_permissions');
    return saved ? JSON.parse(saved) : { ...DEFAULT_PERMISSIONS };
  });

  const togglePermission = (role: RoleKey, permKey: string) => {
    if (!editing || role === 'admin') return; // Admin always has all
    setPermissions(prev => {
      const current = prev[role];
      const updated = current.includes(permKey)
        ? current.filter(k => k !== permKey)
        : [...current, permKey];
      return { ...prev, [role]: updated };
    });
  };

  const handleSave = () => {
    localStorage.setItem('role_permissions', JSON.stringify(permissions));
    setEditing(false);
    toast.success(direction === 'rtl' ? 'تم حفظ الصلاحيات بنجاح' : 'Permissions saved successfully');
  };

  const handleCancel = () => {
    const saved = localStorage.getItem('role_permissions');
    setPermissions(saved ? JSON.parse(saved) : { ...DEFAULT_PERMISSIONS });
    setEditing(false);
  };

  const handleReset = () => {
    setPermissions({ ...DEFAULT_PERMISSIONS });
    localStorage.removeItem('role_permissions');
    setEditing(false);
    toast.success(direction === 'rtl' ? 'تم إعادة الصلاحيات للوضع الافتراضي' : 'Permissions reset to defaults');
  };

  // Group permissions by category
  const categories = PERMISSIONS.reduce<Record<string, Permission[]>>((acc, p) => {
    const cat = direction === 'rtl' ? p.categoryAr : p.category;
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(p);
    return acc;
  }, {});

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Shield className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle>{direction === 'rtl' ? 'صلاحيات الأدوار' : 'Role Permissions'}</CardTitle>
              <CardDescription>
                {direction === 'rtl' 
                  ? 'عرض وتعديل الصلاحيات لكل دور في النظام' 
                  : 'View and edit permissions for each role in the system'}
              </CardDescription>
            </div>
          </div>
          <div className="flex gap-2">
            {editing ? (
              <>
                <Button variant="outline" size="sm" onClick={handleCancel}>
                  <X className="w-4 h-4 me-1" />
                  {direction === 'rtl' ? 'إلغاء' : 'Cancel'}
                </Button>
                <Button variant="outline" size="sm" onClick={handleReset}>
                  {direction === 'rtl' ? 'إعادة تعيين' : 'Reset Defaults'}
                </Button>
                <Button size="sm" onClick={handleSave}>
                  <Save className="w-4 h-4 me-1" />
                  {direction === 'rtl' ? 'حفظ' : 'Save'}
                </Button>
              </>
            ) : (
              <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                <Pencil className="w-4 h-4 me-1" />
                {direction === 'rtl' ? 'تعديل' : 'Edit'}
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto -mx-6 px-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[200px] sticky start-0 bg-card z-10">
                  {direction === 'rtl' ? 'الصلاحية' : 'Permission'}
                </TableHead>
                {ROLES.map(role => (
                  <TableHead key={role.key} className="text-center min-w-[100px]">
                    <span className="text-xs font-semibold">
                      {direction === 'rtl' ? role.labelAr : role.label}
                    </span>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.entries(categories).map(([catName, perms]) => (
                <>
                  <TableRow key={`cat-${catName}`} className="bg-muted/50">
                    <TableCell colSpan={ROLES.length + 1} className="font-semibold text-sm text-primary">
                      {catName}
                    </TableCell>
                  </TableRow>
                  {perms.map(perm => (
                    <TableRow key={perm.key}>
                      <TableCell className="text-sm sticky start-0 bg-card z-10">
                        {direction === 'rtl' ? perm.labelAr : perm.label}
                      </TableCell>
                      {ROLES.map(role => {
                        const hasIt = permissions[role.key]?.includes(perm.key);
                        return (
                          <TableCell key={role.key} className="text-center">
                            {editing && role.key !== 'admin' ? (
                              <div className="flex justify-center">
                                <Switch
                                  checked={hasIt}
                                  onCheckedChange={() => togglePermission(role.key, perm.key)}
                                  className="scale-75"
                                />
                              </div>
                            ) : (
                              <div className="flex justify-center">
                                {hasIt ? (
                                  <Check className="w-4 h-4 text-primary" />
                                ) : (
                                  <X className="w-4 h-4 text-muted-foreground/30" />
                                )}
                              </div>
                            )}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                </>
              ))}
            </TableBody>
          </Table>
        </div>
        {editing && (
          <p className="text-xs text-muted-foreground mt-4">
            {direction === 'rtl' 
              ? '⚠️ صلاحيات المسؤول لا يمكن تعديلها. المسؤول يملك جميع الصلاحيات دائماً.'
              : '⚠️ Admin permissions cannot be modified. Admin always has full access.'}
          </p>
        )}
      </CardContent>
    </Card>
  );
}