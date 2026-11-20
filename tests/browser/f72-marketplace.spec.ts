import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import type { Equipment } from "../../lib/types";
const issues = new WeakMap<Page, string[]>();
test.beforeEach(async ({ page }) => {
  issues.set(page, []);
  page.on("pageerror", (error) => issues.get(page)!.push(error.name));
  page.on("console", (message) => {
    if (
      message.type() === "error" &&
      /hydrat|maximum update|uncaught/i.test(message.text())
    )
      issues.get(page)!.push("React console error");
  });
  await page.emulateMedia({ colorScheme: "light" });
});
test.afterEach(async ({ page }) => {
  expect(issues.get(page) ?? []).toEqual([]);
});
async function listings(page: Page) {
  const rows: Equipment[] = [];
  for (const n of [1, 2])
    rows.push(
      ...(
        await (
          await page.request.get(`/api/backend/equipment?limit=24&page=${n}`)
        ).json()
      ).items,
    );
  return rows;
}
async function signIn(page: Page, role = "customer") {
  await page.goto("/login");
  await page.getByLabel("Email address").fill(`${role}@example.test`);
  await page.getByLabel("Password", { exact: true }).fill("LocalDemo123");
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  await expect(page).toHaveURL("http://localhost:3000/dashboard");
}
async function select(page: Page, ids: string[], recent: string[] = []) {
  await page.goto("/equipment");
  await page.evaluate(
    ({ ids, recent }) => {
      localStorage.setItem("equipora-compare-v1", JSON.stringify(ids));
      localStorage.setItem("equipora-recent-v1", JSON.stringify(recent));
    },
    { ids, recent },
  );
  await page.goto("/compare");
}
test("comparison selects at most three, restores IDs only, removes and clears", async ({
  page,
}) => {
  await page.goto("/equipment");
  const buttons = page.locator(".equipment-grid .compare-button");
  await expect(buttons).toHaveCount(12);
  for (let i = 0; i < 3; i++) await buttons.nth(i).click();
  await buttons.nth(3).click();
  const tray = page.getByRole("complementary", {
    name: "Selected equipment comparison",
  });
  await expect(tray.getByRole("status")).toContainText("up to three");
  expect(
    await page.evaluate(() =>
      JSON.parse(localStorage.getItem("equipora-compare-v1")!),
    ),
  ).toHaveLength(3);
  await tray.getByRole("link", { name: "Compare items" }).click();
  await expect(page.locator(".comparison-table thead th")).toHaveCount(4);
  await page.reload();
  await expect(page.locator(".comparison-table thead th")).toHaveCount(4);
  const stored = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("equipora-compare-v1")!),
  );
  expect(
    stored.every(
      (id: unknown) => typeof id === "string" && /^[a-f0-9]{24}$/.test(id),
    ),
  ).toBe(true);
  await page
    .locator(".comparison-table")
    .getByRole("button", { name: /Remove / })
    .first()
    .click();
  await expect(page.locator(".comparison-table thead th")).toHaveCount(3);
  await page
    .getByRole("button", { name: "Clear all items", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Your comparison starts here." }),
  ).toBeVisible();
  await expect(tray).toHaveCount(0);
});
test("restoration prunes deleted/unapproved IDs but keeps unavailable listings", async ({
  page,
}) => {
  const rows = await listings(page),
    ids = rows.slice(0, 3).map((item) => item.id);
  await page.route("**/api/backend/equipment/selection?*", async (route) => {
    await route.fulfill({ json: { items: [{ ...rows[0], quantity: 0 }] } });
  });
  await select(page, ids);
  await expect(page.locator(".comparison-table")).toContainText(
    "Currently unavailable",
  );
  await expect
    .poll(async () =>
      page.evaluate(() =>
        JSON.parse(localStorage.getItem("equipora-compare-v1")!),
      ),
    )
    .toEqual([ids[0]]);
  await expect(page.locator(".comparison-table thead th")).toHaveCount(2);
});
test("failed selection fetch preserves IDs and supports retry", async ({
  page,
}) => {
  const rows = await listings(page),
    ids = [rows[0].id];
  let failing = true;
  await page.route("**/api/backend/equipment/selection?*", async (route) => {
    if (failing)
      await route.fulfill({ status: 503, json: { error: "Unavailable" } });
    else await route.continue();
  });
  await select(page, ids);
  await expect(
    page.locator(".discovery-page .alert[role=alert]"),
  ).toContainText("couldn’t refresh");
  expect(
    await page.evaluate(() =>
      JSON.parse(localStorage.getItem("equipora-compare-v1")!),
    ),
  ).toEqual(ids);
  failing = false;
  await page.getByRole("button", { name: "Retry comparison" }).click();
  await expect(page.locator(".comparison-table")).toContainText(rows[0].name);
});
test("recent history restores, deduplicates, caps at eight and clears", async ({
  page,
}) => {
  const rows = await listings(page);
  await signIn(page);
  await page.evaluate(
    (id) => localStorage.setItem("equipora-recent-v1", JSON.stringify([id])),
    rows[0].id,
  );
  for (const row of rows.slice(1, 9)) {
    await page.goto(`/equipment/${row.id}`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(row.name);
  }
  await page.goto(`/equipment/${rows[8].id}`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    rows[8].name,
  );
  const ids = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("equipora-recent-v1")!),
  );
  expect(ids).toEqual(
    rows
      .slice(1, 9)
      .map((row) => row.id)
      .reverse(),
  );
  await page.goto("/equipment");
  await expect(page.locator(".recent-grid .equipment-card")).toHaveCount(8);
  await page
    .getByRole("button", { name: "Clear history", exact: true })
    .click();
  await expect(page.locator(".recent-empty")).toContainText(
    "Equipment you open",
  );
  expect(
    await page.evaluate(() => localStorage.getItem("equipora-recent-v1")),
  ).toBeNull();
});
test("blocked storage, image fallback and recent unavailable handling are safe", async ({
  page,
}) => {
  await page.addInitScript(() => {
    for (const method of ["getItem", "setItem", "removeItem"])
      Object.defineProperty(Storage.prototype, method, {
        value() {
          throw new DOMException("Blocked", "SecurityError");
        },
      });
  });
  await page.goto("/equipment");
  await page.locator(".equipment-grid .compare-button").first().click();
  await page.getByRole("link", { name: "Compare items" }).click();
  await expect(page.locator(".comparison-table thead th")).toHaveCount(2);
  await page.route("**/assets/equipment/**", (route) => route.abort());
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Your comparison starts here." }),
  ).toBeVisible();
});
test("recent listing restoration removes stale entries and renders image fallback", async ({
  page,
}) => {
  const rows = await listings(page);
  await select(
    page,
    [],
    rows.slice(0, 2).map((item) => item.id),
  );
  await page.route("**/api/backend/equipment/selection?*", (route) =>
    route.fulfill({
      json: {
        items: [
          {
            ...rows[0],
            quantity: 0,
            image: "https://example.test/f72-image.png",
          },
        ],
      },
    }),
  );
  await page.route("**/f72-image.png", (route) => route.abort());
  await page.goto("/equipment");
  await expect(page.locator(".recent-grid .equipment-card")).toHaveCount(1);
  await expect(page.locator(".recent-grid")).toContainText("Unavailable");
  await page.locator(".recently-viewed").scrollIntoViewIfNeeded();
  await expect(page.locator(".recent-grid .image-fallback")).toBeVisible();
  expect(
    await page.evaluate(() =>
      JSON.parse(localStorage.getItem("equipora-recent-v1")!),
    ),
  ).toEqual([rows[0].id]);
});
test("sharing copies a canonical URL and preserves protected direct-link return", async ({
  page,
  browser,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: undefined,
    });
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async (value: string) => {
          (window as Window & { copied?: string }).copied = value;
        },
      },
    });
  });
  const row = (await listings(page))[0];
  await signIn(page);
  await page.goto(`/equipment/${row.id}`);
  await page
    .getByRole("button", { name: "Share equipment", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "Equipment link copied." }),
  ).toBeVisible();
  const url = await page.evaluate(
    () => (window as Window & { copied?: string }).copied,
  );
  expect(url).toBe(`http://localhost:3000/equipment/${row.id}`);
  const context = await browser.newContext(),
    visitor = await context.newPage();
  await visitor.goto(url!);
  await expect(visitor).toHaveURL(new RegExp("/login\\?returnTo="));
  await visitor.getByLabel("Email address").fill("customer@example.test");
  await visitor.getByLabel("Password", { exact: true }).fill("LocalDemo123");
  await visitor.getByRole("button", { name: "Log in", exact: true }).click();
  await expect(visitor).toHaveURL(url!);
  await expect(visitor.getByRole("heading", { level: 1 })).toHaveText(row.name);
  await context.close();
});
test("native share and clipboard-denied manual fallback show accurate feedback", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: async (data: ShareData) => {
        (window as Window & { shared?: string }).shared = data.url;
      },
    });
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async () => {
          throw new Error("Denied");
        },
      },
    });
  });
  const row = (await listings(page))[0];
  await signIn(page);
  await page.goto(`/equipment/${row.id}`);
  await page
    .getByRole("button", { name: "Share equipment", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "Equipment shared." }),
  ).toBeVisible();
  expect(
    await page.evaluate(() => (window as Window & { shared?: string }).shared),
  ).toBe(`http://localhost:3000/equipment/${row.id}`);
  await page.getByRole("button", { name: "Copy link", exact: true }).click();
  await expect(page.getByLabel("Equipment link", { exact: true })).toHaveValue(
    `http://localhost:3000/equipment/${row.id}`,
  );
});
test("booking displays server-authoritative breakdown and returns modal focus", async ({
  page,
}) => {
  const row = (await listings(page)).find(
    (item) => item.rentalType === "daily" && item.quantity >= 2,
  )!;
  await signIn(page);
  await page.goto(`/equipment/${row.id}`);
  await page.getByRole("button", { name: "Book now", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Start date").fill("2030-03-01");
  await dialog.getByLabel("End date").fill("2030-03-03");
  const response = page.waitForResponse(
    (r) => r.url().endsWith("/quote") && r.status() === 200,
  );
  await dialog.getByLabel("Quantity", { exact: true }).fill("2");
  const reply = await response,
    quote = await reply.json();
  expect(Object.keys(reply.request().postDataJSON()).sort()).toEqual([
    "end",
    "quantity",
    "start",
  ]);
  await expect(dialog.locator(".quote strong")).toHaveText(
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(quote.totalCents / 100),
  );
  await expect(dialog.locator(".rental-breakdown")).toContainText(
    "2 days · 2 daily billing periods",
  );
  await expect(dialog.locator(".rental-breakdown")).toContainText(
    "No additional charges",
  );
  await expect(
    dialog.getByRole("button", { name: "Continue to Stripe Checkout" }),
  ).toBeEnabled();
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(
    page.getByRole("button", { name: "Book now", exact: true }),
  ).toBeFocused();
});
test("quote retry never enables checkout for invalid or unverified totals", async ({
  page,
}) => {
  const row = (await listings(page)).find(
    (item) => item.rentalType === "daily",
  )!;
  let fail = true;
  await page.route("**/api/backend/equipment/*/quote", async (route) => {
    if (fail)
      await route.fulfill({
        status: 503,
        json: { error: "Estimate temporarily unavailable" },
      });
    else await route.continue();
  });
  await signIn(page);
  await page.goto(`/equipment/${row.id}`);
  await page.getByRole("button", { name: "Book now", exact: true }).click();
  const d = page.getByRole("dialog");
  await d.getByLabel("Start date").fill("2030-03-01");
  await d.getByLabel("End date").fill("2030-03-03");
  await expect(d.getByRole("alert")).toContainText(
    "Estimate temporarily unavailable",
  );
  await expect(
    d.getByRole("button", { name: "Continue to Stripe Checkout" }),
  ).toBeDisabled();
  fail = false;
  await d.getByRole("button", { name: "Retry estimate" }).click();
  await expect(
    d.getByRole("button", { name: "Continue to Stripe Checkout" }),
  ).toBeEnabled();
  await d.getByLabel("End date").fill("2030-02-01");
  await expect(
    d.getByRole("button", { name: "Continue to Stripe Checkout" }),
  ).toBeDisabled();
  await expect(d.locator(".quote strong")).toHaveText("—");
});
for (const width of [375, 390, 440, 768, 834, 1366, 1600, 1920, 2560]) {
  test(`comparison responsive light/dark ${width}`, async ({ page }) => {
    await page.setViewportSize({
      width,
      height: width >= 1920 ? 1080 : width < 768 ? 956 : 1024,
    });
    const rows = await listings(page),
      items = ["daily", "weekly", "monthly"].map((unit) =>
        rows.find((item) => item.rentalType === unit)!,
      );
    expect(items.every(Boolean)).toBe(true);
    await select(
      page,
      items.map((item) => item.id),
    );
    await expect(
      page.locator(
        width < 768 ? ".comparison-card" : ".comparison-table thead th",
      ),
    ).toHaveCount(width < 768 ? 3 : 4);
    for (const theme of ["light", "dark"]) {
      await setTheme(page, theme);
      await expect(
        page.getByText("Daily, weekly and monthly rates", { exact: false }),
      ).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      const violations = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();
      expect(violations.violations.map((v) => v.id)).toEqual([]);
      await page.screenshot({
        path: `test-results/f72/compare-${theme}-${width}.png`,
        fullPage: true,
      });
    }
  });
}
test("comparison keyboard focus, reduced motion and owner role remain usable", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/equipment");
  const control = page.locator(".equipment-grid .compare-button").first();
  await control.focus();
  await page.keyboard.press("Enter");
  await expect(control).toHaveAttribute("aria-pressed", "true");
  await page.locator(".mobile-toggle").click();
  await expect(page.locator(".comparison-tray")).toBeHidden();
  await page.keyboard.press("Escape");
  await expect(page.locator(".comparison-tray")).toBeVisible();
  const row = (await listings(page))[0];
  await signIn(page, "owner");
  await page.goto(`/equipment/${row.id}`);
  await expect(
    page.getByRole("button", { name: "Book now", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Share equipment", exact: true }),
  ).toBeVisible();
});

test("comparison changes synchronize between tabs on the same device", async ({
  page,
}) => {
  await page.goto("/equipment");
  await page.locator(".equipment-grid .compare-button").first().click();
  const tab = await page.context().newPage();
  await tab.goto("http://localhost:3000/compare");
  await expect(tab.locator(".comparison-table thead th")).toHaveCount(2);
  await tab
    .getByRole("button", { name: "Clear all items", exact: true })
    .click();
  await expect(
    page.getByRole("complementary", { name: "Selected equipment comparison" }),
  ).toHaveCount(0);
  await tab.close();
});
test("canceling native sharing is not reported as a failure or copied link", async ({
  page,
}) => {
  await page.addInitScript(() =>
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: async () => {
        throw new DOMException("Canceled", "AbortError");
      },
    }),
  );
  const row = (await listings(page))[0];
  await signIn(page);
  await page.goto(`/equipment/${row.id}`);
  await page
    .getByRole("button", { name: "Share equipment", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "Sharing canceled." }),
  ).toBeVisible();
});
test("slower old quotes cannot replace the current server estimate", async ({
  page,
}) => {
  const row = (await listings(page)).find(
    (item) => item.rentalType === "daily",
  )!;
  await page.route("**/api/backend/equipment/*/quote", async (route) => {
    const response = await route.fetch();
    if (route.request().postDataJSON().end === "2030-03-03")
      await new Promise((resolve) => setTimeout(resolve, 700));
    await route.fulfill({ response });
  });
  await signIn(page);
  await page.goto(`/equipment/${row.id}`);
  await page.getByRole("button", { name: "Book now", exact: true }).click();
  const d = page.getByRole("dialog");
  await d.getByLabel("Start date").fill("2030-03-01");
  const first = page.waitForRequest((r) => r.url().endsWith("/quote"));
  await d.getByLabel("End date").fill("2030-03-03");
  await first;
  const fresh = page.waitForResponse(
    (r) =>
      r.url().endsWith("/quote") &&
      r.request().postDataJSON().end === "2030-03-04",
  );
  await d.getByLabel("End date").fill("2030-03-04");
  const quote = await (await fresh).json();
  const total = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(quote.totalCents / 100);
  await expect(d.locator(".quote strong")).toHaveText(total);
  await page.waitForTimeout(850);
  await expect(d.locator(".quote strong")).toHaveText(total);
  await expect(d.locator(".rental-breakdown")).toContainText("3 days");
});
test("a mismatched equipment quote cannot enable Checkout", async ({
  page,
}) => {
  const row = (await listings(page)).find(
    (item) => item.rentalType === "daily",
  )!;
  await page.route("**/api/backend/equipment/*/quote", (route) =>
    route.fulfill({
      json: {
        equipmentId: "0".repeat(24),
        ...route.request().postDataJSON(),
        days: 2,
        units: 2,
        unitPriceCents: 100,
        rentalType: "daily",
        subtotalCents: 200,
        totalCents: 200,
        estimate: true,
      },
    }),
  );
  await signIn(page);
  await page.goto(`/equipment/${row.id}`);
  await page.getByRole("button", { name: "Book now", exact: true }).click();
  const d = page.getByRole("dialog");
  await d.getByLabel("Start date").fill("2030-03-01");
  await d.getByLabel("End date").fill("2030-03-03");
  await expect(d.getByRole("alert")).toContainText("couldn’t verify");
  await expect(
    d.getByRole("button", { name: "Continue to Stripe Checkout" }),
  ).toBeDisabled();
});

