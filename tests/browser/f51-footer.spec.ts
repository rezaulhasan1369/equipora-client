import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
const sizes = [
  [390, 844],
  [440, 956],
  [768, 1024],
  [834, 1112],
  [1366, 900],
  [1600, 900],
  [1920, 1080],
  [2560, 1440],
];
for (const [width, height] of sizes)
  test(`F5.1 integrated footer ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.goto("/");
    await expect(page.locator(".equipment-card")).toHaveCount(6);
    const footer = page.locator("footer");
    await footer.scrollIntoViewIfNeeded();
    await expect(footer.locator("picture,.footer-art")).toHaveCount(0);
    const state = await footer.evaluate((el) => {
      const s = getComputedStyle(el),
        overlay = getComputedStyle(el, "::before"),
        content = el.querySelector(".footer-content")!;
      return {
        background: s.backgroundImage,
        size: s.backgroundSize,
        height: el.getBoundingClientRect().height,
        extra:
          el.getBoundingClientRect().bottom -
          content.getBoundingClientRect().bottom,
        overlayEvents: overlay.pointerEvents,
        overflow: document.documentElement.scrollWidth > innerWidth,
      };
    });
    expect(state.background).toContain(
      `/assets/footer/footer-${width <= 600 ? "mobile" : width <= 1100 ? "tablet" : "desktop"}.png`,
    );
    expect(state.size).toBe("cover");
    expect(state.extra).toBeLessThan(2);
    expect(state.overlayEvents).toBe("none");
    expect(state.overflow).toBe(false);
    expect(state.height).toBeLessThan(
      width <= 600 ? 1200 : width <= 1100 ? 1000 : 600,
    );
    const social = footer.locator(".footer-social");
    await expect(social).toHaveCount(3);
    expect(
      await social.evaluateAll((elements) =>
        elements.every(
          (el) =>
            el.tagName === "A" &&
            el.getAttribute("href") === "/" &&
            !el.hasAttribute("target"),
        ),
      ),
    ).toBe(true);
    for (const icon of await social.all()) {
      await expect(icon.locator("svg")).toBeVisible();
      await icon.focus();
      await expect(icon).toBeFocused();
      expect(
        await icon.evaluate((el) => getComputedStyle(el).outlineStyle),
      ).toBe("solid");
    }

    const links = await footer.locator("a").evaluateAll((els) =>
      els.map((el) => ({
        href: el.getAttribute("href"),
        label: el.textContent?.trim() || el.getAttribute("aria-label"),
      })),
    );
    expect(links.every((l) => l.href && l.href !== "#" && l.label)).toBe(true);
    const scan = await new AxeBuilder({ page })
      .include("footer")
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(
      scan.violations.map((v) => ({
        id: v.id,
        nodes: v.nodes.map((n) => n.target),
      })),
    ).toEqual([]);
    await page
      .locator("header")
      .evaluate((el) => (el.style.visibility = "hidden"));
    await page.evaluate(() => (document.activeElement as HTMLElement)?.blur());
    await footer.screenshot({ path: `test-results/f51-footer-${width}.png` });
  });

test("demo social icons navigate to the homepage", async ({ page }) => {
  for (const name of ["GitHub", "LinkedIn", "Email"]) {
    await page.goto("/equipment");
    await page
      .locator("footer")
      .getByRole("link", { name: name + " demo - return to Equipora home" })
      .click();
    await expect(page).toHaveURL("http://localhost:3000/");
    await expect(
      page.getByRole("heading", { name: /Big ideas/ }),
    ).toBeVisible();
  }
});
