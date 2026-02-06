import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2, Mail, Lock, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const { signIn } = useAuth();
  const { direction } = useLanguage();
  const navigate = useNavigate();

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
      
      // Auto sign in after signup
      const { error: signInError } = await signIn(email, password);
      if (!signInError) {
        navigate('/');
      }
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

      toast.success(
        direction === 'rtl'
          ? 'تم تسجيل الدخول بنجاح!'
          : 'Login successful!'
      );
      navigate('/');
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-2xl">Q</span>
          </div>
          <div>
            <CardTitle className="text-2xl font-bold">
              {direction === 'rtl' ? 'نظام جودة الخدمة' : 'SQCS'}
            </CardTitle>
            <CardDescription>
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
  );
}