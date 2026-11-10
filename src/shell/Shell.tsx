import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Building2,
  Clock,
  Crown,
  Globe,
  Play,
  Sparkles,
  Sprout,
  Swords,
  Compass,
} from 'lucide-react';
import { cn } from '../lib/cn';
import { createBrowserAdapter } from '../platform/adapters';
import { createAssetService } from '../platform/assets/assetService';
import { createRepositories } from '../platform/createRepositories';
import { createEntitlementService } from '../platform/entitlements';
import { EcosystemEventBus } from '../platform/eventBus';
import { getLocale, setLocale, t, type Locale } from '../platform/i18n';
import { createPermissionService } from '../platform/permissions';
import { DEFAULT_SESSION_USER } from '../platform/ports/auth';
import { createTelemetry } from '../platform/ports/telemetry';
import { applyTheme, defaultTenantBrand } from '../platform/theme/theme';
import type { GameContext } from '../platform/types/manifest';
import type { GameId } from '../platform/types/models';
import { EcosystemDevPanel } from './EcosystemDevPanel';
import { GameHost } from './GameHost';
import {
  findGameManifest,
  gameRegistry,
  upcomingGames,
} from './gameRegistry';

export interface ShellProps {
  initialContext?: GameContext;
  startInHub?: boolean;
}

/**
 * Root Ecosystem Shell orchestrating shared platform services (`repos`, `bus`, `assets`,
 * `entitlements`, `permissions`), auto-opening the single standalone game on boot,
 * and rendering the Ecosystem Hub game-picker screen when navigating back (`Rule 4.1 & GĐ7`).
 */
