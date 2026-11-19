import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
const viewports = [
  { width: 375, height: 812 },
  { width: 390, height: 844 },
  { width: 440, height: 956 },
  { width: 768, height: 1024 },
  { width: 834, height: 1112 },
  { width: 1366, height: 900 },
  { width: 1600, height: 900 },
  { width: 1920, height: 1080 },
  { width: 2560, height: 1440 },
];
for (const size of viewports)
  test("F5 visual shell " + size.width, async ({ page }) => {
    await page.setViewportSize(size);
    await page.goto("/");
    await expect(page.locator(".equipment-card")).toHaveCount(6);
    await expect(
      page.getByRole("heading", { name: /Big ideas/ }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    const films = page.locator(".motion-film");
    await expect(films).toHaveCount(3);
    for (const film of await films.all()) {
      await film.scrollIntoViewIfNeeded();
      await expect(film.locator("img")).toBeVisible();
      await expect
        .poll(() =>
          film
            .locator("img")
            .evaluate(
              (i: HTMLImageElement) => i.complete && i.naturalWidth > 0,
            ),
        )
        .toBe(true);
    }
    const footer = page.locator("footer");
    await footer.scrollIntoViewIfNeeded();
    const src = await footer.evaluate(
      (element) => getComputedStyle(element).backgroundImage,
    );
    expect(src).toContain(
      size.width <= 600
        ? "footer-mobile"
        : size.width <= 1100
          ? "footer-tablet"
          : "footer-desktop",
    );
    const accessibility = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(
      accessibility.violations.map((v) => ({
        id: v.id,
        targets: v.nodes.map((n) => n.target),
      })),
    ).toEqual([]);
    await page.evaluate(() => {
      document.querySelectorAll("video").forEach((v) => v.pause());
      window.scrollTo(0, 0);
    });
    await page.screenshot({
      path: "test-results/f5-home-" + size.width + ".png",
      fullPage: true,
    });
  });
test("F5 menu keyboard, focus return and route closure", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const toggle = page.getByRole("button", { name: "Toggle navigation" });
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  expect(
    await page.locator("main").evaluate((e) => (e as HTMLElement).inert),
  ).toBe(true);
  await page.locator("header nav a").last().focus();
  await page.keyboard.press("Tab");
  await expect(page.locator("header .brand")).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(toggle).toBeFocused();
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await toggle.click();
  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("link", { name: "All equipment", exact: true })
    .click();
  await expect(page).toHaveURL(/\/equipment$/);
  expect(
    await page.locator("main").evaluate((e) => (e as HTMLElement).inert),
  ).toBe(false);
});
test("F5 motion visibility, user pause and reduced-motion poster", async ({
  page,
  browser,
}) => {
  await page.goto("/");
  const hero = page.locator('[data-film="hero-equipment-orbit"]');
  await expect(hero).toHaveCount(1);
  await hero.scrollIntoViewIfNeeded();
  await expect
    .poll(() =>
      hero
        .locator("video")
        .evaluate((v: HTMLVideoElement) => !v.paused && v.muted),
    )
    .toBe(true);
  await hero.getByRole("button", { name: /Pause animation/ }).click();
  expect(
    await hero.locator("video").evaluate((v: HTMLVideoElement) => v.paused),
  ).toBe(true);
  await hero.getByRole("button", { name: /Play animation/ }).click();
  await page.locator("footer").scrollIntoViewIfNeeded();
  await expect
    .poll(() =>
      hero.locator("video").evaluate((v: HTMLVideoElement) => v.paused),
    )
    .toBe(true);
  const context = await browser.newContext({ reducedMotion: "reduce" });
  const reduced = await context.newPage();
  let videoRequests = 0;
  reduced.on("request", (r) => {
    if (r.url().endsWith(".webm")) videoRequests++;
  });
  await reduced.goto("/");
  await expect(reduced.locator("video")).toHaveCount(0);
  await expect(reduced.locator(".motion-film img")).toHaveCount(3);
  expect(videoRequests).toBe(0);
  await context.close();
});
test("F5 unsupported video reveals static poster", async ({ page }) => {
  let aborted = false;
  await page.route("**/*.webm", (r) => {
    aborted = true;
    return r.abort();
  });
  await page.goto("/");
  const hero = page.locator('[data-film="hero-equipment-orbit"]');
  await expect(hero).toHaveCount(1);
  await expect.poll(() => aborted).toBe(true);
  await expect(hero.locator("video")).toHaveCount(0);
  await expect(hero.locator("img")).toBeVisible();
});
