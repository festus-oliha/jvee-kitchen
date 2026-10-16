import type { DayKey, Location } from "./types";

const DAYS: DayKey[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
const DAY_NAMES: Record<DayKey, string> = {
  mon: "Monday", tue: "Tuesday", wed: "Wednesday", thu: "Thursday", fri: "Friday", sat: "Saturday", sun: "Sunday",
};

/** Current day and minutes past midnight in Nigeria, whatever the visitor's clock says. */
function lagosNow(now = new Date()): { day: DayKey; minutes: number } {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Lagos", weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const day = get("weekday").slice(0, 3).toLowerCase() as DayKey;
  return { day, minutes: Number(get("hour")) * 60 + Number(get("minute")) };
}

const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

/** "08:00" -> "8am", "18:30" -> "6:30pm" */
export function prettyTime(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  const suffix = h >= 12 ? "pm" : "am";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return m ? `${hour}:${String(m).padStart(2, "0")}${suffix}` : `${hour}${suffix}`;
}

export function isOpenNow(loc: Location, now = new Date()): boolean {
  const { day, minutes } = lagosNow(now);
  const hours = loc.opening_hours[day];
  return !!hours && minutes >= toMinutes(hours[0]) && minutes < toMinutes(hours[1]);
}

/** e.g. "Mon – Sat, 8am – 6pm" when every open day shares the same hours. */
export function hoursSummary(loc: Location): string {
  const order: DayKey[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
  const open = order.filter((d) => loc.opening_hours[d]);
  if (!open.length) return "Closed";
  const first = loc.opening_hours[open[0]]!;
  const same = open.every((d) => loc.opening_hours[d]![0] === first[0] && loc.opening_hours[d]![1] === first[1]);
  const cap = (d: DayKey) => d[0].toUpperCase() + d.slice(1);
  const range = open.length > 1 ? `${cap(open[0])} – ${cap(open[open.length - 1])}` : cap(open[0]);
  return same ? `${range}, ${prettyTime(first[0])} – ${prettyTime(first[1])}` : range;
}

/** When the kitchen next opens, e.g. "8am tomorrow" or "8am Monday". */
export function nextOpening(loc: Location, now = new Date()): string {
  const { day, minutes } = lagosNow(now);
  const start = DAYS.indexOf(day);
  for (let i = 0; i < 8; i++) {
    const d = DAYS[(start + i) % 7];
    const h = loc.opening_hours[d];
    if (!h) continue;
    if (i === 0 && minutes >= toMinutes(h[0])) continue;
    const when = i === 0 ? "today" : i === 1 ? "tomorrow" : DAY_NAMES[d];
    return `${prettyTime(h[0])} ${when}`;
  }
  return "soon";
}
