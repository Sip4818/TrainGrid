# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: runs.spec.ts >> Runs flow >> navigates to run detail on row click
- Location: e2e/runs.spec.ts:33:3

# Error details

```
Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:3000/runs
Call log:
  - navigating to "http://localhost:3000/runs", waiting until "load"

```

# Test source

```ts
  1  | import { expect, test } from "@playwright/test";
  2  | 
  3  | test.describe("Runs flow", () => {
  4  |   test("loads the runs page and shows the new run button", async ({ page }) => {
  5  |     await page.goto("/runs");
  6  | 
  7  |     // Page should show the New Run button (always visible above loading/error states)
  8  |     await expect(page.getByRole("button", { name: "New Run" })).toBeVisible();
  9  |   });
  10 | 
  11 |   test("shows runs in a table when the backend has data", async ({ page }) => {
  12 |     await page.goto("/runs");
  13 | 
  14 |     // Wait for the page to settle (loading spinner resolves or error appears)
  15 |     const spinner = page.locator('[aria-label="Loading"]');
  16 |     const errorMessage = page.getByText(/failed to load runs/i);
  17 | 
  18 |     await page.waitForLoadState("networkidle");
  19 | 
  20 |     // If the backend is not available, an error message appears — gracefully handle it
  21 |     if (await errorMessage.isVisible({ timeout: 1000 }).catch(() => false)) {
  22 |       await expect(errorMessage).toBeVisible();
  23 |       return;
  24 |     }
  25 | 
  26 |     // If spinner goes away without error, the table should be present
  27 |     await expect(spinner).not.toBeVisible({ timeout: 10000 });
  28 | 
  29 |     const table = page.locator("table");
  30 |     await expect(table).toBeVisible({ timeout: 5000 });
  31 |   });
  32 | 
  33 |   test("navigates to run detail on row click", async ({ page }) => {
> 34 |     await page.goto("/runs");
     |                ^ Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:3000/runs
  35 | 
  36 |     const errorMessage = page.getByText(/failed to load runs/i);
  37 |     await page.waitForLoadState("networkidle");
  38 | 
  39 |     if (await errorMessage.isVisible({ timeout: 1000 }).catch(() => false)) {
  40 |       // Backend not available — skip this test
  41 |       test.skip();
  42 |       return;
  43 |     }
  44 | 
  45 |     // Wait for table rows to appear
  46 |     const rows = page.locator("table tbody tr");
  47 |     await expect(rows.first()).toBeVisible({ timeout: 10000 });
  48 |     await rows.first().click();
  49 | 
  50 |     // Should navigate to /runs/{id}
  51 |     await expect(page).toHaveURL(/\/runs\/\d+/);
  52 |   });
  53 | 
  54 |   test("shows run detail page with config and metrics", async ({ page }) => {
  55 |     await page.goto("/runs");
  56 | 
  57 |     const errorMessage = page.getByText(/failed to load runs/i);
  58 |     await page.waitForLoadState("networkidle");
  59 | 
  60 |     if (await errorMessage.isVisible({ timeout: 1000 }).catch(() => false)) {
  61 |       test.skip();
  62 |       return;
  63 |     }
  64 | 
  65 |     // Click first run row
  66 |     const rows = page.locator("table tbody tr");
  67 |     await expect(rows.first()).toBeVisible({ timeout: 10000 });
  68 |     await rows.first().click();
  69 | 
  70 |     await page.waitForURL(/\/runs\/\d+/);
  71 | 
  72 |     // Detail page should show run details
  73 |     await expect(page.getByText(/status|config|metrics/i).first()).toBeVisible();
  74 |   });
  75 | });
  76 | 
```