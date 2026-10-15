import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
const base = "http://127.0.0.1:5173";
const output = "docs/screenshots";
await mkdir(output, { recursive: true });
const browser = await chromium.launch();
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
    deviceScaleFactor: 1,
  });
  await page.goto(base);
  await page.getByLabel("Email address").fill("demo@bookflow.example");
  await page.getByLabel("Password", { exact: true }).fill("BookFlowDemo!2026");
  await page.getByRole("button", { name: "Sign in →", exact: true }).click();
  await page
    .getByRole("heading", { name: "A good day starts here.", exact: true })
    .waitFor();
  for (const [file, path, heading] of [
    ["dashboard", "/", "A good day starts here."],
    ["calendar", "/calendar", "Make space for what matters."],
    ["customers", "/customers", "People come first."],
    ["staff", "/staff", "Better, together."],
  ]) {
    await page.goto(base + path);
    await page.getByRole("heading", { name: heading, exact: true }).waitFor();
    await page.screenshot({
      path: `${output}/${file}.png`,
      fullPage: true,
      animations: "disabled",
    });
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(base);
  await page
    .getByRole("heading", { name: "A good day starts here." })
    .waitFor();
  await page.screenshot({
    path: `${output}/mobile.png`,
    fullPage: true,
    animations: "disabled",
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(base + "/book/willow-studio");
  await page
    .getByRole("heading", { name: "Let’s find your next visit." })
    .waitFor();
  await page.screenshot({
    path: `${output}/public-booking.png`,
    fullPage: true,
    animations: "disabled",
  });
  console.log("Six fictional-demo screenshots saved to " + output);
} finally {
  await browser.close();
}
