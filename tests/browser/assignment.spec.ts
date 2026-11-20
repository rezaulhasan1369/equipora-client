import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
const pageErrors = new WeakMap<Page, string[]>();
test.beforeEach(async ({ page }) => {
  pageErrors.set(page, []);
  page.on("pageerror", (error) => pageErrors.get(page)!.push(error.name));
});
test.afterEach(async ({ page }) => {
  expect(pageErrors.get(page) ?? []).toEqual([]);
});
const password = "LocalDemo123";
const expanded = process.env.EQUIPORA_TEST_F5 === "1";
async function login(page: Page, role = "customer") {
  await page.goto("/login");
  await page.getByLabel("Email address").fill(role + "@example.test");
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  await expect(page).toHaveURL("http://localhost:3000/dashboard");
  await expect(
    page.getByRole("heading", { name: /Good to see you/ }),
  ).toBeVisible();
}
for (const viewport of [
  { name: "desktop", width: 1920, height: 1080 },
  { name: "laptop", width: 1366, height: 900 },
  { name: "tablet", width: 834, height: 1112 },
  { name: "mobile", width: 390, height: 844 },
])
  test(viewport.name + " home and catalog layout", async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: /Big ideas/ }),
    ).toBeVisible();
    await expect(page.locator(".equipment-card")).toHaveCount(
      page.url().includes("/equipment") && !page.url().includes("/dashboard/")
        ? expanded
          ? 12
          : 6
        : page.url().includes("/dashboard/equipment") && expanded
          ? 25
          : 6,
    );
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: "test-results/" + viewport.name + "-home.png",
      fullPage: true,
    });
    if (viewport.name === "mobile") {
      await page.getByRole("button", { name: "Toggle navigation" }).click();
      await page
        .getByRole("navigation", { name: "Main navigation" })
        .getByRole("link", { name: "All equipment", exact: true })
        .click();
    } else await page.goto("/equipment");
    await expect(page.locator(".equipment-card")).toHaveCount(
      page.url().includes("/equipment") && !page.url().includes("/dashboard/")
        ? expanded
          ? 12
          : 6
        : page.url().includes("/dashboard/equipment") && expanded
          ? 25
          : 6,
    );
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: "test-results/" + viewport.name + "-catalog.png",
      fullPage: true,
    });
  });
