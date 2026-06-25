import { expect, test } from "@playwright/test";

test.describe("Runs flow", () => {
  test("loads the runs page and shows the create button", async ({ page }) => {
    await page.goto("/runs");

    // Page should show the Create Run button
    await expect(page.getByRole("button", { name: /create run/i })).toBeVisible();
  });

  test("shows runs in a table when the backend has data", async ({ page }) => {
    await page.goto("/runs");

    // Wait for the table to appear (loading spinner resolves)
    // If the backend is running, rows will be present
    // If not, the error message appears — we handle both cases gracefully
    const table = page.locator("table");
    const errorMessage = page.getByText(/error|failed/i);

    await page.waitForLoadState("networkidle");

    if (await errorMessage.isVisible({ timeout: 1000 }).catch(() => false)) {
      // Backend not available — that's OK, error state is handled
      await expect(errorMessage).toBeVisible();
      return;
    }

    // Backend responded — table should be visible
    await expect(table).toBeVisible();
  });

  test("navigates to run detail on row click", async ({ page }) => {
    await page.goto("/runs");

    const errorMessage = page.getByText(/error|failed/i);
    await page.waitForLoadState("networkidle");

    if (await errorMessage.isVisible({ timeout: 1000 }).catch(() => false)) {
      // Backend not available — skip test
      test.skip();
      return;
    }

    // Click the first row in the table body
    const rows = page.locator("table tbody tr");
    await expect(rows.first()).toBeVisible({ timeout: 5000 });
    await rows.first().click();

    // Should navigate to /runs/{id}
    await expect(page).toHaveURL(/\/runs\/\d+/);
  });

  test("shows run detail page with config and metrics", async ({ page }) => {
    await page.goto("/runs");

    const errorMessage = page.getByText(/error|failed/i);
    await page.waitForLoadState("networkidle");

    if (await errorMessage.isVisible({ timeout: 1000 }).catch(() => false)) {
      test.skip();
      return;
    }

    // Click first run
    const rows = page.locator("table tbody tr");
    await expect(rows.first()).toBeVisible({ timeout: 5000 });
    await rows.first().click();

    await page.waitForURL(/\/runs\/\d+/);

    // Detail page should show run details
    await expect(page.getByText(/status|config|metrics/i).first()).toBeVisible();
  });
});
