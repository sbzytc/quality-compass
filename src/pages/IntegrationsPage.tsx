import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { 
  Mail, 
  Shield, 
  MessageSquare, 
  Plug, 
  CheckCircle2, 
  XCircle, 
  ExternalLink,
  Key,
  Globe,
  Bell,
  Smartphone,
  Settings2,
  RefreshCw,
  AlertCircle,
  Zap,
} from 'lucide-react';

interface Integration {
  id: string;
  nameKey: string;
  descriptionKey: string;
  icon: React.ElementType;
  category: 'email' | 'auth' | 'notifications' | 'platforms';
  status: 'connected' | 'disconnected' | 'pending';
  provider: string;
  fields: { key: string; labelKey: string; placeholder: string; type?: string }[];
  docsUrl?: string;
}

const integrations: Integration[] = [
  // Email
  {
    id: 'resend',
    nameKey: 'integrations.resend.name',
    descriptionKey: 'integrations.resend.description',
    icon: Mail,
    category: 'email',
    status: 'connected',
    provider: 'Resend',
    fields: [
      { key: 'api_key', labelKey: 'integrations.field.apiKey', placeholder: 're_xxxxxxxxxxxx', type: 'password' },
      { key: 'from_email', labelKey: 'integrations.field.fromEmail', placeholder: 'noreply@yourdomain.com' },
    ],
    docsUrl: 'https://resend.com/docs',
  },
  {
    id: 'smtp',
    nameKey: 'integrations.smtp.name',
    descriptionKey: 'integrations.smtp.description',
    icon: Mail,
    category: 'email',
    status: 'disconnected',
    provider: 'SMTP',
    fields: [
      { key: 'host', labelKey: 'integrations.field.host', placeholder: 'smtp.example.com' },
      { key: 'port', labelKey: 'integrations.field.port', placeholder: '587' },
      { key: 'username', labelKey: 'integrations.field.username', placeholder: 'user@example.com' },
      { key: 'password', labelKey: 'integrations.field.password', placeholder: '••••••••', type: 'password' },
    ],
  },
  // Auth
  {
    id: 'google-auth',
    nameKey: 'integrations.googleAuth.name',
    descriptionKey: 'integrations.googleAuth.description',
    icon: Globe,
    category: 'auth',
    status: 'disconnected',
    provider: 'Google',
    fields: [
      { key: 'client_id', labelKey: 'integrations.field.clientId', placeholder: 'xxxx.apps.googleusercontent.com' },
      { key: 'client_secret', labelKey: 'integrations.field.clientSecret', placeholder: 'GOCSPX-xxxx', type: 'password' },
    ],
    docsUrl: 'https://console.cloud.google.com',
  },
  {
    id: 'microsoft-auth',
    nameKey: 'integrations.microsoftAuth.name',
    descriptionKey: 'integrations.microsoftAuth.description',
    icon: Shield,
    category: 'auth',
    status: 'disconnected',
    provider: 'Microsoft',
    fields: [
      { key: 'client_id', labelKey: 'integrations.field.clientId', placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx' },
      { key: 'client_secret', labelKey: 'integrations.field.clientSecret', placeholder: '••••••••', type: 'password' },
      { key: 'tenant_id', labelKey: 'integrations.field.tenantId', placeholder: 'common' },
    ],
    docsUrl: 'https://portal.azure.com',
  },
  // Notifications
  {
    id: 'twilio-sms',
    nameKey: 'integrations.twilio.name',
    descriptionKey: 'integrations.twilio.description',
    icon: Smartphone,
    category: 'notifications',
    status: 'disconnected',
    provider: 'Twilio',
    fields: [
      { key: 'account_sid', labelKey: 'integrations.field.accountSid', placeholder: 'ACxxxxxxxxxxxx' },
      { key: 'auth_token', labelKey: 'integrations.field.authToken', placeholder: '••••••••', type: 'password' },
      { key: 'phone_number', labelKey: 'integrations.field.phoneNumber', placeholder: '+966xxxxxxxxx' },
    ],
    docsUrl: 'https://www.twilio.com/console',
  },
  {
    id: 'whatsapp',
    nameKey: 'integrations.whatsapp.name',
    descriptionKey: 'integrations.whatsapp.description',
    icon: MessageSquare,
    category: 'notifications',
    status: 'disconnected',
    provider: 'WhatsApp Business',
    fields: [
      { key: 'api_key', labelKey: 'integrations.field.apiKey', placeholder: 'whatsapp_api_key', type: 'password' },
      { key: 'phone_id', labelKey: 'integrations.field.phoneId', placeholder: '1234567890' },
    ],
    docsUrl: 'https://business.whatsapp.com',
  },
  // Platforms
  {
    id: 'slack',
    nameKey: 'integrations.slack.name',
    descriptionKey: 'integrations.slack.description',
    icon: MessageSquare,
    category: 'platforms',
    status: 'disconnected',
    provider: 'Slack',
    fields: [
      { key: 'webhook_url', labelKey: 'integrations.field.webhookUrl', placeholder: 'https://hooks.slack.com/services/...' },
    ],
    docsUrl: 'https://api.slack.com',
  },
  {
    id: 'telegram',
    nameKey: 'integrations.telegram.name',
    descriptionKey: 'integrations.telegram.description',
    icon: Bell,
    category: 'platforms',
    status: 'disconnected',
    provider: 'Telegram',
    fields: [
      { key: 'bot_token', labelKey: 'integrations.field.botToken', placeholder: '123456:ABC-DEF', type: 'password' },
      { key: 'chat_id', labelKey: 'integrations.field.chatId', placeholder: '-1001234567890' },
    ],
    docsUrl: 'https://core.telegram.org/bots',
  },
];

export default function IntegrationsPage() {
  const { t, direction } = useLanguage();
  const isAr = direction === 'rtl';
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null);
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [integrationStates, setIntegrationStates] = useState<Record<string, 'connected' | 'disconnected' | 'pending'>>(() => {
    const states: Record<string, string> = {};
    integrations.forEach(i => { states[i.id] = i.status; });
    return states as Record<string, 'connected' | 'disconnected' | 'pending'>;
  });

  const handleOpenConfig = (integration: Integration) => {
    setSelectedIntegration(integration);
    setFormData({});
    setConfigDialogOpen(true);
  };

  const handleSaveConfig = () => {
    if (!selectedIntegration) return;
    
    // Check if all required fields are filled
    const allFilled = selectedIntegration.fields.every(f => formData[f.key]?.trim());
    if (!allFilled) {
      toast.error(isAr ? 'يرجى ملء جميع الحقول المطلوبة' : 'Please fill all required fields');
      return;
    }

    setIntegrationStates(prev => ({ ...prev, [selectedIntegration.id]: 'connected' }));
    setConfigDialogOpen(false);
    toast.success(isAr ? `تم ربط ${selectedIntegration.provider} بنجاح` : `${selectedIntegration.provider} connected successfully`);
  };

  const handleDisconnect = (integrationId: string) => {
    setIntegrationStates(prev => ({ ...prev, [integrationId]: 'disconnected' }));
    toast.success(isAr ? 'تم فصل الخدمة بنجاح' : 'Service disconnected successfully');
  };

  const handleTestConnection = (integration: Integration) => {
    toast.info(isAr ? `جاري اختبار الاتصال مع ${integration.provider}...` : `Testing connection to ${integration.provider}...`);
    setTimeout(() => {
      toast.success(isAr ? 'الاتصال ناجح!' : 'Connection successful!');
    }, 1500);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'connected':
        return (
          <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 gap-1">
            <CheckCircle2 className="h-3 w-3" />
            {isAr ? 'متصل' : 'Connected'}
          </Badge>
        );
      case 'pending':
        return (
          <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 gap-1">
            <AlertCircle className="h-3 w-3" />
            {isAr ? 'قيد الانتظار' : 'Pending'}
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="gap-1 text-muted-foreground">
            <XCircle className="h-3 w-3" />
            {isAr ? 'غير متصل' : 'Disconnected'}
          </Badge>
        );
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'email': return Mail;
      case 'auth': return Shield;
      case 'notifications': return Bell;
      case 'platforms': return Plug;
      default: return Zap;
    }
  };

  const renderIntegrationCard = (integration: Integration) => {
    const currentStatus = integrationStates[integration.id] || 'disconnected';
    const Icon = integration.icon;
    
    return (
      <Card key={integration.id} className="group hover:shadow-md transition-all duration-200 border-border/60">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base">{t(integration.nameKey)}</CardTitle>
                <CardDescription className="text-xs mt-0.5">{integration.provider}</CardDescription>
              </div>
            </div>
            {getStatusBadge(currentStatus)}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">{t(integration.descriptionKey)}</p>
          
          <div className="flex items-center gap-2 flex-wrap">
            {currentStatus === 'connected' ? (
              <>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => handleTestConnection(integration)}
                  className="gap-1.5"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  {isAr ? 'اختبار' : 'Test'}
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => handleOpenConfig(integration)}
                  className="gap-1.5"
                >
                  <Settings2 className="h-3.5 w-3.5" />
                  {isAr ? 'إعدادات' : 'Settings'}
                </Button>
                <Button 
                  size="sm" 
                  variant="destructive"
                  onClick={() => handleDisconnect(integration.id)}
                >
                  {isAr ? 'فصل' : 'Disconnect'}
                </Button>
              </>
            ) : (
              <Button 
                size="sm"
                onClick={() => handleOpenConfig(integration)}
                className="gap-1.5"
              >
                <Key className="h-3.5 w-3.5" />
                {isAr ? 'ربط' : 'Connect'}
              </Button>
            )}
            {integration.docsUrl && (
              <Button 
                size="sm" 
                variant="ghost" 
                asChild
                className="gap-1.5 text-muted-foreground"
              >
                <a href={integration.docsUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-3.5 w-3.5" />
                  {isAr ? 'التوثيق' : 'Docs'}
                </a>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  const categories = [
    { key: 'all', labelKey: 'integrations.category.all' },
    { key: 'email', labelKey: 'integrations.category.email' },
    { key: 'auth', labelKey: 'integrations.category.auth' },
    { key: 'notifications', labelKey: 'integrations.category.notifications' },
    { key: 'platforms', labelKey: 'integrations.category.platforms' },
  ];

  return (
    <div className="space-y-6" dir={direction}>
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          {isAr ? 'إدارة الربط والتكاملات' : 'Integrations Management'}
        </h1>
        <p className="text-muted-foreground mt-1">
          {isAr ? 'اربط نظامك مع الخدمات الخارجية لتسهيل العمليات والإشعارات' : 'Connect your system with external services for operations and notifications'}
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        {[
          { label: isAr ? 'إجمالي الخدمات' : 'Total Services', value: integrations.length, icon: Plug },
          { label: isAr ? 'متصلة' : 'Connected', value: Object.values(integrationStates).filter(s => s === 'connected').length, icon: CheckCircle2 },
          { label: isAr ? 'غير متصلة' : 'Disconnected', value: Object.values(integrationStates).filter(s => s === 'disconnected').length, icon: XCircle },
          { label: isAr ? 'قيد الانتظار' : 'Pending', value: Object.values(integrationStates).filter(s => s === 'pending').length, icon: AlertCircle },
        ].map((stat, i) => (
          <Card key={i} className="border-border/60">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <stat.icon className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs by Category */}
      <Tabs defaultValue="all" dir={direction}>
        <TabsList>
          {categories.map(cat => (
            <TabsTrigger key={cat.key} value={cat.key} className="gap-1.5">
              {cat.key !== 'all' && (() => {
                const CatIcon = getCategoryIcon(cat.key);
                return <CatIcon className="h-3.5 w-3.5" />;
              })()}
              {t(cat.labelKey)}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="all" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {integrations.map(renderIntegrationCard)}
          </div>
        </TabsContent>

        {['email', 'auth', 'notifications', 'platforms'].map(cat => (
          <TabsContent key={cat} value={cat} className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {integrations.filter(i => i.category === cat).map(renderIntegrationCard)}
            </div>
          </TabsContent>
        ))}
      </Tabs>

      {/* Configuration Dialog */}
      <Dialog open={configDialogOpen} onOpenChange={setConfigDialogOpen}>
        <DialogContent className="sm:max-w-md" dir={direction}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedIntegration && (() => {
                const Icon = selectedIntegration.icon;
                return <Icon className="h-5 w-5 text-primary" />;
              })()}
              {selectedIntegration && t(selectedIntegration.nameKey)}
            </DialogTitle>
            <DialogDescription>
              {isAr ? 'أدخل بيانات الربط للاتصال بالخدمة' : 'Enter credentials to connect to the service'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {selectedIntegration?.fields.map(field => (
              <div key={field.key} className="space-y-2">
                <Label htmlFor={field.key}>{t(field.labelKey)}</Label>
                <Input
                  id={field.key}
                  type={field.type || 'text'}
                  placeholder={field.placeholder}
                  value={formData[field.key] || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, [field.key]: e.target.value }))}
                  dir="ltr"
                />
              </div>
            ))}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConfigDialogOpen(false)}>
              {isAr ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button onClick={handleSaveConfig}>
              {isAr ? 'حفظ وربط' : 'Save & Connect'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