test("server-side filters and anonymous detail protection", async ({
  page,
}) => {
  await page.goto("/equipment");
  await expect(page.locator(".equipment-card")).toHaveCount(
    page.url().includes("/equipment") && !page.url().includes("/dashboard/")
      ? expanded
        ? 12
        : 6
      : page.url().includes("/dashboard/equipment") && expanded
        ? 25
        : 6,
  );
  await page.getByLabel("Search equipment or location").fill("Dhaka");
  await page.getByRole("button", { name: "Apply filters" }).click();
  await expect(page.locator(".equipment-card")).toHaveCount(expanded ? 8 : 3);
  await page.locator(".equipment-card").first().getByRole("link").click();
  await expect(page).toHaveURL(new RegExp("/login[?]returnTo="));
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Welcome back." }),
  ).toBeVisible();
});
test("password validation and registration feedback", async ({ page }) => {
  await page.goto("/register");
  await page.getByLabel("Full name").fill("New Customer");
  // The form previews the pasted link; serve a real PNG for the non-resolving test host.
  await page.route("https://example.test/**", (route) => route.fulfill({ status: 200, contentType: "image/png", body: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/lWQAAAAASUVORK5CYII=", "base64") }));
  await page.getByLabel("Image URL",{exact:true}).fill("https://example.test/profile.png");
  await expect(page.getByText("Image found")).toBeVisible();
  await page
    .getByLabel("Email address")
    .fill("new-" + Date.now() + "@example.test");
  await page.getByLabel("Password", { exact: true }).fill("abcdef");
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await expect(page.locator("form [role=alert]")).toContainText("uppercase");
  await page.getByLabel("Password", { exact: true }).fill("ValidPassword123");
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await expect(page).toHaveURL("http://localhost:3000/dashboard");
});
test("customer session survives reload, profile and favorite workflows", async ({
  page,
}) => {
  await login(page);
  await page.goto("/dashboard/profile");
  await expect(page.getByLabel("Full name")).toHaveValue("Jamie Park");
  await page.reload();
  await expect(page).toHaveURL("http://localhost:3000/dashboard/profile");
  await expect(page.getByLabel("Full name")).toHaveValue("Jamie Park");
  await page.getByLabel("Phone number").fill("0123456789");
  await page.getByRole("button", { name: "Save profile" }).click();
  await expect(page.locator(".alert[role=status]")).toContainText("updated");
  await page.goto("/equipment");
  await page.locator(".equipment-card").first().getByRole("link").click();
  await expect(page.getByRole("button", { name: "Book now" })).toBeVisible();
  await page.getByRole("button", { name: "Save favorite" }).click();
  await expect(page.locator(".alert[role=status]")).toContainText("saved");
  await page.goto("/dashboard/favorites");
  await expect(
    page.getByRole("button", { name: "Remove", exact: true }),
  ).toHaveCount(1);
  await page.getByRole("button", { name: "Remove", exact: true }).click();
  await expect(page.getByText("Save equipment as you explore")).toBeVisible();
});
test("booking modal calculates date/quantity quote and fails safely without Stripe secrets", async ({
  page,
}) => {
  await login(page);
  await page.goto("/equipment");
  await page.locator(".equipment-card").first().getByRole("link").click();
  await page.getByRole("button", { name: "Book now" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await dialog.getByLabel("Start date").fill("2030-03-01");
  await dialog.getByLabel("End date").fill("2030-03-03");
  await dialog.getByLabel("Quantity", { exact: true }).fill("2");
  await dialog.getByLabel("Contact number").fill("0123456789");
  await dialog.getByLabel("Delivery address").fill("Local test address");
  await dialog
    .getByRole("button", { name: "Continue to Stripe Checkout" })
    .click();
  await expect(dialog.getByRole("alert")).toContainText("not configured");
  await dialog.getByRole("button", { name: "Close booking" }).click();
  await expect(dialog).not.toBeVisible();
});
test("owner dashboard reload, equipment and analytics; customer cannot use admin API", async ({
  page,
}) => {
  await login(page, "owner");
  await expect(page.getByText("Monthly rental revenue")).toBeVisible();
  await page.goto("/dashboard/equipment");
  await expect(page.getByRole("table")).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "My equipment." }),
  ).toBeVisible();
  await page.goto("/dashboard/add-equipment");
  await expect(page.getByLabel("Equipment name")).toBeVisible();
  await page.screenshot({
    path: "test-results/owner-add-equipment.png",
    fullPage: true,
  });
});
test("admin moderation UI, user management, scoped dashboards", async ({
  page,
}) => {
  await login(page, "admin");
  await page.goto("/dashboard/users");
  await expect(page.getByRole("heading", { name: "All users." })).toBeVisible();
  await expect(page.getByRole("table")).toBeVisible();
  await page.goto("/dashboard/equipment");
  await expect(page.getByLabel(/Approval status for/)).toHaveCount(
    page.url().includes("/equipment") && !page.url().includes("/dashboard/")
      ? expanded
        ? 12
        : 6
      : page.url().includes("/dashboard/equipment") && expanded
        ? 25
        : 6,
  );
  await page.goto("/dashboard/rentals");
  await expect(
    page.getByRole("heading", { name: "All rentals" }),
  ).toBeVisible();
});
test("gateway blocks diagnostic proxying and cross-origin mutations", async ({
  request,
}) => {
  expect((await request.get("/api/backend/health/db")).status()).toBe(404);
  expect((await request.get("/api/backend/payments/webhook")).status()).toBe(
    404,
  );
  expect(
    (
      await request.post("/api/backend/me", {
        headers: { origin: "https://attacker.invalid" },
        data: { name: "Bad" },
      })
    ).status(),
  ).toBe(403);
});
test("public and form accessibility", async ({ page }) => {
  for (const url of ["/", "/equipment", "/login", "/register"]) {
    await page.goto(url);
    if (url === "/equipment")
      await expect(page.locator(".equipment-card")).toHaveCount(
        page.url().includes("/equipment") && !page.url().includes("/dashboard/")
          ? expanded
            ? 12
            : 6
          : page.url().includes("/dashboard/equipment") && expanded
            ? 25
            : 6,
      );
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(
      results.violations.map((v) => ({
        id: v.id,
        nodes: v.nodes.map((n) => n.target),
      })),
    ).toEqual([]);
  }
});

test("owner create, update and delete through real local API (upload response mocked only)", async ({
  page,
}) => {
  await login(page, "owner");
  await page.route("**/api/backend/uploads", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        url: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=800&q=80",
      }),
    }),
  );
  await page.goto("/dashboard/add-equipment");
  await page
    .getByLabel("Equipment name", { exact: true })
    .fill("Acceptance Camera");
  await page
    .getByLabel("Description", { exact: true })
    .fill(
      "A professional camera used only in isolated local acceptance testing.",
    );
  await page
    .getByLabel("Category", { exact: true })
    .selectOption("Photography Equipment");
  await page.getByLabel("Location", { exact: true }).fill("Dhaka");
  await page.getByLabel("Rental price (USD)", { exact: true }).fill("19.99");
  await page.getByLabel("Available quantity", { exact: true }).fill("1");
  await page.getByLabel("Condition", { exact: true }).fill("Excellent");
  await page.getByLabel("Brand", { exact: true }).fill("Local");
  await page.getByLabel("Model", { exact: true }).fill("Test 1");
  await page
    .getByLabel("Rental terms and conditions", { exact: true })
    .fill("Return clean and on time. Local fixture only.");
  await page.getByLabel("Equipment image (imgbb upload)").setInputFiles({
    name: "test.png",
    mimeType: "image/png",
    buffer: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/lWQAAAAASUVORK5CYII=",
      "base64",
    ),
  });
  await expect(page.getByRole("status")).toContainText("Image uploaded");
  await page
    .getByRole("button", { name: "Submit equipment", exact: true })
    .click();
  await expect(page).toHaveURL("http://localhost:3000/dashboard/equipment");
  let row = page.getByRole("row").filter({ hasText: "Acceptance Camera" });
  await expect(row).toContainText("pending");
  await row.getByRole("link", { name: "Update", exact: true }).click();
  await page
    .getByLabel("Equipment name", { exact: true })
    .fill("Acceptance Camera Updated");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(page).toHaveURL("http://localhost:3000/dashboard/equipment");
  row = page.getByRole("row").filter({ hasText: "Acceptance Camera Updated" });
  await expect(row).toBeVisible();
  page.once("dialog", (dialog) => dialog.accept());
  await row.getByRole("button", { name: "Delete", exact: true }).click();
  await expect(row).toHaveCount(0);
});
test("catalog failure feedback and unknown route are safe", async ({
  page,
}) => {
  await page.route("**/api/backend/equipment*", (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ error: "Equipment is temporarily unavailable" }),
    }),
  );
  await page.goto("/equipment");
  await expect(page.locator(".alert-error")).toContainText(
    "temporarily unavailable",
  );
  await page.goto("/not-an-equipora-page");
  await expect(
    page.getByRole("heading", { name: "This page isn’t available." }),
  ).toBeVisible();
});

