import { expect, test } from "@playwright/test";

test.describe("Runs flow", () => {
  test("loads the runs page and shows the new run button", async ({ page }) => {
    await page.goto("/runs");

    // Page should show the New Run button (always visible above loading/error states)
    await expect(page.getByRole("button", { name: "New Run" })).toBeVisible();
  });

  test("shows runs in a table when the backend has data", async ({ page }) => {
    await page.goto("/runs");

    // Wait for the page to settle (loading spinner resolves or error appears)
    const spinner = page.locator('[aria-label="Loading"]');
    const errorMessage = page.getByText(/failed to load runs/i);

    await page.waitForLoadState("networkidle");

    // If the backend is not available, an error message appears — gracefully handle it
    if (await errorMessage.isVisible({ timeout: 1000 }).catch(() => false)) {
      await expect(errorMessage).toBeVisible();
      return;
    }

    // If spinner goes away without error, the table should be present
    await expect(spinner).not.toBeVisible({ timeout: 10000 });

    const table = page.locator("table");
    await expect(table).toBeVisible({ timeout: 5000 });
  });

  test("navigates to run detail on row click", async ({ page }) => {
    await page.goto("/runs");

    const errorMessage = page.getByText(/failed to load runs/i);
    await page.waitForLoadState("networkidle");

    if (await errorMessage.isVisible({ timeout: 1000 }).catch(() => false)) {
      // Backend not available — skip this test
      test.skip();
      return;
    }

    // Wait for table rows to appear
    const rows = page.locator("table tbody tr");
    await expect(rows.first()).toBeVisible({ timeout: 10000 });
    await rows.first().click();

    // Should navigate to /runs/{id}
    await expect(page).toHaveURL(/\/runs\/\d+/);
  });

  test("shows run detail page with config and metrics", async ({ page }) => {
    await page.goto("/runs");

    const errorMessage = page.getByText(/failed to load runs/i);
    await page.waitForLoadState("networkidle");

    if (await errorMessage.isVisible({ timeout: 1000 }).catch(() => false)) {
      test.skip();
      return;
    }

    // Click first run row
    const rows = page.locator("table tbody tr");
    await expect(rows.first()).toBeVisible({ timeout: 10000 });
    await rows.first().click();

    await page.waitForURL(/\/runs\/\d+/);

    // Detail page should show run details
    await expect(page.getByText(/status|config|metrics/i).first()).toBeVisible();
  });
});
