import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
async function login(page: Page, role: string) {
  await page.goto("/login");
  await page.getByLabel("Email address").fill(role + "@example.test");
  await page.getByLabel("Password", { exact: true }).fill("LocalDemo123");
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  await page.waitForURL("**/dashboard");
}
async function fields(page: Page, names: string[]) {
  for (const name of names)
    await expect(
      name === "Address"
        ? page.getByRole("textbox", { name, exact: true })
        : page.getByLabel(name, { exact: true }),
    ).toBeVisible();
}
async function columns(page: Page, names: string[]) {
  for (const name of names)
    await expect(
      page.getByRole("columnheader", { name, exact: true }),
    ).toBeVisible();
}
test("F62 registration fields, supplied photo validation and four disclosed reviews", async ({
  page,
}) => {
  await page.goto("/register");
  await fields(page, ["Full name", "Email address", "Password"]);
  const photo = page.locator("input[name=image]");
  await expect(photo).toHaveAttribute("type", "url");
  await photo.fill("http://example.test/photo.png");
  expect(await photo.evaluate((e: HTMLInputElement) => e.checkValidity())).toBe(
    false,
  );
  await photo.fill("https://example.test/photo.png");
  expect(await photo.evaluate((e: HTMLInputElement) => e.checkValidity())).toBe(
    true,
  );
  await photo.fill("");
  expect(await photo.evaluate((e:HTMLInputElement)=>e.checkValidity())).toBe(false);
  for (const password of ["abcdef", "ABCDEF", "Ab1"]) {
    const r = await page.request.post("/api/auth/sign-up/email", {
      headers: { origin: "http://localhost:3000" },
      data: {
        name: "F62 Invalid",
        email: "invalid-" + Date.now() + "@example.test",
        password,
      },
    });
    expect(r.status()).toBe(400);
  }
  const bad = await page.request.post("/api/auth/sign-up/email", {
    headers: { origin: "http://localhost:3000" },
    data: {
      name: "F62 Invalid Image",
      email: "image-" + Date.now() + "@example.test",
      password: "Valid123",
      image: "http://example.test/x.png",
    },
  });
  expect(bad.status()).toBe(400);
  await page.goto("/");
  await expect(page.locator(".review")).toHaveCount(4);
  for (const review of await page.locator(".review").all()) {
    await expect(review.locator("strong")).not.toBeEmpty();
    await expect(review.locator("blockquote")).not.toBeEmpty();
    await expect(
      review.getByRole("img", { name: "Illustrative rating: 5 out of 5" }),
    ).toBeVisible();
  }
  await expect(page.locator(".review-disclosure")).toContainText(
    "Not verified",
  );
});
for (const role of ["customer", "owner", "admin"])
  test(`F62 ${role} dashboard fields and reload`, async ({ page }) => {
    await login(page, role);
    await page.goto("/dashboard/rentals");
    await columns(page, [
      "Equipment",
      ...(role === "customer"
        ? ["Rental start date", "Rental end date"]
        : ["Rental period"]),
      "Booking date",
      "Quantity",
      "Total",
      "Payment",
      "Status",
      ...(role !== "customer" ? ["Customer"] : []),
      ...(role === "admin" ? ["Owner", "Manage"] : []),
    ]);
    await page.goto("/dashboard/profile");
    await fields(page, [
      "Full name",
      "Email",
      "Profile image URL",
      "Phone number",
      "Address",
    ]);
    await expect(page.getByLabel("Email", { exact: true })).toHaveAttribute(
      "readonly",
      "",
    );
    await page.getByLabel("Phone number").fill("0123456789");
    await page
      .getByRole("textbox", { name: "Address", exact: true })
      .fill("Isolated F62 fixture address");
    await page.getByRole("button", { name: "Save profile" }).click();
    await expect(page.locator("p[role=status]")).toContainText("updated");
    await page.reload();
    await expect(page.getByLabel("Phone number")).toHaveValue("0123456789");
    if (role === "customer") {
      await page.goto("/dashboard/favorites");
      await columns(page, ["Equipment", "Category", "Rental price", "Actions"]);
      await page.goto("/equipment");
      await page.locator(".equipment-card").first().getByRole("link").click();
      for (const term of [
        "Available quantity",
        "Condition",
        "Brand & model",
        "Owner",
      ])
        await expect(page.locator("dt", { hasText: term })).toBeVisible();
      await expect(
        page.getByRole("heading", { name: "Rental terms & conditions" }),
      ).toBeVisible();
      await page.getByRole("button", { name: "Book now", exact: true }).click();
      await fields(page, [
        "Start date",
        "End date",
        "Quantity",
        "Contact number",
        "Delivery address",
        "Additional notes",
      ]);
      await expect(
        page.getByRole("button", { name: "Continue to Stripe Checkout" }),
      ).toBeVisible();
    } else {
      await page.goto("/dashboard/equipment");
      await columns(page, [
        "Equipment",
        "Category",
        "Rental price",
        "Quantity",
        "Status",
        "Actions",
      ]);
      await expect(
        page
          .locator("tbody tr")
          .first()
          .getByRole("link", { name: "Update", exact: true }),
      ).toBeVisible();
      await expect(
        page
          .locator("tbody tr")
          .first()
          .getByRole("button", { name: "Delete", exact: true }),
      ).toBeVisible();
      await expect(
        page
          .locator("tbody tr")
          .first()
          .getByRole("link", { name: "Details", exact: true }),
      ).toBeVisible();
      if (role === "owner") {
        await page.goto("/dashboard/add-equipment");
        await fields(page, [
          "Equipment name",
          "Description",
          "Category",
          "Location",
          "Rental price (USD)",
          "Rental type",
          "Available quantity",
          "Condition",
          "Brand",
          "Model",
          "Equipment image (imgbb upload)",
          "Rental terms and conditions",
        ]);
        await expect(page.locator(".form-meta")).toContainText(
          "Pending approval",
        );
        await expect(page.locator(".form-meta")).toContainText("Owner:");
      } else {
        await page.goto("/dashboard/users");
        await columns(page, ["Name", "Email", "Role", "Registered", "Access"]);
        const select = page.getByRole("combobox").first();
        await expect(select.locator("option")).toHaveText([
          "customer",
          "owner",
          "admin",
        ]);
      }
    }
  });
