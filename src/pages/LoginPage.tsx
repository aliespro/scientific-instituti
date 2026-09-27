import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Mail, Lock, ArrowLeft, UserPlus, LogIn, AlertCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Logo } from '@/components/Logo';

export function LoginPage() {
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error } = mode === 'signin' ? await signIn(email, password) : await signUp(email, password);

    if (error) {
      setError(error);
      setLoading(false);
    } else {
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen flex" dir="rtl">
      {/* Left panel - decorative */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-emerald-800 via-teal-800 to-emerald-950 relative overflow-hidden">
        <div className="absolute inset-0 bg-islamic-pattern opacity-20" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-400/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-teal-400/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

        <div className="relative z-10 flex flex-col justify-between p-12 text-white w-full">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center">
              <BookOpen size={24} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold">پژوه‌گر</h1>
              <p className="text-xs text-emerald-100">سامانه مدیریت موسسه علمی</p>
            </div>
          </div>

          <div className="space-y-6">
            <h2 className="text-3xl font-bold leading-relaxed">
              مدیریت یکپارچه<br />
              موسسه علمی و پژوهشی
            </h2>
            <p className="text-emerald-100/80 text-lg leading-relaxed max-w-md">
              پروژه‌های پژوهشی، انتشارات علمی، اعضای هیئت علمی،
              وظایف و رویدادهای موسسه را در یک سامانه زیبا و کارآمد مدیریت کنید.
            </p>
            <div className="space-y-3">
              {[
                'مدیریت پروژه‌های پژوهشی و اجرایی با نمای کانبان و گانت',
                'پروفایل پژوهشی با ردیابی مقالات و شاخص‌های استنادی',
                'تقویم رویدادهای علمی با تاریخ شمسی',
              ].map((item) => (
                <div key={item} className="flex items-center gap-3 text-emerald-100/90">
                  <div className="w-5 h-5 rounded-full bg-emerald-400/20 flex items-center justify-center flex-shrink-0">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-300" />
                  </div>
                  <span className="text-sm">{item}</span>
                </div>
              ))}
            </div>
          </div>

          <p className="text-xs text-emerald-200/50">© ۱۴۰۴ - سامانه پژوه‌گر</p>
        </div>
      </div>

      {/* Right panel - form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-slate-50">
        <div className="w-full max-w-md animate-slide-up">
          <div className="lg:hidden mb-8 flex justify-center">
            <Logo size="lg" />
          </div>

          <div className="card p-8">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-slate-800 mb-1">
                {mode === 'signin' ? 'ورود به حساب' : 'ساخت حساب جدید'}
              </h2>
              <p className="text-sm text-slate-500">
                {mode === 'signin'
                  ? 'برای دسترسی به پنل مدیریت وارد شوید'
                  : 'برای شروع استفاده از سامانه ثبت‌نام کنید'}
              </p>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-100 flex items-start gap-2 animate-fade-in">
                <AlertCircle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">ایمیل</label>
                <div className="relative">
                  <Mail size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input pr-10"
                    placeholder="example@institute.ir"
                    dir="ltr"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">رمز عبور</label>
                <div className="relative">
                  <Lock size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input pr-10"
                    placeholder="••••••••"
                    dir="ltr"
                    minLength={6}
                  />
                </div>
              </div>

              <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3 disabled:opacity-60">
                {mode === 'signin' ? (
                  <>
                    <LogIn size={18} />
                    ورود
                  </>
                ) : (
                  <>
                    <UserPlus size={18} />
                    ثبت‌نام
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 pt-6 border-t border-slate-100 text-center">
              <p className="text-sm text-slate-500">
                {mode === 'signin' ? 'حساب ندارید؟' : 'قبلاً ثبت‌نام کرده‌اید؟'}
                <button
                  onClick={() => {
                    setMode(mode === 'signin' ? 'signup' : 'signin');
                    setError(null);
                  }}
                  className="mr-1.5 text-emerald-600 font-medium hover:text-emerald-700 transition-colors"
                >
                  {mode === 'signin' ? 'ثبت‌نام کنید' : 'وارد شوید'}
                </button>
              </p>
            </div>
          </div>

          <button
            onClick={() => navigate('/')}
            className="mt-4 flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors mx-auto"
          >
            <ArrowLeft size={16} />
            ورود به عنوان مهمان
          </button>
        </div>
      </div>
    </div>
  );
}
