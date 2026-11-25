export interface AISettings {
  apiKey: string;
  baseUrl: string;
  model: string;
  temperature: number;
}

export type ChatRole = 'system' | 'user' | 'assistant';

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

export interface AIRef {
  type: 'node' | 'edge';
  id: string;
}

export interface AIIssue {
  severity: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  question: string;
  refs: AIRef[];
}

export interface AIAnalysisResult {
  issues: AIIssue[];
  summary: string;
}

export const PROVIDER_PRESETS: { label: string; baseUrl: string; model: string }[] = [
  { label: 'CoArena', baseUrl: 'https://coarena.ai/api/v1', model: 'claude-sonnet-5-5' },
  { label: 'APMix', baseUrl: 'https://api.apmix.ai/v1', model: 'claude-sonnet-4-6-free' },
  { label: 'OpenAI', baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o' },
  { label: 'OpenRouter', baseUrl: 'https://openrouter.ai/api/v1', model: 'anthropic/claude-sonnet-4' },
  { label: 'Groq', baseUrl: 'https://api.groq.com/openai/v1', model: 'llama-3.3-70b-versatile' },
];

export const DEFAULT_SETTINGS: AISettings = {
  apiKey: 'coa_2abefb45ba8d9e7b0487bbf811629e12',
  baseUrl: 'https://coarena.ai/api/v1',
  model: 'claude-sonnet-5-5',
  temperature: 0.4,
};
