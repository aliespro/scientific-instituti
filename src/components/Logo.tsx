import { BookOpen } from 'lucide-react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  variant?: 'light' | 'dark';
}

export function Logo({ size = 'md', showText = true, variant = 'dark' }: LogoProps) {
  const sizes = {
    sm: { box: 'w-8 h-8', icon: 16, text: 'text-base' },
    md: { box: 'w-10 h-10', icon: 20, text: 'text-lg' },
    lg: { box: 'w-14 h-14', icon: 28, text: 'text-2xl' },
  };

  const textColor = variant === 'light' ? 'text-white' : 'text-emerald-800';
  const subColor = variant === 'light' ? 'text-emerald-100' : 'text-slate-500';

  return (
    <div className="flex items-center gap-2.5">
      <div
        className={`${sizes[size].box} rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center shadow-soft relative overflow-hidden`}
      >
        <div className="absolute inset-0 bg-islamic-pattern opacity-30" />
        <BookOpen size={sizes[size].icon} className="text-white relative z-10" />
      </div>
      {showText && (
        <div className="flex flex-col leading-none">
          <span className={`${sizes[size].text} font-bold ${textColor}`}>پژوه‌گر</span>
          <span className={`text-[10px] ${subColor} mt-0.5`}>سامانه مدیریت موسسه علمی</span>
        </div>
      )}
    </div>
  );
}
