import type { AISettings } from './types';
import { DEFAULT_SETTINGS } from './types';

const SETTINGS_KEY = 'mindflow_ai_settings';
const LEGACY_DEFAULTS = {
  apiKey: 'apx_live_Qd1G0gaTQl3Sorz2YhNqxBAK21gUHAVfJFD3NcPU',
  baseUrl: 'https://api.apmix.ai/v1',
};

export function loadAISettings(): AISettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Migrate users who had the old defaults saved: drop them so new defaults apply
      if (parsed.apiKey === LEGACY_DEFAULTS.apiKey && parsed.baseUrl === LEGACY_DEFAULTS.baseUrl) {
        delete parsed.apiKey;
        delete parsed.baseUrl;
        delete parsed.model;
      }
      return { ...DEFAULT_SETTINGS, ...parsed };
    }
  } catch { /* ignore */ }
  return { ...DEFAULT_SETTINGS };
}

export function saveAISettings(settings: AISettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch { /* ignore */ }
}
