import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import fs from "node:fs";
const out = "test-results/f73";
fs.mkdirSync(out, { recursive: true });
async function login(page: Page, role = "customer") {
  await page.goto("/login");
  await page.getByLabel("Email address").fill(role + "@example.test");
  await page.getByLabel("Password", { exact: true }).fill("LocalDemo123");
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}
test.beforeEach(async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.name));
  page.on("console", (m) => {
    if (
      m.type() === "error" &&
      /hydrat|uncaught|maximum update/i.test(m.text())
    )
      errors.push("React error");
  });
  (page as Page & { qaErrors?: string[] }).qaErrors = errors;
});
test.afterEach(async ({ page }) =>
  expect((page as Page & { qaErrors?: string[] }).qaErrors ?? []).toEqual([]),
);
for (const theme of ["light", "dark"])
  for (const width of [375, 390, 440, 768, 834, 1440, 1600, 1920, 2560]) {
    test(`F73 equipment navigation ${theme} ${width}`, async ({ page }) => {
      await page.setViewportSize({ width, height: width < 768 ? 844 : 1024 });
      await page.addInitScript(
        (t) => localStorage.setItem("equipora-theme", t),
        theme,
      );
      await page.goto("/equipment");
      await expect(page.locator(".equipment-card").first()).toBeVisible();
      const row = (
        await (await page.request.get("/api/backend/equipment?limit=1")).json()
      ).items[0];
      for (const route of ["catalog", "details"]) {
        if (route === "details") {
          await login(page);
          await page.goto("/equipment/" + row.id);
          await expect(
            page.getByRole("button", { name: "Book now", exact: true }),
          ).toBeVisible();
        }
        const header = page.locator("header"),
          themeButton = header.getByRole("button", {
            name: /Switch to .* theme/,
          });
        await expect(header).toHaveAttribute("data-equipment", "true");
        await expect(themeButton).toBeVisible();
        expect((await themeButton.boundingBox())!.width).toBe(44);
        const metrics = await header.evaluate((el) => {
          const brand = el.querySelector(".brand")!.getBoundingClientRect(),
            content = document
              .querySelector("main .container")!
              .getBoundingClientRect(),
            controls = el
              .querySelector(".header-controls")!
              .getBoundingClientRect();
          return {
            surface: getComputedStyle(el, "::before").backgroundColor,
            body: getComputedStyle(document.body).backgroundColor,
            border: getComputedStyle(el, "::before").borderBottomColor,
            logoX: brand.x,
            contentX: content.x,
            right: controls.right,
            contentRight: content.right,
            width: el.getBoundingClientRect().width,
            mainY:
              document.querySelector("main")!.getBoundingClientRect().top +
              scrollY,
          };
        });
        expect(metrics.width).toBe(width);
        expect(Math.abs(metrics.logoX - metrics.contentX)).toBeLessThanOrEqual(
          2,
        );
        expect(
          Math.abs(metrics.right - metrics.contentRight),
        ).toBeLessThanOrEqual(2);
        if (theme === "dark") {
          expect(metrics.surface).toBe(metrics.body);
          expect(metrics.border).toBe("rgba(0, 0, 0, 0)");
        }
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        ).toBe(true);
        await expect(page.locator("footer .theme-toggle")).toHaveCount(0);
        await expect(header.locator(".theme-toggle")).toHaveCount(1);
        if (route === "catalog") {
          await expect(page.locator(".catalog-select")).toHaveCount(4);
          await expect(page.locator(".catalog-select>svg")).toHaveCount(4);
          for (const name of [
            "Category",
            "Rental type",
            "Availability",
            "Sort by",
          ]) {
            const s = page.getByRole("combobox", { name, exact: true });
            expect(
              await s.evaluate((el) => getComputedStyle(el).backgroundImage),
            ).toBe("none");
            await s.focus();
            expect(
              await s.evaluate((el) => getComputedStyle(el).outlineStyle),
            ).toBe("solid");
          }
          await expect(
            page.locator("input[name=min],input[name=max]"),
          ).toHaveCount(2);
          await expect(page.locator(".catalog-select input")).toHaveCount(0);
        }
        await page.evaluate(() => {
          (document.activeElement as HTMLElement)?.blur();
          scrollTo(0, 0);
        });
        await expect(header).not.toHaveClass(/is-scrolled/);
        await page.waitForTimeout(450);
        await page.screenshot({
          path: `${out}/${route}-${theme}-${width}-top.png`,
        });
        const scan = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
          .analyze();
        expect(
          scan.violations.map((v) => ({
            id: v.id,
            nodes: v.nodes.map((n) => n.target),
          })),
        ).toEqual([]);
        await page.evaluate(() => scrollTo(0, 160));
        await expect(header).toHaveClass(/is-scrolled/);
        await page.waitForTimeout(450);
        await expect(themeButton).toBeVisible();
        expect(
          (await header.locator(".header-inner").boundingBox())!.width,
        ).toBeLessThan(width);
        expect(
          await page.evaluate(
            () =>
              document.querySelector("main")!.getBoundingClientRect().top +
              scrollY,
          ),
        ).toBe(metrics.mainY);
        await page.screenshot({
          path: `${out}/${route}-${theme}-${width}-floating.png`,
        });
        await themeButton.evaluate((el) => {
          if (el instanceof HTMLElement) el.focus({ preventScroll: true });
        });
        await page.keyboard.press("Enter");
        await expect(page.locator("html")).toHaveAttribute(
          "data-theme",
          theme === "dark" ? "light" : "dark",
        );
        const pointer = (await themeButton.boundingBox())!;
        await page.mouse.click(
          pointer.x + pointer.width / 2,
          pointer.y + pointer.height / 2,
        );
        await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
        expect(await page.evaluate(() => scrollY)).toBe(160);
        await page.evaluate(() => scrollTo(0, 100));
        await expect(header).toHaveClass(/is-scrolled/);
        await page.evaluate(() => scrollTo(0, 0));
        await expect(header).not.toHaveClass(/is-scrolled/);
        await page.waitForTimeout(450);
        if (width < 1101) {
          await page.getByRole("button", { name: "Toggle navigation" }).click();
          await expect(
            page.getByRole("navigation", { name: "Main navigation" }),
          ).toBeVisible();
          await page.keyboard.press("Escape");
          await expect(
            page.getByRole("button", { name: "Toggle navigation" }),
          ).toBeFocused();
        }
        fs.writeFileSync(
          `${out}/metrics-${route}-${theme}-${width}.json`,
          JSON.stringify(metrics),
        );
      }
    });
  }
