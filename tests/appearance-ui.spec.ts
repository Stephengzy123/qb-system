import { test, expect } from "@playwright/test";

for (const role of ["student", "admin"]) {
  test(`${role}: Dusk applies immediately, persists, locks dark, and resets`, async ({ page }) => {
    await page.addInitScript(() => { if (!localStorage.getItem("aoma-theme")) localStorage.setItem("aoma-theme", "light"); });
    await page.goto(`/appearance-demo/${role}`);
    await expect(page.getByRole("link", { name: "Appearance", exact: true })).toHaveAttribute("href", `/${role}/account/appearance`);
    await page.getByRole("button", { name: /^Dusk.*A warm/ }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await expect(page.getByRole("button", { name: /Dusk uses dark mode/ })).toBeDisabled();
    const shell = page.locator(role === "admin" ? ".app-shell" : ".student-shell");
    await expect(shell).toHaveCSS("background-image", "linear-gradient(58deg, rgb(71, 43, 21), rgb(15, 7, 75))");
    await expect(page.locator(".appearance-panel")).toHaveCSS("border-radius", "16px");
    await expect(page.getByRole("button", { name: "Reset to default" })).toHaveCSS("background-color", "rgb(240, 183, 189)");
    await page.screenshot({ path: `/tmp/dusk-${role}.png`, fullPage: true });
    await page.reload();
    await expect(page.getByRole("button", { name: /^Dusk.*A warm/ })).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await page.getByRole("button", { name: "Reset to default" }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    await page.getByRole("button", { name: "Switch to dark mode" }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await page.getByRole("button", { name: "Switch to light mode" }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  });
}

test("temporary admin appearance survives Dusk and reset", async ({ page }) => {
  await page.goto("/appearance-demo/admin");
  await page.getByText("Admin appearance (temporary)", { exact: true }).click();
  await page.getByLabel("Start color", { exact: true }).fill("#123456");
  const saved = await page.evaluate(() => localStorage.getItem("qb-admin-appearance"));
  await page.getByRole("button", { name: /^Dusk.*A warm/ }).click();
  await expect(page.locator(".app-shell")).toHaveCSS("background-image", "linear-gradient(58deg, rgb(71, 43, 21), rgb(15, 7, 75))");
  await page.getByRole("button", { name: "Reset to default" }).click();
  await expect(page.locator(".app-shell")).toHaveCSS("background-image", "linear-gradient(135deg, rgb(18, 52, 86), rgb(225, 233, 250))");
  expect(await page.evaluate(() => localStorage.getItem("qb-admin-appearance"))).toBe(saved);
});

test("Dusk still applies when storage is unavailable", async ({ page }) => {
  await page.addInitScript(() => { Storage.prototype.setItem = () => { throw new Error("Unavailable"); }; });
  await page.goto("/appearance-demo/student");
  await page.getByRole("button", { name: /^Dusk.*A warm/ }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.getByRole("status")).toContainText("Applied for this session");
  await page.getByRole("button", { name: "Reset to default" }).click();
  await expect(page.getByRole("button", { name: /Switch to .* mode/ })).toBeEnabled();
});
