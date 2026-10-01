import { test, expect, closeElectronApp } from '../../playwright';
import {
  createCollection,
  createFolder,
  createRequest,
  expandFolder,
  openRequest,
  openfolder,
  waitForReadyPage
} from '../utils/page';
import { buildCommonLocators } from '../utils/page/locators';

const modifier = process.platform === 'darwin' ? 'Meta' : 'Control';

/**
 * Regression: selecting a request that lives in a subfolder of an *unmounted*
 * collection from Cmd/Ctrl+K must open the request itself.
 *
 * The target collection is mounted lazily on selection. Mounting also restores
 * its persisted tabs; if the tab is opened before the mount settles, the
 * restore lands afterwards, replaces the tab list, and — when the persisted
 * snapshot has no active tab — activates the first persisted tab (a
 * folder-settings tab). The fix awaits the mount before opening the tab.
 */
test.describe('Global Search: open nested request in an unmounted collection', () => {
  test('Cmd+K opens the request, not its parent folder', async ({ launchElectronApp, createTmpDir }) => {
    const userDataPath = await createTmpDir('gs-nested-request');
    const colAPath = await createTmpDir('col-a');
    const colBPath = await createTmpDir('col-b');

    const app = await launchElectronApp({ userDataPath });
    const page = await waitForReadyPage(app);
    const locators = buildCommonLocators(page);

    await test.step('Create collection A with a folder and a request inside it', async () => {
      await createCollection(page, 'ColA', colAPath);
      await createFolder(page, 'dashboard', 'ColA', true);
      await expandFolder(page, 'dashboard');
      await createRequest(page, 'nested-req', 'dashboard', { inFolder: true });
    });

    await test.step('Persist a folder-settings tab and the request tab in A', async () => {
      // Folder settings tab first, so it is the first persisted tab (and would
      // be activated on a naive tab restore).
      await openfolder(page, 'ColA', 'dashboard', { persist: true });
      await expandFolder(page, 'dashboard');
      await openRequest(page, 'ColA', 'nested-req', { persist: true });
      await expect(locators.tabs.requestTab('nested-req')).toHaveCount(1);
    });

    await test.step('Create collection B and make it the active collection', async () => {
      await createCollection(page, 'ColB', colBPath);
      await createRequest(page, 'b-req', 'ColB', { url: 'https://echo.usebruno.com', method: 'GET' });
      await openRequest(page, 'ColB', 'b-req', { persist: true });
      // B is now the active collection, so A is restored unmounted; A's
      // snapshot has no active tab (its tabs exist but none is active).
      await page.waitForTimeout(2000);
    });

    await closeElectronApp(app);

    await test.step('Restart, search for the nested request and open it', async () => {
      const app2 = await launchElectronApp({ userDataPath });
      const page2 = await waitForReadyPage(app2);
      const locators2 = buildCommonLocators(page2);

      // Wait for the active collection (B) to settle after restart.
      await expect(locators2.tabs.activeRequestTab()).toBeVisible({ timeout: 15000 });

      await page2.keyboard.press(`${modifier}+k`);
      const input = page2.getByTestId('global-search-input');
      await expect(input).toBeVisible();
      await input.fill('nested-req');
      await expect(page2.locator('.result-item').filter({ hasText: 'nested-req' })).toBeVisible({ timeout: 10000 });
      await page2.keyboard.press('Enter');

      // The request tab must be opened and active — not the parent folder.
      await expect(locators2.tabs.requestTab('nested-req')).toHaveCount(1, { timeout: 15000 });
      await expect(locators2.tabs.activeRequestTab()).toContainText('nested-req');
      await expect(locators2.tabs.activeRequestTab()).not.toContainText('dashboard');

      await closeElectronApp(app2);
    });
  });
});