for (const saved of [null, "system", "obsolete", "dark", "light"])
  test(`F73 first paint with dark OS and preference ${saved}`, async ({
    browser,
  }) => {
    const c = await browser.newContext({ colorScheme: "dark" }),
      p = await c.newPage();
    await p.addInitScript((value) => {
      if (value !== null) localStorage.setItem("equipora-theme", value);
      requestAnimationFrame(() => {
        (window as Window & { firstTheme?: string }).firstTheme =
          document.documentElement.dataset.theme;
      });
    }, saved);
    await p.route(/\/_next\/static\/.*\.js/, async (r) => {
      await new Promise((done) => setTimeout(done, 150));
      await r.continue();
    });
    await p.goto("http://localhost:3000/login");
    const expected = saved === "dark" ? "dark" : "light";
    await expect(p.locator("html")).toHaveAttribute("data-theme", expected);
    expect(
      await p.evaluate(
        () => (window as Window & { firstTheme?: string }).firstTheme,
      ),
    ).toBe(expected);
    await p.emulateMedia({ colorScheme: "light" });
    await expect(p.locator("html")).toHaveAttribute("data-theme", expected);
    await c.close();
  });
test("F73 native filters retain server search and sorting", async ({
  page,
}) => {
  await page.goto("/equipment");
  await page
    .getByRole("combobox", { name: "Category", exact: true })
    .selectOption("Photography Equipment");
  await page
    .getByRole("combobox", { name: "Rental type", exact: true })
    .selectOption("daily");
  await page
    .getByRole("combobox", { name: "Availability", exact: true })
    .selectOption("true");
  await page
    .getByRole("combobox", { name: "Sort by", exact: true })
    .selectOption("price-asc");
  await page.locator("input[name=min]").fill("1");
  await page.locator("input[name=max]").fill("500");
  await page.getByRole("button", { name: "Apply filters" }).click();
  await expect(page).toHaveURL(/category=Photography/);
  await expect(page.locator(".equipment-card").first()).toBeVisible();
  const url = new URL(page.url());
  const res = await page.request.get(
    "/api/backend/equipment?" + url.searchParams.toString(),
  );
  expect(res.status()).toBe(200);
  const rows = (await res.json()).items;
  expect(rows.length).toBeGreaterThan(0);
  expect(
    rows.every(
      (r: {
        category: string;
        rentalType: string;
        quantity: number;
        price: number;
      }) =>
        r.category === "Photography Equipment" &&
        r.rentalType === "daily" &&
        r.quantity > 0 &&
        r.price >= 1 &&
        r.price <= 500,
    ),
  ).toBe(true);
  expect(rows.map((r: { price: number }) => r.price)).toEqual(
    rows
      .map((r: { price: number }) => r.price)
      .sort((a: number, b: number) => a - b),
  );
});
for (const role of ["customer", "owner", "admin"])
  test(`F73 ${role} theme survives auth, route refresh and logout`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/login");
    await page.getByRole("button", { name: "Switch to dark theme" }).click();
    await login(page, role);
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await page.goto("/dashboard/profile");
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await page.getByRole("button", { name: "Toggle navigation" }).click();
    await page
      .locator("header")
      .getByRole("button", { name: "Log out" })
      .click();
    await expect(page).toHaveURL("http://localhost:3000/");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await page.goto("/register");
    await page.getByRole("button", { name: "Switch to light theme" }).click();
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  });
test("F73 cross-tab invalidated preference falls back to light", async ({
  context,
  page,
}) => {
  await page.goto("/equipment");
  const other = await context.newPage();
  await other.goto("/login");
  await page.getByRole("button", { name: "Switch to dark theme" }).click();
  await expect(other.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.evaluate(() => localStorage.setItem("equipora-theme", "obsolete"));
  await expect(other.locator("html")).toHaveAttribute("data-theme", "light");
  await page.evaluate(() => localStorage.clear());
  await expect(other.locator("html")).toHaveAttribute("data-theme", "light");
});
