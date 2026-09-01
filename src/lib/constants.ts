/** Payload encoded in the hall's Attendance QR. Members scan this to clock in. */
export const ATTENDANCE_TOKEN = "SINOVA26-ATTENDANCE";

/** Fixed points every player earns for a trade-off individual activity. */
export const TRADE_OFF_POINTS = 5;

/** Fraction of an individual's points the begging team receives on a trade. */
export const TRADE_OFF_RATE = 0.5;

// ---------- Scream Machine loudness tuning ----------
// A phone browser can't read true dB SPL (no reference level, mics differ), so the
// meter is a RELATIVE 0–100 score derived from mic RMS in dBFS. These knobs make it
// hard to reach 100 with a normal voice — bump GAMMA/CEIL up to make it even harder.
/** dBFS that maps to 0 (silence / room noise floor). */
export const SCREAM_DB_FLOOR = -50;
/** dBFS that maps to the top of the raw range (near mic clipping). */
export const SCREAM_DB_CEIL = -3;
/** Curve exponent (>1 = harder): normal speech stays low, only real screaming nears 100. */
export const SCREAM_GAMMA = 2.6;

/** Convert a dBFS value to the difficulty-curved 0–100 loudness score. */
export function dbfsToLevel(dbfs: number): number {
  const raw = Math.max(0, Math.min(1, (dbfs - SCREAM_DB_FLOOR) / (SCREAM_DB_CEIL - SCREAM_DB_FLOOR)));
  return Math.pow(raw, SCREAM_GAMMA) * 100;
}
