import { test, expect, type Page, type Route } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// F12.2: registration photo by pasted HTTPS URL or ImgBB upload. Every network effect is mocked:
// the upload endpoint, the image hosts and sign-up itself, so no account or upload is created.
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/lWQAAAAASUVORK5CYII=",
  "base64",
);
const png = { name: "me.png", mimeType: "image/png", buffer: PNG };

async function setup(page: Page) {
  const signUps: Record<string, unknown>[] = [];
  await page.route("https://img.example.test/**", (r) => r.fulfill({ status: 200, contentType: "image/png", body: PNG }));
  await page.route("https://broken.example.test/**", (r) => r.fulfill({ status: 404, contentType: "text/html", body: "nope" }));
  await page.route("**/api/auth/sign-up/email", async (r) => {
    signUps.push(r.request().postDataJSON());
    await new Promise((res) => setTimeout(res, 400));
    const now = new Date().toISOString();
    await r.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ token: null, user: { id: "u1", name: "F122", email: "f122@example.test", image: null, emailVerified: false, createdAt: now, updatedAt: now } }),
    });
  });
  await page.goto("/register");
  await page.getByLabel("Full name", { exact: true }).fill("Photo Tester");
  await page.getByLabel("Email address").fill("f122@example.test");
  await page.getByLabel("Password", { exact: true }).fill("ValidPass1");
  return signUps;
}
const error = (page: Page) => page.locator(".photo-error");
const create = (page: Page) => page.getByRole("button", { name: "Create account", exact: true });

test("both photo options are labelled radios with keyboard switching", async ({ page }) => {
  await setup(page);
  const group = page.getByRole("radiogroup", { name: "How would you like to add your photo?" });
  await expect(group.getByRole("radio")).toHaveCount(2);
  const urlOpt = page.getByRole("radio", { name: "Paste image URL" });
  const upOpt = page.getByRole("radio", { name: "Upload photo" });
  await expect(urlOpt).toBeChecked();
  await expect(page.getByLabel("Image URL", { exact: true })).toBeVisible();
  await urlOpt.focus();
  await page.keyboard.press("ArrowRight");
  await expect(upOpt).toBeChecked();
  await expect(page.getByLabel("Choose a photo")).toBeVisible();
  await expect(page.getByText("up to 2 MB")).toBeVisible();
  await page.keyboard.press("ArrowLeft");
  await expect(urlOpt).toBeChecked();
  await expect(page.locator("fieldset.photo-field legend")).toContainText("Profile photo");
});

test("pasted URL: required, HTTPS-only, credential-free and must load as an image", async ({ page }) => {
  const signUps = await setup(page);
  const url = page.getByLabel("Image URL", { exact: true });
  await create(page).click();
  await expect(error(page)).toContainText("Add a profile photo");
  await expect(url).toBeFocused();
  await url.fill("http://img.example.test/me.png");
  await url.blur();
  await expect(error(page)).toContainText("https://");
  await url.fill("https://user:secret@img.example.test/me.png");
  await url.blur();
  await expect(error(page)).toContainText("username or password");
  await url.fill("https://broken.example.test/me.png");
  await expect(error(page)).toContainText("couldn't load an image");
  await create(page).click();
  await expect(error(page)).toContainText("couldn't load an image");
  expect(signUps).toHaveLength(0);
  await url.fill("https://img.example.test/me.png");
  await expect(page.getByText("Image found")).toBeVisible();
  await expect(page.getByAltText("Profile photo preview")).toBeVisible();
  await expect(error(page)).toBeEmpty();
  // Duplicate-submit guard: a rapid double click sends exactly one sign-up.
  await create(page).dblclick();
  await expect(page.getByRole("button", { name: "Please wait…" })).toBeDisabled();
  await expect.poll(() => signUps.length).toBe(1);
  await page.waitForTimeout(600);
  expect(signUps).toHaveLength(1);
  expect(signUps[0]).toMatchObject({ name: "Photo Tester", email: "f122@example.test", image: "https://img.example.test/me.png" });
});

test("upload: client-side type/size checks never call the endpoint", async ({ page }) => {
  await setup(page);
  let calls = 0;
  await page.route("**/api/backend/registration-image", (r) => { calls++; return r.fulfill({ status: 500 }); });
  await page.getByRole("radio", { name: "Upload photo" }).check();
  const file = page.getByLabel("Choose a photo");
  await file.setInputFiles({ name: "a.gif", mimeType: "image/gif", buffer: Buffer.from("GIF89a") });
  await expect(error(page)).toContainText("JPG, PNG or WebP");
  await file.setInputFiles({ name: "big.png", mimeType: "image/png", buffer: Buffer.alloc(2_000_001, 1) });
  await expect(error(page)).toContainText("larger than 2 MB");
  await create(page).click();
  await expect(error(page)).toContainText("larger than 2 MB");
  expect(calls).toBe(0);
});

