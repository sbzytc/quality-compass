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
import { toast } from 'sonner';
import { useLanguage } from '@/contexts/LanguageContext';
import { useGoBack } from '@/hooks/useGoBack';
import { 
  useUsers, 
  useUserStats, 
  useInviteUser, 
  useResetPassword,
  useResendInvitation,
  useUpdateUserStatus,
  useUpdateUserRole,
  UserWithRole
} from '@/hooks/useUsers';
import { AppRole } from '@/contexts/AuthContext';

const roleLabels: Record<AppRole, { en: string; ar: string }> = {
  admin: { en: 'Admin', ar: 'مدير النظام' },
  executive: { en: 'Executive', ar: 'تنفيذي' },
  branch_manager: { en: 'Branch Manager', ar: 'مدير الفرع' },
  assessor: { en: 'Assessor', ar: 'مقيّم' },
};

const roleColors: Record<AppRole, string> = {
  admin: 'bg-purple-500/10 text-purple-500 border-purple-500/30',
  executive: 'bg-blue-500/10 text-blue-500 border-blue-500/30',
  branch_manager: 'bg-amber-500/10 text-amber-500 border-amber-500/30',
  assessor: 'bg-green-500/10 text-green-500 border-green-500/30',
};

export default function UsersPage() {
  const navigate = useNavigate();
  const goBack = useGoBack('/dashboard/ceo');
  const { t, language } = useLanguage();
  const { data: users, isLoading } = useUsers();
  const stats = useUserStats();
  const inviteUser = useInviteUser();
  const resetPassword = useResetPassword();
  const resendInvitation = useResendInvitation();
  const updateStatus = useUpdateUserStatus();
  const updateRole = useUpdateUserRole();

  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<AppRole | 'all'>('all');
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [isResetPasswordDialogOpen, setIsResetPasswordDialogOpen] = useState(false);
  const [resetMode, setResetMode] = useState<'choose' | 'email' | 'manual' | 'done'>('choose');
  const [manualPassword, setManualPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetResult, setResetResult] = useState<{ tempPassword?: string; emailSent?: boolean } | null>(null);
  const [selectedUser, setSelectedUser] = useState<UserWithRole | null>(null);
  const [inviteForm, setInviteForm] = useState({
    email: '',
    fullName: '',
    role: 'assessor' as AppRole,
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
      setIsInviteDialogOpen(false);
      setInviteForm({ email: '', fullName: '', role: 'assessor' });
    } catch (error) {
      toast.error(
        language === 'ar'
          ? 'فشل إرسال الدعوة'
          : 'Failed to send invitation'
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

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
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
        <Button onClick={() => setIsInviteDialogOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          {t('users.invite')}
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
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
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
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleChangeRole(user, 'admin')}>
                              <Shield className="w-4 h-4 me-2" />
                              {language === 'ar' ? 'جعله مدير' : 'Make Admin'}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleChangeRole(user, 'executive')}>
                              <Users className="w-4 h-4 me-2" />
                              {language === 'ar' ? 'جعله تنفيذي' : 'Make Executive'}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleChangeRole(user, 'branch_manager')}>
                              <Building className="w-4 h-4 me-2" />
                              {language === 'ar' ? 'جعله مدير فرع' : 'Make Branch Manager'}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleChangeRole(user, 'assessor')}>
                              <Users className="w-4 h-4 me-2" />
                              {language === 'ar' ? 'جعله مقيّم' : 'Make Assessor'}
                            </DropdownMenuItem>
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

      {/* Invite User Dialog */}
      <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{language === 'ar' ? 'دعوة مستخدم جديد' : 'Invite New User'}</DialogTitle>
            <DialogDescription>
              {language === 'ar' 
                ? 'سيتم إرسال بريد إلكتروني للدعوة مع كلمة مرور مؤقتة'
                : 'Send an invitation email with a temporary password'
              }
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">{language === 'ar' ? 'الاسم الكامل' : 'Full Name'}</Label>
              <Input
                id="fullName"
                placeholder={language === 'ar' ? 'أدخل الاسم الكامل' : 'Enter full name'}
                value={inviteForm.fullName}
                onChange={(e) => setInviteForm((prev) => ({ ...prev, fullName: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">{language === 'ar' ? 'البريد الإلكتروني' : 'Email Address'}</Label>
              <Input
                id="email"
                type="email"
                placeholder={language === 'ar' ? 'أدخل البريد الإلكتروني' : 'Enter email address'}
                value={inviteForm.email}
                onChange={(e) => setInviteForm((prev) => ({ ...prev, email: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">{language === 'ar' ? 'الدور' : 'Role'}</Label>
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
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsInviteDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button 
              onClick={handleInviteUser} 
              disabled={!inviteForm.email || !inviteForm.fullName || inviteUser.isPending}
            >
              {inviteUser.isPending && <Loader2 className="w-4 h-4 me-2 animate-spin" />}
              <Mail className="w-4 h-4 me-2" />
              {language === 'ar' ? 'إرسال الدعوة' : 'Send Invitation'}
            </Button>
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
    </div>
  );
}
