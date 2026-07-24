import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Building2, ClipboardCheck, MessageSquareWarning, ListChecks,
  FileText, LayoutDashboard, BellRing, ShieldCheck,
  ArrowLeft, Mail, Lock, Loader2, Languages, CheckCircle2, Sparkles,
  Store, Stethoscope, ShoppingBag, Warehouse, Briefcase, Home as HomeIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { getDefaultDashboard } from '@/components/ProtectedRoute';
import rasdaLogo from '@/assets/rasdah-logo.png';

export default function LandingPage() {
  const { signIn, user, roles, loading: authLoading } = useAuth();
  const { language, setLanguage, direction } = useLanguage();
  const navigate = useNavigate();
  const isRTL = direction === 'rtl';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const loginRef = useRef<HTMLDivElement>(null);
  const contactRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!authLoading && user && roles.length > 0) {
      navigate(getDefaultDashboard(roles), { replace: true });
    }
  }, [user, roles, authLoading, navigate]);

  const scrollTo = (ref: React.RefObject<HTMLDivElement>) => {
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await signIn(email, password);
    if (error) {
      toast.error(isRTL ? 'خطأ في تسجيل الدخول. تحقق من بياناتك.' : 'Login failed. Check your credentials.');
      setLoading(false);
      return;
    }
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (currentUser) {
      const { data: profileData } = await supabase
        .from('profiles').select('force_password_change')
        .eq('user_id', currentUser.id).single();
      if (profileData?.force_password_change) {
        navigate('/login');
        return;
      }
    }
    toast.success(isRTL ? 'تم تسجيل الدخول بنجاح!' : 'Login successful!');
    setLoading(false);
  };

  const nav = [
    { id: 'home', label: isRTL ? 'الرئيسية' : 'Home' },
    { id: 'about', label: isRTL ? 'عن رصدة' : 'About' },
    { id: 'features', label: isRTL ? 'المزايا' : 'Features' },
    { id: 'how', label: isRTL ? 'كيف تعمل' : 'How it works' },
    { id: 'vision', label: isRTL ? 'رؤية 2030' : 'Vision 2030' },
    { id: 'contact', label: isRTL ? 'تواصل معنا' : 'Contact' },
  ];

  const features = [
    { icon: Building2, title: isRTL ? 'إدارة الفروع' : 'Branch Management',
      desc: isRTL ? 'متابعة بيانات الفروع وحالتها من لوحة مركزية موحدة.' : 'Track branch data and status from one unified dashboard.' },
    { icon: ClipboardCheck, title: isRTL ? 'التقييمات وقوائم الفحص' : 'Evaluations & Checklists',
      desc: isRTL ? 'تنفيذ تقييمات منظمة وفق المعايير المناسبة لنشاط منشأتك.' : 'Structured evaluations aligned with your standards.' },
    { icon: MessageSquareWarning, title: isRTL ? 'إدارة الملاحظات' : 'Findings Management',
      desc: isRTL ? 'تسجيل الملاحظات وربطها بالفرع والمتطلب والمسؤول عن المعالجة.' : 'Log findings linked to branch, requirement, and owner.' },
    { icon: ListChecks, title: isRTL ? 'متابعة الإجراءات' : 'Action Tracking',
      desc: isRTL ? 'تحديد الإجراء المطلوب ومتابعته حتى اكتمال المعالجة والإغلاق.' : 'Assign corrective actions and follow them to closure.' },
    { icon: FileText, title: isRTL ? 'الأدلة والمستندات' : 'Evidence & Documents',
      desc: isRTL ? 'حفظ الصور والوثائق والمستندات الداعمة ضمن سجل منظم.' : 'Photos and documents in one organized record.' },
    { icon: LayoutDashboard, title: isRTL ? 'لوحات المتابعة' : 'Dashboards',
      desc: isRTL ? 'مؤشرات واضحة لحالة الفروع والتقييمات والملاحظات للإدارة.' : 'Clear KPIs for branches, evaluations, and findings.' },
    { icon: BellRing, title: isRTL ? 'التنبيهات والتذكيرات' : 'Alerts & Reminders',
      desc: isRTL ? 'تنبيه المستخدمين بالمهام والملاحظات التي تحتاج إلى تدخل.' : 'Timely nudges for tasks that need attention.' },
    { icon: ShieldCheck, title: isRTL ? 'الصلاحيات' : 'Roles & Permissions',
      desc: isRTL ? 'تحديد مستوى الوصول لكل مستخدم بحسب دوره ومسؤوليته.' : 'Access levels tuned to each user role.' },
  ];

  const steps = [
    { n: '1', title: isRTL ? 'إضافة الفروع' : 'Add branches',
      desc: isRTL ? 'تسجيل بيانات الفروع والمعلومات الأساسية المرتبطة بها.' : 'Register branches and their core information.' },
    { n: '2', title: isRTL ? 'تحديد المعايير' : 'Set standards',
      desc: isRTL ? 'اختيار المتطلبات أو قوائم الفحص المناسبة لكل فرع.' : 'Pick requirements and checklists per branch.' },
    { n: '3', title: isRTL ? 'تنفيذ التقييم' : 'Run evaluations',
      desc: isRTL ? 'تسجيل النتائج والملاحظات وإرفاق الأدلة عبر المنصة.' : 'Record results, findings, and evidence.' },
    { n: '4', title: isRTL ? 'تعيين المسؤوليات' : 'Assign owners',
      desc: isRTL ? 'إسناد الإجراءات وتحديد موعد للمعالجة.' : 'Route actions and set due dates.' },
    { n: '5', title: isRTL ? 'متابعة التنفيذ' : 'Track execution',
      desc: isRTL ? 'متابعة حالة الإجراءات والتحقق من الاكتمال.' : 'Monitor actions and verify closure.' },
    { n: '6', title: isRTL ? 'قراءة المؤشرات' : 'Read the KPIs',
      desc: isRTL ? 'الاطلاع على حالة الفروع ونقاط التحسين من لوحة مركزية.' : 'Read branch health from a central dashboard.' },
  ];

  const values = [
    isRTL ? 'مواءمة أفضل بين الفروع والمعايير المعتمدة.' : 'Better alignment between branches and standards.',
    isRTL ? 'رؤية أوضح لحالة كل فرع ونقاط التحسين.' : 'Clearer view of each branch and its improvement areas.',
    isRTL ? 'توحيد أسلوب التقييم والمتابعة بين المواقع.' : 'Unified evaluation and follow-up across locations.',
    isRTL ? 'تحديد واضح للمسؤوليات ومواعيد المعالجة.' : 'Clear ownership and due dates for every action.',
    isRTL ? 'تقليل الاعتماد على الجداول والمراسلات المتفرقة.' : 'Less scattered spreadsheets and email chains.',
    isRTL ? 'توثيق مركزي للنتائج والإجراءات والأدلة.' : 'Central record for results, actions, and evidence.',
  ];

  const industries = [
    { icon: Store, label: isRTL ? 'المطاعم والمقاهي' : 'Restaurants & cafés' },
    { icon: ShoppingBag, label: isRTL ? 'متاجر التجزئة' : 'Retail' },
    { icon: Stethoscope, label: isRTL ? 'المنشآت الصحية' : 'Healthcare' },
    { icon: Warehouse, label: isRTL ? 'المستودعات' : 'Warehouses' },
    { icon: Briefcase, label: isRTL ? 'الشركات الخدمية' : 'Services' },
    { icon: HomeIcon, label: isRTL ? 'المنشآت العقارية' : 'Real estate' },
  ];

  const Arrow = () => <ArrowLeft className={`w-4 h-4 ${isRTL ? '' : 'rotate-180'}`} />;

  return (
    <div dir={direction} className="min-h-screen bg-gradient-to-br from-[#edf3ff] via-[#e8eff9] to-[#dfe9f5] text-foreground">
      {/* Ambient background blobs */}
      <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden -z-10">
        <div className="absolute -top-40 -end-40 w-[560px] h-[560px] rounded-full bg-primary/15 blur-3xl" />
        <div className="absolute top-1/3 -start-40 w-[520px] h-[520px] rounded-full bg-accent/20 blur-3xl" />
        <div className="absolute -bottom-40 end-1/3 w-[520px] h-[520px] rounded-full bg-primary/10 blur-3xl" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-white/50 border-b border-white/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <button onClick={() => scrollTo({ current: document.getElementById('home') } as any)} className="flex items-center gap-2">
            <img src={rasdaLogo} alt="Rasdah" className="h-10 w-auto object-contain" />
          </button>
          <nav className="hidden lg:flex items-center gap-1">
            {nav.map((n) => (
              <a key={n.id} href={`#${n.id}`}
                className="px-3 py-1.5 text-sm font-medium text-[color:var(--text-secondary)] hover:text-primary rounded-full hover:bg-white/60 transition">
                {n.label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-9 px-3 gap-1.5"
              onClick={() => setLanguage(language === 'en' ? 'ar' : 'en')}>
              <Languages className="h-3.5 w-3.5" />
              <span>{language === 'en' ? 'العربية' : 'English'}</span>
            </Button>
            <Button size="sm" className="h-9 px-4 hidden sm:inline-flex" onClick={() => scrollTo(loginRef)}>
              {isRTL ? 'تسجيل الدخول' : 'Sign in'}
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section id="home" className="relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-16 pb-24 lg:pt-24 lg:pb-32 grid lg:grid-cols-2 gap-12 items-center">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/70 border border-white/70 text-xs font-medium text-primary mb-6">
              <Sparkles className="w-3.5 h-3.5" />
              {isRTL ? 'منصة رقمية لمواءمة أداء الفروع' : 'Digital platform to align branch performance'}
            </div>
            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.15] tracking-tight text-[color:var(--text-primary)]">
              {isRTL ? (<>مواءمة أدق.<br/><span className="text-primary">جودة قابلة للقياس.</span></>)
                     : (<>Sharper alignment.<br/><span className="text-primary">Measurable quality.</span></>)}
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-[color:var(--text-secondary)] max-w-xl">
              {isRTL
                ? 'رصدة منصة رقمية تساعد المنشآت متعددة الفروع على توحيد المتابعة والتقييم، ومواءمة الأداء مع المعايير المعتمدة من مكان واحد.'
                : 'Rasdah unifies follow-up and evaluation across multi-branch operations, aligning performance with your approved standards — in one place.'}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button size="lg" className="h-12 px-6 text-base gap-2" onClick={() => scrollTo(contactRef)}>
                {isRTL ? 'اطلب عرضًا توضيحيًا' : 'Request a demo'} <Arrow />
              </Button>
              <Button size="lg" variant="outline" className="h-12 px-6 text-base bg-white/60" onClick={() => scrollTo(loginRef)}>
                {isRTL ? 'تسجيل الدخول' : 'Sign in'}
              </Button>
            </div>
          </motion.div>

          {/* Login card (hero side) */}
          <motion.div ref={loginRef} id="login"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.15 }}
            className="relative">
            <div className="absolute -inset-4 bg-gradient-to-br from-primary/20 to-accent/20 rounded-[32px] blur-2xl -z-10" />
            <div className="rounded-[28px] bg-white/75 backdrop-blur-2xl border border-white/70 shadow-2xl p-8 sm:p-10">
              <div className="text-center mb-6">
                <img src={rasdaLogo} alt="Rasdah" className="h-20 w-auto mx-auto object-contain mb-2" />
                <p className="text-sm text-[color:var(--text-secondary)]">
                  {isRTL ? 'تسجيل الدخول إلى حسابك' : 'Sign in to your account'}
                </p>
              </div>
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="landing-email">{isRTL ? 'البريد الإلكتروني' : 'Email'}</Label>
                  <div className="relative">
                    <Mail className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input id="landing-email" type="email" required autoComplete="email"
                      placeholder={isRTL ? 'أدخل بريدك الإلكتروني' : 'Enter your email'}
                      value={email} onChange={(e) => setEmail(e.target.value)} className="ps-10 h-11" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="landing-password">{isRTL ? 'كلمة المرور' : 'Password'}</Label>
                  <div className="relative">
                    <Lock className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input id="landing-password" type="password" required autoComplete="current-password" minLength={6}
                      placeholder={isRTL ? 'أدخل كلمة المرور' : 'Enter your password'}
                      value={password} onChange={(e) => setPassword(e.target.value)} className="ps-10 h-11" />
                  </div>
                </div>
                <Button type="submit" className="w-full h-11 text-base" disabled={loading}>
                  {loading ? (<><Loader2 className="w-4 h-4 animate-spin me-2" />{isRTL ? 'جاري التحميل...' : 'Loading...'}</>)
                    : (isRTL ? 'تسجيل الدخول' : 'Sign in')}
                </Button>
              </form>
              <p className="mt-5 text-xs text-center text-[color:var(--text-muted-glass)]">
                {isRTL ? 'ليس لديك حساب؟ تواصل مع مسؤول النظام في منشأتك.' : 'No account? Contact your organization admin.'}
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* About */}
      <section id="about" className="py-20 lg:py-28">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center">
          <div className="text-xs font-semibold tracking-wider uppercase text-primary mb-3">
            {isRTL ? 'عن رصدة' : 'About'}
          </div>
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-[color:var(--text-primary)] mb-6">
            {isRTL ? 'رؤية موحدة لجميع فروعك' : 'One unified view of every branch'}
          </h2>
          <p className="text-lg leading-relaxed text-[color:var(--text-secondary)]">
            {isRTL
              ? 'مع تعدد الفروع، قد تختلف طرق التقييم والمتابعة، وتتوزع الملاحظات بين عدة جهات وأدوات. صُممت رصدة لتوحيد هذه العمليات ضمن منصة واحدة تربط الفروع بالمعايير والملاحظات والإجراءات والمسؤوليات — لترفع مستوى المواءمة، وتتابع جودة التنفيذ، وتعالج الفجوات ضمن مسار واضح وقابل للقياس.'
              : 'When branches multiply, methods diverge and findings scatter. Rasdah unifies those processes on one platform — linking branches to standards, findings, actions, and owners — so alignment rises, quality is tracked, and gaps close on a clear, measurable path.'}
          </p>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14 max-w-3xl mx-auto">
            <div className="text-xs font-semibold tracking-wider uppercase text-primary mb-3">
              {isRTL ? 'المزايا الرئيسية' : 'Key features'}
            </div>
            <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-[color:var(--text-primary)]">
              {isRTL ? 'كل ما تحتاجه للمتابعة اليومية في مكان واحد' : 'Everything you need to run daily follow-up — in one place'}
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {features.map((f, i) => {
              const Icon = f.icon;
              return (
                <motion.div key={i}
                  initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.04 }}
                  className="group rounded-2xl p-6 bg-white/70 backdrop-blur-xl border border-white/70 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="font-display text-lg font-bold text-[color:var(--text-primary)] mb-1.5">{f.title}</h3>
                  <p className="text-sm leading-relaxed text-[color:var(--text-secondary)]">{f.desc}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14 max-w-3xl mx-auto">
            <div className="text-xs font-semibold tracking-wider uppercase text-primary mb-3">
              {isRTL ? 'كيف تعمل رصدة' : 'How Rasdah works'}
            </div>
            <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-[color:var(--text-primary)]">
              {isRTL ? 'من التقييم إلى المعالجة — بست خطوات' : 'From evaluation to closure — in six steps'}
            </h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {steps.map((s, i) => (
              <motion.div key={i}
                initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.05 }}
                className="relative rounded-2xl p-6 bg-gradient-to-br from-white/80 to-white/50 backdrop-blur-xl border border-white/70 shadow-sm">
                <div className="absolute top-4 end-4 font-display text-5xl font-bold text-primary/15 leading-none">{s.n}</div>
                <div className="relative">
                  <div className="w-9 h-9 rounded-lg bg-primary text-primary-foreground font-bold flex items-center justify-center mb-4 text-sm">{s.n}</div>
                  <h3 className="font-display text-lg font-bold text-[color:var(--text-primary)] mb-1.5">{s.title}</h3>
                  <p className="text-sm leading-relaxed text-[color:var(--text-secondary)]">{s.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Vision 2030 */}
      <section id="vision" className="py-20 lg:py-28">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="rounded-3xl p-10 lg:p-16 bg-gradient-to-br from-primary to-accent text-primary-foreground relative overflow-hidden">
            <div className="absolute -top-20 -end-20 w-80 h-80 rounded-full bg-white/10 blur-3xl" />
            <div className="absolute -bottom-20 -start-20 w-80 h-80 rounded-full bg-white/10 blur-3xl" />
            <div className="relative max-w-3xl">
              <div className="text-xs font-semibold tracking-wider uppercase opacity-80 mb-3">
                {isRTL ? 'مواءمة مع رؤية 2030' : 'Aligned with Vision 2030'}
              </div>
              <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold mb-6 leading-tight">
                {isRTL ? 'من المتابعة المتفرقة إلى منظومة رقمية قابلة للقياس' : 'From scattered follow-up to a measurable digital system'}
              </h2>
              <p className="text-lg leading-relaxed opacity-95">
                {isRTL
                  ? 'تنسجم رصدة مع توجهات رؤية السعودية 2030 في دعم التحول الرقمي، رفع كفاءة الأداء، تعزيز الشفافية والمساءلة، والارتقاء بجودة الخدمات — لتحويل المتابعة من إجراءات متفرقة إلى عملية رقمية موحدة وقابلة للقياس.'
                  : 'Rasdah aligns with Saudi Vision 2030 directions in digital transformation, operational efficiency, transparency and accountability — turning scattered follow-up into a unified, measurable digital process.'}
              </p>
              <p className="mt-6 text-xs opacity-70">
                {isRTL ? '*رصدة تنسجم مع توجهات رؤية 2030 دون الادعاء بأي اعتماد أو شراكة رسمية.' : '*Rasdah aligns with Vision 2030 directions without claiming any official endorsement or partnership.'}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Value + Industries */}
      <section className="py-20 lg:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 grid lg:grid-cols-2 gap-10">
          <div className="rounded-3xl p-8 lg:p-10 bg-white/70 backdrop-blur-xl border border-white/70 shadow-sm">
            <div className="text-xs font-semibold tracking-wider uppercase text-primary mb-3">
              {isRTL ? 'القيمة التي تقدمها رصدة' : 'The value Rasdah brings'}
            </div>
            <h3 className="font-display text-2xl sm:text-3xl font-bold text-[color:var(--text-primary)] mb-6">
              {isRTL ? 'نتائج ملموسة، من اليوم الأول' : 'Tangible outcomes, from day one'}
            </h3>
            <ul className="space-y-3">
              {values.map((v, i) => (
                <li key={i} className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <span className="text-[color:var(--text-secondary)] leading-relaxed">{v}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-3xl p-8 lg:p-10 bg-white/70 backdrop-blur-xl border border-white/70 shadow-sm">
            <div className="text-xs font-semibold tracking-wider uppercase text-primary mb-3">
              {isRTL ? 'لمن صُممت رصدة' : 'Who Rasdah is for'}
            </div>
            <h3 className="font-display text-2xl sm:text-3xl font-bold text-[color:var(--text-primary)] mb-6">
              {isRTL ? 'للمنشآت التي تدير عدة فروع أو مواقع' : 'Multi-branch and multi-site operators'}
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {industries.map((it, i) => {
                const Icon = it.icon;
                return (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-white/60 border border-white/70">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-sm font-medium text-[color:var(--text-primary)]">{it.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Contact */}
      <section id="contact" ref={contactRef} className="py-20 lg:py-28">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="rounded-3xl p-8 sm:p-12 bg-white/75 backdrop-blur-xl border border-white/70 shadow-xl">
            <div className="text-center mb-8">
              <div className="text-xs font-semibold tracking-wider uppercase text-primary mb-3">
                {isRTL ? 'تواصل معنا' : 'Contact us'}
              </div>
              <h2 className="font-display text-3xl sm:text-4xl font-bold text-[color:var(--text-primary)] mb-3">
                {isRTL ? 'شاهد كيف تساعد رصدة منشأتك' : 'See how Rasdah can help your organization'}
              </h2>
              <p className="text-[color:var(--text-secondary)] max-w-2xl mx-auto">
                {isRTL
                  ? 'اكتشف كيف يمكن لرصدة أن تساعدك على توحيد متابعة الفروع، ورفع مستوى المواءمة، وتحويل نتائج التقييم إلى إجراءات واضحة قابلة للمتابعة.'
                  : 'Discover how Rasdah can unify branch follow-up, raise alignment, and turn evaluation results into clear, trackable actions.'}
              </p>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); toast.success(isRTL ? 'تم استلام طلبك، سنتواصل معك قريبًا.' : 'Received. We\'ll be in touch shortly.'); (e.target as HTMLFormElement).reset(); }}
              className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2"><Label>{isRTL ? 'الاسم' : 'Name'}</Label><Input required className="h-11 bg-white/70" /></div>
              <div className="space-y-2"><Label>{isRTL ? 'اسم المنشأة' : 'Organization'}</Label><Input required className="h-11 bg-white/70" /></div>
              <div className="space-y-2"><Label>{isRTL ? 'البريد الإلكتروني' : 'Email'}</Label><Input type="email" required className="h-11 bg-white/70" /></div>
              <div className="space-y-2"><Label>{isRTL ? 'رقم الجوال' : 'Phone'}</Label><Input required className="h-11 bg-white/70" /></div>
              <div className="space-y-2"><Label>{isRTL ? 'عدد الفروع' : 'Number of branches'}</Label><Input type="number" min={1} className="h-11 bg-white/70" /></div>
              <div className="space-y-2"><Label>{isRTL ? 'طبيعة النشاط' : 'Industry'}</Label><Input className="h-11 bg-white/70" /></div>
              <div className="space-y-2 sm:col-span-2"><Label>{isRTL ? 'الرسالة' : 'Message'}</Label><Textarea rows={4} className="bg-white/70" /></div>
              <div className="sm:col-span-2 pt-2">
                <Button type="submit" size="lg" className="w-full h-12 text-base gap-2">
                  {isRTL ? 'اطلب عرضًا توضيحيًا' : 'Request a demo'} <Arrow />
                </Button>
              </div>
            </form>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/60 bg-white/40 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 grid md:grid-cols-3 gap-8">
          <div>
            <img src={rasdaLogo} alt="Rasdah" className="h-12 w-auto object-contain mb-3" />
            <p className="text-sm text-[color:var(--text-secondary)] leading-relaxed max-w-sm">
              {isRTL
                ? 'رصدة — منصة رقمية لمواءمة أداء الفروع، توحيد التقييم، ومتابعة الملاحظات من مكان واحد.'
                : 'Rasdah — a digital platform to align branch performance, unify evaluation, and follow up on findings from one place.'}
            </p>
          </div>
          <div>
            <h4 className="font-display font-bold text-[color:var(--text-primary)] mb-3 text-sm">{isRTL ? 'روابط' : 'Links'}</h4>
            <ul className="space-y-2 text-sm">
              {nav.map((n) => (
                <li key={n.id}><a className="text-[color:var(--text-secondary)] hover:text-primary" href={`#${n.id}`}>{n.label}</a></li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="font-display font-bold text-[color:var(--text-primary)] mb-3 text-sm">{isRTL ? 'عبارات مختصرة' : 'Taglines'}</h4>
            <ul className="space-y-2 text-sm text-[color:var(--text-secondary)]">
              <li>• {isRTL ? 'مواءمة أدق. جودة قابلة للقياس.' : 'Sharper alignment. Measurable quality.'}</li>
              <li>• {isRTL ? 'معايير موحدة. أداء أكثر اتساقًا.' : 'Unified standards. Consistent performance.'}</li>
              <li>• {isRTL ? 'رؤية أوضح لكل فرع.' : 'A clearer view of every branch.'}</li>
              <li>• {isRTL ? 'من التقييم إلى المعالجة.' : 'From evaluation to closure.'}</li>
            </ul>
          </div>
        </div>
        <div className="border-t border-white/60">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 text-xs text-[color:var(--text-muted-glass)] flex flex-wrap items-center justify-between gap-3">
            <span>© {new Date().getFullYear()} {isRTL ? 'رصدة. جميع الحقوق محفوظة.' : 'Rasdah. All rights reserved.'}</span>
            <div className="flex gap-4">
              <a href="#" className="hover:text-primary">{isRTL ? 'سياسة الخصوصية' : 'Privacy Policy'}</a>
              <a href="#" className="hover:text-primary">{isRTL ? 'الشروط والأحكام' : 'Terms'}</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}