export type ClassValue = string | number | boolean | null | undefined | ClassValue[];

/**
 * Lightweight class name joiner without external dependencies.
 */
export function cn(...inputs: ClassValue[]): string {
  const classes: string[] = [];

  const pushValue = (val: ClassValue): void => {
    if (!val || typeof val === 'boolean') return;
    if (Array.isArray(val)) {
      for (const item of val) {
        pushValue(item);
      }
      return;
    }
    const trimmed = String(val).trim();
    if (trimmed.length > 0) {
      classes.push(trimmed);
    }
  };

  for (const input of inputs) {
    pushValue(input);
  }

  return classes.join(' ');
}