async function setTheme(page: Page, theme: string) {
  if ((await page.locator("html").getAttribute("data-theme")) !== theme)
    await page.locator(".cinematic-footer .theme-toggle").click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
  await page.evaluate(() => scrollTo(0, 0));
  await expect(page.locator(".premium-header")).not.toHaveClass(/is-scrolled/);
  await page.waitForTimeout(450);
}
for (const width of [390, 834, 1600]) {
  test(`discovery and rental breakdown visuals ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: width < 768 ? 844 : 1024 });
    const rows = await listings(page);
    await select(
      page,
      rows.slice(0, 3).map((item) => item.id),
      rows.slice(0, 2).map((item) => item.id),
    );
    await page.goto("/equipment");
    await expect(page.locator(".recent-grid .equipment-card")).toHaveCount(2);
    for (const theme of ["light", "dark"]) {
      await setTheme(page, theme);
      await page.locator(".recently-viewed").scrollIntoViewIfNeeded();
      await page.evaluate(() => scrollTo(0, 0));
      if (width < 768)
        expect(
          (await page.locator(".comparison-tray strong").boundingBox())!.height,
        ).toBeLessThan(28);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await page.screenshot({
        path: `test-results/f72/catalog-recent-${theme}-${width}.png`,
        fullPage: true,
      });
    }
    await signIn(page);
    const row = rows.find(
      (item) => item.rentalType === "daily" && item.quantity >= 2,
    )!;
    await page.goto(`/equipment/${row.id}`);
    await expect(
      page.getByRole("button", { name: "Share equipment", exact: true }),
    ).toBeVisible();
    for (const theme of ["light", "dark"]) {
      await setTheme(page, theme);
      await page.screenshot({
        path: `test-results/f72/details-sharing-${theme}-${width}.png`,
        fullPage: true,
      });
      await page.getByRole("button", { name: "Book now", exact: true }).click();
      const dialog = page.getByRole("dialog");
      await dialog.getByLabel("Start date").fill("2030-03-01");
      await dialog.getByLabel("End date").fill("2030-03-03");
      await dialog.getByLabel("Quantity", { exact: true }).fill("2");
      await expect(
        dialog.getByRole("button", { name: "Continue to Stripe Checkout" }),
      ).toBeEnabled();
      await dialog.locator(".rental-breakdown").scrollIntoViewIfNeeded();
      const audit = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();
      expect(audit.violations.map((v) => v.id)).toEqual([]);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await page.screenshot({
        path: `test-results/f72/rental-breakdown-${theme}-${width}.png`,
        fullPage: true,
      });
      await page.keyboard.press("Escape");
      await expect(dialog).not.toBeVisible();
    }
  });
}

test("comparison and details retain accessible image fallbacks", async ({
  page,
}) => {
  const row = (await listings(page))[0],
    broken = { ...row, image: "https://example.test/f72-broken.png" };
  await page.route("**/f72-broken.png", (route) => route.abort());
  await page.route("**/api/backend/equipment/selection?*", (route) =>
    route.fulfill({ json: { items: [broken] } }),
  );
  await select(page, [row.id]);
  await expect(page.locator(".comparison-table .image-fallback")).toBeVisible();
  await expect(
    page.locator(".comparison-table .image-fallback"),
  ).toHaveAttribute("aria-label", `Image unavailable for ${row.name}`);
  await page.route(`**/api/backend/equipment/${row.id}`, (route) =>
    route.fulfill({ json: broken }),
  );
  await signIn(page);
  await page.goto(`/equipment/${row.id}`);
  await expect(page.locator(".detail-image.image-fallback")).toBeVisible();
  await expect(page.locator(".detail-image.image-fallback")).toHaveAttribute(
    "aria-label",
    `Image unavailable for ${row.name}`,
  );
  await expect(
    page.getByRole("button", { name: "Share equipment", exact: true }),
  ).toBeVisible();
});

test("uppercase detail URLs keep canonical sharing and server quotations", async ({
  page,
}) => {
  const row = (await listings(page))[0];
  await signIn(page);
  await page.goto(`/equipment/${row.id.toUpperCase()}`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(row.name);
  await page.getByRole("button", { name: "Book now", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Start date").fill("2030-03-01");
  await dialog.getByLabel("End date").fill("2030-03-03");
  await expect(
    dialog.getByRole("button", { name: "Continue to Stripe Checkout" }),
  ).toBeEnabled();
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("equipora-recent-v1")!)[0],
    ),
  ).toBe(row.id);
});
