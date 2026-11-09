import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const ROOT_DIR = process.cwd();
const SRC_DIR = path.join(ROOT_DIR, 'src');

/**
 * Recursively collect all .ts and .tsx files under dir.
 * @param {string} dir
 * @returns {string[]}
 */
function walkFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const results = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkFiles(fullPath));
    } else if (entry.isFile() && /\.(ts|tsx)$/.test(entry.name)) {
      results.push(fullPath);
    }
  }
  return results;
}

/**
 * Normalize path to forward-slash relative to src/
 * @param {string} fullPath
 * @returns {string}
 */
function toRelSrc(fullPath) {
  return path.relative(SRC_DIR, fullPath).split(path.sep).join('/');
}

/**
 * Extract all module specifiers from import/export statements and dynamic imports.
 * @param {string} content
 * @returns {string[]}
 */
function extractImports(content) {
  const specs = [];
  const staticRegex = /\b(?:import|export)\s+(?:[^'"]*?\s+from\s+)?['"]([^'"]+)['"]/g;
  const dynamicRegex = /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g;

  let match;
  while ((match = staticRegex.exec(content)) !== null) {
    specs.push(match[1]);
  }
  while ((match = dynamicRegex.exec(content)) !== null) {
    specs.push(match[1]);
  }
  return specs;
}

/**
 * Resolve a relative import specifier to a path relative to src/
 * @param {string} fromFileRel
 * @param {string} spec
 * @returns {string | null}
 */
function resolveInternalSpec(fromFileRel, spec) {
  if (spec.startsWith('.')) {
    const fromDir = path.posix.dirname(fromFileRel);
    return path.posix.normalize(path.posix.join(fromDir, spec));
  }
  if (spec.startsWith('src/')) {
    return spec.slice(4);
  }
  if (spec.startsWith('@/')) {
    return spec.slice(2);
  }
  return null;
}

/**
 * Strip comments from source code before checking token/diacritic rules.
 * @param {string} content
 * @returns {string}
 */
function stripComments(content) {
  return content
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '');
}

const files = walkFiles(SRC_DIR);
const violations = [];

const FORBIDDEN_DOMAIN_PKGS = new Set([
  'react',
  'react-dom',
  'three',
  'zustand',
  'gsap',
]);

const ALLOWED_GAME_PLATFORM_SEGMENTS = new Set([
  'types',
  'ports',
  'i18n',
  'assets',
  'audio',
  'theme',
  'entitlements',
  'permissions',
  'eventBus',
  'backup',
]);

// Matches Vietnamese accented characters (for R8 check in .tsx outside locales/)
const VIETNAMESE_DIACRITIC_REGEX =
  /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ]/;

for (const file of files) {
  const rel = toRelSrc(file);
  const raw = fs.readFileSync(file, 'utf8');
  const codeNoComments = stripComments(raw);
  const imports = extractImports(raw);

  const isTestFile =
    rel.includes('__tests__/') ||
    rel.endsWith('.test.ts') ||
    rel.endsWith('.test.tsx');

  // Rule R1: localStorage only allowed inside platform/adapters/**
  if (!rel.startsWith('platform/adapters/') && !isTestFile) {
    if (/\blocalStorage\b/.test(codeNoComments)) {
      violations.push(
        `[R1] ${rel}: Forbidden direct reference to "localStorage" outside platform/adapters/**`
      );
    }
  }

  // Rule R7: subscriptionTier only allowed inside platform/entitlements
  if (!rel.startsWith('platform/entitlements')) {
    if (/\bsubscriptionTier\b/.test(codeNoComments)) {
      violations.push(
        `[R7] ${rel}: Forbidden reference to "subscriptionTier" outside platform/entitlements`
      );
    }
  }

  // Rule R8: No hardcoded Vietnamese strings in .tsx files outside locales/
  if (rel.endsWith('.tsx') && !rel.includes('/locales/') && !isTestFile) {
    if (VIETNAMESE_DIACRITIC_REGEX.test(codeNoComments)) {
      violations.push(
        `[R8] ${rel}: Hardcoded Vietnamese characters found in .tsx file; use t('key') via locales instead`
      );
    }
  }

  for (const spec of imports) {
    const resolved = resolveInternalSpec(rel, spec);

    // 1. Rules for games/<gameId>/**
    if (rel.startsWith('games/')) {
      const gameId = rel.split('/')[1];

      if (resolved && !isTestFile) {
        if (resolved.startsWith('platform/')) {
          const seg = resolved.split('/')[1]?.replace(/\.(ts|tsx)$/, '');
          if (!seg || !ALLOWED_GAME_PLATFORM_SEGMENTS.has(seg)) {
            violations.push(
              `[Boundary] ${rel}: games/** is not allowed to import "${resolved}" (found "${spec}")`
            );
          }
        }
        if (resolved.startsWith('shell')) {
          violations.push(
            `[Boundary] ${rel}: games/** must NOT import shell/** (found "${spec}")`
          );
        }
        if (resolved.startsWith('games/')) {
          const targetGameId = resolved.split('/')[1];
          if (targetGameId && targetGameId !== gameId) {
            violations.push(
              `[Boundary] ${rel}: games/${gameId} must NOT import another game "${targetGameId}" (found "${spec}")`
            );
          }
        }
      }
    }

    // 2. Rules for platform/**
    if (rel.startsWith('platform/')) {
      if (resolved) {
        if (
          resolved.startsWith('games') ||
          resolved.startsWith('shell') ||
          resolved.startsWith('three-kit')
        ) {
          violations.push(
            `[Boundary] ${rel}: platform/** must NOT import games/**, shell/**, or three-kit/** (found "${spec}")`
          );
        }
      }
    }

    // 3. Rules for domain/** (R3: Pure TypeScript)
    if (rel.includes('/domain/')) {
      const pkgRoot = spec.startsWith('@')
        ? spec.split('/').slice(0, 2).join('/')
        : spec.split('/')[0];

      if (
        FORBIDDEN_DOMAIN_PKGS.has(pkgRoot) ||
        spec.startsWith('@react-three/')
      ) {
        violations.push(
          `[R3] ${rel}: domain/** must be pure TypeScript and NOT import "${spec}"`
        );
      }

      if (resolved) {
        if (
          resolved.includes('/components/') ||
          resolved.startsWith('three-kit') ||
          resolved.startsWith('shell')
        ) {
          violations.push(
            `[R3] ${rel}: domain/** must NOT import UI/3D components or shell (found "${spec}")`
          );
        }
      }
    }
  }
}

if (violations.length > 0) {
  console.error('Architecture boundary violations detected:');
  for (const v of violations) {
    console.error(`  - ${v}`);
  }
  process.exit(1);
} else {
  console.log(`Boundaries check passed (${files.length} files scanned).`);
}
