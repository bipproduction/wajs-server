
/**
 * Helper type to recursively generate all possible key paths up to 7 levels deep.
 * Example: "media.data", "a.b.c.d.e.f.g"
 */
type NestedKeyOf<T, Prev extends string = ''> = {
  [K in keyof T & (string | number)]: T[K] extends Record<string, any>
  ? | `${Prev}${K}`
  | `${Prev}${K}.${NestedKeyOf<T[K], ''>}`
  : `${Prev}${K}`;
}[keyof T & (string | number)];

/**
 * Safely get deep value by string path like "a.b.c[0].d"
 */
export function getValueByPath<
  T extends object,
  P extends string,
  R = unknown
>(obj: T, path: P, defaultValue?: R): any {
  try {
    return path
      .replace(/\[(\w+)\]/g, '.$1')
      .split('.')
      .reduce((acc: any, key) => (acc != null ? acc[key] : undefined), obj) ?? defaultValue;
  } catch {
    return defaultValue;
  }
}

/**
 * Safely set deep value by string path like "a.b.c[0].d"
 */
export function setValueByPath<T extends object>(
  obj: T,
  path: string,
  value: any
): void {
  const keys = path.replace(/\[(\w+)\]/g, '.$1').split('.');
  let current: any = obj;

  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (current[key as keyof typeof current] == null || typeof current[key as keyof typeof current] !== 'object') {
      current[key as keyof typeof current] = isNaN(Number(keys[i + 1])) ? {} : [];
    }
    current = current[key as keyof typeof current];
  }

  current[keys[keys.length - 1] as keyof typeof current] = value;
}
