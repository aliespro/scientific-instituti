import { useState } from 'react';
import { Settings, User, Bell, Globe, Shield, Database } from 'lucide-react';

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState('profile');

  const tabs = [
    { id: 'profile', icon: User, label: 'پروفایل' },
    { id: 'notifications', icon: Bell, label: 'اعلان‌ها' },
    { id: 'preferences', icon: Globe, label: 'تنظیمات نمایش' },
    { id: 'security', icon: Shield, label: 'امنیت' },
    { id: 'data', icon: Database, label: 'داده‌ها' },
  ];

  return (
    <div className="space-y-5 animate-fade-in" dir="rtl">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
        <div className="card p-4 lg:col-span-1">
          <div className="space-y-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`nav-link w-full ${activeTab === tab.id ? 'nav-link-active' : ''}`}
              >
                <tab.icon size={18} />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="card p-6 lg:col-span-3">
          {activeTab === 'profile' && (
            <div className="space-y-4">
              <h3 className="font-bold text-slate-800 mb-4">پروفایل کاربری</h3>
              <div className="flex items-center gap-4 pb-4 border-b border-slate-100">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-white text-xl font-semibold flex items-center justify-center">
                  پ
                </div>
                <div>
                  <p className="font-medium text-slate-800">پژوهشگر</p>
                  <p className="text-sm text-slate-400">حساب فعال</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">نام نمایشی</label>
                  <input type="text" className="input" placeholder="نام..." />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">ایمیل</label>
                  <input type="email" className="input" dir="ltr" placeholder="email@institute.ir" />
                </div>
              </div>
              <button className="btn-primary">ذخیره تغییرات</button>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="space-y-4">
              <h3 className="font-bold text-slate-800 mb-4">تنظیمات اعلان‌ها</h3>
              {[
                { title: 'اعلان پروژه‌های جدید', desc: 'هنگام ایجاد پروژه جدید مطلع شوید' },
                { title: 'یادآوری وظایف', desc: 'یادآوری وظایف نزدیک به سررسید' },
                { title: 'رویدادهای علمی', desc: 'اعلان رویدادهای پیش رو' },
                { title: 'انتشارات جدید', desc: 'اعلان انتشار مقالات جدید' },
              ].map((item) => (
                <div key={item.title} className="flex items-center justify-between p-3 rounded-xl border border-slate-100">
                  <div>
                    <p className="text-sm font-medium text-slate-700">{item.title}</p>
                    <p className="text-xs text-slate-400">{item.desc}</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" defaultChecked className="sr-only peer" />
                    <div className="w-11 h-6 bg-slate-200 rounded-full peer peer-checked:bg-emerald-500 transition-colors after:content-[''] after:absolute after:top-0.5 after:right-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:-translate-x-5" />
                  </label>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'preferences' && (
            <div className="space-y-4">
              <h3 className="font-bold text-slate-800 mb-4">تنظیمات نمایش</h3>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">زبان</label>
                <select className="input" defaultValue="fa">
                  <option value="fa">فارسی</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">تقویم</label>
                <select className="input" defaultValue="jalali">
                  <option value="jalali">شمسی (جلالی)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">ناحیه زمانی</label>
                <select className="input" defaultValue="irst">
                  <option value="irst">ایران (IRST)</option>
                </select>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="space-y-4">
              <h3 className="font-bold text-slate-800 mb-4">امنیت حساب</h3>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">رمز عبور فعلی</label>
                <input type="password" className="input" dir="ltr" placeholder="••••••••" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">رمز عبور جدید</label>
                  <input type="password" className="input" dir="ltr" placeholder="••••••••" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">تکرار رمز</label>
                  <input type="password" className="input" dir="ltr" placeholder="••••••••" />
                </div>
              </div>
              <button className="btn-primary">تغییر رمز</button>
            </div>
          )}

          {activeTab === 'data' && (
            <div className="space-y-4">
              <h3 className="font-bold text-slate-800 mb-4">مدیریت داده‌ها</h3>
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-3 mb-2">
                  <Database size={20} className="text-emerald-600" />
                  <p className="font-medium text-slate-700">پایگاه داده موسسه</p>
                </div>
                <p className="text-sm text-slate-500">داده‌های موسسه روی پایگاه داده امن ذخیره می‌شوند.</p>
              </div>
              <p className="text-xs text-slate-400">برای خروجی‌گیری یا انتقال داده با مدیر سیستم تماس بگیرید.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
