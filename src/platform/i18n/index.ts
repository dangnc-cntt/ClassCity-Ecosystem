import { viMessages } from './locales/vi';
import { enMessages } from './locales/en';

export type Locale = 'vi' | 'en';

let currentLocale: Locale = 'vi';

const dictionaries: Record<Locale, Record<string, string>> = {
  vi: { ...viMessages },
  en: { ...enMessages },
};

export function setLocale(locale: Locale): void {
  currentLocale = locale;
}

export function getLocale(): Locale {
  return currentLocale;
}

export function registerMessages(locale: Locale, messages: Record<string, string>): void {
  dictionaries[locale] = {
    ...dictionaries[locale],
    ...messages,
  };
}

export function t(key: string, params?: Record<string, string | number>): string {
  const dict = dictionaries[currentLocale] ?? dictionaries.vi;
  let template = dict[key] ?? dictionaries.vi[key] ?? key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      template = template.replaceAll(`{${k}}`, String(v));
    }
  }
  return template;
}

export function useT(): typeof t {
  return t;
}
