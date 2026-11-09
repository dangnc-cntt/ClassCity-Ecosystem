import { useEffect } from 'react';
import type { GameContext } from '../../platform/types/manifest';
import { registerMessages, t } from '../../platform/i18n';
import { classCityVi } from './locales/vi';
import { classCityEn } from './locales/en';

export interface ClassCityModuleProps {
  ctx?: GameContext;
}

export function ClassCityModule(_props: ClassCityModuleProps) {
  useEffect(() => {
    registerMessages('vi', classCityVi);
    registerMessages('en', classCityEn);
  }, []);

  return (
    <main className="flex h-screen w-screen items-center justify-center bg-slate-950 text-slate-100">
      <div className="rounded-xl border border-teal-500/30 bg-slate-900/90 px-6 py-4 text-center shadow-lg">
        <h1 className="text-xl font-bold text-teal-400">{t('app.title')}</h1>
        <p className="mt-1 text-sm text-slate-300">{t('city.ready')}</p>
      </div>
    </main>
  );
}