test("F62 persisted theme, storage failure fallback and dark responsive accessibility", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Switch to dark theme" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  for (const width of [390, 834, 1920])
    for (const path of ["/", "/equipment", "/login", "/register"]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(path);
      const scan = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();
      expect(
        scan.violations.map((v) => ({
          id: v.id,
          nodes: v.nodes.map((n) => n.target),
        })),
      ).toEqual([]);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
    }
  await page.getByRole("button", { name: "Switch to light theme" }).click();
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
});

for (const role of ["customer", "owner", "admin"])
  test(`F62 dark ${role} dashboard accessibility`, async ({ page }) => {
    await login(page, role);
    await page.getByRole("button", { name: "Switch to dark theme" }).click();
    for (const width of [390, 834, 1920])
      for (const path of [
        "/dashboard",
        "/dashboard/profile",
        "/dashboard/rentals",
        ...(role === "customer"
          ? ["/dashboard/favorites"]
          : ["/dashboard/equipment"]),
        ...(role === "owner"
          ? ["/dashboard/add-equipment"]
          : role === "admin"
            ? ["/dashboard/users"]
            : []),
      ]) {
        await page.setViewportSize({ width, height: 1000 });
        await page.goto(path);
        await expect(page.locator("main h1")).toBeVisible();
        const scan = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
          .analyze();
        expect(
          scan.violations.map((v) => ({
            id: v.id,
            nodes: v.nodes.map((n) => n.target),
          })),
        ).toEqual([]);
      }
  });
test("F62 theme survives unavailable storage without breaking navigation", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Storage.prototype.getItem = () => {
      throw new Error("blocked");
    };
    Storage.prototype.setItem = () => {
      throw new Error("blocked");
    };
  });
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.getByRole("button", { name: "Switch to dark theme" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.goto("/equipment");
  await expect(page.locator("main h1")).toBeVisible();
});