for (const [label, handler, expected] of [
  ["unavailable (503)", (r: Route) => r.fulfill({ status: 503, contentType: "application/json", body: '{"error":"Image upload is not configured"}' }), "isn't available right now"],
  ["rate limited (429)", (r: Route) => r.fulfill({ status: 429, contentType: "application/json", body: '{"error":"limit"}' }), "Too many photo uploads"],
  ["rejected file (400)", (r: Route) => r.fulfill({ status: 400, contentType: "application/json", body: '{"error":"Use a JPG, PNG, or WebP image smaller than 2 MB"}' }), "smaller than 2 MB."],
  ["non-JSON gateway error", (r: Route) => r.fulfill({ status: 502, contentType: "text/html", body: "<html>bad gateway</html>" }), "didn't finish"],
  ["unsafe URL returned", (r: Route) => r.fulfill({ status: 200, contentType: "application/json", body: '{"url":"http://i.ibb.co/x.png"}' }), "didn't finish"],
  ["network failure", (r: Route) => r.abort("internetdisconnected"), "couldn't reach the upload service"],
] as const)
  test(`upload error: ${label}`, async ({ page }) => {
    const signUps = await setup(page);
    await page.route("**/api/backend/registration-image", handler);
    await page.getByRole("radio", { name: "Upload photo" }).check();
    await page.getByLabel("Choose a photo").setInputFiles(png);
    await expect(error(page)).toContainText(expected);
    await expect(page.getByAltText("Profile photo preview")).toHaveCount(0);
    await create(page).click();
    expect(signUps).toHaveLength(0);
  });

test("upload success: progress, preview, remove, retry and submission with the ImgBB URL", async ({ page }) => {
  const signUps = await setup(page);
  let release!: () => void;
  const gate = new Promise<void>((r) => (release = r));
  const bodies: unknown[] = [];
  await page.route("**/api/backend/registration-image", async (r) => {
    bodies.push(r.request().postDataJSON());
    await gate;
    await r.fulfill({ status: 200, contentType: "application/json", body: '{"url":"https://i.ibb.co/abc/me.png"}' });
  });
  await page.getByRole("radio", { name: "Upload photo" }).check();
  await page.getByLabel("Choose a photo").setInputFiles(png);
  await expect(page.getByRole("status").filter({ hasText: "Uploading photo" })).toBeVisible();
  await expect(create(page)).toBeDisabled();
  release();
  await expect(page.getByRole("status").filter({ hasText: "Uploaded me.png" })).toBeVisible();
  await expect(page.getByAltText("Profile photo preview")).toHaveAttribute("src", "https://i.ibb.co/abc/me.png");
  expect(bodies).toEqual([{ image: PNG.toString("base64") }]);
  await page.getByRole("button", { name: "Remove" }).click();
  await expect(page.getByAltText("Profile photo preview")).toHaveCount(0);
  await create(page).click();
  await expect(error(page)).toContainText("choose an image to upload");
  expect(signUps).toHaveLength(0);
  await page.getByLabel("Choose a photo").setInputFiles(png);
  await expect(page.getByRole("status").filter({ hasText: "Uploaded me.png" })).toBeVisible();
  // Switching to URL mode and back keeps each option's own value; the active option is what is submitted.
  await page.getByRole("radio", { name: "Paste image URL" }).check();
  await page.getByLabel("Image URL", { exact: true }).fill("https://img.example.test/other.png");
  await page.getByRole("radio", { name: "Upload photo" }).check();
  await expect(page.getByRole("status").filter({ hasText: "Uploaded me.png" })).toBeVisible();
  await create(page).click();
  await expect.poll(() => signUps.length).toBe(1);
  expect(signUps[0]).toMatchObject({ image: "https://i.ibb.co/abc/me.png" });
});

test("password rule still enforced before any sign-up request", async ({ page }) => {
  const signUps = await setup(page);
  await page.getByLabel("Image URL", { exact: true }).fill("https://img.example.test/me.png");
  await expect(page.getByText("Image found")).toBeVisible();
  await page.getByLabel("Password", { exact: true }).fill("alllower1");
  await create(page).click();
  await expect(page.locator("form .alert-error")).toContainText("uppercase");
  expect(signUps).toHaveLength(0);
});

test("accessible and overflow-free in both themes at phone, tablet and desktop widths", async ({ page }) => {
  for (const theme of ["light", "dark"] as const) {
    await page.addInitScript((t) => localStorage.setItem("equipora-theme", t), theme);
    for (const width of [360, 390, 834, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      await setup(page);
      await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
      for (const mode of ["Paste image URL", "Upload photo"]) {
        await page.getByRole("radio", { name: mode }).check();
        if (mode === "Paste image URL") {
          await page.getByLabel("Image URL", { exact: true }).fill("http://img.example.test/me.png");
          await page.getByLabel("Image URL", { exact: true }).blur();
          await expect(error(page)).toContainText("https://");
        }
        const scan = await new AxeBuilder({ page }).include(".auth-panel").withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
        expect(scan.violations.map((v) => ({ id: v.id, targets: v.nodes.map((n) => n.target) }))).toEqual([]);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        await page.locator(".photo-field").screenshot({ path: `test-results/f122-${theme}-${width}-${mode === "Upload photo" ? "upload" : "url"}.png` });
      }
    }
  }
});
