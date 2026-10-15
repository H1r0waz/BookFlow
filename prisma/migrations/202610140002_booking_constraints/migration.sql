CREATE EXTENSION IF NOT EXISTS btree_gist;
ALTER TABLE "Appointment" ADD CONSTRAINT appointment_positive_duration CHECK ("endAt" > "startAt");
ALTER TABLE "Appointment" ADD CONSTRAINT appointment_status CHECK (status IN ('CONFIRMED','COMPLETED','CANCELLED','NO_SHOW'));
ALTER TABLE "Appointment" ADD CONSTRAINT no_overlapping_staff_appointments EXCLUDE USING gist (
  "staffId" WITH =, tstzrange("startAt", "endAt", '[)') WITH &&
) WHERE (status IN ('CONFIRMED','COMPLETED'));
ALTER TABLE "Service" ADD CONSTRAINT service_valid CHECK (duration BETWEEN 5 AND 480 AND price >= 0);
ALTER TABLE "WorkingHours" ADD CONSTRAINT hours_valid CHECK (weekday BETWEEN 1 AND 7 AND "startMinute" >= 0 AND "endMinute" <= 1440 AND "endMinute" > "startMinute");
ALTER TABLE "TimeOff" ADD CONSTRAINT time_off_valid CHECK ("endAt" > "startAt");
