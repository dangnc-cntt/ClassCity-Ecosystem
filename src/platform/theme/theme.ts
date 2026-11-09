export interface TenantBrand {
  name: string;
  logoUrl?: string;
  primary: string;
  accent: string;
}

export const defaultTenantBrand: TenantBrand = {
  name: 'ClassCity',
  primary: '#0f766e',
  accent: '#f59e0b',
};

export function applyTheme(brand: TenantBrand = defaultTenantBrand): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.style.setProperty('--brand-primary', brand.primary);
  root.style.setProperty('--brand-accent', brand.accent);
}
