import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Users,
  Plus,
  Search,
  MoreHorizontal,
  Shield,
  Building,
  Mail,
  Key,
  UserX,
  UserCheck,
  Loader2,
  ArrowLeft,
  Send,
  UserPlus,
  Eye,
  EyeOff,
  Bot,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { useLanguage } from '@/contexts/LanguageContext';
import { getInitials } from '@/lib/getInitials';
import { useGoBack } from '@/hooks/useGoBack';
import {
  useUsers,
  useUserStats,
  useInviteUser,
  useCreateUser,
  useResetPassword,
  useResendInvitation,
  useUpdateUserStatus,
  useUpdateUserRole,
  useAssignBranch,
  useToggleAIAssistant,
  UserWithRole,
} from '@/hooks/useUsers';
import { AppRole, useAuth } from '@/contexts/AuthContext';
import { useBranches } from '@/hooks/useBranches';

const roleLabels: Record<AppRole, { en: string; ar: string }> = {
  admin: { en: 'Admin', ar: 'مدير النظام' },
  executive: { en: 'Executive', ar: 'تنفيذي' },
  branch_manager: { en: 'Branch Manager', ar: 'مدير الفرع' },
  assessor: { en: 'Assessor', ar: 'مقيّم' },
  branch_employee: { en: 'Branch Employee', ar: 'موظف فرع' },
  support_agent: { en: 'Support Agent', ar: 'موظف دعم فني' },
};

const roleColors: Record<AppRole, string> = {
  admin: 'bg-purple-500/10 text-purple-500 border-purple-500/30',
  executive: 'bg-blue-500/10 text-blue-500 border-blue-500/30',
  branch_manager: 'bg-amber-500/10 text-amber-500 border-amber-500/30',
  assessor: 'bg-green-500/10 text-green-500 border-green-500/30',
  branch_employee: 'bg-teal-500/10 text-teal-500 border-teal-500/30',
  support_agent: 'bg-primary/10 text-primary border-primary/30',
};

