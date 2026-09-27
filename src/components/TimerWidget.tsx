import { useState, useEffect } from 'react';
import { Square, X, Clock, CheckCircle2, AlertCircle, Loader2, Pause, Play } from 'lucide-react';
import { useTimer, formatElapsed } from '@/contexts/TimerContext';
import { formatDuration } from '@/lib/persianDate';

export function TimerWidget() {
  const { activeTimer, elapsedSeconds, isRunning, isPaused, stopTimer, pauseTimer, resumeTimer, cancelTimer, saveStatus, lastSavedHours, resetSaveStatus } = useTimer();
  const [confirmStop, setConfirmStop] = useState(false);

  useEffect(() => {
    if (saveStatus === 'saved' && !activeTimer) {
      const t = setTimeout(() => resetSaveStatus(), 4000);
      return () => clearTimeout(t);
    }
  }, [saveStatus, activeTimer, resetSaveStatus]);

  if (saveStatus === 'saved' && !activeTimer && lastSavedHours !== null) {
    return (
      <div className="fixed bottom-6 left-6 z-40 animate-slide-up" dir="rtl">
        <div className="flex items-center gap-3 bg-white rounded-2xl shadow-xl border border-emerald-200 p-3 pr-4">
          <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
            <CheckCircle2 size={20} className="text-emerald-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800">زمان ثبت شد</p>
            <p className="text-xs text-slate-500">{formatDuration(lastSavedHours)} ذخیره شد</p>
          </div>
        </div>
      </div>
    );
  }

  if (saveStatus === 'error' && !activeTimer) {
    return (
      <div className="fixed bottom-6 left-6 z-40 animate-slide-up" dir="rtl">
        <div className="flex items-center gap-3 bg-white rounded-2xl shadow-xl border border-rose-200 p-3 pr-4">
          <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center">
            <AlertCircle size={20} className="text-rose-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800">خطا در ثبت زمان</p>
            <p className="text-xs text-slate-500">ذخیره ناموفق بود. تایمر حفظ شد.</p>
          </div>
          <button onClick={resetSaveStatus} className="p-2 rounded-lg text-slate-300 hover:text-slate-500">
            <X size={16} />
          </button>
        </div>
      </div>
    );
  }

  if (!activeTimer || (!isRunning && !isPaused)) return null;

  const isSaving = saveStatus === 'saving';

  return (
    <div className="fixed bottom-6 left-6 z-40 animate-slide-up" dir="rtl">
      <div className="flex items-center gap-3 bg-white rounded-2xl shadow-xl border border-slate-200 p-3 pr-4">
        <div className="relative">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isSaving ? 'bg-amber-50' : isPaused ? 'bg-amber-50' : 'bg-emerald-50'}`}>
            {isSaving ? <Loader2 size={20} className="text-amber-600 animate-spin" /> : isPaused ? <Pause size={20} className="text-amber-600" /> : <Clock size={20} className="text-emerald-600" />}
          </div>
          {!isSaving && !isPaused && <span className="absolute -top-1 -left-1 w-3 h-3 rounded-full bg-emerald-500 animate-pulse ring-2 ring-white" />}
        </div>

        <div className="min-w-0">
          <p className="text-xs text-slate-400">{isSaving ? 'در حال ذخیره...' : isPaused ? 'متوقف شد' : 'در حال ثبت زمان'}</p>
          <p className="text-sm font-semibold text-slate-800 truncate max-w-[180px]">{activeTimer.taskTitle}</p>
        </div>

        {!isSaving && (
          <div className={`font-mono text-lg font-bold tabular-nums ${isPaused ? 'text-amber-600' : 'text-emerald-600'}`} dir="ltr">
            {formatElapsed(elapsedSeconds)}
          </div>
        )}

        <div className="flex items-center gap-1">
          {isSaving ? (
            <span className="text-xs text-amber-600 px-2">...</span>
          ) : !confirmStop ? (
            <>
              {isPaused ? (
                <button
                  onClick={resumeTimer}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition-colors"
                >
                  <Play size={14} fill="currentColor" />
                  ادامه
                </button>
              ) : (
                <button
                  onClick={pauseTimer}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500 text-white text-sm font-medium hover:bg-amber-600 transition-colors"
                >
                  <Pause size={14} fill="currentColor" />
                  توقف
                </button>
              )}
              <button
                onClick={() => setConfirmStop(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 text-slate-600 text-sm font-medium hover:bg-slate-200 transition-colors"
                title="ثبت و پایان"
              >
                <Square size={14} fill="currentColor" />
              </button>
              <button
                onClick={cancelTimer}
                className="p-2 rounded-xl text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                title="لغو تایمر"
              >
                <X size={16} />
              </button>
            </>
          ) : (
            <div className="flex items-center gap-1.5 animate-fade-in">
              <span className="text-xs text-slate-500">ذخیره شود؟</span>
              <button
                onClick={async () => {
                  const ok = await stopTimer();
                  if (ok) setConfirmStop(false);
                }}
                className="px-2.5 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-medium hover:bg-emerald-700"
              >
                بله، ذخیره
              </button>
              <button
                onClick={() => setConfirmStop(false)}
                className="px-2.5 py-1.5 rounded-lg bg-slate-100 text-slate-500 text-xs font-medium hover:bg-slate-200"
              >
                خیر
              </button>
            </div>
          )}
        </div>

        {saveStatus === 'error' && isRunning && (
          <span className="text-xs text-rose-500 flex items-center gap-1">
            <AlertCircle size={12} /> خطا
          </span>
        )}
      </div>
    </div>
  );
}
