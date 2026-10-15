import { db } from "../server/db.js";
import bcrypt from "bcryptjs";
import { DateTime } from "luxon";
const business = await db.business.upsert({
  where: { slug: "willow-studio" },
  update: {},
  create: {
    name: "Willow Studio",
    slug: "willow-studio",
    timezone: "America/New_York",
    currency: "USD",
  },
});
await db.user.upsert({
  where: { email: "demo@bookflow.example" },
  update: {},
  create: {
    businessId: business.id,
    email: "demo@bookflow.example",
    name: "Jamie Lane",
    passwordHash: await bcrypt.hash("BookFlowDemo!2026", 12),
  },
});
if (!(await db.service.count({ where: { businessId: business.id } }))) {
  const services = await Promise.all(
    [
      ["Signature haircut", 60, 8500],
      ["Color consultation", 30, 3500],
      ["Restorative facial", 60, 12000],
      ["Styling session", 45, 6500],
    ].map(([name, duration, price]) =>
      db.service.create({
        data: {
          businessId: business.id,
          name: String(name),
          duration: Number(duration),
          price: Number(price),
        },
      }),
    ),
  );
  const staff = await Promise.all(
    [
      ["Alex Morgan", "alex@willow.example", "#9178d0"],
      ["Sam Rivera", "sam@willow.example", "#79aaa4"],
      ["Taylor Brooks", "taylor@willow.example", "#d3a67e"],
    ].map(([name, email, color]) =>
      db.staff.create({
        data: {
          businessId: business.id,
          name,
          email,
          color,
          hours: {
            create: Array.from({ length: 6 }, (_, i) => ({
              weekday: i + 1,
              startMinute: 540,
              endMinute: 1080,
            })),
          },
          assignments: { create: services.map((s) => ({ serviceId: s.id })) },
        },
      }),
    ),
  );
  const customers = await Promise.all(
    [
      ["Olivia Bennett", "olivia@example.com"],
      ["Ethan Williams", "ethan@example.com"],
      ["Sophia Chen", "sophia@example.com"],
      ["Noah Thompson", "noah@example.com"],
      ["Emma Davis", "emma@example.com"],
      ["Liam Anderson", "liam@example.com"],
    ].map(([name, email], i) =>
      db.customer.create({
        data: {
          businessId: business.id,
          name,
          email,
          phone: `+1 202 555 01${String(i).padStart(2, "0")}`,
          notes: "Fictional portfolio demo customer.",
        },
      }),
    ),
  );
  const today = DateTime.now().setZone(business.timezone).startOf("day");
  for (let day = -7; day <= 14; day++) {
    const d = today.plus({ days: day });
    if (d.weekday === 7) continue;
    for (let i = 0; i < 3; i++) {
      const start = d.set({ hour: 10 + i * 2, minute: 0 }),
        service = services[(day + 21 + i) % services.length];
      const appointment = await db.appointment.create({
        data: {
          businessId: business.id,
          staffId: staff[i].id,
          customerId: customers[(day + 21 + i) % customers.length].id,
          serviceId: service.id,
          startAt: start.toJSDate(),
          endAt: start.plus({ minutes: service.duration }).toJSDate(),
          status: start < DateTime.now() ? "COMPLETED" : "CONFIRMED",
          price: service.price,
          requestKey: `seed-${day}-${i}`,
          requestHash: "seed",
        },
      });
      await db.auditLog.create({
        data: {
          businessId: business.id,
          appointmentId: appointment.id,
          actor: "SEED",
          action: "CREATED",
        },
      });
    }
  }
}
console.log(
  "Fictional Willow Studio demo is ready. See README for sign-in details.",
);
await db.$disconnect();
