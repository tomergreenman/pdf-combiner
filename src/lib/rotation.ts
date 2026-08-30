/** Normalize any degree value to one of 0 / 90 / 180 / 270. */
export function normalizeQuarter(deg: number): number {
  return ((Math.round(deg / 90) * 90) % 360 + 360) % 360;
}

/** Next 90° step, used by the rotate button. */
export function nextRotation(deg: number): number {
  return normalizeQuarter(deg + 90);
}

/**
 * Total rotation to apply at export time: the rotation already on the source
 * page PLUS the user's added rotation, normalized mod 360. Never overwrites the
 * embedded value.
 */
export function totalRotation(embedded: number, user: number): number {
  return normalizeQuarter(embedded + user);
}
