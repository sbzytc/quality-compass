import { motion } from 'framer-motion';
import { Globe, Moon, Sun, Bell, Mail, Smartphone } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from 'sonner';

export default function SettingsPage() {
  const { language, setLanguage, t } = useLanguage();

  const handleLanguageChange = (lang: 'en' | 'ar') => {
    setLanguage(lang);
    toast.success(lang === 'ar' ? 'تم تغيير اللغة إلى العربية' : 'Language changed to English');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">{t('settings.title')}</h1>
        <p className="text-muted-foreground mt-1">{t('settings.subtitle')}</p>
      </div>

      <div className="grid gap-6">
        {/* Language Settings */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
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

        {/* Theme Settings */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
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
  );
}
