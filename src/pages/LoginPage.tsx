import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Loader2, Mail, Lock, User, Eye, EyeOff } from 'lucide-react';
import { Languages } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import rasdaLogo from '@/assets/rasdah-logo.png';
import { getDefaultDashboard } from '@/components/ProtectedRoute';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [showForcePasswordChange, setShowForcePasswordChange] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const { signIn, user, roles, loading: authLoading } = useAuth();
  const { direction, language, setLanguage } = useLanguage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const rawNext = searchParams.get('next');
  const nextPath = rawNext && rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : null;

  // Redirect if already logged in (and not showing force password change)
  useEffect(() => {
    if (!authLoading && user && roles.length > 0 && !showForcePasswordChange) {
      navigate(nextPath ?? getDefaultDashboard(roles), { replace: true });
    }
  }, [user, roles, authLoading, navigate, showForcePasswordChange, nextPath]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (isSignUp) {
      // Sign up flow
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin,
        },
      });

      if (error) {
        toast.error(error.message);
        setLoading(false);
        return;
      }

      if (data.user) {
        // Create profile and assign default role
        const { error: profileError } = await supabase.rpc('create_user_profile', {
          _user_id: data.user.id,
          _email: email,
          _full_name: fullName,
          _role: 'assessor',
        });

        if (profileError) {
          console.error('Profile creation error:', profileError);
        }
      }

      toast.success(
        direction === 'rtl'
          ? 'تم إنشاء الحساب بنجاح! جاري تسجيل الدخول...'
          : 'Account created successfully! Logging in...'
      );
      
      // Auto sign in after signup - the useEffect will handle redirect
      await signIn(email, password);
      // Small delay to allow auth state to update
      setTimeout(() => {
        navigate('/dashboard/auditor', { replace: true });
      }, 100);
    } else {
      // Sign in flow
      const { error } = await signIn(email, password);

      if (error) {
        toast.error(
          direction === 'rtl' 
            ? 'خطأ في تسجيل الدخول. يرجى التحقق من بياناتك.'
            : 'Login failed. Please check your credentials.'
        );
        setLoading(false);
        return;
      }

      // Check if user needs to change password
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (currentUser) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('force_password_change')
          .eq('user_id', currentUser.id)
          .single();

        if (profileData?.force_password_change) {
          setShowForcePasswordChange(true);
          setLoading(false);
          return;
        }
      }

      toast.success(
        direction === 'rtl'
          ? 'تم تسجيل الدخول بنجاح!'
          : 'Login successful!'
      );
      // Redirect is handled by the useEffect once roles load,
      // so admin users go to /admin and other users go to their own dashboard.
    }

    setLoading(false);
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmNewPassword) {
      toast.error(direction === 'rtl' ? 'كلمات المرور غير متطابقة' : 'Passwords do not match');
      return;
    }
    if (newPassword.length < 8 || !/[A-Za-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      toast.error(direction === 'rtl'
        ? 'كلمة المرور يجب ألا تقل عن 8 أحرف وتحتوي على حرف ورقم'
        : 'Password must be at least 8 characters and include a letter and a number');
      return;
    }

    setChangingPassword(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      if (updateError) throw updateError;

      // Clear the force_password_change flag
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (currentUser) {
        await supabase
          .from('profiles')
          .update({ force_password_change: false })
          .eq('user_id', currentUser.id);
      }

      toast.success(direction === 'rtl' ? 'تم تغيير كلمة المرور بنجاح!' : 'Password changed successfully!');
      setShowForcePasswordChange(false);
      navigate('/', { replace: true });
    } catch (error: any) {
      toast.error(error.message || (direction === 'rtl' ? 'فشل تغيير كلمة المرور' : 'Failed to change password'));
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <>
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="absolute top-4 end-4">
        <Button
          variant="outline"
          size="sm"
          className="h-8 px-3 gap-1.5 text-[13px] font-medium"
          onClick={() => setLanguage(language === 'en' ? 'ar' : 'en')}
        >
          <Languages className="h-3.5 w-3.5" />
          <span>{language === 'en' ? 'العربية' : 'English'}</span>
        </Button>
      </div>
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-1">
          <img src={rasdaLogo} alt="Rasda" className="mx-auto w-52 h-52 object-contain" />
          <div>
            <CardDescription className="text-muted-foreground">
              {isSignUp
                ? (direction === 'rtl' ? 'إنشاء حساب جديد' : 'Create a new account')
                : (direction === 'rtl' ? 'تسجيل الدخول إلى حسابك' : 'Sign in to your account')
              }
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <div className="space-y-2">
                <Label htmlFor="fullName">
                  {direction === 'rtl' ? 'الاسم الكامل' : 'Full Name'}
                </Label>
                <div className="relative">
                  <User className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="fullName"
                    type="text"
                    placeholder={direction === 'rtl' ? 'أدخل اسمك الكامل' : 'Enter your full name'}
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="ps-10"
                    required
                  />
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">
                {direction === 'rtl' ? 'البريد الإلكتروني' : 'Email'}
              </Label>
              <div className="relative">
                <Mail className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder={direction === 'rtl' ? 'أدخل بريدك الإلكتروني' : 'Enter your email'}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="ps-10"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">
                {direction === 'rtl' ? 'كلمة المرور' : 'Password'}
              </Label>
              <div className="relative">
                <Lock className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder={direction === 'rtl' ? 'أدخل كلمة المرور' : 'Enter your password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="ps-10"
                  required
                  minLength={6}
                />
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin me-2" />
                  {direction === 'rtl' ? 'جاري التحميل...' : 'Loading...'}
                </>
              ) : (
                isSignUp
                  ? (direction === 'rtl' ? 'إنشاء حساب' : 'Sign Up')
                  : (direction === 'rtl' ? 'تسجيل الدخول' : 'Sign In')
              )}
            </Button>
          </form>
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-sm text-primary hover:underline"
            >
              {isSignUp
                ? (direction === 'rtl' ? 'لديك حساب؟ تسجيل الدخول' : 'Already have an account? Sign In')
                : (direction === 'rtl' ? 'ليس لديك حساب؟ إنشاء حساب' : "Don't have an account? Sign Up")
              }
            </button>
          </div>
        </CardContent>
      </Card>
    </div>

      {/* Force Password Change Dialog */}
      <Dialog open={showForcePasswordChange} onOpenChange={() => {}}>
        <DialogContent className="max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>{direction === 'rtl' ? 'تغيير كلمة المرور' : 'Change Your Password'}</DialogTitle>
            <DialogDescription>
              {direction === 'rtl'
                ? 'يرجى تعيين كلمة مرور جديدة للمتابعة'
                : 'Please set a new password to continue'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{direction === 'rtl' ? 'كلمة المرور الجديدة' : 'New Password'}</Label>
              <div className="relative">
                <Input
                  type={showNewPassword ? 'text' : 'password'}
                  placeholder={direction === 'rtl' ? 'أدخل كلمة المرور الجديدة' : 'Enter new password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute end-0 top-0 h-full px-3"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>{direction === 'rtl' ? 'تأكيد كلمة المرور' : 'Confirm Password'}</Label>
              <Input
                type={showNewPassword ? 'text' : 'password'}
                placeholder={direction === 'rtl' ? 'أعد إدخال كلمة المرور' : 'Re-enter password'}
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
              />
              {newPassword && confirmNewPassword && newPassword !== confirmNewPassword && (
                <p className="text-xs text-destructive">
                  {direction === 'rtl' ? 'كلمات المرور غير متطابقة' : 'Passwords do not match'}
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={handleChangePassword}
              disabled={changingPassword || !newPassword || newPassword !== confirmNewPassword}
            >
              {changingPassword && <Loader2 className="w-4 h-4 me-2 animate-spin" />}
              {direction === 'rtl' ? 'تغيير كلمة المرور' : 'Change Password'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}