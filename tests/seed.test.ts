import { afterAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { db } from "../server/db.js";
import { seedDemoBusiness } from "../prisma/demo.js";
const slug = "seed-test-" + randomUUID();
const ownerEmail = slug + "@example.invalid";
const foreignSlug = slug + "-foreign";
afterAll(async () => {
  for (const s of [slug, foreignSlug]) {
    const b = await db.business.findUnique({ where: { slug: s } });
    if (!b) continue;
    await db.auditLog.deleteMany({ where: { businessId: b.id } });
    await db.appointment.deleteMany({ where: { businessId: b.id } });
    await db.staff.deleteMany({ where: { businessId: b.id } });
    await db.service.deleteMany({ where: { businessId: b.id } });
    await db.customer.deleteMany({ where: { businessId: b.id } });
    await db.user.deleteMany({ where: { businessId: b.id } });
    await db.business.delete({ where: { id: b.id } });
  }
  await db.$disconnect();
});
describe("Explicit safe demo seeding", () => {
  it("creates a fictional workspace transactionally and preserves changes on repeat", async () => {
    const first = await seedDemoBusiness(
      slug,
      "Synthetic Seed Test",
      ownerEmail,
    );
    expect(first.created).toBe(true);
    const b = await db.business.findUniqueOrThrow({
      where: { id: first.id },
      include: {
        _count: {
          select: {
            staff: true,
            services: true,
            customers: true,
            appointments: true,
          },
        },
      },
    });
    expect(b._count).toMatchObject({ staff: 3, services: 4, customers: 6 });
    expect(b._count.appointments).toBeGreaterThan(0);
    await db.business.update({
      where: { id: b.id },
      data: { name: "Preserve this demo edit" },
    });
    expect(
      await seedDemoBusiness(slug, "Synthetic Seed Test", ownerEmail),
    ).toEqual({ id: b.id, created: false });
    expect(
      (await db.business.findUniqueOrThrow({ where: { id: b.id } })).name,
    ).toBe("Preserve this demo edit");
    expect(await db.appointment.count({ where: { businessId: b.id } })).toBe(
      b._count.appointments,
    );
  });
  it("never injects a demo login into an existing unrelated business", async () => {
    const b = await db.business.create({
      data: { slug: foreignSlug, name: "Unrelated synthetic tenant" },
    });
    await expect(
      seedDemoBusiness(
        foreignSlug,
        "Ignored",
        foreignSlug + "@example.invalid",
      ),
    ).rejects.toThrow("Refusing");
    expect(await db.user.count({ where: { businessId: b.id } })).toBe(0);
  });
});
