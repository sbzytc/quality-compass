import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Globe, Moon, Sun, Bell, Mail, Smartphone, ArrowLeft, User, Key, Lock, Settings, Shield, Phone, Clock, Check, X } from 'lucide-react';
import RolePermissionsManager from '@/components/RolePermissionsManager';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useGoBack } from '@/hooks/useGoBack';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function SettingsPage() {
  const { isAdmin, profile, user } = useAuth();
  const goBack = useGoBack('/evaluations');
  const { language, setLanguage, t, direction } = useLanguage();
  
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  
  // Phone number state
  const [phoneNumber, setPhoneNumber] = useState(profile?.phone || '');
  const [isSubmittingPhone, setIsSubmittingPhone] = useState(false);
  const [pendingPhoneRequest, setPendingPhoneRequest] = useState<any>(null);
  
  // Admin: all pending requests
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [isLoadingRequests, setIsLoadingRequests] = useState(false);

  // Load user's pending phone request
  useEffect(() => {
    if (!user) return;
    const loadPendingRequest = async () => {
      const { data } = await supabase
        .from('profile_change_requests')
        .select('*')
        .eq('user_id', user.id)
        .eq('field_name', 'phone')
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(1);
      if (data && data.length > 0) {
        setPendingPhoneRequest(data[0]);
      } else {
        setPendingPhoneRequest(null);
      }
    };
    loadPendingRequest();
  }, [user]);

  // Admin: load all pending requests
  useEffect(() => {
    if (!isAdmin) return;
    const loadAllRequests = async () => {
      setIsLoadingRequests(true);
      const { data } = await supabase
        .from('profile_change_requests')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      setPendingRequests(data || []);
      setIsLoadingRequests(false);
    };
    loadAllRequests();
  }, [isAdmin]);

  // Fetch profile names for pending requests
  const [requestProfiles, setRequestProfiles] = useState<Record<string, string>>({});
  useEffect(() => {
    if (pendingRequests.length === 0) return;
    const userIds = [...new Set(pendingRequests.map(r => r.user_id))];
    const fetchProfiles = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', userIds);
      if (data) {
        const map: Record<string, string> = {};
        data.forEach(p => { map[p.user_id] = p.full_name; });
        setRequestProfiles(map);
      }
    };
    fetchProfiles();
  }, [pendingRequests]);

  const handleLanguageChange = (lang: 'en' | 'ar') => {
    setLanguage(lang);
    toast.success(lang === 'ar' ? 'تم تغيير اللغة إلى العربية' : 'Language changed to English');
  };

  const handlePasswordChange = async () => {
    if (!newPassword || !confirmPassword) {
      toast.error(direction === 'rtl' ? 'يرجى ملء جميع الحقول' : 'Please fill in all fields');
      return;
    }

    if (newPassword.length < 6) {
      toast.error(direction === 'rtl' ? 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' : 'Password must be at least 6 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error(direction === 'rtl' ? 'كلمات المرور غير متطابقة' : 'Passwords do not match');
      return;
    }

    setIsChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      toast.success(direction === 'rtl' ? 'تم تغيير كلمة المرور بنجاح' : 'Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      console.error('Password change error:', error);
      toast.error(error.message || (direction === 'rtl' ? 'فشل تغيير كلمة المرور' : 'Failed to change password'));
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handlePhoneSubmit = async () => {
    if (!phoneNumber.trim()) {
      toast.error(direction === 'rtl' ? 'يرجى إدخال رقم الجوال' : 'Please enter a phone number');
      return;
    }
    if (phoneNumber.trim() === (profile?.phone || '')) {
      toast.error(direction === 'rtl' ? 'الرقم نفسه لم يتغير' : 'Phone number has not changed');
      return;
    }

    setIsSubmittingPhone(true);
    try {
      const { error } = await supabase
        .from('profile_change_requests')
        .insert({
          user_id: user!.id,
          field_name: 'phone',
          old_value: profile?.phone || null,
          new_value: phoneNumber.trim(),
        });

      if (error) throw error;

      toast.success(direction === 'rtl' ? 'تم إرسال الطلب للمسؤول للموافقة' : 'Request submitted for admin approval');
      // Reload pending request
      const { data } = await supabase
        .from('profile_change_requests')
        .select('*')
        .eq('user_id', user!.id)
        .eq('field_name', 'phone')
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(1);
      if (data && data.length > 0) setPendingPhoneRequest(data[0]);
    } catch (error: any) {
      toast.error(error.message || (direction === 'rtl' ? 'فشل إرسال الطلب' : 'Failed to submit request'));
    } finally {
      setIsSubmittingPhone(false);
    }
  };

  const handleApproveRequest = async (request: any) => {
    try {
      // Update request status
      const { error: reqError } = await supabase
        .from('profile_change_requests')
        .update({ status: 'approved', reviewed_by: user!.id, reviewed_at: new Date().toISOString() })
        .eq('id', request.id);
      if (reqError) throw reqError;

      // Update the profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ [request.field_name]: request.new_value })
        .eq('user_id', request.user_id);
      if (profileError) throw profileError;

      toast.success(direction === 'rtl' ? 'تمت الموافقة على الطلب' : 'Request approved');
      setPendingRequests(prev => prev.filter(r => r.id !== request.id));
    } catch (error: any) {
      toast.error(error.message || (direction === 'rtl' ? 'فشل الموافقة' : 'Failed to approve'));
    }
  };

  const handleRejectRequest = async (request: any) => {
    try {
      const { error } = await supabase
        .from('profile_change_requests')
        .update({ status: 'rejected', reviewed_by: user!.id, reviewed_at: new Date().toISOString() })
        .eq('id', request.id);
      if (error) throw error;

      toast.success(direction === 'rtl' ? 'تم رفض الطلب' : 'Request rejected');
      setPendingRequests(prev => prev.filter(r => r.id !== request.id));
    } catch (error: any) {
      toast.error(error.message || (direction === 'rtl' ? 'فشل الرفض' : 'Failed to reject'));
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Back Button */}
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
          <h1 className="text-3xl font-bold text-foreground">{t('settings.title')}</h1>
          <p className="text-muted-foreground mt-1">{t('settings.subtitle')}</p>
        </div>
      </div>

      {/* Profile Settings Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <User className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-semibold">
            {direction === 'rtl' ? 'إعدادات الملف الشخصي' : 'Profile Settings'}
          </h2>
        </div>
        <Separator />

        <div className="grid gap-6">
          {/* Profile Information */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
          >
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <User className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle>{direction === 'rtl' ? 'معلومات الحساب' : 'Account Information'}</CardTitle>
                    <CardDescription>{direction === 'rtl' ? 'معلومات حسابك الشخصية' : 'Your personal account information'}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>{direction === 'rtl' ? 'الاسم الكامل' : 'Full Name'}</Label>
                    <Input value={profile?.full_name || ''} disabled className="bg-muted" />
                  </div>
                  <div className="space-y-2">
                    <Label>{direction === 'rtl' ? 'البريد الإلكتروني' : 'Email'}</Label>
                    <Input value={profile?.email || ''} disabled className="bg-muted" />
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  {direction === 'rtl' 
                    ? 'تواصل مع المسؤول لتحديث بياناتك الشخصية'
                    : 'Contact an administrator to update your profile information'}
                </p>
              </CardContent>
            </Card>
          </motion.div>

          {/* Phone Number */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.07 }}
          >
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Phone className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle>{direction === 'rtl' ? 'رقم الجوال' : 'Phone Number'}</CardTitle>
                    <CardDescription>
                      {direction === 'rtl' 
                        ? 'أي تغيير يتطلب موافقة المسؤول' 
                        : 'Any change requires admin approval'}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {pendingPhoneRequest ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                      <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-amber-700">
                          {direction === 'rtl' ? 'طلب معلق بانتظار الموافقة' : 'Pending request awaiting approval'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {direction === 'rtl' ? 'الرقم الجديد: ' : 'New number: '}{pendingPhoneRequest.new_value}
                        </p>
                      </div>
                      <Badge variant="outline" className="bg-amber-500/10 text-amber-700 border-amber-500/30">
                        {direction === 'rtl' ? 'معلق' : 'Pending'}
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      <Label>{direction === 'rtl' ? 'الرقم الحالي' : 'Current Number'}</Label>
                      <Input value={profile?.phone || (direction === 'rtl' ? 'لا يوجد' : 'Not set')} disabled className="bg-muted" />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label htmlFor="phone">{direction === 'rtl' ? 'رقم الجوال' : 'Phone Number'}</Label>
                      <Input 
                        id="phone"
                        type="tel"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        placeholder={direction === 'rtl' ? 'أدخل رقم الجوال' : 'Enter phone number'}
                        dir="ltr"
                      />
                    </div>
                    <Button 
                      onClick={handlePhoneSubmit}
                      disabled={isSubmittingPhone || !phoneNumber.trim() || phoneNumber.trim() === (profile?.phone || '')}
                      className="w-full md:w-auto"
                    >
                      <Phone className="w-4 h-4 me-2" />
                      {isSubmittingPhone 
                        ? (direction === 'rtl' ? 'جارٍ الإرسال...' : 'Submitting...') 
                        : (direction === 'rtl' ? 'إرسال طلب التغيير' : 'Submit Change Request')}
                    </Button>
                    {profile?.phone && (
                      <p className="text-sm text-muted-foreground">
                        {direction === 'rtl' ? 'الرقم الحالي: ' : 'Current: '}{profile.phone}
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Password Change */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Key className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle>{direction === 'rtl' ? 'تغيير كلمة المرور' : 'Change Password'}</CardTitle>
                    <CardDescription>{direction === 'rtl' ? 'قم بتحديث كلمة المرور الخاصة بك' : 'Update your account password'}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="new-password">{direction === 'rtl' ? 'كلمة المرور الجديدة' : 'New Password'}</Label>
                    <Input 
                      id="new-password"
                      type="password" 
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder={direction === 'rtl' ? 'أدخل كلمة المرور الجديدة' : 'Enter new password'}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">{direction === 'rtl' ? 'تأكيد كلمة المرور' : 'Confirm Password'}</Label>
                    <Input 
                      id="confirm-password"
                      type="password" 
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder={direction === 'rtl' ? 'أكد كلمة المرور الجديدة' : 'Confirm new password'}
                    />
                  </div>
                </div>
                <Button 
                  onClick={handlePasswordChange} 
                  disabled={isChangingPassword || !newPassword || !confirmPassword}
                  className="w-full md:w-auto"
                >
                  <Lock className="w-4 h-4 me-2" />
                  {isChangingPassword 
                    ? (direction === 'rtl' ? 'جارٍ التغيير...' : 'Changing...') 
                    : (direction === 'rtl' ? 'تغيير كلمة المرور' : 'Change Password')}
                </Button>
              </CardContent>
            </Card>
          </motion.div>

          {/* Language Settings */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Globe className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle>{t('settings.language')}</CardTitle>
                    <CardDescription>{t('settings.languageDesc')}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-3">
                  <Button
                    variant={language === 'en' ? 'default' : 'outline'}
                    onClick={() => handleLanguageChange('en')}
                    className="min-w-[120px]"
                  >
                    🇬🇧 {t('settings.english')}
                  </Button>
                  <Button
                    variant={language === 'ar' ? 'default' : 'outline'}
                    onClick={() => handleLanguageChange('ar')}
                    className="min-w-[120px]"
                  >
                    🇸🇦 {t('settings.arabic')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>

      {/* System Settings Section - Admin Only */}
      {isAdmin && (
        <div className="space-y-4 pt-4">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-semibold">
              {direction === 'rtl' ? 'إعدادات النظام' : 'System Settings'}
            </h2>
            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
              {direction === 'rtl' ? 'مسؤول فقط' : 'Admin Only'}
            </span>
          </div>
          <Separator />

          <div className="grid gap-6">
            {/* Pending Change Requests - Admin */}
            {pendingRequests.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <Card className="border-amber-500/30">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-amber-500/10">
                        <Clock className="w-5 h-5 text-amber-600" />
                      </div>
                      <div className="flex-1">
                        <CardTitle>{direction === 'rtl' ? 'طلبات التغيير المعلقة' : 'Pending Change Requests'}</CardTitle>
                        <CardDescription>
                          {direction === 'rtl' 
                            ? `${pendingRequests.length} طلب بانتظار الموافقة` 
                            : `${pendingRequests.length} request(s) awaiting approval`}
                        </CardDescription>
                      </div>
                      <Badge variant="outline" className="bg-amber-500/10 text-amber-700 border-amber-500/30">
                        {pendingRequests.length}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {pendingRequests.map((req) => (
                        <div key={req.id} className="flex items-center gap-3 p-3 rounded-lg border bg-card">
                          <div className="flex-1 space-y-1">
                            <p className="text-sm font-medium">
                              {requestProfiles[req.user_id] || req.user_id}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {direction === 'rtl' ? 'تغيير رقم الجوال' : 'Phone number change'}
                            </p>
                            <div className="flex items-center gap-2 text-xs">
                              <span className="text-muted-foreground">{req.old_value || (direction === 'rtl' ? 'فارغ' : 'Empty')}</span>
                              <span>→</span>
                              <span className="font-medium">{req.new_value}</span>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" className="text-green-600 hover:bg-green-50 hover:text-green-700" onClick={() => handleApproveRequest(req)}>
                              <Check className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="outline" className="text-destructive hover:bg-destructive/10" onClick={() => handleRejectRequest(req)}>
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Theme Settings */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
            >
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Sun className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle>{t('settings.theme')}</CardTitle>
                      <CardDescription>{t('settings.themeDesc')}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Sun className="w-5 h-5 text-muted-foreground" />
                      <Label htmlFor="dark-mode">Dark Mode</Label>
                    </div>
                    <Switch id="dark-mode" />
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Notification Settings */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Bell className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle>{t('settings.notifications')}</CardTitle>
                      <CardDescription>{t('settings.notificationsDesc')}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Mail className="w-5 h-5 text-muted-foreground" />
                      <Label htmlFor="email-notifications">{t('settings.email')}</Label>
                    </div>
                    <Switch id="email-notifications" defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Smartphone className="w-5 h-5 text-muted-foreground" />
                      <Label htmlFor="push-notifications">{t('settings.push')}</Label>
                    </div>
                    <Switch id="push-notifications" defaultChecked />
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Role Permissions */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
            >
              <RolePermissionsManager />
            </motion.div>
          </div>
        </div>
      )}
    </div>
  );
}