export function Shell({ initialContext, startInHub = false }: ShellProps) {
  const [activeGameId, setActiveGameId] = useState<GameId | null>(() => {
    if (startInHub) return null;
    return gameRegistry.length === 1 ? (gameRegistry[0]?.id ?? null) : null;
  });

  const [classroomId, setClassroomId] = useState<string>(
    initialContext?.classroomId ?? 'class-5a'
  );
  const [muted, setMuted] = useState<boolean>(
    initialContext?.audio.muted ?? false
  );
  const [brandName, setBrandName] = useState<string>(defaultTenantBrand.name);
  const [localeTick, setLocaleTick] = useState<number>(0);
  const [tierTick, setTierTick] = useState<number>(0);
  const [bootReady, setBootReady] = useState<boolean>(Boolean(initialContext));

  const goHub = useCallback(() => {
    setActiveGameId(null);
  }, []);

  const ownedServices = useMemo(() => {
    if (initialContext) return null;

    const repos = createRepositories(
      createBrowserAdapter({ autoSeed: true, seed: 20261109 })
    );
    const bus = new EcosystemEventBus();
    const telemetry = createTelemetry();
    const assets = createAssetService({ telemetry });
    const entitlements = createEntitlementService('free');
    const permissions = createPermissionService('teacher');

    return { repos, bus, telemetry, assets, entitlements, permissions };
  }, [initialContext]);

  const ctx = useMemo<GameContext>(() => {
    if (initialContext) {
      return {
        ...initialContext,
        classroomId,
        audio: { muted },
        navigate: {
          toHub: () => {
            initialContext.navigate.toHub();
            goHub();
          },
        },
      };
    }

    const svc = ownedServices!;
    return {
      user: DEFAULT_SESSION_USER,
      classroomId,
      repos: svc.repos,
      bus: svc.bus,
      assets: svc.assets,
      entitlements: svc.entitlements,
      permissions: svc.permissions,
      telemetry: svc.telemetry,
      audio: { muted },
      navigate: {
        toHub: goHub,
      },
    };
  }, [initialContext, ownedServices, classroomId, muted, goHub]);

  // Hydrate persisted ecosystem settings & teacher subscription tier on boot
  useEffect(() => {
    let cancelled = false;
    void Promise.all([
      ctx.repos.settings.getSettings(),
      ctx.repos.teachers.getProfile(),
    ]).then(([settings, teacher]) => {
      if (cancelled) return;
      setLocale(settings.locale);
      applyTheme(settings.brand);
      ctx.entitlements.setTier(teacher.tier);
      setClassroomId(settings.activeClassroomId || 'class-5a');
      setMuted(settings.muted);
      setBrandName(settings.brand.name || defaultTenantBrand.name);
      setLocaleTick((v) => v + 1);
      setBootReady(true);
    });

    return () => {
      cancelled = true;
    };
  }, [ctx.repos, ctx.entitlements]);

  // Listen to cross-game navigation, classroom switches, audio mute, and entitlement updates (Rule R5)
  useEffect(() => {
    const unsubNav = ctx.bus.on('HUB:NAVIGATE', (evt) => {
      if (evt.source.instanceId !== ctx.bus.instanceId) return;
      if (evt.payload.target === 'hub') {
        setActiveGameId(null);
      } else if (findGameManifest(evt.payload.target)) {
        setActiveGameId(evt.payload.target);
      }
    });

    const unsubClass = ctx.bus.on('CLASSROOM:CHANGED', (evt) => {
      setClassroomId(evt.payload.classroomId);
    });

    const unsubAudio = ctx.bus.on('AUDIO:MUTE_CHANGED', (evt) => {
      setMuted(evt.payload.muted);
    });

    const unsubTier = ctx.entitlements.subscribe(() => {
      setTierTick((v) => v + 1);
    });

    return () => {
      unsubNav();
      unsubClass();
      unsubAudio();
      unsubTier();
    };
  }, [ctx.bus, ctx.entitlements]);

  // Dispose owned platform services only on true Shell unmount (cancelling React StrictMode simulated unmount)
  const disposeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (disposeTimerRef.current !== null) {
      clearTimeout(disposeTimerRef.current);
      disposeTimerRef.current = null;
    }
    return () => {
      if (ownedServices) {
        disposeTimerRef.current = setTimeout(() => {
          ownedServices.assets.dispose();
          ownedServices.bus.dispose();
          disposeTimerRef.current = null;
        }, 0);
      }
    };
  }, [ownedServices]);

  void tierTick;
  void localeTick;

  const isPro = ctx.entitlements.has('classcity.multi_class');
  const activeManifest = activeGameId ? findGameManifest(activeGameId) : undefined;
  const activeLocale = getLocale();

  const handleSwitchHubLocale = async (nextLocale: Locale) => {
    setLocale(nextLocale);
    setLocaleTick((v) => v + 1);
    await ctx.repos.settings.patchSettings({ locale: nextLocale });
  };

  if (!bootReady) {
    return (
      <div className="flex h-dvh w-screen items-center justify-center bg-[var(--surface)] text-base font-bold text-[var(--ink-primary)]">
        {t('shell.loading')}
      </div>
    );
  }

  return (
    <div className="relative h-dvh w-screen overflow-hidden bg-[var(--surface)] text-[var(--ink-primary)]">
      {activeManifest ? (
        <GameHost
          manifest={activeManifest}
          ctx={ctx}
          onBackToHub={goHub}
        />
      ) : (
        /* Ecosystem Hub Game-Picker Screen */
        <main className="h-full w-full overflow-y-auto px-4 py-8 sm:px-8">
          <div className="mx-auto max-w-5xl">
            {/* Hub Top Bar */}
            <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-6">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-[var(--surface-elevated)] px-3.5 py-1 text-sm font-bold text-teal-300">
                  <Sparkles className="size-4" aria-hidden="true" />
                  <span>
                    {brandName} • {t('shell.hub.badge')}
                  </span>
                </div>
                <h1 className="mt-3 text-3xl font-extrabold text-white text-balance sm:text-4xl">
                  {t('shell.hub.title')}
                </h1>
                <p className="mt-2 max-w-2xl text-base text-[var(--ink-muted)] text-pretty">
                  {t('shell.hub.subtitle')}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-extrabold',
                    isPro
                      ? 'bg-amber-400 text-slate-950'
                      : 'border border-slate-700 bg-[var(--surface-elevated)] text-[var(--ink-primary)]'
                  )}
                >
                  <Crown className="size-4" aria-hidden="true" />
                  <span>
                    {isPro
                      ? t('shell.hub.tierProBadge')
                      : t('shell.hub.tierFreeBadge')}
                  </span>
                </span>

                <div
                  role="group"
                  aria-label={t('shell.hub.switchLangAria')}
                  className="inline-flex items-center gap-1 rounded-xl border border-slate-700 bg-[var(--surface-elevated)] p-1"
                >
                  <Globe
                    className="ml-2 size-4 text-[var(--ink-muted)]"
                    aria-hidden="true"
                  />
                  {(['vi', 'en'] as const).map((loc) => (
                    <button
                      key={loc}
                      type="button"
                      aria-pressed={activeLocale === loc}
                      onClick={() => void handleSwitchHubLocale(loc)}
                      className={cn(
                        'rounded-lg px-2.5 py-1 text-sm font-bold transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-400',
                        activeLocale === loc
                          ? 'bg-[var(--brand-primary)] text-white'
                          : 'text-[var(--ink-muted)] hover:bg-slate-700 hover:text-white'
                      )}
                    >
                      {loc.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
            </header>

            {/* Game Cards Grid: Registered Games + Coming Soon Previews */}
            <section className="mt-8 grid gap-5 sm:grid-cols-2">
              {gameRegistry.map((manifest) => (
                <article
                  key={manifest.id}
                  className="flex flex-col justify-between rounded-2xl border-2 border-teal-500/70 bg-[var(--surface-elevated)] p-6 shadow-lg"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex size-12 items-center justify-center rounded-xl bg-[var(--brand-primary)] text-white">
                        <Building2 className="size-6" aria-hidden="true" />
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-emerald-400 px-3 py-0.5 text-xs font-extrabold text-slate-950">
                          {t('shell.hub.activeTag')}
                        </span>
                        <span className="rounded-full border border-slate-700 bg-slate-900 px-2.5 py-0.5 text-xs font-bold text-[var(--ink-muted)] tabular-nums">
                          {t('shell.hub.versionLabel', {
                            version: manifest.version,
                          })}
                        </span>
                      </div>
                    </div>

                    <h2 className="mt-4 text-2xl font-extrabold text-white text-balance">
                      {t(manifest.name)}
                    </h2>
                    <p className="mt-2 text-base text-[var(--ink-muted)] text-pretty">
                      {t(`game.${manifest.id}.desc`)}
                    </p>
                  </div>

                  <div className="mt-6 flex items-center justify-between gap-3 border-t border-slate-700/80 pt-4">
                    <span className="text-sm font-semibold text-teal-300">
                      {t('shell.hub.sharedRosterNote')}
                    </span>
                    <button
                      type="button"
                      onClick={() => setActiveGameId(manifest.id)}
                      className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-[var(--brand-accent)] px-5 py-2.5 text-base font-extrabold text-slate-950 transition-transform duration-150 hover:brightness-105 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300"
                    >
                      <Play className="size-4 fill-current" aria-hidden="true" />
                      <span>{t('shell.hub.openGame')}</span>
                    </button>
                  </div>
                </article>
              ))}

              {upcomingGames.map((upcoming) => {
                const Icon =
                  upcoming.id === 'classfarm'
                    ? Sprout
                    : upcoming.id === 'classarena'
                      ? Swords
                      : Compass;

                return (
                  <article
                    key={upcoming.id}
                    aria-disabled="true"
                    className="flex flex-col justify-between rounded-2xl border border-slate-800 bg-[var(--surface-elevated)]/60 p-6 opacity-70"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className="inline-flex size-12 items-center justify-center rounded-xl text-slate-950"
                          style={{ backgroundColor: upcoming.accentColor }}
                        >
                          <Icon className="size-6" aria-hidden="true" />
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full border border-slate-700 bg-slate-900 px-3 py-0.5 text-xs font-bold text-[var(--ink-muted)]">
                          <Clock className="size-3.5" aria-hidden="true" />
                          <span>{t('shell.hub.comingSoon')}</span>
                        </span>
                      </div>

                      <h2 className="mt-4 text-xl font-extrabold text-white text-balance">
                        {t(upcoming.nameKey)}
                      </h2>
                      <p className="mt-2 text-base text-[var(--ink-muted)] text-pretty">
                        {t(upcoming.descKey)}
                      </p>
                    </div>

                    <div className="mt-6 flex justify-end border-t border-slate-800 pt-4">
                      <button
                        type="button"
                        disabled
                        className="cursor-not-allowed rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-bold text-slate-400"
                      >
                        {t('shell.hub.comingSoon')}
                      </button>
                    </div>
                  </article>
                );
              })}
            </section>
          </div>
        </main>
      )}

      {/* Persistent Ecosystem Developer Panel */}
      <EcosystemDevPanel ctx={ctx} localeTick={localeTick} />
    </div>
  );
}
