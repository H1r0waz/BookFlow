import { test, expect } from "@playwright/test";
import { DateTime } from "luxon";
import { db } from "../../server/db.js";
test("demo workspace and responsive navigation", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Email address").fill("demo@bookflow.example");
  await page.getByLabel("Password", { exact: true }).fill("BookFlowDemo!2026");
  await page.getByRole("button", { name: "Sign in →", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "A good day starts here." }),
  ).toBeVisible();
  await page.screenshot({ path: "test-results/dashboard.png", fullPage: true });
  await page.getByRole("link", { name: "Calendar", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Make space for what matters." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Month", exact: true }).click();
  await page.getByRole("link", { name: "Customers", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "People come first." }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Olivia Bennett", exact: true }),
  ).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: "test-results/mobile.png", fullPage: true });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test("public booking page and validation", async ({ page }) => {
  await page.goto("/book/willow-studio");
  await expect(
    page.getByRole("heading", { name: "Let’s find your next visit." }),
  ).toBeVisible();
  await expect(page.getByLabel("Choose a service")).toBeVisible();
  await page.screenshot({
    path: "test-results/public-booking.png",
    fullPage: true,
  });
});
test("mobile navigation exposes logout and revokes the browser session", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByLabel("Email address").fill("demo@bookflow.example");
  await page.getByLabel("Password", { exact: true }).fill("BookFlowDemo!2026");
  await page.getByRole("button", { name: "Sign in →", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "A good day starts here." }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Customers", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "People come first." }),
  ).toBeVisible();
  const logout = page.getByRole("button", { name: /Sign out/ });
  await expect(logout).toBeVisible();
  await logout.click();
  await expect(
    page.getByRole("heading", { name: "Welcome back." }),
  ).toBeVisible();
  expect((await page.request.get("/api/me")).status()).toBe(401);
});
test("historical appointment editor saves notes without moving the visit", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByLabel("Email address").fill("demo@bookflow.example");
  await page.getByLabel("Password", { exact: true }).fill("BookFlowDemo!2026");
  await page.getByRole("button", { name: "Sign in →", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "A good day starts here." }),
  ).toBeVisible();
  const w = await (await page.request.get("/api/workspace")).json();
  const a = w.appointments.find(
    (a: { status: string }) => a.status === "COMPLETED",
  );
  expect(a).toBeTruthy();
  await page.getByRole("link", { name: "Calendar", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Make space for what matters." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Day", exact: true }).click();
  await page
    .getByLabel("Calendar date")
    .fill(DateTime.fromISO(a.startAt).setZone("America/New_York").toISODate()!);
  await page
    .locator(".appointment-row")
    .filter({ hasText: a.customer.name })
    .first()
    .click();
  const note = "Fictional historical visit reviewed";
  try {
    await page.getByLabel("Notes", { exact: true }).fill(note);
    await page
      .getByRole("button", { name: "Save appointment", exact: true })
      .click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    const updated = (
      await (await page.request.get("/api/workspace")).json()
    ).appointments.find((x: { id: string }) => x.id === a.id);
    expect(updated.notes).toBe(note);
    expect(updated.startAt).toBe(a.startAt);
  } finally {
    await db.appointment.update({
      where: { id: a.id },
      data: { notes: a.notes },
    });
    await db.auditLog.deleteMany({
      where: {
        appointmentId: a.id,
        action: "NOTES_UPDATED",
        createdAt: { gte: new Date(Date.now() - 60000) },
      },
    });
  }
});
test("public reservation persists and is visible to the business owner", async ({
  page,
}) => {
  const request = page.request;
  const suffix = Date.now(),
    slug = `browser-${suffix}`,
    origin = "http://127.0.0.1:5173";
  let businessId = "";
  try {
    const registered = await request.post("/api/auth/register", {
      headers: { Origin: origin },
      data: {
        name: "Browser Owner",
        email: `browser-${suffix}@test.example`,
        password: "BrowserTest!2026",
        businessName: "Browser Studio",
        slug,
      },
    });
    expect(registered.status()).toBe(201);
    const csrf = (await registered.json()).csrf,
      headers = { Origin: origin, "x-csrf-token": csrf };
    businessId = (await (await request.get("/api/me")).json()).business.id;
    const staff = await (
      await request.post("/api/staff", {
        headers,
        data: { name: "Browser Staff", email: "staff@browser.example" },
      })
    ).json();
    const service = await (
      await request.post("/api/services", {
        headers,
        data: { name: "Browser Session", duration: 60, price: 5000 },
      })
    ).json();
    await request.put("/api/staff/" + staff.id + "/availability", {
      headers,
      data: {
        serviceIds: [service.id],
        hours: Array.from({ length: 7 }, (_, i) => ({
          weekday: i + 1,
          startMinute: 540,
          endMinute: 1020,
        })),
      },
    });
    await page.goto("/book/" + slug);
    await page.getByLabel("Team member").selectOption(staff.id);
    await page
      .getByLabel("Date & time", { exact: false })
      .fill(
        DateTime.now()
          .setZone("America/New_York")
          .plus({ days: 45 })
          .set({ hour: 10, minute: 0 })
          .toFormat("yyyy-MM-dd'T'HH:mm"),
      );
    await page.getByLabel("Your name").fill("Browser Customer");
    await page.getByLabel("Email address").fill("customer@browser.example");
    await page.getByRole("button", { name: "Confirm appointment →" }).click();
    await expect(
      page.getByRole("heading", { name: "You’re on the calendar." }),
    ).toBeVisible();
    const workspace = await (await request.get("/api/workspace")).json();
    expect(workspace.appointments).toHaveLength(1);
    expect(workspace.appointments[0].customer.name).toBe("Browser Customer");
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: "A good day starts here." }),
    ).toBeVisible();
    await page.getByRole("button", { name: /Browser Customer/ }).click();
    await page.getByLabel("Status", { exact: true }).selectOption("CANCELLED");
    await page
      .getByRole("button", { name: "Save appointment", exact: true })
      .click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    expect(
      (await (await request.get("/api/workspace")).json()).appointments[0]
        .status,
    ).toBe("CANCELLED");
  } finally {
    if (businessId) {
      await db.auditLog.deleteMany({ where: { businessId } });
      await db.appointment.deleteMany({ where: { businessId } });
      await db.staff.deleteMany({ where: { businessId } });
      await db.service.deleteMany({ where: { businessId } });
      await db.customer.deleteMany({ where: { businessId } });
      await db.user.deleteMany({ where: { businessId } });
      await db.business.delete({ where: { id: businessId } });
    }
  }
});
test.afterAll(async () => {
  await db.$disconnect();
});
