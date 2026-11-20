import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
test("F63 required photo and mocked ImgBB success", async ({ page }) => {
  await page.goto("/register");
  await page.getByLabel("Full name", { exact: true }).fill("Photo Customer");
  await page
    .getByLabel("Email address")
    .fill("f63-" + Date.now() + "@example.test");
  await page.getByLabel("Password", { exact: true }).fill("ValidPassword123");
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await expect(page.locator("#registration-photo-error")).toContainText(
    "valid HTTPS",
  );
  await page.route("**/api/backend/registration-image", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ url: "https://i.ibb.co/demo/profile.png" }),
    }),
  );
  await page.getByLabel("Upload profile photo (ImgBB)").setInputFiles({
    name: "profile.png",
    mimeType: "image/png",
    buffer: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/lWQAAAAASUVORK5CYII=",
      "base64",
    ),
  });
  await expect(
    page.getByLabel("Profile image URL", { exact: true }),
  ).toHaveValue("https://i.ibb.co/demo/profile.png");
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await expect(page).toHaveURL("http://localhost:3000/dashboard");
});
test("F63 equipment pagination URL state and theme screenshots", async ({
  page,
}) => {
  for (const theme of ["light", "dark"]) {
    await page.addInitScript(
      (t) => localStorage.setItem("equipora-theme", t),
      theme,
    );
    await page.goto(
      "/equipment?search=Equipment&sort=price-asc&available=true&min=0&limit=12",
    );
    const pager = page.getByRole("navigation", { name: "Equipment pages" });
    await expect(pager).toContainText("Page 1 of 2");
    await pager.getByRole("button", { name: "Next" }).click();
    await expect(page).toHaveURL(/page=2/);
    expect(new URL(page.url()).searchParams.get("sort")).toBe("price-asc");
    expect(new URL(page.url()).searchParams.get("available")).toBe("true");
    await page.reload();
    await expect(pager).toContainText("Page 2 of 2");
    await expect(page.locator(".equipment-card")).toHaveCount(8);
    await expect(pager.getByRole("button", { name: "Next" })).toBeDisabled();
    expect(new URL(page.url()).searchParams.get("search")).toBe("Equipment");

    for (const width of [390, 1920]) {
      await page.setViewportSize({ width, height: 1080 });
      const a = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();
      expect(a.violations.map((v) => v.id)).toEqual([]);
      await page.locator("footer").scrollIntoViewIfNeeded();
      const footerScan=await new AxeBuilder({page}).include("footer").withTags(["wcag2a","wcag2aa","wcag21a","wcag21aa"]).analyze();expect(footerScan.violations.map(v=>v.id)).toEqual([]);
      await page.evaluate(()=>window.scrollTo({top:0,behavior:"instant"}));
      await page.screenshot({
        path: `test-results/f63-catalog-${theme}-${width}.png`,
        fullPage: true,
      });
    }
  }
});
test("F63 history URL and page counts (mocked response; scoped API separately tested)", async ({
  page,
}) => {
  await page.goto("/login");
  await page.getByLabel("Email address").fill("customer@example.test");
  await page.getByLabel("Password", { exact: true }).fill("LocalDemo123");
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  await page.waitForURL("**/dashboard");
  await page.route("**/api/backend/rentals?*", async (route) => {
    const p = Number(new URL(route.request().url()).searchParams.get("page"));
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        page: p,
        limit: 15,
        total: 18,
        items: Array.from({ length: p === 1 ? 15 : 3 }, (_, i) => ({
          id: "fixture-" + p + "-" + i,
          equipmentName: "History fixture " + p + " " + i,
          start: "2026-01-01",
          end: "2026-01-03",
          bookingDate: "2026-01-01",
          quantity: 1,
          totalCents: 2000,
          paymentStatus: "paid",
          bookingStatus: "completed",
        })),
      }),
    });
  });
  await page.goto("/dashboard/rentals?page=1&view=history");
  const pager = page.getByRole("navigation", { name: "Rental history pages" });
  await expect(pager).toContainText("Page 1 of 2");
  await pager.getByRole("button", { name: "Next" }).click();
  await expect(page).toHaveURL(/page=2/);
  expect(new URL(page.url()).searchParams.get("view")).toBe("history");
  await page.reload();
  await expect(pager).toContainText("Page 2 of 2");
  await expect(page.locator("tbody tr")).toHaveCount(3);
  for (const theme of ["light", "dark"]) {
    await page.evaluate((t) => {
      document.documentElement.dataset.theme = t;
      localStorage.setItem("equipora-theme", t);
    }, theme);
    await page.screenshot({
      path: `test-results/f63-history-${theme}.png`,
      fullPage: true,
    });
  }
});
test("F63 system fallback, persisted choice and cross-tab theme", async ({
  browser,
}) => {
  const c = await browser.newContext({ colorScheme: "dark" });
  const p = await c.newPage();
  await p.addInitScript(() =>
    requestAnimationFrame(() => {
      (window as Window & { firstTheme?: string }).firstTheme =
        document.documentElement.dataset.theme;
    }),
  );
  await p.route(/\/_next\/static\/.*\.js/, async (route) => {
    await new Promise((r) => setTimeout(r, 300));
    await route.continue();
  });
  await p.goto("http://localhost:3000/");
  await expect(p.locator("html")).toHaveAttribute("data-theme", "dark");
  expect(
    await p.evaluate(
      () => (window as Window & { firstTheme?: string }).firstTheme,
    ),
  ).toBe("dark");
  await p.getByRole("button", { name: "Switch to light theme" }).click();
  await p.reload();
  await expect(p.locator("html")).toHaveAttribute("data-theme", "light");
  const tab = await c.newPage();
  await tab.goto("http://localhost:3000/");
  await p.getByRole("button", { name: "Switch to dark theme" }).click();
  await expect(tab.locator("html")).toHaveAttribute("data-theme", "dark");
  await c.close();
});
test("F63 details/booking modal and public error/legal states in both themes", async ({
  page,
}) => {
  await page.goto("/login");
  await page.getByLabel("Email address").fill("customer@example.test");
  await page.getByLabel("Password", { exact: true }).fill("LocalDemo123");
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  await page.waitForURL("**/dashboard");
  for (const theme of ["light", "dark"])
    for (const width of [390, 1920]) {
      await page.evaluate((t) => {
        localStorage.setItem("equipora-theme", t);
        document.documentElement.dataset.theme = t;
      }, theme);
      await page.setViewportSize({ width, height: 1080 });
      await page.goto("/equipment");
      await page.locator(".equipment-card").first().getByRole("link").click();
      await page.getByRole("button", { name: "Book now", exact: true }).click();
      await expect(page.getByRole("dialog")).toBeVisible();
      await page.getByRole("dialog").evaluate(async el=>{await Promise.all(el.getAnimations({subtree:true}).map(animation=>animation.finished.catch(()=>undefined)))});
      const scan = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();
      expect(
        scan.violations.map((v) => ({
          id: v.id,
          targets: v.nodes.map((n) => n.target),
        })),
      ).toEqual([]);
      await page.screenshot({
        path: `test-results/f63-booking-${theme}-${width}.png`,
        fullPage: true,
      });
      await page.getByRole("button", { name: "Close booking" }).click();
      for (const path of [
        "/privacy",
        "/terms",
        "/asset-credits",
        "/not-a-real-route",
        "/payment/success?session_id=cs_test_unknown",
        "/dashboard/rentals?payment=cancelled",
      ]) {
        await page.goto(path);
        await expect(page.locator("main")).toBeVisible();
        const scan = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
          .analyze();
        expect(
          scan.violations.map((v) => ({
            id: v.id,
            targets: v.nodes.map((n) => n.target),
          })),
        ).toEqual([]);
      }
    }
});
