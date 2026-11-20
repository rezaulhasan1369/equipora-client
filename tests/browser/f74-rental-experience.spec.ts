import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import fs from "node:fs";
const out = "test-results/f74";
fs.mkdirSync(out, { recursive: true });
async function login(page: Page, role = "customer") {
  await page.goto("/login");
  await page.getByLabel("Email address").fill(role + "@example.test");
  await page.getByLabel("Password", { exact: true }).fill("LocalDemo123");
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}
async function read(page: Page, path: string) {
  return page.evaluate(async (p) => {
    const auth = await (await fetch("/api/auth/token")).json();
    const response = await fetch("/api/backend/" + p, {
      headers: { authorization: "Bearer " + auth.token },
    });
    if (!response.ok) throw Error("Fixture request failed");
    return response.json();
  }, path);
}
test.beforeEach(async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.name));
  page.on("console", (m) => {
    if (
      m.type() === "error" &&
      /hydrat|read-only|without an.*onChange|uncaught/i.test(m.text())
    )
      errors.push("React warning");
  });
  (page as Page & { qaErrors?: string[] }).qaErrors = errors;
});
test.afterEach(async ({ page }) =>
  expect((page as Page & { qaErrors?: string[] }).qaErrors ?? []).toEqual([]),
);
for (const [width, theme] of [
  [390, "dark"],
  [834, "light"],
] as const)
  test(`F74 real availability, exclusive end and keyboard ${width}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.addInitScript(
      (t) => localStorage.setItem("equipora-theme", t),
      theme,
    );
    await login(page);
    const rental = (await read(page, "rentals")).items.find(
      (r: { bookingStatus: string }) => r.bookingStatus === "confirmed",
    );
    await page.goto("/equipment/" + rental.equipmentId);
    await page.getByRole("button", { name: "Book now", exact: true }).click();
    const d = page.getByRole("dialog"),
      calendar = page.getByRole("region", {
        name: "Equipment availability calendar",
      });
    await expect(
      calendar.getByRole("group", { name: "Rental dates" }),
    ).toBeVisible();
    const today = new Date().toISOString().slice(0, 10),
      tomorrow = new Date(Date.parse(today) + 86400000)
        .toISOString()
        .slice(0, 10);
    await expect(
      calendar.locator(`button[data-date="${today}"]`),
    ).toHaveAccessibleDescription(new RegExp(today));
    if (tomorrow.slice(0, 7) !== today.slice(0, 7))
      await calendar
        .getByRole("button", { name: "Next availability month" })
        .click();
    await expect(
      calendar.locator(`button[data-date="${tomorrow}"]`),
    ).toBeDisabled();
    if (tomorrow.slice(0, 7) !== today.slice(0, 7))
      await calendar
        .getByRole("button", { name: "Previous availability month" })
        .click();
    await calendar.locator(`button[data-date="${today}"]`).click();
    await expect(d.getByLabel("Start date")).toHaveValue(today);
    if (tomorrow.slice(0, 7) !== today.slice(0, 7))
      await calendar
        .getByRole("button", { name: "Next availability month" })
        .click();
    await expect(
      calendar.locator(`button[data-date="${tomorrow}"]`),
    ).toBeEnabled();
    await calendar.locator(`button[data-date="${tomorrow}"]`).click();
    await expect(d.getByLabel("End date")).toHaveValue(tomorrow);
    await expect(
      d.getByRole("button", { name: "Continue to Stripe Checkout" }),
    ).toBeEnabled();
    await calendar
      .locator("button[data-date]:not([disabled])")
      .first()
      .evaluate((el) => {
        if (el instanceof HTMLElement) el.focus({ preventScroll: true });
      });
    await page.keyboard.press("ArrowRight");
    expect(
      await page.evaluate(() =>
        document.activeElement?.hasAttribute("data-date"),
      ),
    ).toBe(true);
    expect(
      (
        await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
          .analyze()
      ).violations.map((v) => ({
        id: v.id,
        nodes: v.nodes.map((n) => n.target),
      })),
    ).toEqual([]);
    await calendar.screenshot({
      path: `${out}/calendar-${width}-${theme}.png`,
    });
    await d.getByRole("button", { name: "Close booking" }).click();
    await expect(
      page.getByRole("button", { name: "Book now", exact: true }),
    ).toBeFocused();
  });
test("F74 customer timeline and actual verified receipt download", async ({
  page,
  context,
}) => {
  await login(page);
  const rental = (await read(page, "rentals")).items.find(
    (r: { bookingStatus: string }) => r.bookingStatus === "completed",
  );
  await page.goto("/dashboard/rentals/" + rental.id);
  await expect(
    page.getByRole("heading", { name: "Rental completed", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Payment confirmed", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Rental initiated", exact: true }),
  ).toBeVisible();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download receipt" }).click();
  const file = await download;
  await file.saveAs(`${out}/receipt.html`);
  const html = fs.readFileSync(`${out}/receipt.html`, "utf8");
  expect(html).toContain("SIMULATED LOCAL TEST");
  expect(html).toContain("no payment was processed");
  expect(html).not.toContain("customer@example.test");
  expect(html).not.toContain("<script");
  const receipt = await context.newPage();
  await receipt.setContent(html);
  await expect(
    receipt.getByRole("heading", { name: "Rental payment receipt" }),
  ).toBeVisible();
  expect(
    (
      await new AxeBuilder({ page: receipt })
        .withTags(["wcag2a", "wcag2aa"])
        .analyze()
    ).violations.map((v) => v.id),
  ).toEqual([]);
  await receipt.screenshot({ path: `${out}/receipt.png`, fullPage: true });
  await receipt.emulateMedia({ media: "print" });
  await expect(receipt.locator(".print-help")).toBeHidden();
  await receipt.close();
  await page
    .locator(".rental-activity")
    .screenshot({ path: `${out}/timeline.png` });
});
test("F74 persisted notifications, unread badge and mark-as-read", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page);
  const before = await read(page, "notifications");
  expect(before.unread).toBeGreaterThan(0);
  await page
    .getByRole("navigation", { name: "Dashboard navigation" })
    .getByRole("link", { name: /Notifications/ })
    .click();
  await expect(
    page.getByRole("heading", { name: "Notifications", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".notification-list li")).toHaveCount(
    before.items.length,
  );
  await page
    .getByRole("button", { name: /Mark as read:/ })
    .first()
    .click();
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: "Notification marked as read." }),
  ).toBeVisible();
  await expect
    .poll(async () => (await read(page, "notifications")).unread)
    .toBe(before.unread - 1);
  await page.reload();
  await expect(page.locator(".notification-list li")).toHaveCount(
    before.items.length,
  );
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze()
    ).violations.map((v) => v.id),
  ).toEqual([]);
  await page
    .locator(".notification-list")
    .screenshot({ path: `${out}/notifications.png` });
});
test("F74 owner can view own activity and receipt; admin is not granted participant access", async ({
  page,
}) => {
  await login(page, "owner");
  const rental = (await read(page, "rentals")).items[0];
  await page.goto("/dashboard/rentals/" + rental.id);
  await expect(
    page.getByRole("button", { name: "Download receipt" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Payment confirmed", exact: true }),
  ).toBeVisible();
  await page.goto("/dashboard/notifications");
  await expect(page.locator(".notification-list li").first()).toBeVisible();
  await login(page, "admin");
  await page.goto("/dashboard/rentals/" + rental.id);
  await expect(
    page.getByRole("alert").filter({ hasText: "customers and owners" }),
  ).toContainText("customers and owners");
  await expect(
    page.getByRole("button", { name: "Download receipt" }),
  ).toHaveCount(0);
});
test("F74 availability retry and unavailable history are honest", async ({
  page,
}) => {
  await login(page);
  const rental = (await read(page, "rentals")).items[0];
  let failed = true;
  await page.route(
    "**/api/backend/equipment/*/availability?*",
    async (route) =>
      failed
        ? route.fulfill({
            status: 503,
            json: { error: "Synthetic unavailable" },
          })
        : route.continue(),
  );
  await page.goto("/equipment/" + rental.equipmentId);
  await page.getByRole("button", { name: "Book now", exact: true }).click();
  await expect(
    page
      .getByRole("region", { name: "Equipment availability calendar" })
      .getByRole("alert"),
  ).toContainText("could not be loaded");
  failed = false;
  await page.getByRole("button", { name: "Retry availability" }).click();
  await expect(page.getByRole("group", { name: "Rental dates" })).toBeVisible();
  await page.keyboard.press("Escape");
  await page.goto("/dashboard/rentals/000000000000000000000000");
  await expect(
    page.getByRole("alert").filter({ hasText: "Rental not found" }),
  ).toContainText("Rental not found");
  await expect(page.locator(".rental-timeline")).toHaveCount(0);
});
