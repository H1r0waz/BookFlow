import { db } from "../server/db.js";
import bcrypt from "bcryptjs";
import { DateTime } from "luxon";

export async function seedDemoBusiness(
  slug: string,
  name: string,
  ownerEmail: string,
) {
  return db.$transaction(
    async (tx) => {
      const existing = await tx.business.findUnique({ where: { slug } });
      if (existing) {
        const owner = await tx.user.findUnique({
          where: { email: ownerEmail },
        });
        if (!owner || owner.businessId !== existing.id)
          throw new Error(
            "Refusing to seed an existing business not owned by the expected demo account.",
          );
        return { id: existing.id, created: false };
      }
      if (await tx.user.findUnique({ where: { email: ownerEmail } }))
        throw new Error(
          "Refusing to reuse an existing account for demo seeding.",
        );
      const business = await tx.business.create({
        data: { name, slug, timezone: "America/New_York", currency: "USD" },
      });
      await tx.user.create({
        data: {
          businessId: business.id,
          email: ownerEmail,
          name: "Jamie Lane",
          passwordHash: await bcrypt.hash("BookFlowDemo!2026", 12),
        },
      });
      const services = await Promise.all(
        [
          ["Signature haircut", 60, 8500],
          ["Color consultation", 30, 3500],
          ["Restorative facial", 60, 12000],
          ["Styling session", 45, 6500],
        ].map(([name, duration, price]) =>
          tx.service.create({
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
          tx.staff.create({
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
              assignments: {
                create: services.map((s) => ({ serviceId: s.id })),
              },
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
          tx.customer.create({
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
          const appointment = await tx.appointment.create({
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
          await tx.auditLog.create({
            data: {
              businessId: business.id,
              appointmentId: appointment.id,
              actor: "SEED",
              action: "CREATED",
            },
          });
        }
      }
      return { id: business.id, created: true };
    },
    { timeout: 30000 },
  );
}
