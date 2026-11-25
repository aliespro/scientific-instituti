import { createContext, useContext } from 'react';
import type { Lang, TFunc } from './i18n';

export const LangContext = createContext<{ lang: Lang; t: TFunc }>({
  lang: 'fa',
  t: (key: string) => key,
});

export function useLang() {
  return useContext(LangContext);
}