export default function UsersPage() {
  const navigate = useNavigate();
  const { roles, refreshProfile, user } = useAuth();
  const goBack = useGoBack('/dashboard/ceo');
  const { t, language } = useLanguage();
  const { data: users, isLoading } = useUsers();
  const { data: branches } = useBranches();
  const stats = useUserStats();
  const inviteUser = useInviteUser();
  const createUser = useCreateUser();
  const resetPassword = useResetPassword();
  const resendInvitation = useResendInvitation();
  const updateStatus = useUpdateUserStatus();
  const updateRole = useUpdateUserRole();
  const assignBranch = useAssignBranch();
  const toggleAIAssistant = useToggleAIAssistant();

  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<AppRole | 'all'>('all');
  const [isAddUserDialogOpen, setIsAddUserDialogOpen] = useState(false);
  const [addUserMode, setAddUserMode] = useState<'choose' | 'invite' | 'create'>('choose');
  const [isResetPasswordDialogOpen, setIsResetPasswordDialogOpen] = useState(false);
  const [resetMode, setResetMode] = useState<'choose' | 'email' | 'manual' | 'done'>('choose');
  const [manualPassword, setManualPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetResult, setResetResult] = useState<{ tempPassword?: string; emailSent?: boolean } | null>(null);
  const [selectedUser, setSelectedUser] = useState<UserWithRole | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isAssignBranchDialogOpen, setIsAssignBranchDialogOpen] = useState(false);
  const [assignBranchUser, setAssignBranchUser] = useState<UserWithRole | null>(null);
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [isChangeRoleDialogOpen, setIsChangeRoleDialogOpen] = useState(false);
  const [changeRoleUser, setChangeRoleUser] = useState<UserWithRole | null>(null);
  const [newRole, setNewRole] = useState<AppRole>('assessor');
  const isAdmin = roles.includes('admin');
  const [inviteForm, setInviteForm] = useState({
    email: '',
    fullName: '',
    role: 'assessor' as AppRole,
  });
  const [createForm, setCreateForm] = useState({
    email: '',
    fullName: '',
    password: '',
    confirmPassword: '',
    role: 'assessor' as AppRole,
    forcePasswordChange: true,
    branchId: '',
  });

  const filteredUsers = (users || []).filter((user) => {
    const matchesSearch =
      user.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'all' || user.roles.includes(roleFilter);
    return matchesSearch && matchesRole;
  });

  const getPrimaryRole = (user: UserWithRole): AppRole => {
    if (user.roles.includes('admin')) return 'admin';
    if (user.roles.includes('executive')) return 'executive';
    if (user.roles.includes('branch_manager')) return 'branch_manager';
    return 'assessor';
  };

  const handleInviteUser = async () => {
    try {
      await inviteUser.mutateAsync({
        email: inviteForm.email,
        fullName: inviteForm.fullName,
        role: inviteForm.role,
      });
      toast.success(
        language === 'ar' 
          ? `تم إرسال الدعوة إلى ${inviteForm.email}`
          : `Invitation sent to ${inviteForm.email}`
      );
      setIsAddUserDialogOpen(false);
      setAddUserMode('choose');
      setInviteForm({ email: '', fullName: '', role: 'assessor' });
    } catch (error) {
      toast.error(
        language === 'ar'
          ? 'فشل إرسال الدعوة'
          : 'Failed to send invitation'
      );
    }
  };

  const handleCreateUser = async () => {
    if (createForm.password !== createForm.confirmPassword) {
      toast.error(language === 'ar' ? 'كلمات المرور غير متطابقة' : 'Passwords do not match');
      return;
    }
    if (createForm.password.length < 6) {
      toast.error(language === 'ar' ? 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' : 'Password must be at least 6 characters');
      return;
    }
    try {
      await createUser.mutateAsync({
        email: createForm.email,
        fullName: createForm.fullName,
        password: createForm.password,
        role: createForm.role,
        forcePasswordChange: createForm.forcePasswordChange,
        branchId: createForm.role === 'branch_manager' ? createForm.branchId : undefined,
      });
      toast.success(
        language === 'ar'
          ? `تم إنشاء المستخدم ${createForm.fullName} بنجاح`
          : `User ${createForm.fullName} created successfully`
      );
      setIsAddUserDialogOpen(false);
      setAddUserMode('choose');
      setCreateForm({ email: '', fullName: '', password: '', confirmPassword: '', role: 'assessor', forcePasswordChange: true, branchId: '' });
    } catch (error) {
      toast.error(
        language === 'ar'
          ? 'فشل إنشاء المستخدم'
          : 'Failed to create user'
      );
    }
  };

  const handleResetViaEmail = async () => {
    if (!selectedUser) return;
    try {
      const result = await resetPassword.mutateAsync({ userId: selectedUser.user_id, email: selectedUser.email });
      setResetResult(result);
      setResetMode('done');
      toast.success(
        language === 'ar'
          ? result.emailSent ? `تم إرسال كلمة المرور الجديدة إلى ${selectedUser.email}` : 'تم إعادة تعيين كلمة المرور بنجاح'
          : result.emailSent ? `New password sent to ${selectedUser.email}` : 'Password reset successfully'
      );
    } catch (error) {
      toast.error(language === 'ar' ? 'فشل إعادة تعيين كلمة المرور' : 'Failed to reset password');
    }
  };

  const handleResetManual = async () => {
    if (!selectedUser) return;
    if (manualPassword !== confirmPassword) {
      toast.error(language === 'ar' ? 'كلمات المرور غير متطابقة' : 'Passwords do not match');
      return;
    }
    if (manualPassword.length < 6) {
      toast.error(language === 'ar' ? 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' : 'Password must be at least 6 characters');
      return;
    }
    try {
      await resetPassword.mutateAsync({ userId: selectedUser.user_id, email: selectedUser.email, customPassword: manualPassword });
      setResetMode('done');
      toast.success(language === 'ar' ? 'تم تعيين كلمة المرور بنجاح' : 'Password set successfully');
    } catch (error) {
      toast.error(language === 'ar' ? 'فشل تعيين كلمة المرور' : 'Failed to set password');
    }
  };

  const handleResendInvitation = async (user: UserWithRole) => {
    try {
      await resendInvitation.mutateAsync(user.user_id);
      toast.success(
        language === 'ar'
          ? `تم إعادة إرسال الدعوة إلى ${user.email}`
          : `Invitation resent to ${user.email}`
      );
    } catch (error) {
      toast.error(
        language === 'ar'
          ? 'فشل إعادة إرسال الدعوة'
          : 'Failed to resend invitation'
      );
    }
  };

  const handleToggleActive = async (user: UserWithRole) => {
    try {
      await updateStatus.mutateAsync({ userId: user.user_id, isActive: !user.is_active });
      toast.success(
        language === 'ar'
          ? user.is_active ? 'تم تعطيل المستخدم' : 'تم تفعيل المستخدم'
          : user.is_active ? 'User deactivated' : 'User activated'
      );
    } catch (error) {
      toast.error(language === 'ar' ? 'فشل تحديث الحالة' : 'Failed to update status');
    }
  };

  const handleChangeRole = async (user: UserWithRole, newRole: AppRole) => {
    try {
      await updateRole.mutateAsync({ userId: user.user_id, newRole });
      toast.success(
        language === 'ar'
          ? `تم تحديث الدور إلى ${roleLabels[newRole].ar}`
          : `Role updated to ${roleLabels[newRole].en}`
      );
    } catch (error) {
      toast.error(language === 'ar' ? 'فشل تحديث الدور' : 'Failed to update role');
    }
  };

  const handleAssignBranch = async () => {
    if (!assignBranchUser || !selectedBranchId) return;
    try {
      await assignBranch.mutateAsync({ userId: assignBranchUser.user_id, branchId: selectedBranchId });
      toast.success(
        language === 'ar' ? 'تم تعيين الفرع بنجاح' : 'Branch assigned successfully'
      );
      setIsAssignBranchDialogOpen(false);
      setAssignBranchUser(null);
      setSelectedBranchId('');
    } catch (error) {
      toast.error(language === 'ar' ? 'فشل تعيين الفرع' : 'Failed to assign branch');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Back Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={goBack}
            className="mt-1"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">{t('users.title')}</h1>
            <p className="text-muted-foreground mt-1">{t('users.subtitle')}</p>
          </div>
        </div>
        <Button onClick={() => setIsAddUserDialogOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          {language === 'ar' ? 'إضافة مستخدم' : 'Add User'}
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: language === 'ar' ? 'إجمالي المستخدمين' : 'Total Users', value: stats.total, icon: Users },
          { label: language === 'ar' ? 'المديرين' : 'Admins', value: stats.admins, icon: Shield },
          { label: language === 'ar' ? 'نشط' : 'Active', value: stats.active, icon: UserCheck },
          { label: language === 'ar' ? 'غير نشط' : 'Inactive', value: stats.inactive, icon: UserX },
        ].map((stat) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card rounded-xl border border-border p-4"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <stat.icon className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={t('users.search')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="ps-9"
          />
        </div>
        <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v as AppRole | 'all')}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder={language === 'ar' ? 'تصفية حسب الدور' : 'Filter by role'} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{language === 'ar' ? 'جميع الأدوار' : 'All Roles'}</SelectItem>
            <SelectItem value="admin">{roleLabels.admin[language]}</SelectItem>
            <SelectItem value="executive">{roleLabels.executive[language]}</SelectItem>
            <SelectItem value="branch_manager">{roleLabels.branch_manager[language]}</SelectItem>
            <SelectItem value="assessor">{roleLabels.assessor[language]}</SelectItem>
            <SelectItem value="branch_employee">{roleLabels.branch_employee[language]}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Users Table */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="bg-card rounded-xl border border-border overflow-hidden"
      >
        {isLoading ? (
          <div className="p-6 space-y-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-16" />
            ))}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{language === 'ar' ? 'المستخدم' : 'User'}</TableHead>
                <TableHead>{language === 'ar' ? 'الدور' : 'Role'}</TableHead>
                <TableHead className="hidden sm:table-cell">{t('common.status')}</TableHead>
                <TableHead className="hidden md:table-cell">{language === 'ar' ? 'المساعد الذكي' : 'AI Assistant'}</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    {t('common.noData')}
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((user) => {
                  const primaryRole = getPrimaryRole(user);
                  return (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarImage src={user.avatar_url || undefined} />
                            <AvatarFallback className="bg-primary/10 text-primary text-sm">
                              {getInitials(user.full_name)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-foreground">{user.full_name}</p>
                            <p className="text-sm text-muted-foreground">{user.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={roleColors[primaryRole]}>
                          {roleLabels[primaryRole][language]}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <Badge
                          variant="outline"
                          className={
                            user.is_active
                              ? 'bg-score-excellent/10 text-score-excellent border-score-excellent/30'
                              : 'bg-muted text-muted-foreground border-border'
                          }
                        >
                          {user.is_active 
                            ? (language === 'ar' ? 'نشط' : 'Active')
                            : (language === 'ar' ? 'غير نشط' : 'Inactive')
                          }
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <Badge
                          variant="outline"
                          className={
                            user.ai_assistant_enabled
                              ? 'bg-blue-500/10 text-blue-500 border-blue-500/30'
                              : 'bg-muted text-muted-foreground border-border'
                          }
                        >
                          <Bot className="w-3 h-3 me-1" />
                          {user.ai_assistant_enabled
                            ? (language === 'ar' ? 'مفعّل' : 'Enabled')
                            : (language === 'ar' ? 'معطّل' : 'Disabled')
                          }
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedUser(user);
                                setIsResetPasswordDialogOpen(true);
                              }}
                            >
                              <Key className="w-4 h-4 me-2" />
                              {t('users.resetPassword')}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleResendInvitation(user)}>
                              <Send className="w-4 h-4 me-2" />
                              {language === 'ar' ? 'إعادة إرسال الدعوة' : 'Resend Invitation'}
                            </DropdownMenuItem>
                            {primaryRole === 'branch_manager' && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => {
                                    setAssignBranchUser(user);
                                    setSelectedBranchId(user.branch_id || '');
                                    setIsAssignBranchDialogOpen(true);
                                  }}
                                >
                                  <Building className="w-4 h-4 me-2" />
                                  {language === 'ar' ? 'تعيين / تغيير الفرع' : 'Assign / Change Branch'}
                                </DropdownMenuItem>
                              </>
                            )}
                            {isAdmin && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => {
                                    setChangeRoleUser(user);
                                    setNewRole(primaryRole);
                                    setIsChangeRoleDialogOpen(true);
                                  }}
                                >
                                  <Shield className="w-4 h-4 me-2" />
                                  {language === 'ar' ? 'تغيير الدور' : 'Change Role'}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={async () => {
                                    try {
                                      await toggleAIAssistant.mutateAsync({ userId: user.user_id, enabled: !user.ai_assistant_enabled });
                                      toast.success(
                                        language === 'ar'
                                          ? user.ai_assistant_enabled ? 'تم تعطيل المساعد الذكي' : 'تم تفعيل المساعد الذكي'
                                          : user.ai_assistant_enabled ? 'AI Assistant disabled' : 'AI Assistant enabled'
                                      );
                                    } catch {
                                      toast.error(language === 'ar' ? 'فشل تحديث الإعداد' : 'Failed to update setting');
                                    }
                                  }}
                                >
                                  <Bot className="w-4 h-4 me-2" />
                                  {user.ai_assistant_enabled
                                    ? (language === 'ar' ? 'تعطيل المساعد الذكي' : 'Disable AI Assistant')
                                    : (language === 'ar' ? 'تفعيل المساعد الذكي' : 'Enable AI Assistant')
                                  }
                                </DropdownMenuItem>
                              </>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleToggleActive(user)}
                              className={user.is_active ? 'text-destructive' : ''}
                            >
                              {user.is_active ? (
                                <>
                                  <UserX className="w-4 h-4 me-2" />
                                  {t('users.deactivate')}
                                </>
                              ) : (
                                <>
                                  <UserCheck className="w-4 h-4 me-2" />
                                  {t('users.activate')}
                                </>
                              )}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        )}
      </motion.div>

      {/* Add User Dialog */}
      <Dialog open={isAddUserDialogOpen} onOpenChange={(open) => {
        setIsAddUserDialogOpen(open);
        if (!open) {
          setAddUserMode('choose');
          setInviteForm({ email: '', fullName: '', role: 'assessor' });
          setCreateForm({ email: '', fullName: '', password: '', confirmPassword: '', role: 'assessor', forcePasswordChange: true, branchId: '' });
          setShowPassword(false);
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{language === 'ar' ? 'إضافة مستخدم جديد' : 'Add New User'}</DialogTitle>
            <DialogDescription>
              {language === 'ar' 
                ? 'اختر طريقة إضافة المستخدم'
                : 'Choose how to add the user'
              }
            </DialogDescription>
          </DialogHeader>

          {/* Method selection */}
          {addUserMode === 'choose' && (
            <div className="flex flex-col gap-3 py-4">
              <Button variant="outline" className="justify-start gap-3 h-auto py-3" onClick={() => setAddUserMode('invite')}>
                <Mail className="w-5 h-5 text-primary" />
                <div className="text-start">
                  <p className="font-medium">{language === 'ar' ? 'دعوة عبر البريد الإلكتروني' : 'Invite via Email'}</p>
                  <p className="text-xs text-muted-foreground">{language === 'ar' ? 'إرسال دعوة مع كلمة مرور مؤقتة' : 'Send an invitation with a temporary password'}</p>
                </div>
              </Button>
              <Button variant="outline" className="justify-start gap-3 h-auto py-3" onClick={() => setAddUserMode('create')}>
                <UserPlus className="w-5 h-5 text-primary" />
                <div className="text-start">
                  <p className="font-medium">{language === 'ar' ? 'إنشاء مباشر' : 'Create Directly'}</p>
                  <p className="text-xs text-muted-foreground">{language === 'ar' ? 'إنشاء المستخدم وتعيين كلمة المرور مباشرة' : 'Create user and set password directly'}</p>
                </div>
              </Button>
            </div>
          )}

          {/* Invite form */}
          {addUserMode === 'invite' && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>{language === 'ar' ? 'الاسم الكامل' : 'Full Name'}</Label>
                <Input
                  placeholder={language === 'ar' ? 'أدخل الاسم الكامل' : 'Enter full name'}
                  value={inviteForm.fullName}
                  onChange={(e) => setInviteForm((prev) => ({ ...prev, fullName: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>{language === 'ar' ? 'البريد الإلكتروني' : 'Email Address'}</Label>
                <Input
                  type="email"
                  placeholder={language === 'ar' ? 'أدخل البريد الإلكتروني' : 'Enter email address'}
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm((prev) => ({ ...prev, email: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>{language === 'ar' ? 'الدور' : 'Role'}</Label>
                <Select
                  value={inviteForm.role}
                  onValueChange={(v) => setInviteForm((prev) => ({ ...prev, role: v as AppRole }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">{roleLabels.admin[language]}</SelectItem>
                    <SelectItem value="executive">{roleLabels.executive[language]}</SelectItem>
                    <SelectItem value="branch_manager">{roleLabels.branch_manager[language]}</SelectItem>
                    <SelectItem value="assessor">{roleLabels.assessor[language]}</SelectItem>
                    <SelectItem value="branch_employee">{roleLabels.branch_employee[language]}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Create form */}
          {addUserMode === 'create' && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>{language === 'ar' ? 'الاسم الكامل' : 'Full Name'}</Label>
                <Input
                  placeholder={language === 'ar' ? 'أدخل الاسم الكامل' : 'Enter full name'}
                  value={createForm.fullName}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, fullName: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>{language === 'ar' ? 'البريد الإلكتروني' : 'Email Address'}</Label>
                <Input
                  type="email"
                  placeholder={language === 'ar' ? 'أدخل البريد الإلكتروني' : 'Enter email address'}
                  value={createForm.email}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, email: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>{language === 'ar' ? 'كلمة المرور' : 'Password'}</Label>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder={language === 'ar' ? 'أدخل كلمة المرور' : 'Enter password'}
                    value={createForm.password}
                    onChange={(e) => setCreateForm((prev) => ({ ...prev, password: e.target.value }))}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute end-0 top-0 h-full px-3"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>{language === 'ar' ? 'تأكيد كلمة المرور' : 'Confirm Password'}</Label>
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder={language === 'ar' ? 'أعد إدخال كلمة المرور' : 'Re-enter password'}
                  value={createForm.confirmPassword}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                />
                {createForm.password && createForm.confirmPassword && createForm.password !== createForm.confirmPassword && (
                  <p className="text-xs text-destructive">
                    {language === 'ar' ? 'كلمات المرور غير متطابقة' : 'Passwords do not match'}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>{language === 'ar' ? 'الدور' : 'Role'}</Label>
                <Select
                  value={createForm.role}
                  onValueChange={(v) => setCreateForm((prev) => ({ ...prev, role: v as AppRole, branchId: '' }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">{roleLabels.admin[language]}</SelectItem>
                    <SelectItem value="executive">{roleLabels.executive[language]}</SelectItem>
                    <SelectItem value="branch_manager">{roleLabels.branch_manager[language]}</SelectItem>
                    <SelectItem value="assessor">{roleLabels.assessor[language]}</SelectItem>
                    <SelectItem value="branch_employee">{roleLabels.branch_employee[language]}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {createForm.role === 'branch_manager' && (
                <div className="space-y-2">
                  <Label>{language === 'ar' ? 'الفرع' : 'Assign to Branch'}</Label>
                  <Select
                    value={createForm.branchId}
                    onValueChange={(v) => setCreateForm((prev) => ({ ...prev, branchId: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={language === 'ar' ? 'اختر الفرع' : 'Select a branch'} />
                    </SelectTrigger>
                    <SelectContent>
                      {branches?.map((branch) => (
                        <SelectItem key={branch.id} value={branch.id}>
                          {language === 'ar' && branch.nameAr ? branch.nameAr : branch.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div>
                  <p className="text-sm font-medium">{language === 'ar' ? 'تغيير كلمة المرور عند أول تسجيل دخول' : 'Force password change on first login'}</p>
                  <p className="text-xs text-muted-foreground">{language === 'ar' ? 'سيُطلب من المستخدم تغيير كلمة المرور' : 'User will be prompted to change their password'}</p>
                </div>
                <Switch
                  checked={createForm.forcePasswordChange}
                  onCheckedChange={(checked) => setCreateForm((prev) => ({ ...prev, forcePasswordChange: checked }))}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            {addUserMode === 'choose' ? (
              <Button variant="outline" onClick={() => setIsAddUserDialogOpen(false)}>
                {t('common.cancel')}
              </Button>
            ) : (
              <div className="flex gap-2 w-full justify-end">
                <Button variant="outline" onClick={() => setAddUserMode('choose')}>
                  {language === 'ar' ? 'رجوع' : 'Back'}
                </Button>
                {addUserMode === 'invite' && (
                  <Button 
                    onClick={handleInviteUser} 
                    disabled={!inviteForm.email || !inviteForm.fullName || inviteUser.isPending}
                  >
                    {inviteUser.isPending && <Loader2 className="w-4 h-4 me-2 animate-spin" />}
                    <Mail className="w-4 h-4 me-2" />
                    {language === 'ar' ? 'إرسال الدعوة' : 'Send Invitation'}
                  </Button>
                )}
                {addUserMode === 'create' && (
                  <Button
                    onClick={handleCreateUser}
                    disabled={!createForm.email || !createForm.fullName || !createForm.password || createForm.password !== createForm.confirmPassword || (createForm.role === 'branch_manager' && !createForm.branchId) || createUser.isPending}
                  >
                    {createUser.isPending && <Loader2 className="w-4 h-4 me-2 animate-spin" />}
                    <UserPlus className="w-4 h-4 me-2" />
                    {language === 'ar' ? 'إنشاء المستخدم' : 'Create User'}
                  </Button>
                )}
              </div>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={isResetPasswordDialogOpen} onOpenChange={(open) => {
        setIsResetPasswordDialogOpen(open);
        if (!open) {
          setResetResult(null);
          setSelectedUser(null);
          setResetMode('choose');
          setManualPassword('');
          setConfirmPassword('');
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('users.resetPassword')}</DialogTitle>
            <DialogDescription>
              {language === 'ar'
                ? 'اختر طريقة إعادة تعيين كلمة المرور'
                : 'Choose how to reset the password'
              }
            </DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="py-4 space-y-4">
              <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
                <Avatar>
                  <AvatarImage src={selectedUser.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {getInitials(selectedUser.full_name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{selectedUser.full_name}</p>
                  <p className="text-sm text-muted-foreground">{selectedUser.email}</p>
                </div>
              </div>

              {/* Choose mode */}
              {resetMode === 'choose' && (
                <div className="flex flex-col gap-3">
                  <Button variant="outline" className="justify-start gap-3 h-auto py-3" onClick={() => setResetMode('email')}>
                    <Mail className="w-5 h-5 text-primary" />
                    <div className="text-start">
                      <p className="font-medium">{language === 'ar' ? 'إرسال عبر البريد الإلكتروني' : 'Send via Email'}</p>
                      <p className="text-xs text-muted-foreground">{language === 'ar' ? 'إنشاء كلمة مرور مؤقتة وإرسالها للمستخدم' : 'Generate a temporary password and email it to the user'}</p>
                    </div>
                  </Button>
                  <Button variant="outline" className="justify-start gap-3 h-auto py-3" onClick={() => setResetMode('manual')}>
                    <Key className="w-5 h-5 text-primary" />
                    <div className="text-start">
                      <p className="font-medium">{language === 'ar' ? 'تعيين يدوي' : 'Set Manually'}</p>
                      <p className="text-xs text-muted-foreground">{language === 'ar' ? 'إدخال كلمة مرور جديدة يدوياً' : 'Enter a new password manually'}</p>
                    </div>
                  </Button>
                </div>
              )}

              {/* Email confirmation */}
              {resetMode === 'email' && (
                <div className="p-4 bg-muted/30 rounded-lg">
                  <p className="text-sm text-foreground">
                    {language === 'ar'
                      ? 'سيتم إنشاء كلمة مرور مؤقتة جديدة وإرسالها إلى بريد المستخدم. هل تريد المتابعة؟'
                      : 'A new temporary password will be generated and sent to the user\'s email. Continue?'}
                  </p>
                </div>
              )}

              {/* Manual password entry */}
              {resetMode === 'manual' && (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label>{language === 'ar' ? 'كلمة المرور الجديدة' : 'New Password'}</Label>
                    <Input
                      type="password"
                      value={manualPassword}
                      onChange={(e) => setManualPassword(e.target.value)}
                      placeholder={language === 'ar' ? 'أدخل كلمة المرور الجديدة' : 'Enter new password'}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{language === 'ar' ? 'تأكيد كلمة المرور' : 'Confirm Password'}</Label>
                    <Input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder={language === 'ar' ? 'أعد إدخال كلمة المرور' : 'Re-enter password'}
                    />
                  </div>
                  {manualPassword && confirmPassword && manualPassword !== confirmPassword && (
                    <p className="text-xs text-destructive">
                      {language === 'ar' ? 'كلمات المرور غير متطابقة' : 'Passwords do not match'}
                    </p>
                  )}
                </div>
              )}

              {/* Done state */}
              {resetMode === 'done' && (
                <div className="space-y-3">
                  {resetResult?.tempPassword && (
                    <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg space-y-2">
                      <p className="text-sm font-medium text-foreground">
                        {language === 'ar' ? 'كلمة المرور المؤقتة الجديدة:' : 'New temporary password:'}
                      </p>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 p-2 bg-muted rounded text-sm font-mono select-all break-all">
                          {resetResult.tempPassword}
                        </code>
                        <Button variant="outline" size="sm" onClick={() => {
                          navigator.clipboard.writeText(resetResult.tempPassword!);
                          toast.success(language === 'ar' ? 'تم النسخ' : 'Copied!');
                        }}>
                          {language === 'ar' ? 'نسخ' : 'Copy'}
                        </Button>
                      </div>
                    </div>
                  )}
                  {resetResult?.emailSent && (
                    <div className="p-3 bg-score-excellent/10 border border-score-excellent/20 rounded-lg">
                      <p className="text-sm text-score-excellent">
                        {language === 'ar' ? '✓ تم إرسال كلمة المرور الجديدة عبر البريد الإلكتروني' : '✓ New password has been sent via email'}
                      </p>
                    </div>
                  )}
                  {!resetResult?.tempPassword && !resetResult?.emailSent && (
                    <div className="p-3 bg-score-excellent/10 border border-score-excellent/20 rounded-lg">
                      <p className="text-sm text-score-excellent">
                        {language === 'ar' ? '✓ تم تعيين كلمة المرور بنجاح' : '✓ Password has been set successfully'}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            {resetMode === 'done' ? (
              <Button onClick={() => {
                setIsResetPasswordDialogOpen(false);
                setResetResult(null);
                setSelectedUser(null);
                setResetMode('choose');
                setManualPassword('');
                setConfirmPassword('');
              }}>
                {language === 'ar' ? 'إغلاق' : 'Close'}
              </Button>
            ) : resetMode === 'choose' ? (
              <Button variant="outline" onClick={() => setIsResetPasswordDialogOpen(false)}>
                {t('common.cancel')}
              </Button>
            ) : (
              <div className="flex gap-2 w-full justify-end">
                <Button variant="outline" onClick={() => setResetMode('choose')}>
                  {language === 'ar' ? 'رجوع' : 'Back'}
                </Button>
                {resetMode === 'email' && (
                  <Button onClick={handleResetViaEmail} disabled={resetPassword.isPending}>
                    {resetPassword.isPending && <Loader2 className="w-4 h-4 me-2 animate-spin" />}
                    <Mail className="w-4 h-4 me-2" />
                    {language === 'ar' ? 'إرسال' : 'Send'}
                  </Button>
                )}
                {resetMode === 'manual' && (
                  <Button
                    onClick={handleResetManual}
                    disabled={resetPassword.isPending || !manualPassword || manualPassword !== confirmPassword}
                  >
                    {resetPassword.isPending && <Loader2 className="w-4 h-4 me-2 animate-spin" />}
                    <Key className="w-4 h-4 me-2" />
                    {language === 'ar' ? 'تعيين كلمة المرور' : 'Set Password'}
                  </Button>
                )}
              </div>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Branch Dialog */}
      <Dialog open={isAssignBranchDialogOpen} onOpenChange={(open) => {
        setIsAssignBranchDialogOpen(open);
        if (!open) {
          setAssignBranchUser(null);
          setSelectedBranchId('');
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{language === 'ar' ? 'تعيين / تغيير الفرع' : 'Assign / Change Branch'}</DialogTitle>
            <DialogDescription>
              {language === 'ar'
                ? 'اختر الفرع الذي سيكون هذا المستخدم مديراً له'
                : 'Select the branch this user will manage'
              }
            </DialogDescription>
          </DialogHeader>
          {assignBranchUser && (
            <div className="py-4 space-y-4">
              <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
                <Avatar>
                  <AvatarImage src={assignBranchUser.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {getInitials(assignBranchUser.full_name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{assignBranchUser.full_name}</p>
                  <p className="text-sm text-muted-foreground">{assignBranchUser.email}</p>
                </div>
              </div>
              <div className="space-y-2">
                <Label>{language === 'ar' ? 'الفرع' : 'Branch'}</Label>
                <Select
                  value={selectedBranchId}
                  onValueChange={setSelectedBranchId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={language === 'ar' ? 'اختر الفرع' : 'Select a branch'} />
                  </SelectTrigger>
                  <SelectContent>
                    {branches?.map((branch) => (
                      <SelectItem key={branch.id} value={branch.id}>
                        {language === 'ar' && branch.nameAr ? branch.nameAr : branch.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAssignBranchDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              onClick={handleAssignBranch}
              disabled={!selectedBranchId || assignBranch.isPending}
            >
              {assignBranch.isPending && <Loader2 className="w-4 h-4 me-2 animate-spin" />}
              <Building className="w-4 h-4 me-2" />
              {language === 'ar' ? 'تعيين الفرع' : 'Assign Branch'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Role Dialog */}
      <Dialog open={isChangeRoleDialogOpen} onOpenChange={(open) => {
        setIsChangeRoleDialogOpen(open);
        if (!open) {
          setChangeRoleUser(null);
          setNewRole('assessor');
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{language === 'ar' ? 'تغيير الدور' : 'Change Role'}</DialogTitle>
            <DialogDescription>
              {language === 'ar'
                ? 'اختر الدور الجديد لهذا المستخدم'
                : 'Select the new role for this user'
              }
            </DialogDescription>
          </DialogHeader>
          {changeRoleUser && (
            <div className="py-4 space-y-4">
              <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
                <Avatar>
                  <AvatarImage src={changeRoleUser.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {getInitials(changeRoleUser.full_name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{changeRoleUser.full_name}</p>
                  <p className="text-sm text-muted-foreground">{changeRoleUser.email}</p>
                </div>
              </div>
              <div className="space-y-2">
                <Label>{language === 'ar' ? 'الدور' : 'Role'}</Label>
                <Select
                  value={newRole}
                  onValueChange={(v) => setNewRole(v as AppRole)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">{roleLabels.admin[language]}</SelectItem>
                    <SelectItem value="executive">{roleLabels.executive[language]}</SelectItem>
                    <SelectItem value="branch_manager">{roleLabels.branch_manager[language]}</SelectItem>
                    <SelectItem value="assessor">{roleLabels.assessor[language]}</SelectItem>
                    <SelectItem value="branch_employee">{roleLabels.branch_employee[language]}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsChangeRoleDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              onClick={async () => {
                if (!changeRoleUser) return;
                await handleChangeRole(changeRoleUser, newRole);
                setIsChangeRoleDialogOpen(false);
                setChangeRoleUser(null);
              }}
              disabled={updateRole.isPending}
            >
              {updateRole.isPending && <Loader2 className="w-4 h-4 me-2 animate-spin" />}
              <Shield className="w-4 h-4 me-2" />
              {language === 'ar' ? 'تغيير الدور' : 'Change Role'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
