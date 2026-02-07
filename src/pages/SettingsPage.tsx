import { useState } from 'react';
import { motion } from 'framer-motion';
import { Globe, Moon, Sun, Bell, Mail, Smartphone, ArrowLeft, User, Key, Lock, Settings } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useGoBack } from '@/hooks/useGoBack';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function SettingsPage() {
  const { isAdmin, profile } = useAuth();
  const goBack = useGoBack('/evaluations');
  const { language, setLanguage, t, direction } = useLanguage();
  
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

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
          </div>
        </div>
      )}
    </div>
  );
}
