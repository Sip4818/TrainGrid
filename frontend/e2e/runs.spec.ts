import { expect, test } from "@playwright/test";

test.describe("Project-first navigation flow", () => {
  test("navigates from project list to experiment runs table", async ({
    page,
  }) => {
    await page.goto("/projects");

    // Default Project should be visible
    await expect(page.getByText("Default Project")).toBeVisible();

    // Click the project row
    await page.getByText("Default Project").click();
    await expect(page).toHaveURL(/\/projects\/\d+/);

    // Default experiment should be visible
    await expect(page.getByText("Default")).toBeVisible();

    // Click the experiment row
    await page.getByText("Default").click();
    await expect(page).toHaveURL(/\/projects\/\d+\/experiments\/\d+/);

    // Runs table should be visible with seeded runs
    const table = page.locator("table");
    await expect(table).toBeVisible({ timeout: 10000 });
  });

  test("navigates to run detail on row click", async ({ page }) => {
    await page.goto("/projects/1/experiments/1");

    // Wait for runs table to load
    const rows = page.locator("table tbody tr");
    await expect(rows.first()).toBeVisible({ timeout: 10000 });

    // Click first run row
    await rows.first().click();

    // Should navigate to scoped run detail URL
    await expect(page).toHaveURL(/\/projects\/\d+\/experiments\/\d+\/runs\/\d+/);

    // Detail page should show config section
    await expect(page.getByText("Configuration")).toBeVisible();
  });

  test("compares two completed runs side-by-side", async ({ page }) => {
    await page.goto("/projects/1/experiments/1");

    // Wait for completed runs to appear
    const completedRows = page.locator("table tbody tr", {
      hasText: "completed",
    });
    await expect(completedRows.first()).toBeVisible({ timeout: 10000 });

    // Select both completed runs for comparison
    const compareCheckboxes = page.locator(
      'table tbody tr:has-text("completed") input[type="checkbox"]',
    );
    for (let i = 0; i < (await compareCheckboxes.count()); i++) {
      await compareCheckboxes.nth(i).check();
    }

    // Click Compare button
    const compareButton = page.getByRole("button", {
      name: /Compare \(2\)/,
    });
    await expect(compareButton).toBeEnabled();
    await compareButton.click();

    // Should navigate to scoped comparison URL
    await expect(page).toHaveURL(
      /\/projects\/\d+\/experiments\/\d+\/compare\?run_ids=\d+&run_ids=\d+/,
    );

    // Comparison matrix should render both runs and their metrics
    await expect(
      page.getByRole("heading", { name: "Run Comparison" }),
    ).toBeVisible();
    await expect(page.getByText("accuracy")).toBeVisible();
    await expect(
      page.getByText(/Run #\d+ \u2014 random_forest/),
    ).toBeVisible();
    await expect(
      page.getByText(/Run #\d+ \u2014 xgboost/),
    ).toBeVisible();
  });

  test("navigates back to experiment from run detail", async ({ page }) => {
    await page.goto("/projects/1/experiments/1");

    const rows = page.locator("table tbody tr");
    await expect(rows.first()).toBeVisible({ timeout: 10000 });
    await rows.first().click();

    await page.waitForURL(/\/projects\/\d+\/experiments\/\d+\/runs\/\d+/);

    // Click Back to Experiment
    await page.getByRole("button", { name: "Back to Experiment" }).click();

    // Should return to experiment page
    await expect(page).toHaveURL(/\/projects\/\d+\/experiments\/\d+$/);
  });
});
