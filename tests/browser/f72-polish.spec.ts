import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import fs from "node:fs";
const out = "test-results/f72-polish";
fs.mkdirSync(out, { recursive: true });
const widths = [375, 390, 440, 768, 834, 1440, 1600, 1920, 2560];
for (const theme of ["light", "dark"])
  for (const width of widths) {
    test(`catalog navigation ${theme} ${width}`, async ({ page }) => {
      await page.setViewportSize({ width, height: width < 768 ? 812 : 1024 });
      await page.addInitScript(
        (theme) => localStorage.setItem("equipora-theme", theme),
        theme,
      );
      await page.goto("/equipment");
      await expect(page.locator(".equipment-card").first()).toBeVisible();
      const header = page.locator(".premium-header");
      await expect(header).toHaveAttribute("data-catalog", "true");
      const top = await header.evaluate((el) => ({
        surface: getComputedStyle(el, "::before").backgroundColor,
        border: getComputedStyle(el, "::before").borderBottomColor,
        body: getComputedStyle(document.body).backgroundColor,
        width: el.getBoundingClientRect().width,
      }));
      if (theme === "dark") {
        expect(top.surface).toBe(top.body);
        expect(top.border).toBe("rgba(0, 0, 0, 0)");
      }
      expect(top.width).toBe(width);
      await page.screenshot({ path: `${out}/after-${theme}-${width}-top.png` });
      expect(
        (
          await new AxeBuilder({ page })
            .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
            .analyze()
        ).violations,
      ).toEqual([]);
      await page.evaluate(() => window.scrollTo(0, 120));
      await expect(header).toHaveClass(/is-scrolled/);
      await page.waitForTimeout(450);
      const floating = await page.locator(".header-inner").evaluate((el) => ({
        width: el.getBoundingClientRect().width,
        radius: getComputedStyle(el).borderRadius,
        bg: getComputedStyle(el).backgroundColor,
      }));
      expect(floating.width).toBeLessThan(width);
      expect(floating.radius).not.toBe("0px");
      if (theme === "dark") expect(floating.bg).not.toBe(top.body);
      await page.screenshot({
        path: `${out}/after-${theme}-${width}-floating.png`,
      });
      for (const y of [105, 85]) {
        await page.evaluate((y) => window.scrollTo(0, y), y);
        await page.waitForTimeout(60);
        await expect(header).toHaveClass(/is-scrolled/);
      }
      await page.evaluate(() => window.scrollTo(0, 0));
      await expect(header).not.toHaveClass(/is-scrolled/);
      await page.waitForTimeout(450);
      await page.screenshot({
        path: `${out}/after-${theme}-${width}-returned.png`,
      });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
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
      await page.emulateMedia({ reducedMotion: "reduce" });
      expect(
        await page
          .locator(".header-inner")
          .evaluate((el) => getComputedStyle(el).transitionDuration),
      ).toBe("0s");
      fs.writeFileSync(
        `${out}/nav-${theme}-${width}.json`,
        JSON.stringify({ top, floating }),
      );
    });
  }
for (const theme of ["light", "dark"])
  for (const width of [375, 390, 440]) {
    test(`tray and booking ${theme} ${width}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 667 });
      await page.addInitScript(
        (theme) => localStorage.setItem("equipora-theme", theme),
        theme,
      );
      await page.goto("/equipment");
      const buttons = page.locator(".equipment-grid .compare-button");
      await buttons.first().click();
      const tray = page.getByRole("complementary", {
        name: "Selected equipment comparison",
      });
      const expanded = (await tray.boundingBox())!;
      await tray.getByRole("button", { name: "Minimize comparison" }).click();
      await expect(
        tray.getByRole("link", { name: "Compare items" }),
      ).toBeHidden();
      const collapsed = (await tray.boundingBox())!;
      expect(collapsed.height).toBeLessThan(expanded.height);
      expect(collapsed.height).toBeLessThan(90);
      expect(
        await page.evaluate(
          () => JSON.parse(localStorage.getItem("equipora-compare-v1")!).length,
        ),
      ).toBe(1);
      await page.screenshot({
        path: `${out}/tray-${theme}-${width}-minimized.png`,
      });
      const next = page
        .getByRole("navigation", { name: "Equipment pages" })
        .getByRole("button", { name: "Next", exact: true });
      await next.evaluate((el) => el.scrollIntoView({ block: "center" }));
      await next.click();
      await expect(page).toHaveURL(/page=2/);
      expect(
        await page.evaluate(
          () => JSON.parse(localStorage.getItem("equipora-compare-v1")!).length,
        ),
      ).toBe(1);
      const toggle = tray.getByRole("button", { name: "Expand comparison" });
      await toggle.focus();
      await page.keyboard.press("Enter");
      await expect(
        tray.getByRole("link", { name: "Compare items" }),
      ).toBeVisible();
      await page.screenshot({
        path: `${out}/tray-${theme}-${width}-expanded.png`,
      });
      await page.goto("/login");
      await page.getByLabel("Email address").fill("customer@example.test");
      await page.getByLabel("Password", { exact: true }).fill("LocalDemo123");
      await page.getByRole("button", { name: "Log in", exact: true }).click();
      await expect(page).toHaveURL(/\/dashboard$/);
      const item = (
        await (await page.request.get("/api/backend/equipment?limit=1")).json()
      ).items[0];
      await page.goto("/equipment/" + item.id);
      const colors = await page.locator(".detail-price").evaluate((el) => ({
        fg: getComputedStyle(el).color,
        bg: getComputedStyle(document.body).backgroundColor,
      }));
      fs.writeFileSync(`${out}/price-${theme}.json`, JSON.stringify(colors));
      expect(
        (
          await new AxeBuilder({ page })
            .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
            .analyze()
        ).violations,
      ).toEqual([]);
      const book = page.getByRole("button", { name: "Book now", exact: true });
      await book.click();
      const d = page.getByRole("dialog");
      await expect(
        d.getByRole("heading", { name: "Plan your rental." }),
      ).toBeVisible();
      await d.getByLabel("Start date").fill("2030-03-01");
      await d.getByLabel("End date").fill("2030-03-03");
      await d.getByLabel("Quantity", { exact: true }).fill("1");
      await d.getByLabel("Contact number").fill("0123456789");
      await d
        .getByLabel("Delivery address")
        .fill("Synthetic local test address");
      await d.getByLabel("Additional notes").fill("No payment submission.");
      await expect(
        d.getByRole("button", { name: "Continue to Stripe Checkout" }),
      ).toBeEnabled();
      await d
        .getByRole("button", { name: "Continue to Stripe Checkout" })
        .scrollIntoViewIfNeeded();
      const close = d.getByRole("button", { name: "Close booking" });
      const rect = (await close.boundingBox())!;
      expect(rect.y).toBeGreaterThanOrEqual(0);
      expect(rect.y + rect.height).toBeLessThan(667);
      const heading = (await d
        .getByRole("heading", { name: "Plan your rental." })
        .boundingBox())!;
      expect(heading.y).toBeGreaterThanOrEqual(0);
      expect(
        (
          await new AxeBuilder({ page })
            .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
            .analyze()
        ).violations,
      ).toEqual([]);
      await page.screenshot({
        path: `${out}/booking-${theme}-${width}-bottom.png`,
      });
      await close.click();
      await expect(d).not.toBeVisible();
      await expect(book).toBeFocused();
    });
  }