for (const role of ["customer", "owner", "admin"])
  test(
    role + " mobile and tablet dashboard layout and reload",
    async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await login(page, role);
      for (const viewport of [
        { width: 390, height: 844 },
        { width: 834, height: 1112 },
      ]) {
        await page.setViewportSize(viewport);
        await page.goto("/dashboard/rentals");
        await expect(page.getByRole("table")).toBeVisible();
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= window.innerWidth,
          ),
        ).toBe(true);
        await page.reload();
        await expect(page).toHaveURL("http://localhost:3000/dashboard/rentals");
        await expect(page.getByRole("table")).toBeVisible();
      }
      await page.screenshot({
        path: "test-results/" + role + "-tablet-dashboard.png",
        fullPage: true,
      });
    },
  );

for (const role of ["customer", "owner", "admin"])
  test(
    role + " dashboard tables meet WCAG contrast and label requirements",
    async ({ page }) => {
      await login(page, role);
      for (const route of [
        "/dashboard/rentals",
        role === "customer" ? "/dashboard/favorites" : "/dashboard/equipment",
        ...(role === "admin" ? ["/dashboard/users"] : []),
      ]) {
        await page.goto(route);
        await expect(page.getByRole("table")).toBeVisible();
        const result = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
          .analyze();
        expect(result.violations).toEqual([]);
      }
    },
  );
