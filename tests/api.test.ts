import { beforeAll, afterAll, describe, it, expect } from "vitest";
import request from "supertest";
import { DateTime } from "luxon";
import { app } from "../server/app.js";
import { db } from "../server/db.js";
import { readdir, readFile, unlink } from "node:fs/promises";
import { createHash, randomBytes } from "node:crypto";
const origin = "http://127.0.0.1:5173";
const suffix = Date.now();
const one = request.agent(app),
  two = request.agent(app);
let csrf1 = "",
  csrf2 = "",
  businessId = "",
  business2 = "",
  staffId = "",
  serviceId = "",
  customerId = "",
  startAt = "",
  appointmentId = "";
const body = () => ({ staffId, serviceId, customerId, startAt });
beforeAll(async () => {
  const first = await one
    .post("/api/auth/register")
    .set("Origin", origin)
    .send({
      email: `one-${suffix}@test.example`,
      password: "IntegrationTest!2026",
      name: "Owner One",
      businessName: "Test One",
      slug: `test-one-${suffix}`,
    });
  expect(first.status).toBe(201);
  csrf1 = first.body.csrf;
  const second = await two
    .post("/api/auth/register")
    .set("Origin", origin)
    .send({
      email: `two-${suffix}@test.example`,
      password: "IntegrationTest!2026",
      name: "Owner Two",
      businessName: "Test Two",
      slug: `test-two-${suffix}`,
    });
  expect(second.status).toBe(201);
  csrf2 = second.body.csrf;
  businessId = (await one.get("/api/me")).body.business.id;
  business2 = (await two.get("/api/me")).body.business.id;
  staffId = (
    await one
      .post("/api/staff")
      .set("Origin", origin)
      .set("x-csrf-token", csrf1)
      .send({ name: "Test Staff", email: "staff@test.example" })
  ).body.id;
  serviceId = (
    await one
      .post("/api/services")
      .set("Origin", origin)
      .set("x-csrf-token", csrf1)
      .send({ name: "Test service", duration: 60, price: 5000 })
  ).body.id;
  customerId = (
    await one
      .post("/api/customers")
      .set("Origin", origin)
      .set("x-csrf-token", csrf1)
      .send({ name: "Test customer", email: "customer@test.example" })
  ).body.id;
  await one
    .put(`/api/staff/${staffId}/availability`)
    .set("Origin", origin)
    .set("x-csrf-token", csrf1)
    .send({
      serviceIds: [serviceId],
      hours: Array.from({ length: 7 }, (_, i) => ({
        weekday: i + 1,
        startMinute: 540,
        endMinute: 1020,
      })),
    });
  startAt = DateTime.now()
    .setZone("America/New_York")
    .plus({ days: 30 })
    .set({ hour: 10, minute: 0, second: 0, millisecond: 0 })
    .toUTC()
    .toISO()!;
}, 30000);
afterAll(async () => {
  for (const id of [businessId, business2]) {
    if (!id) continue;
    await db.auditLog.deleteMany({ where: { businessId: id } });
    await db.appointment.deleteMany({ where: { businessId: id } });
    await db.staff.deleteMany({ where: { businessId: id } });
    await db.service.deleteMany({ where: { businessId: id } });
    await db.customer.deleteMany({ where: { businessId: id } });
    await db.user.deleteMany({ where: { businessId: id } });
    await db.business.delete({ where: { id } });
  }
  await db.$disconnect();
});
describe("Real PostgreSQL API", () => {
  it("requires authentication, origin and CSRF", async () => {
    expect((await request(app).get("/api/workspace")).status).toBe(401);
    expect((await one.post("/api/customers").send({})).status).toBe(403);
    expect(
      (await one.post("/api/customers").set("Origin", origin).send({})).status,
    ).toBe(403);
  });
  it("protects tenant reads and writes", async () => {
    expect((await two.get("/api/workspace")).body.customers).toEqual([]);
    expect(
      (
        await two
          .put("/api/customers/" + customerId)
          .set("Origin", origin)
          .set("x-csrf-token", csrf2)
          .send({ name: "Stolen", email: "stolen@test.example" })
      ).status,
    ).toBe(404);
    expect(
      (
        await two
          .post("/api/appointments")
          .set("Origin", origin)
          .set("x-csrf-token", csrf2)
          .set("idempotency-key", "other-tenant")
          .send(body())
      ).status,
    ).toBe(400);
  });
  it("allows one winner for concurrent bookings and preserves idempotency", async () => {
    const results = await Promise.all(
      ["concurrent-a", "concurrent-b"].map((key) =>
        one
          .post("/api/appointments")
          .set("Origin", origin)
          .set("x-csrf-token", csrf1)
          .set("idempotency-key", key)
          .send(body()),
      ),
    );
    expect(results.map((r) => r.status).sort()).toEqual([201, 409]);
    const winner = results.find((r) => r.status === 201)!;
    appointmentId = winner.body.id;
    const key = results[0].status === 201 ? "concurrent-a" : "concurrent-b";
    const repeat = await one
      .post("/api/appointments")
      .set("Origin", origin)
      .set("x-csrf-token", csrf1)
      .set("idempotency-key", key)
      .send(body());
    expect(repeat.body.id).toBe(appointmentId);
    expect(
      (
        await one
          .post("/api/appointments")
          .set("Origin", origin)
          .set("x-csrf-token", csrf1)
          .set("idempotency-key", key)
          .send({ ...body(), notes: "different" })
      ).status,
    ).toBe(409);
  });
  it("enforces the database overlap constraint even outside the API", async () => {
    await expect(
      db.appointment.create({
        data: {
          businessId,
          staffId,
          serviceId,
          customerId,
          startAt: new Date(startAt),
          endAt: new Date(new Date(startAt).getTime() + 3600000),
          price: 5000,
          requestKey: "direct-insert",
          requestHash: "direct",
        },
      }),
    ).rejects.toThrow();
  });
  it("checks working hours and time off", async () => {
    const early = DateTime.fromISO(startAt)
      .setZone("America/New_York")
      .set({ hour: 7 })
      .toUTC()
      .toISO();
    expect(
      (
        await one
          .post("/api/appointments")
          .set("Origin", origin)
          .set("x-csrf-token", csrf1)
          .set("idempotency-key", "early-booking")
          .send({ ...body(), startAt: early })
      ).status,
    ).toBe(409);
    const off = DateTime.fromISO(startAt).plus({ days: 1 });
    expect(
      (
        await one
          .post(`/api/staff/${staffId}/time-off`)
          .set("Origin", origin)
          .set("x-csrf-token", csrf1)
          .send({
            startAt: off.toISO(),
            endAt: off.plus({ hours: 3 }).toISO(),
            reason: "Holiday",
          })
      ).status,
    ).toBe(201);
    expect(
      (
        await one
          .post("/api/appointments")
          .set("Origin", origin)
          .set("x-csrf-token", csrf1)
          .set("idempotency-key", "off-booking")
          .send({ ...body(), startAt: off.toISO() })
      ).status,
    ).toBe(409);
  });
  it("cancels idempotently and records one event", async () => {
    for (let i = 0; i < 2; i++)
      expect(
        (
          await one
            .patch("/api/appointments/" + appointmentId)
            .set("Origin", origin)
            .set("x-csrf-token", csrf1)
            .send({ status: "CANCELLED" })
        ).status,
      ).toBe(200);
    expect(
      await db.auditLog.count({
        where: { appointmentId, action: "CANCELLED" },
      }),
    ).toBe(1);
  });
  it("offers public booking without leaking customer details", async () => {
    const publicData = await request(app).get(`/api/public/test-one-${suffix}`);
    expect(publicData.status).toBe(200);
    expect(publicData.body.customers).toBeUndefined();
    expect(publicData.body.staff[0].email).toBeUndefined();
    const result = await request(app)
      .post(`/api/public/test-one-${suffix}/book`)
      .set("Origin", origin)
      .set("idempotency-key", "public-booking")
      .send({
        staffId,
        serviceId,
        startAt,
        customer: { name: "Public Client", email: "public@test.example" },
      });
    expect(result.status).toBe(201);
    expect(result.body.customerId).toBeUndefined();
  });
  it("rejects bad credentials and validates input", async () => {
    expect(
      (
        await request(app)
          .post("/api/auth/login")
          .set("Origin", origin)
          .send({
            email: `one-${suffix}@test.example`,
            password: "WrongPassword!",
          })
      ).status,
    ).toBe(401);
    expect(
      (
        await one
          .post("/api/services")
          .set("Origin", origin)
          .set("x-csrf-token", csrf1)
          .send({ name: "Bad", duration: -1, price: 0 })
      ).status,
    ).toBe(400);
  });
  it("updates and deletes tenant-owned CRUD records", async () => {
    const created = await one
      .post("/api/customers")
      .set("Origin", origin)
      .set("x-csrf-token", csrf1)
      .send({ name: "Temporary", email: "temporary@test.example" });
    expect(created.status).toBe(201);
    expect(
      (
        await one
          .put("/api/customers/" + created.body.id)
          .set("Origin", origin)
          .set("x-csrf-token", csrf1)
          .send({ name: "Updated", email: "temporary@test.example" })
      ).status,
    ).toBe(200);
    expect(
      (
        await one
          .delete("/api/customers/" + created.body.id)
          .set("Origin", origin)
          .set("x-csrf-token", csrf1)
      ).status,
    ).toBe(200);
  });
  it("allows historical notes and completion without rescheduling or duplicate audit events", async () => {
    const past = DateTime.fromISO(startAt).minus({ days: 60 }).toJSDate();
    const a = await db.appointment.create({
      data: {
        businessId,
        staffId,
        serviceId,
        customerId,
        startAt: past,
        endAt: new Date(past.getTime() + 3600000),
        price: 5000,
        requestKey: "historical",
        requestHash: "fixture",
      },
    });
    const patch = () =>
      one
        .patch("/api/appointments/" + a.id)
        .set("Origin", origin)
        .set("x-csrf-token", csrf1)
        .send({
          startAt: past.toISOString(),
          status: "COMPLETED",
          notes: "Historical visit completed",
        });
    expect((await patch()).status).toBe(200);
    expect((await patch()).status).toBe(200);
    const actions = (
      await db.auditLog.findMany({ where: { appointmentId: a.id } })
    )
      .map((x) => x.action)
      .sort();
    expect(actions).toEqual(["COMPLETED", "NOTES_UPDATED"]);
    expect(
      (
        await one
          .patch("/api/appointments/" + a.id)
          .set("Origin", origin)
          .set("x-csrf-token", csrf1)
          .send({ startAt: new Date(past.getTime() + 60000).toISOString() })
      ).status,
    ).toBe(400);
  });
  it("rejects cross-tenant appointment and availability mutations", async () => {
    expect(
      (
        await two
          .patch("/api/appointments/" + appointmentId)
          .set("Origin", origin)
          .set("x-csrf-token", csrf2)
          .send({ status: "CANCELLED" })
      ).status,
    ).toBe(404);
    expect(
      (
        await two
          .put("/api/staff/" + staffId + "/availability")
          .set("Origin", origin)
          .set("x-csrf-token", csrf2)
          .send({ serviceIds: [serviceId], hours: [] })
      ).status,
    ).toBe(404);
    expect(
      (
        await two
          .delete("/api/staff/" + staffId)
          .set("Origin", origin)
          .set("x-csrf-token", csrf2)
      ).status,
    ).toBe(404);
  });
  it("serializes simultaneous retries of the same request key", async () => {
    const payload = {
      ...body(),
      startAt: DateTime.fromISO(startAt).plus({ days: 2 }).toISO(),
    };
    const results = await Promise.all(
      Array.from({ length: 4 }, () =>
        one
          .post("/api/appointments")
          .set("Origin", origin)
          .set("x-csrf-token", csrf1)
          .set("idempotency-key", "identical-concurrent")
          .send(payload),
      ),
    );
    expect(results.map((r) => r.status)).toEqual([201, 201, 201, 201]);
    expect(new Set(results.map((r) => r.body.id)).size).toBe(1);
    expect(
      await db.auditLog.count({
        where: { appointmentId: results[0].body.id, action: "CREATED" },
      }),
    ).toBe(1);
  });
  it("permits adjacent appointments and rejects reactivation into a conflict", async () => {
    const day = DateTime.fromISO(startAt).plus({ days: 3 });
    const create = (hour: number, key: string) =>
      one
        .post("/api/appointments")
        .set("Origin", origin)
        .set("x-csrf-token", csrf1)
        .set("idempotency-key", key)
        .send({ ...body(), startAt: day.plus({ hours: hour }).toISO() });
    const a = await create(0, "adjacent-one"),
      b = await create(1, "adjacent-two");
    expect(a.status).toBe(201);
    expect(b.status).toBe(201);
    const patch = (id: string, data: object) =>
      one
        .patch("/api/appointments/" + id)
        .set("Origin", origin)
        .set("x-csrf-token", csrf1)
        .send(data);
    expect(
      (await patch(b.body.id, { startAt: day.plus({ minutes: 30 }).toISO() }))
        .status,
    ).toBe(409);
    expect(
      (await patch(a.body.id, { status: "CANCELLED", startAt: day.toISO() }))
        .status,
    ).toBe(200);
    const replacement = await create(0, "replacement-one");
    expect(replacement.status).toBe(201);
    expect((await patch(a.body.id, { status: "CONFIRMED" })).status).toBe(409);
    expect(
      (await db.auditLog.findMany({ where: { appointmentId: a.body.id } }))
        .map((x) => x.action)
        .sort(),
    ).toEqual(["CANCELLED", "CREATED"]);
  });
  it("records rescheduling, status and note changes independently", async () => {
    const day = DateTime.fromISO(startAt).plus({ days: 4 });
    const result = await one
      .post("/api/appointments")
      .set("Origin", origin)
      .set("x-csrf-token", csrf1)
      .set("idempotency-key", "audit-combined")
      .send({ ...body(), startAt: day.toISO() });
    expect(result.status).toBe(201);
    const response = await one
      .patch("/api/appointments/" + result.body.id)
      .set("Origin", origin)
      .set("x-csrf-token", csrf1)
      .send({
        startAt: day.plus({ hours: 2 }).toISO(),
        status: "NO_SHOW",
        notes: "Customer did not attend",
      });
    expect(response.status).toBe(200);
    expect(
      (await db.auditLog.findMany({ where: { appointmentId: result.body.id } }))
        .map((x) => x.action)
        .sort(),
    ).toEqual(["CREATED", "NOTES_UPDATED", "NO_SHOW", "RESCHEDULED"]);
  });
  it("replays public requests without returning personal information and rejects unknown businesses", async () => {
    const payload = {
      staffId,
      serviceId,
      startAt: DateTime.fromISO(startAt).plus({ days: 5 }).toISO(),
      customer: {
        name: "Fictional Repeat Client",
        email: "repeat@example.invalid",
      },
    };
    const post = () =>
      request(app)
        .post(`/api/public/test-one-${suffix}/book`)
        .set("Origin", origin)
        .set("idempotency-key", "public-repeat")
        .send(payload);
    const a = await post(),
      b = await post();
    expect(a.status).toBe(201);
    expect(b.body.id).toBe(a.body.id);
    expect(Object.keys(b.body).sort()).toEqual([
      "endAt",
      "id",
      "startAt",
      "status",
    ]);
    expect(
      (await request(app).get("/api/public/unknown-business")).status,
    ).toBe(404);
  });
  it("rejects expired and invalid recovery tokens and hides unknown accounts", async () => {
    const user = await db.user.findUniqueOrThrow({
      where: { email: `two-${suffix}@test.example` },
    });
    const token = randomBytes(32).toString("hex");
    await db.passwordResetToken.create({
      data: {
        id: createHash("sha256").update(token).digest("hex"),
        userId: user.id,
        expiresAt: new Date(Date.now() - 1000),
      },
    });
    for (const value of [token, "0".repeat(64)])
      expect(
        (
          await request(app)
            .post("/api/auth/reset")
            .set("Origin", origin)
            .send({ token: value, password: "NewIntegration!2026" })
        ).status,
      ).toBe(400);
    expect(
      (
        await request(app)
          .post("/api/auth/forgot")
          .set("Origin", origin)
          .send({ email: "not-an-account@example.invalid" })
      ).body,
    ).toEqual({
      message: "If this account exists, a reset link has been sent.",
    });
  });
  it("consumes reset tokens once and revokes sessions", async () => {
    const email = `one-${suffix}@test.example`;
    expect(
      (
        await request(app)
          .post("/api/auth/forgot")
          .set("Origin", origin)
          .send({ email })
      ).status,
    ).toBe(200);
    const files = await readdir(".local/outbox");
    let token = "",
      matched = "";
    for (const file of files) {
      const content = await readFile(".local/outbox/" + file, "utf8");
      if (content.includes(email)) {
        token = new URL(content.split("\n")[1]).searchParams.get("token")!;
        matched = file;
        break;
      }
    }
    expect(token).toHaveLength(64);
    try {
      expect(
        (
          await request(app)
            .post("/api/auth/reset")
            .set("Origin", origin)
            .send({ token, password: "NewIntegration!2026" })
        ).status,
      ).toBe(200);
      expect((await one.get("/api/me")).status).toBe(401);
      expect(
        (
          await request(app)
            .post("/api/auth/reset")
            .set("Origin", origin)
            .send({ token, password: "NewIntegration!2026" })
        ).status,
      ).toBe(400);
      expect(
        (
          await request(app)
            .post("/api/auth/login")
            .set("Origin", origin)
            .send({ email, password: "NewIntegration!2026" })
        ).status,
      ).toBe(200);
    } finally {
      if (matched) await unlink(".local/outbox/" + matched);
    }
  });
});
