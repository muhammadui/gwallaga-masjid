import { Coordinates, Qibla } from "adhan";
import { BAUCHI } from "./constants";

/** Great-circle bearing to the Ka'bah from the masjid, degrees from true north (≈ 65°). */
export const QIBLA_DEGREES: number = Qibla(new Coordinates(BAUCHI.latitude, BAUCHI.longitude));

const POINTS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];

/** Eight-point compass label for a bearing, e.g. 65 → "NE". */
export function compassPoint(degrees: number): string {
  return POINTS[Math.round((((degrees % 360) + 360) % 360) / 45) % 8];
}
