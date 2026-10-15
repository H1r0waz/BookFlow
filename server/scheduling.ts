import { DateTime } from "luxon";
export function validHours(
  start: Date,
  end: Date,
  zone: string,
  hours: { weekday: number; startMinute: number; endMinute: number }[],
) {
  const a = DateTime.fromJSDate(start, { zone }),
    b = DateTime.fromJSDate(end, { zone });
  const startMinute =
    a.hour * 60 + a.minute + a.second / 60 + a.millisecond / 60000;
  const endMinute =
    b.hour * 60 + b.minute + b.second / 60 + b.millisecond / 60000;
  return (
    a.isValid &&
    b.isValid &&
    a.toISODate() === b.toISODate() &&
    hours.some(
      (h) =>
        h.weekday === a.weekday &&
        startMinute >= h.startMinute &&
        endMinute <= h.endMinute,
    )
  );
}
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
