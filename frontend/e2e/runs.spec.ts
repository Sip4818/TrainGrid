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

  test("compares two completed runs side-by-side", async ({ page }) => {
    await page.goto("/runs");

    const errorMessage = page.getByText(/failed to load runs/i);
    await page.waitForLoadState("networkidle");

    if (await errorMessage.isVisible({ timeout: 1000 }).catch(() => false)) {
      test.skip();
      return;
    }

    // CI seeds two completed runs (random_forest + xgboost) in experiment 1
    const completedRows = page.locator("table tbody tr", {
      hasText: "completed",
    });
    await expect(completedRows.first()).toBeVisible({ timeout: 10000 });
    await expect(completedRows).toHaveCount(2);

    // Select both completed runs for comparison
    const compareCheckboxes = page.locator(
      'table tbody tr:has-text("completed") input[type="checkbox"]',
    );
    for (let i = 0; i < (await compareCheckboxes.count()); i++) {
      await compareCheckboxes.nth(i).check();
    }

    const compareButton = page.getByRole("button", {
      name: /Compare \(2\)/,
    });
    await expect(compareButton).toBeEnabled();
    await compareButton.click();

    await expect(page).toHaveURL(
      /\/runs\/compare\?experiment_id=1&run_ids=\d+&run_ids=\d+/,
    );

    // Comparison matrix should render both runs and their metrics
    await expect(page.getByRole("heading", { name: "Run Comparison" })).toBeVisible();
    await expect(page.getByText("Experiment #1")).toBeVisible();
    await expect(
      page.getByText(/Run #\d+ \u2014 random_forest/),
    ).toBeVisible();
    await expect(page.getByText(/Run #\d+ \u2014 xgboost/)).toBeVisible();
    await expect(page.getByText("accuracy")).toBeVisible();
    await expect(page.getByText("0.9300")).toBeVisible();
    await expect(page.getByText("0.9700")).toBeVisible();
  });

  test("navigates from dashboard to a status-filtered runs list", async ({
    page,
  }) => {
    await page.goto("/");

    const errorMessage = page.getByText(/failed to load dashboard/i);
    await page.waitForLoadState("networkidle");

    if (await errorMessage.isVisible({ timeout: 1000 }).catch(() => false)) {
      test.skip();
      return;
    }

    // Click the Pending summary card (CI seeds a pending run)
    await page.getByText("Pending").click();

    await expect(page).toHaveURL(/\/runs\?status=pending/);

    // Every row in the table should be a pending run
    const statusBadges = page.locator("table tbody tr td span");
    const badgeCount = await statusBadges.count();
    for (let i = 0; i < badgeCount; i++) {
      await expect(statusBadges.nth(i)).toContainText("pending");
    }
  });
});
