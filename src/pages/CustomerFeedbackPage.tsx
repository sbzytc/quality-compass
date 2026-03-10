import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, Send, CheckCircle2, MessageSquare, User, Phone, Shield, ArrowLeft, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { useFeedbackQuestions, useSubmitFeedback, useCheckDailyLimit } from '@/hooks/useCustomerFeedback';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import rasdahLogo from '@/assets/rasdah-logo.png';

type Step = 'info' | 'otp' | 'rating' | 'complaint' | 'success';

export default function CustomerFeedbackPage() {
  const { branchId } = useParams<{ branchId: string }>();
  const [step, setStep] = useState<Step>('info');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [otpValue, setOtpValue] = useState('');
  const [scores, setScores] = useState<Record<string, number>>({});
  const [complaintText, setComplaintText] = useState('');
  const [branchName, setBranchName] = useState('');
  const [branchNameAr, setBranchNameAr] = useState('');

  const { data: questions, isLoading: questionsLoading } = useFeedbackQuestions();
  const submitMutation = useSubmitFeedback();
  const { data: alreadySubmitted } = useCheckDailyLimit(branchId || '', customerPhone);

  // Fetch branch name
  useEffect(() => {
    if (!branchId) return;
    supabase.from('branches').select('name, name_ar').eq('id', branchId).single()
      .then(({ data }) => {
        if (data) {
          setBranchName(data.name);
          setBranchNameAr(data.name_ar || data.name);
        }
      });
  }, [branchId]);

  const handleInfoSubmit = () => {
    if (!customerName.trim() || !customerPhone.trim()) {
      toast.error('يرجى إدخال الاسم ورقم الجوال');
      return;
    }
    if (customerPhone.length < 9) {
      toast.error('يرجى إدخال رقم جوال صحيح');
      return;
    }
    if (alreadySubmitted) {
      toast.error('لقد قمت بالتقييم اليوم بالفعل. يمكنك التقييم مرة أخرى غداً.');
      return;
    }
    setStep('otp');
  };

  const handleOtpVerify = () => {
    // For demo, accept any 4-digit OTP
    if (otpValue.length === 4) {
      setStep('rating');
    } else {
      toast.error('يرجى إدخال رمز التحقق');
    }
  };

  const handleRatingNext = () => {
    if (!questions) return;
    const allRated = questions.every(q => scores[q.id] && scores[q.id] > 0);
    if (!allRated) {
      toast.error('يرجى تقييم جميع العناصر');
      return;
    }
    setStep('complaint');
  };

  const handleSubmit = async () => {
    if (!branchId || !questions) return;
    try {
      await submitMutation.mutateAsync({
        branchId,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        scores: questions.map(q => ({
          questionId: q.id,
          score: scores[q.id] || 3,
        })),
        complaintText: complaintText.trim() || undefined,
      });
      setStep('success');
    } catch {
      toast.error('حدث خطأ أثناء إرسال التقييم');
    }
  };

  if (!branchId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[hsl(214,65%,28%)] to-[hsl(214,65%,18%)]">
        <p className="text-white text-xl">رابط غير صالح</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[hsl(214,65%,95%)] to-[hsl(214,65%,88%)]" dir="rtl">
      {/* Header */}
      <div className="bg-[hsl(214,65%,28%)] text-white py-6 px-4 text-center">
        <img src={rasdahLogo} alt="Rasdah" className="w-14 h-14 mx-auto mb-3 rounded-xl" />
        <h1 className="text-xl font-bold">تقييم العملاء</h1>
        <p className="text-sm text-white/70 mt-1">{branchNameAr || branchName}</p>
      </div>

      {/* Content */}
      <div className="max-w-md mx-auto p-4 pb-10">
        <AnimatePresence mode="wait">
          {/* Step 1: Customer Info */}
          {step === 'info' && (
            <motion.div key="info" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <Card className="p-6 space-y-5">
                <div className="text-center">
                  <div className="w-14 h-14 rounded-full bg-[hsl(214,65%,28%)]/10 flex items-center justify-center mx-auto mb-3">
                    <User className="w-7 h-7 text-[hsl(214,65%,28%)]" />
                  </div>
                  <h2 className="text-lg font-bold text-foreground">معلومات العميل</h2>
                  <p className="text-sm text-muted-foreground mt-1">يرجى إدخال بياناتك للمتابعة</p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1.5">الاسم</label>
                    <Input
                      placeholder="أدخل اسمك"
                      value={customerName}
                      onChange={e => setCustomerName(e.target.value)}
                      className="text-right"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5">رقم الجوال</label>
                    <div className="relative">
                      <Phone className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="05xxxxxxxx"
                        value={customerPhone}
                        onChange={e => setCustomerPhone(e.target.value.replace(/\D/g, ''))}
                        maxLength={10}
                        className="pr-10 text-right"
                        dir="ltr"
                      />
                    </div>
                  </div>
                </div>

                <Button onClick={handleInfoSubmit} className="w-full bg-[hsl(214,65%,28%)] hover:bg-[hsl(214,65%,22%)]">
                  متابعة
                  <ArrowLeft className="w-4 h-4 mr-2" />
                </Button>
              </Card>
            </motion.div>
          )}

          {/* Step 2: OTP Verification */}
          {step === 'otp' && (
            <motion.div key="otp" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <Card className="p-6 space-y-5">
                <div className="text-center">
                  <div className="w-14 h-14 rounded-full bg-[hsl(43,90%,55%)]/20 flex items-center justify-center mx-auto mb-3">
                    <Shield className="w-7 h-7 text-[hsl(43,90%,45%)]" />
                  </div>
                  <h2 className="text-lg font-bold text-foreground">رمز التحقق</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    أدخل رمز التحقق المرسل إلى {customerPhone}
                  </p>
                  <p className="text-xs text-amber-600 mt-2 bg-amber-50 p-2 rounded-lg">
                    ⚠️ للعرض التجريبي: أدخل أي 4 أرقام
                  </p>
                </div>

                <div className="flex justify-center" dir="ltr">
                  <InputOTP maxLength={4} value={otpValue} onChange={setOtpValue}>
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                      <InputOTPSlot index={3} />
                    </InputOTPGroup>
                  </InputOTP>
                </div>

                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setStep('info')} className="flex-1">
                    <ArrowRight className="w-4 h-4 ml-2" />
                    رجوع
                  </Button>
                  <Button onClick={handleOtpVerify} className="flex-1 bg-[hsl(214,65%,28%)] hover:bg-[hsl(214,65%,22%)]">
                    تحقق
                  </Button>
                </div>
              </Card>
            </motion.div>
          )}

          {/* Step 3: Star Rating */}
          {step === 'rating' && (
            <motion.div key="rating" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <Card className="p-6 space-y-5">
                <div className="text-center">
                  <div className="w-14 h-14 rounded-full bg-[hsl(43,90%,55%)]/20 flex items-center justify-center mx-auto mb-3">
                    <Star className="w-7 h-7 text-[hsl(43,90%,45%)]" />
                  </div>
                  <h2 className="text-lg font-bold text-foreground">قيّم تجربتك</h2>
                  <p className="text-sm text-muted-foreground mt-1">اضغط على النجوم لتقييم كل عنصر</p>
                </div>

                {questionsLoading ? (
                  <div className="space-y-4">
                    {[1,2,3].map(i => <div key={i} className="h-16 bg-muted rounded-lg animate-pulse" />)}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {questions?.map(q => (
                      <div key={q.id} className="p-4 bg-muted/50 rounded-xl">
                        <p className="text-sm font-medium mb-3">{q.question_text_ar || q.question_text}</p>
                        <div className="flex gap-1 justify-center" dir="ltr">
                          {[1, 2, 3, 4, 5].map(star => (
                            <button
                              key={star}
                              onClick={() => setScores(prev => ({ ...prev, [q.id]: star }))}
                              className="p-1 transition-transform hover:scale-110"
                            >
                              <Star
                                className={`w-8 h-8 transition-colors ${
                                  star <= (scores[q.id] || 0)
                                    ? 'fill-[hsl(43,90%,55%)] text-[hsl(43,90%,55%)]'
                                    : 'text-gray-300'
                                }`}
                              />
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <Button onClick={handleRatingNext} className="w-full bg-[hsl(214,65%,28%)] hover:bg-[hsl(214,65%,22%)]">
                  التالي
                  <ArrowLeft className="w-4 h-4 mr-2" />
                </Button>
              </Card>
            </motion.div>
          )}

          {/* Step 4: Complaint/Suggestion */}
          {step === 'complaint' && (
            <motion.div key="complaint" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <Card className="p-6 space-y-5">
                <div className="text-center">
                  <div className="w-14 h-14 rounded-full bg-[hsl(214,65%,28%)]/10 flex items-center justify-center mx-auto mb-3">
                    <MessageSquare className="w-7 h-7 text-[hsl(214,65%,28%)]" />
                  </div>
                  <h2 className="text-lg font-bold text-foreground">شكوى أو اقتراح</h2>
                  <p className="text-sm text-muted-foreground mt-1">هل لديك شكوى أو اقتراح تود مشاركته؟ (اختياري)</p>
                </div>

                <Textarea
                  placeholder="اكتب شكواك أو اقتراحك هنا..."
                  value={complaintText}
                  onChange={e => setComplaintText(e.target.value)}
                  rows={4}
                  className="text-right resize-none"
                />

                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setStep('rating')} className="flex-1">
                    <ArrowRight className="w-4 h-4 ml-2" />
                    رجوع
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={submitMutation.isPending}
                    className="flex-1 bg-[hsl(43,90%,50%)] hover:bg-[hsl(43,90%,45%)] text-[hsl(214,65%,15%)] font-bold"
                  >
                    {submitMutation.isPending ? 'جاري الإرسال...' : 'إرسال التقييم'}
                    <Send className="w-4 h-4 mr-2" />
                  </Button>
                </div>
              </Card>
            </motion.div>
          )}

          {/* Step 5: Success */}
          {step === 'success' && (
            <motion.div key="success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
              <Card className="p-8 text-center space-y-4">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', bounce: 0.5, delay: 0.2 }}
                >
                  <div className="w-20 h-20 rounded-full bg-[hsl(142,76%,36%)]/10 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-10 h-10 text-[hsl(142,76%,36%)]" />
                  </div>
                </motion.div>
                <h2 className="text-xl font-bold text-foreground">شكراً لك!</h2>
                <p className="text-muted-foreground">تم إرسال تقييمك بنجاح. نقدر ملاحظاتك ونسعى دائماً لتحسين خدماتنا.</p>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Progress indicators */}
        {step !== 'success' && (
          <div className="flex justify-center gap-2 mt-6">
            {(['info', 'otp', 'rating', 'complaint'] as Step[]).map((s, i) => (
              <div
                key={s}
                className={`w-2.5 h-2.5 rounded-full transition-colors ${
                  s === step ? 'bg-[hsl(214,65%,28%)]' : 'bg-[hsl(214,65%,28%)]/20'
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
