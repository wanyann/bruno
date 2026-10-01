import { expect, test } from '../../playwright';
import { buildDevToolsLocators, closeDevToolsConsole } from '../utils/page/devtools-console';

// Toggle Console default: Option+C on both macOS and Windows.
const toggleConsoleKeys = ['Alt', 'KeyC'];

const pressToggleConsole = async (page) => {
  for (const key of toggleConsoleKeys) await page.keyboard.down(key);
  for (const key of [...toggleConsoleKeys].reverse()) await page.keyboard.up(key);
};

test.describe('Shortcut Keys - Toggle Console', () => {
  test.beforeEach(async ({ pageWithUserData: page }) => {
    await page.locator('[data-app-state="loaded"]').waitFor();
  });

  test.afterEach(async ({ pageWithUserData: page }) => {
    await closeDevToolsConsole(page);
  });

  test('opens the Devtools panel on the Console tab when closed', async ({ pageWithUserData: page }) => {
    const devtools = buildDevToolsLocators(page);

    await expect(devtools.header()).not.toBeVisible();

    await pressToggleConsole(page);

    await expect(devtools.header()).toBeVisible();
    await expect(devtools.consoleTab()).toHaveClass(/active/);
  });

  test('closes the Devtools panel when Console is active', async ({ pageWithUserData: page }) => {
    const devtools = buildDevToolsLocators(page);

    await pressToggleConsole(page);
    await expect(devtools.header()).toBeVisible();
    await expect(devtools.consoleTab()).toHaveClass(/active/);

    await pressToggleConsole(page);
    await expect(devtools.header()).not.toBeVisible();
  });

  test('switches to the Console tab when Devtools is open on another tab', async ({ pageWithUserData: page }) => {
    const devtools = buildDevToolsLocators(page);

    await pressToggleConsole(page);
    await expect(devtools.header()).toBeVisible();

    // Move to the Network tab, then toggle: panel must stay open and switch to Console.
    await devtools.networkTab().click();
    await expect(devtools.networkTab()).toHaveClass(/active/);

    await pressToggleConsole(page);
    await expect(devtools.header()).toBeVisible();
    await expect(devtools.consoleTab()).toHaveClass(/active/);
  });

  test('focuses the Console panel when toggled open', async ({ pageWithUserData: page }) => {
    const devtools = buildDevToolsLocators(page);

    await pressToggleConsole(page);
    await expect(devtools.header()).toBeVisible();

    // The Console panel root receives focus (tabIndex=-1).
    const focusedInsideConsole = await page.evaluate(() => {
      const active = document.activeElement;
      const header = document.querySelector('[data-testid="console-header"]');
      const root = header ? header.parentElement : null;
      return Boolean(root && active && root.contains(active));
    });
    expect(focusedInsideConsole).toBe(true);
  });
});
