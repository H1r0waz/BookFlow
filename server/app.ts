import express, {
  type Request,
  type Response,
  type NextFunction,
} from "express";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { randomBytes, createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import bcrypt from "bcryptjs";
import nodemailer from "nodemailer";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { db } from "./db.js";
import { HttpError, validHours } from "./scheduling.js";
import { readConfig } from "./config.js";

const config = readConfig();
const production = config.production;
const origin = config.origin;
const secret = () => randomBytes(32).toString("hex");
const hash = (s: string) => createHash("sha256").update(s).digest("hex");
const cookie = {
  httpOnly: true,
  secure: production,
  sameSite: "lax" as const,
  path: "/",
};
const uuid = z.uuid();
const email = z
  .email()
  .max(254)
  .transform((s) => s.toLowerCase());
const password = z
  .string()
  .min(10)
  .max(72)
  .refine(
    (value) => Buffer.byteLength(value, "utf8") <= 72,
    "Password must be at most 72 UTF-8 bytes.",
  );
const name = z.string().trim().min(1).max(120);
const authSchema = z.object({ email, password });
const customerSchema = z.object({
  name,
  email,
  phone: z.string().max(40).default(""),
  notes: z.string().max(2000).default(""),
});
const serviceSchema = z.object({
  name,
  duration: z.number().int().min(5).max(480),
  price: z.number().int().min(0).max(10000000),
});
const staffSchema = z.object({
  name,
  email,
  color: z
    .string()
    .regex(/^#[0-9a-f]{6}$/i)
    .default("#7468df"),
});
const bookingSchema = z.object({
  staffId: uuid,
  serviceId: uuid,
  customerId: uuid.optional(),
  customer: customerSchema.optional(),
  startAt: z.iso.datetime({ offset: true }),
  notes: z.string().max(2000).default(""),
});
type Context = {
  businessId: string;
  userId: string;
  csrf: string;
  sessionId: string;
};
const contexts = new WeakMap<Request, Context>();
const context = (r: Request) => {
  const c = contexts.get(r);
  if (!c) throw new HttpError(401, "Please sign in.");
  return c;
};
const param = (r: Request, k: string) => String(r.params[k]);
export const app = express();
app.disable("x-powered-by");
app.set("trust proxy", config.proxyHops || false);
app.use(helmet());
app.use(express.json({ limit: "64kb" }));
app.use(cookieParser());
app.use("/api", (req, _res, next) => {
  if (
    !["GET", "HEAD", "OPTIONS"].includes(req.method) &&
    req.get("origin") !== origin
  )
    return next(new HttpError(403, "Request origin rejected."));
  next();
});
const sensitive = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: "draft-8",
  legacyHeaders: false,
});
app.use("/api/auth", sensitive);
app.use(
  "/api/public",
  rateLimit({
    windowMs: 60000,
    limit: 90,
    standardHeaders: "draft-8",
    legacyHeaders: false,
  }),
);
async function session(userId: string, res: Response) {
  const raw = secret(),
    csrf = secret();
  await db.session.create({
    data: {
      id: hash(raw),
      userId,
      csrf,
      expiresAt: new Date(Date.now() + 7 * 86400000),
    },
  });
  res.cookie("bookflow_session", raw, { ...cookie, maxAge: 7 * 86400000 });
  return csrf;
}
app.get("/api/health", async (_req, res) => {
  await db.$queryRaw`SELECT 1`;
  res.json({ status: "ok" });
});
app.post("/api/auth/register", async (req, res) => {
  const data = authSchema
    .extend({
      name,
      businessName: name,
      slug: z
        .string()
        .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
        .min(3)
        .max(60),
    })
    .parse(req.body);
  const passwordHash = await bcrypt.hash(data.password, 12);
  const user = await db.user.create({
    data: {
      email: data.email,
      name: data.name,
      passwordHash,
      business: { create: { name: data.businessName, slug: data.slug } },
    },
  });
  res.status(201).json({ csrf: await session(user.id, res) });
});
app.post("/api/auth/login", async (req, res) => {
  const data = authSchema.parse(req.body),
    user = await db.user.findUnique({ where: { email: data.email } });
  if (!user || !(await bcrypt.compare(data.password, user.passwordHash)))
    throw new HttpError(401, "Email or password is incorrect.");
  if (req.cookies.bookflow_session)
    await db.session.deleteMany({
      where: { id: hash(req.cookies.bookflow_session) },
    });
  res.json({ csrf: await session(user.id, res) });
});
app.post("/api/auth/forgot", async (req, res) => {
  if (config.recovery === "disabled")
    throw new HttpError(
      503,
      "Password recovery is disabled in this public demo. Use the demo account or register with fictional data.",
    );
  const data = z.object({ email }).parse(req.body),
    user = await db.user.findUnique({ where: { email: data.email } });
  if (user) {
    const token = secret();
    await db.passwordResetToken.create({
      data: {
        id: hash(token),
        userId: user.id,
        expiresAt: new Date(Date.now() + 3600000),
      },
    });
    const link = `${origin}/reset?token=${token}`;
    if (config.recovery === "smtp")
      await nodemailer.createTransport(process.env.SMTP_URL).sendMail({
        from: process.env.MAIL_FROM,
        to: user.email,
        subject: "Reset your BookFlow password",
        text: `Reset your password within one hour: ${link}`,
      });
    else if (config.recovery === "local") {
      await mkdir(".local/outbox", { recursive: true });
      await writeFile(
        `.local/outbox/${Date.now()}.txt`,
        `To: ${user.email}\n${link}`,
      );
    } else
      throw new HttpError(503, "Password recovery is temporarily unavailable.");
  }
  res.json({ message: "If this account exists, a reset link has been sent." });
});
app.post("/api/auth/reset", async (req, res) => {
  if (config.recovery === "disabled")
    throw new HttpError(
      503,
      "Password recovery is disabled in this public demo.",
    );
  const data = z
    .object({ token: z.string().length(64), password })
    .parse(req.body);
  const passwordHash = await bcrypt.hash(data.password, 12);
  await db.$transaction(async (tx) => {
    const token = await tx.passwordResetToken.findUnique({
      where: { id: hash(data.token) },
    });
    if (!token || token.expiresAt < new Date())
      throw new HttpError(400, "Reset link is invalid or expired.");
    const consumed = await tx.passwordResetToken.deleteMany({
      where: { id: token.id },
    });
    if (consumed.count !== 1)
      throw new HttpError(400, "Reset link has already been used.");
    await tx.user.update({
      where: { id: token.userId },
      data: { passwordHash },
    });
    await tx.session.deleteMany({ where: { userId: token.userId } });
    await tx.passwordResetToken.deleteMany({ where: { userId: token.userId } });
  });
  res.json({ message: "Password updated. Please sign in." });
});
app.use("/api", async (req, _res, next) => {
  if (req.path.startsWith("/public/")) return next();
  const raw = req.cookies.bookflow_session;
  const s = raw
    ? await db.session.findUnique({
        where: { id: hash(raw) },
        include: { user: true },
      })
    : null;
  if (!s || s.expiresAt < new Date())
    throw new HttpError(401, "Please sign in.");
  if (
    !["GET", "HEAD"].includes(req.method) &&
    req.get("x-csrf-token") !== s.csrf
  )
    throw new HttpError(403, "Request token rejected.");
  contexts.set(req, {
    businessId: s.user.businessId,
    userId: s.userId,
    csrf: s.csrf,
    sessionId: s.id,
  });
  next();
});
app.get("/api/me", async (req, res) => {
  const c = context(req);
  const user = await db.user.findUniqueOrThrow({
    where: { id: c.userId },
    select: { name: true, email: true, business: true },
  });
  res.json({ ...user, csrf: c.csrf });
});
app.post("/api/logout", async (req, res) => {
  await db.session.deleteMany({ where: { id: context(req).sessionId } });
  res.clearCookie("bookflow_session", cookie).json({ ok: true });
});
app.get("/api/workspace", async (req, res) => {
  const businessId = context(req).businessId;
  const [customers, services, staff, appointments, audits] = await Promise.all([
    db.customer.findMany({ where: { businessId }, orderBy: { name: "asc" } }),
    db.service.findMany({ where: { businessId }, orderBy: { name: "asc" } }),
    db.staff.findMany({
      where: { businessId },
      include: { hours: true, timeOff: true, assignments: true },
      orderBy: { name: "asc" },
    }),
    db.appointment.findMany({
      where: { businessId },
      include: { customer: true, staff: true, service: true },
      orderBy: { startAt: "asc" },
    }),
    db.auditLog.findMany({
      where: { businessId },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
  ]);
  res.json({ customers, services, staff, appointments, audits });
});
for (const kind of ["customers", "services", "staff"] as const) {
  const model = {
    customers: db.customer,
    services: db.service,
    staff: db.staff,
  }[kind] as any;
  const schema = {
    customers: customerSchema,
    services: serviceSchema,
    staff: staffSchema,
  }[kind];
  app.post(`/api/${kind}`, async (req, res) => {
    res.status(201).json(
      await model.create({
        data: {
          ...schema.parse(req.body),
          businessId: context(req).businessId,
        },
      }),
    );
  });
  app.put(`/api/${kind}/:id`, async (req, res) => {
    const result = await model.updateMany({
      where: {
        id: uuid.parse(param(req, "id")),
        businessId: context(req).businessId,
      },
      data: schema.parse(req.body),
    });
    if (!result.count) throw new HttpError(404, "Record not found.");
    res.json({ ok: true });
  });
  app.delete(`/api/${kind}/:id`, async (req, res) => {
    const result = await model.deleteMany({
      where: {
        id: uuid.parse(param(req, "id")),
        businessId: context(req).businessId,
      },
    });
    if (!result.count) throw new HttpError(404, "Record not found.");
    res.json({ ok: true });
  });
}
app.put("/api/staff/:id/availability", async (req, res) => {
  const staffId = uuid.parse(param(req, "id")),
    businessId = context(req).businessId;
  const data = z
    .object({
      serviceIds: z.array(uuid).max(100),
      hours: z
        .array(
          z
            .object({
              weekday: z.number().int().min(1).max(7),
              startMinute: z.number().int().min(0).max(1439),
              endMinute: z.number().int().min(1).max(1440),
            })
            .refine((h) => h.endMinute > h.startMinute),
        )
        .max(7),
    })
    .parse(req.body);
  if (new Set(data.hours.map((h) => h.weekday)).size !== data.hours.length)
    throw new HttpError(400, "Each weekday must be unique.");
  await db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "Staff" WHERE id=${staffId}::uuid AND "businessId"=${businessId}::uuid FOR UPDATE`;
    if (!(await tx.staff.findFirst({ where: { id: staffId, businessId } })))
      throw new HttpError(404, "Staff member not found.");
    if (
      (await tx.service.count({
        where: { id: { in: data.serviceIds }, businessId },
      })) !== data.serviceIds.length
    )
      throw new HttpError(400, "Invalid services.");
    await tx.workingHours.deleteMany({ where: { staffId } });
    await tx.staffService.deleteMany({ where: { staffId } });
    await tx.workingHours.createMany({
      data: data.hours.map((h) => ({ ...h, staffId })),
    });
    await tx.staffService.createMany({
      data: data.serviceIds.map((serviceId) => ({ serviceId, staffId })),
    });
  });
  res.json({ ok: true });
});
app.post("/api/staff/:id/time-off", async (req, res) => {
  const staffId = uuid.parse(param(req, "id")),
    businessId = context(req).businessId;
  const data = z
    .object({
      startAt: z.iso.datetime({ offset: true }),
      endAt: z.iso.datetime({ offset: true }),
      reason: name,
    })
    .parse(req.body);
  const startAt = new Date(data.startAt),
    endAt = new Date(data.endAt);
  if (endAt <= startAt) throw new HttpError(400, "End must follow start.");
  await db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "Staff" WHERE id=${staffId}::uuid AND "businessId"=${businessId}::uuid FOR UPDATE`;
    if (!(await tx.staff.findFirst({ where: { id: staffId, businessId } })))
      throw new HttpError(404, "Staff member not found.");
    if (
      await tx.appointment.count({
        where: {
          staffId,
          businessId,
          status: { in: ["CONFIRMED", "COMPLETED"] },
          startAt: { lt: endAt },
          endAt: { gt: startAt },
        },
      })
    )
      throw new HttpError(409, "Time off conflicts with an appointment.");
    await tx.timeOff.create({
      data: { staffId, startAt, endAt, reason: data.reason },
    });
  });
  res.status(201).json({ ok: true });
});
app.delete("/api/time-off/:id", async (req, res) => {
  const result = await db.timeOff.deleteMany({
    where: {
      id: uuid.parse(param(req, "id")),
      staff: { businessId: context(req).businessId },
    },
  });
  if (!result.count) throw new HttpError(404, "Time off not found.");
  res.json({ ok: true });
});
app.put("/api/settings", async (req, res) => {
  const data = z
    .object({
      name,
      timezone: z.string().refine((zone) => {
        try {
          new Intl.DateTimeFormat("en", { timeZone: zone });
          return true;
        } catch {
          return false;
        }
      }, "Invalid timezone"),
      currency: z
        .string()
        .regex(/^[A-Z]{3}$/)
        .refine((currency) => {
          try {
            new Intl.NumberFormat("en", { style: "currency", currency });
            return true;
          } catch {
            return false;
          }
        }),
    })
    .parse(req.body);
  await db.business.update({ where: { id: context(req).businessId }, data });
  res.json({ ok: true });
});
async function book(
  req: Request,
  businessId: string,
  actor: string,
  publicBooking = false,
) {
  const data = bookingSchema.parse(req.body),
    key = z.string().min(8).max(100).parse(req.get("idempotency-key"));
  if (publicBooking && !data.customer)
    throw new HttpError(400, "Customer details are required.");
  const fingerprint = hash(JSON.stringify(data));
  return db.$transaction(
    async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Staff" WHERE id=${data.staffId}::uuid AND "businessId"=${businessId}::uuid FOR UPDATE`;
      const existing = await tx.appointment.findUnique({
        where: { businessId_requestKey: { businessId, requestKey: key } },
      });
      if (existing) {
        if (existing.requestHash !== fingerprint)
          throw new HttpError(409, "This request key was already used.");
        return {
          id: existing.id,
          startAt: existing.startAt,
          endAt: existing.endAt,
          status: existing.status,
        };
      }
      const [business, staff, service] = await Promise.all([
        tx.business.findUniqueOrThrow({ where: { id: businessId } }),
        tx.staff.findFirst({
          where: { id: data.staffId, businessId },
          include: { hours: true, assignments: true },
        }),
        tx.service.findFirst({ where: { id: data.serviceId, businessId } }),
      ]);
      if (
        !staff ||
        !service ||
        !staff.assignments.some((a) => a.serviceId === service.id)
      )
        throw new HttpError(
          400,
          "This staff member does not offer this service.",
        );
      const startAt = new Date(data.startAt),
        endAt = new Date(startAt.getTime() + service.duration * 60000);
      if (startAt < new Date())
        throw new HttpError(400, "Choose a future appointment.");
      if (!validHours(startAt, endAt, business.timezone, staff.hours))
        throw new HttpError(409, "The appointment is outside working hours.");
      if (
        await tx.timeOff.count({
          where: {
            staffId: staff.id,
            startAt: { lt: endAt },
            endAt: { gt: startAt },
          },
        })
      )
        throw new HttpError(409, "This staff member is away.");
      if (
        await tx.appointment.count({
          where: {
            staffId: staff.id,
            businessId,
            status: { in: ["CONFIRMED", "COMPLETED"] },
            startAt: { lt: endAt },
            endAt: { gt: startAt },
          },
        })
      )
        throw new HttpError(409, "This time is already booked.");
      let customerId = data.customerId;
      if (data.customer) {
        const c = await tx.customer.findUnique({
          where: {
            businessId_email: { businessId, email: data.customer.email },
          },
        });
        customerId =
          c?.id ||
          (
            await tx.customer.create({
              data: {
                ...data.customer,
                businessId,
                notes: publicBooking ? "" : data.customer.notes,
              },
            })
          ).id;
      }
      if (
        !customerId ||
        !(await tx.customer.findFirst({
          where: { id: customerId, businessId },
        }))
      )
        throw new HttpError(400, "Customer not found.");
      const appointment = await tx.appointment.create({
        data: {
          businessId,
          staffId: staff.id,
          serviceId: service.id,
          customerId,
          startAt,
          endAt,
          price: service.price,
          notes: data.notes,
          requestKey: key,
          requestHash: fingerprint,
        },
      });
      await tx.auditLog.create({
        data: {
          businessId,
          appointmentId: appointment.id,
          actor,
          action: "CREATED",
        },
      });
      return { id: appointment.id, startAt, endAt, status: appointment.status };
    },
    { maxWait: 10000, timeout: 15000 },
  );
}
app.post("/api/appointments", async (req, res) => {
  res
    .status(201)
    .json(await book(req, context(req).businessId, context(req).userId));
});
app.patch("/api/appointments/:id", async (req, res) => {
  const id = uuid.parse(param(req, "id")),
    c = context(req);
  const data = z
    .object({
      status: z
        .enum(["CONFIRMED", "COMPLETED", "CANCELLED", "NO_SHOW"])
        .optional(),
      notes: z.string().max(2000).optional(),
      startAt: z.iso.datetime({ offset: true }).optional(),
    })
    .parse(req.body);
  await db.$transaction(async (tx) => {
    const a = await tx.appointment.findFirst({
      where: { id, businessId: c.businessId },
    });
    if (!a) throw new HttpError(404, "Appointment not found.");
    await tx.$queryRaw`SELECT id FROM "Staff" WHERE id=${a.staffId}::uuid FOR UPDATE`;
    const current = await tx.appointment.findFirstOrThrow({
      where: { id, businessId: c.businessId },
    });
    const startAt = data.startAt ? new Date(data.startAt) : current.startAt,
      endAt = new Date(
        startAt.getTime() +
          (current.endAt.getTime() - current.startAt.getTime()),
      );
    const status = data.status || current.status;
    const timeChanged = startAt.getTime() !== current.startAt.getTime();
    const statusChanged = status !== current.status;
    const notesChanged =
      data.notes !== undefined && data.notes !== current.notes;
    if (!timeChanged && !statusChanged && !notesChanged) return;
    if (timeChanged && startAt < new Date())
      throw new HttpError(400, "Choose a future appointment.");
    const reactivated = !["CONFIRMED", "COMPLETED"].includes(current.status);
    // Historical notes/status edits do not reserve a new slot against today's schedule.
    if (
      (timeChanged || reactivated) &&
      (status === "CONFIRMED" || status === "COMPLETED")
    ) {
      const staff = await tx.staff.findUniqueOrThrow({
        where: { id: a.staffId },
        include: { hours: true, business: true },
      });
      if (!validHours(startAt, endAt, staff.business.timezone, staff.hours))
        throw new HttpError(409, "Outside working hours.");
      if (
        await tx.timeOff.count({
          where: {
            staffId: a.staffId,
            startAt: { lt: endAt },
            endAt: { gt: startAt },
          },
        })
      )
        throw new HttpError(409, "Staff member is away.");
      if (
        await tx.appointment.count({
          where: {
            id: { not: id },
            businessId: c.businessId,
            staffId: a.staffId,
            status: { in: ["CONFIRMED", "COMPLETED"] },
            startAt: { lt: endAt },
            endAt: { gt: startAt },
          },
        })
      )
        throw new HttpError(409, "This time is already booked.");
    }
    await tx.appointment.update({
      where: { id },
      data: { status, notes: data.notes, startAt, endAt },
    });
    const actions = [
      ...(timeChanged ? ["RESCHEDULED"] : []),
      ...(statusChanged ? [status] : []),
      ...(notesChanged ? ["NOTES_UPDATED"] : []),
    ];
    await tx.auditLog.createMany({
      data: actions.map((action) => ({
        businessId: c.businessId,
        appointmentId: id,
        actor: c.userId,
        action,
      })),
    });
  });
  res.json({ ok: true });
});
app.get("/api/public/:slug", async (req, res) => {
  const business = await db.business.findUnique({
    where: { slug: param(req, "slug") },
    select: {
      id: true,
      name: true,
      slug: true,
      timezone: true,
      currency: true,
      services: {
        select: { id: true, name: true, duration: true, price: true },
      },
      staff: {
        select: {
          id: true,
          name: true,
          assignments: { select: { serviceId: true } },
          hours: true,
        },
      },
    },
  });
  if (!business) throw new HttpError(404, "Business not found.");
  res.json(business);
});
app.post("/api/public/:slug/book", async (req, res) => {
  const b = await db.business.findUnique({
    where: { slug: param(req, "slug") },
    select: { id: true },
  });
  if (!b) throw new HttpError(404, "Business not found.");
  res.status(201).json(await book(req, b.id, "PUBLIC", true));
});
app.use("/api", (_req, _res, next) =>
  next(new HttpError(404, "Endpoint not found.")),
);
app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (error instanceof z.ZodError)
    return res
      .status(400)
      .json({ error: error.issues.map((i) => i.message).join(" ") });
  if (error instanceof HttpError)
    return res.status(error.status).json({ error: error.message });
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (["P2002", "P2003", "P2004", "P2010", "P2034"].includes(error.code))
      return res.status(409).json({
        error:
          "The record conflicts with an existing booking or linked record.",
      });
    if (error.code === "P2025")
      return res.status(404).json({ error: "Record not found." });
  }
  if (error instanceof SyntaxError)
    return res.status(400).json({ error: "Invalid JSON." });
  console.error(
    "Request failed:",
    error instanceof Error ? error.name : "UnknownError",
  );
  return res
    .status(500)
    .json({ error: "Something went wrong. Please try again." });
});
