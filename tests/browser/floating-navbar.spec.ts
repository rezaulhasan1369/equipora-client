import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
const sizes = [
  [375, 812],
  [390, 844],
  [768, 1024],
  [834, 1112],
  [1366, 900],
  [1600, 900],
  [1920, 1080],
  [2560, 1440],
];
for (const [width, height] of sizes)
  test(`floating navbar ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.goto("/");
    await expect(page.locator(".equipment-card")).toHaveCount(6);
    const header = page.locator("header"),
      inner = header.locator(".header-inner");
    const scroll = async (top: number) => {
      await page.evaluate(
        (y) => window.scrollTo({ top: y, behavior: "instant" }),
        top,
      );
      await page.waitForTimeout(480);
    };
    const initial = await inner.boundingBox();
    const surface = () =>
      header.evaluate((el) => {
        const style = getComputedStyle(el, "::before");
        return {
          width: parseFloat(style.width),
          opacity: style.opacity,
          pointer: style.pointerEvents,
        };
      });
    expect((await header.boundingBox())!.width).toBe(width);
    expect(await surface()).toEqual({ width, opacity: "1", pointer: "none" });
    const mainY = await page
      .locator("main")
      .evaluate((el) => el.getBoundingClientRect().top + scrollY);
    await expect(header).not.toHaveClass(/is-scrolled/);
    await page.screenshot({ path: `test-results/nav-${width}-top.png` });
    await scroll(100);
    await expect(header).not.toHaveClass(/is-scrolled/);
    await scroll(160);
    await expect(header).toHaveClass(/is-scrolled/);
    expect((await surface()).opacity).toBe("0");
    const floating = await inner.boundingBox();
    expect(floating!.y).toBeGreaterThanOrEqual(7);
    expect(floating!.y).toBeLessThan(15);
    if (width >= 1366) expect(floating!.width).toBeLessThan(initial!.width);
    expect(
      await page
        .locator("main")
        .evaluate((el) => el.getBoundingClientRect().top + scrollY),
    ).toBe(mainY);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({ path: `test-results/nav-${width}-floating.png` });
    await scroll(100);
    await expect(header).toHaveClass(/is-scrolled/);
    await scroll(79);
    await expect(header).not.toHaveClass(/is-scrolled/);
    await scroll(0);
    expect((await surface()).opacity).toBe("1");
    const restored = await inner.boundingBox();
    expect(restored!.x).toBe(initial!.x);
    expect(restored!.width).toBe(initial!.width);
    await page.screenshot({ path: `test-results/nav-${width}-restored.png` });
    if (width <= 1100) {
      const toggle = header.getByRole("button", { name: "Toggle navigation" });
      await scroll(200);
      await toggle.click();
      await expect(toggle).toHaveAttribute("aria-expanded", "true");
      await expect(page.locator("main")).toHaveJSProperty("inert", true);
      await header
        .getByRole("link", { name: "All equipment", exact: true })
        .focus();
      await page.keyboard.press("Escape");
      await expect(toggle).toBeFocused();
      await toggle.click();
      await page.screenshot({ path: `test-results/nav-${width}-menu.png` });
    }
    const scan = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(
      scan.violations.map((v) => ({
        id: v.id,
        nodes: v.nodes.map((n) => n.target),
      })),
    ).toEqual([]);
    await header
      .getByRole("link", { name: "All equipment", exact: true })
      .click();
    await expect(page).toHaveURL(/\/equipment$/);
  });
test("navbar resizing and reduced motion", async ({ page }) => {
  await page.setViewportSize({ width: 834, height: 1112 });
  await page.goto("/");
  await page.getByRole("button", { name: "Toggle navigation" }).click();
  await page.setViewportSize({ width: 1366, height: 900 });
  await expect(page.locator("main")).toHaveJSProperty("inert", false);
  await expect(page.locator("header nav")).toBeVisible();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.evaluate(() => window.scrollTo({ top: 200, behavior: "instant" }));
  await expect(page.locator("header")).toHaveClass(/is-scrolled/);
  expect(
    await page
      .locator(".header-inner")
      .evaluate((el) => getComputedStyle(el).transitionDuration),
  ).toBe("0s");
});

for (const role of ["customer", "owner", "admin"])
  test(`floating authenticated navbar ${role}`, async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email address").fill(role + "@example.test");
    await page.getByLabel("Password", { exact: true }).fill("LocalDemo123");
    await page.getByRole("button", { name: "Log in", exact: true }).click();
    await page.waitForURL("**/dashboard");
    for (const width of [1366, 375]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/");
      await page.evaluate(() =>
        window.scrollTo({ top: 200, behavior: "instant" }),
      );
      await expect(page.locator("header")).toHaveClass(/is-scrolled/);
      if (width === 375)
        await page.getByRole("button", { name: "Toggle navigation" }).click();
      await expect(
        page
          .locator("header")
          .getByRole("link", { name: "Dashboard", exact: true }),
      ).toBeVisible();
      await expect(
        page.locator("header").getByRole("button", { name: "Log out" }),
      ).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await page
        .locator("header")
        .getByRole("link", { name: "Dashboard", exact: true })
        .click();
      await expect(page).toHaveURL(/\/dashboard$/);
    }
  });
