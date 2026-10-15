import { describe, it, expect } from "vitest";
import { validHours } from "../server/scheduling.js";
import { DateTime } from "luxon";
const hours = [{ weekday: 1, startMinute: 540, endMinute: 1020 }];
describe("Business timezone hours", () => {
  it("checks the spring DST jump using elapsed UTC duration", () => {
    expect(
      validHours(
        new Date("2030-03-10T06:30:00Z"),
        new Date("2030-03-10T07:30:00Z"),
        "America/New_York",
        [{ weekday: 7, startMinute: 60, endMinute: 240 }],
      ),
    ).toBe(true);
    expect(
      validHours(
        new Date("2030-03-10T06:30:00Z"),
        new Date("2030-03-10T07:30:00Z"),
        "America/New_York",
        [{ weekday: 7, startMinute: 60, endMinute: 180 }],
      ),
    ).toBe(false);
  });
  it("distinguishes the two UTC instants of a repeated autumn local time", () => {
    const first = DateTime.fromISO("2030-11-03T01:30:00-04:00").setZone(
      "America/New_York",
    );
    const second = DateTime.fromISO("2030-11-03T01:30:00-05:00").setZone(
      "America/New_York",
    );
    expect(first.toFormat("HH:mm")).toBe(second.toFormat("HH:mm"));
    expect(second.toMillis() - first.toMillis()).toBe(3600000);
    for (const d of [first, second])
      expect(
        validHours(
          d.toJSDate(),
          d.plus({ minutes: 30 }).toJSDate(),
          "America/New_York",
          [{ weekday: 7, startMinute: 0, endMinute: 240 }],
        ),
      ).toBe(true);
  });
  it("detects normalization of a nonexistent spring local time", () => {
    expect(
      DateTime.fromISO("2030-03-10T02:30", {
        zone: "America/New_York",
      }).toFormat("yyyy-MM-dd'T'HH:mm"),
    ).not.toBe("2030-03-10T02:30");
  });
  it("converts UTC to business local time", () => {
    expect(
      validHours(
        new Date("2030-01-07T14:00:00Z"),
        new Date("2030-01-07T15:00:00Z"),
        "America/New_York",
        hours,
      ),
    ).toBe(true);
  });
  it("rejects before opening and appointments crossing closing", () => {
    expect(
      validHours(
        new Date("2030-01-07T13:00:00Z"),
        new Date("2030-01-07T14:00:00Z"),
        "America/New_York",
        hours,
      ),
    ).toBe(false);
    expect(
      validHours(
        new Date("2030-01-07T21:30:00Z"),
        new Date("2030-01-07T22:30:00Z"),
        "America/New_York",
        hours,
      ),
    ).toBe(false);
  });
  it("uses daylight saving offset rather than fixed UTC offset", () => {
    expect(
      validHours(
        new Date("2030-07-08T13:00:00Z"),
        new Date("2030-07-08T14:00:00Z"),
        "America/New_York",
        hours,
      ),
    ).toBe(true);
  });
  it("rejects overnight and nonexistent zone", () => {
    expect(
      validHours(
        new Date("2030-01-07T23:00:00Z"),
        new Date("2030-01-08T14:00:00Z"),
        "America/New_York",
        hours,
      ),
    ).toBe(false);
    expect(validHours(new Date(), new Date(), "invalid", hours)).toBe(false);
  });
  it("rejects even fractional minutes after closing", () => {
    expect(
      validHours(
        new Date("2030-01-07T21:00:01Z"),
        new Date("2030-01-07T22:00:01Z"),
        "America/New_York",
        hours,
      ),
    ).toBe(false);
  });
});
