import { createContext, useContext, useState, useEffect, useRef, useCallback, type ReactNode } from 'react';
import { supabase } from '@/lib/supabase';

interface ActiveTimer {
  taskId: string;
  taskTitle: string;
  projectId: string;
  memberName: string;
  memberId: string | null;
  startedAt: number;
  accumulatedSeconds: number;
  isPaused: boolean;
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface TimerContextValue {
  activeTimer: ActiveTimer | null;
  elapsedSeconds: number;
  isRunning: boolean;
  isPaused: boolean;
  saveStatus: SaveStatus;
  lastSavedHours: number | null;
  startTimer: (taskId: string, taskTitle: string, projectId: string, memberName: string, memberId: string | null) => void;
  stopTimer: () => Promise<boolean>;
  pauseTimer: () => void;
  resumeTimer: () => void;
  cancelTimer: () => void;
  resetSaveStatus: () => void;
}

const TimerContext = createContext<TimerContextValue | null>(null);
const STORAGE_KEY = 'active_timer';

export function TimerProvider({ children }: { children: ReactNode }) {
  const [activeTimer, setActiveTimer] = useState<ActiveTimer | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [lastSavedHours, setLastSavedHours] = useState<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const activeTimerRef = useRef<ActiveTimer | null>(null);

  useEffect(() => {
    activeTimerRef.current = activeTimer;
  }, [activeTimer]);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as ActiveTimer;
        setActiveTimer(parsed);
        activeTimerRef.current = parsed;
        if (parsed.isPaused) {
          setIsRunning(false);
          setIsPaused(true);
          setElapsedSeconds(parsed.accumulatedSeconds);
        } else {
          setIsRunning(true);
          setIsPaused(false);
          setElapsedSeconds(parsed.accumulatedSeconds + Math.floor((Date.now() - parsed.startedAt) / 1000));
        }
      } catch { /* ignore */ }
    }
  }, []);

  useEffect(() => {
    if (isRunning && activeTimer && !activeTimer.isPaused) {
      intervalRef.current = setInterval(() => {
        setElapsedSeconds(activeTimer.accumulatedSeconds + Math.floor((Date.now() - activeTimer.startedAt) / 1000));
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isRunning, activeTimer]);

  const startTimer = useCallback((taskId: string, taskTitle: string, projectId: string, memberName: string, memberId: string | null) => {
    const timer: ActiveTimer = { taskId, taskTitle, projectId, memberName, memberId, startedAt: Date.now(), accumulatedSeconds: 0, isPaused: false };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(timer));
    activeTimerRef.current = timer;
    setActiveTimer(timer);
    setElapsedSeconds(0);
    setIsRunning(true);
    setIsPaused(false);
    setSaveStatus('idle');
  }, []);

  const stopTimer = useCallback(async (): Promise<boolean> => {
    const timer = activeTimerRef.current;
    if (!timer) return false;

    const seconds = timer.isPaused
      ? timer.accumulatedSeconds
      : timer.accumulatedSeconds + Math.floor((Date.now() - timer.startedAt) / 1000);
    const hours = seconds / 3600;

    setSaveStatus('saving');

    if (hours < 0.001) {
      localStorage.removeItem(STORAGE_KEY);
      activeTimerRef.current = null;
      setActiveTimer(null);
      setElapsedSeconds(0);
      setIsRunning(false);
      setSaveStatus('saved');
      setLastSavedHours(0);
      return true;
    }

    const roundedHours = Math.round(hours * 100) / 100;

    const { error: insertError } = await supabase.from('time_entries').insert({
      task_id: timer.taskId,
      member_id: timer.memberId,
      hours: roundedHours,
      description: `تایمر خودکار — ${timer.taskTitle}`,
      entry_date: new Date().toISOString().split('T')[0],
    });

    if (insertError) {
      setSaveStatus('error');
      return false;
    }

    const { data: taskData, error: taskError } = await supabase
      .from('tasks')
      .select('actual_hours')
      .eq('id', timer.taskId)
      .maybeSingle();

    if (taskError) {
      setSaveStatus('error');
      return false;
    }

    const currentHours = (taskData as { actual_hours: number } | null)?.actual_hours ?? 0;
    const newTotal = Math.round((currentHours + roundedHours) * 100) / 100;

    const { error: updateError } = await supabase
      .from('tasks')
      .update({ actual_hours: newTotal, updated_at: new Date().toISOString() })
      .eq('id', timer.taskId);

    if (updateError) {
      setSaveStatus('error');
      return false;
    }

    localStorage.removeItem(STORAGE_KEY);
    activeTimerRef.current = null;
    setActiveTimer(null);
    setElapsedSeconds(0);
    setIsRunning(false);
    setIsPaused(false);
    setSaveStatus('saved');
    setLastSavedHours(roundedHours);
    return true;
  }, []);

  const pauseTimer = useCallback(() => {
    const timer = activeTimerRef.current;
    if (!timer || timer.isPaused) return;
    const accumulated = timer.accumulatedSeconds + Math.floor((Date.now() - timer.startedAt) / 1000);
    const updated = { ...timer, isPaused: true, accumulatedSeconds: accumulated };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    activeTimerRef.current = updated;
    setActiveTimer(updated);
    setIsRunning(false);
    setIsPaused(true);
    setElapsedSeconds(accumulated);
  }, []);

  const resumeTimer = useCallback(() => {
    const timer = activeTimerRef.current;
    if (!timer || !timer.isPaused) return;
    const updated = { ...timer, isPaused: false, startedAt: Date.now() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    activeTimerRef.current = updated;
    setActiveTimer(updated);
    setIsRunning(true);
    setIsPaused(false);
  }, []);

  const cancelTimer = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    activeTimerRef.current = null;
    setActiveTimer(null);
    setElapsedSeconds(0);
    setIsRunning(false);
    setIsPaused(false);
    setSaveStatus('idle');
  }, []);

  const resetSaveStatus = useCallback(() => {
    setSaveStatus('idle');
    setLastSavedHours(null);
  }, []);

  return (
    <TimerContext.Provider value={{ activeTimer, elapsedSeconds, isRunning, isPaused, saveStatus, lastSavedHours, startTimer, stopTimer, pauseTimer, resumeTimer, cancelTimer, resetSaveStatus }}>
      {children}
    </TimerContext.Provider>
  );
}

export function useTimer() {
  const ctx = useContext(TimerContext);
  if (!ctx) throw new Error('useTimer must be used within TimerProvider');
  return ctx;
}

export function formatElapsed(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}
