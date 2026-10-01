import { expect, test } from '../../../playwright';
import {
  buildCommonLocators,
  closeAllCollections,
  createCollection,
  createFolder,
  createRequest,
  expandFolder,
  openCollection,
  openRequestInFolder
} from '../../utils/page';

const collectionName = 'breadcrumb-collection';

// Build a small nested tree: collection > folder-a > folder-b > nested-req,
// plus a root request and a preferences tab for the non-folder cases.
const setup = async (page, createTmpDir) => {
  await closeAllCollections(page);
  const path = await createTmpDir('breadcrumb-collection-path');
  await createCollection(page, collectionName, path);
  await createFolder(page, 'folder-a', collectionName, true);
  await expandFolder(page, 'folder-a');
  await createFolder(page, 'folder-b', 'folder-a', false);
  await expandFolder(page, 'folder-b');
  await createRequest(page, 'nested-req', 'folder-b', { inFolder: true });
  await createRequest(page, 'root-req', collectionName);
};

const openNestedRequest = async (page) => {
  await openCollection(page, collectionName);
  await expandFolder(page, 'folder-a');
  await expandFolder(page, 'folder-b');
  await openRequestInFolder(page, 'folder-b', 'nested-req');
};

test.describe('Collection header breadcrumb', () => {
  test.beforeEach(async ({ pageWithUserData: page, createTmpDir }) => {
    await page.locator('[data-app-state="loaded"]').waitFor();
    await setup(page, createTmpDir);
  });

  test('shows the tab name for a root-level request', async ({ pageWithUserData: page }) => {
    const { collectionHeader, sidebar } = buildCommonLocators(page);
    await openCollection(page, collectionName);
    await sidebar.itemRowIn(collectionName, 'root-req').dblclick();

    await expect(collectionHeader.breadcrumb()).toBeVisible();
    await expect(collectionHeader.breadcrumbTabName()).toHaveText('root-req');
    await expect(collectionHeader.breadcrumbFolders()).toHaveCount(0);
  });

  test('shows the full folder chain for a nested request', async ({ pageWithUserData: page }) => {
    const { collectionHeader } = buildCommonLocators(page);
    await openNestedRequest(page);

    await expect(collectionHeader.breadcrumb()).toBeVisible();
    await expect(collectionHeader.breadcrumbFolders()).toHaveText(['folder-a', 'folder-b']);
    await expect(collectionHeader.breadcrumbTabName()).toHaveText('nested-req');
  });

  test('clicking a folder in the breadcrumb opens its settings tab', async ({ pageWithUserData: page }) => {
    const { collectionHeader } = buildCommonLocators(page);
    await openNestedRequest(page);

    await collectionHeader.breadcrumbFolderByName('folder-a').click();

    // The folder settings tab becomes active and the breadcrumb reflects it.
    await expect(page.locator('li.request-tab.active .tab-name')).toHaveText('folder-a');
    await expect(collectionHeader.breadcrumbTabName()).toHaveText('folder-a');
  });

  test('shows the tab name for Preferences', async ({ pageWithUserData: page }) => {
    const { collectionHeader, openPreferences } = buildCommonLocators(page);
    await openCollection(page, collectionName);

    await openPreferences().click();

    await expect(collectionHeader.breadcrumbTabName()).toHaveText('Preferences');
  });

  test('path elements use a regular (400) font weight', async ({ pageWithUserData: page }) => {
    const { collectionHeader } = buildCommonLocators(page);
    await openNestedRequest(page);

    const weight = (locator) =>
      locator.evaluate((el) => getComputedStyle(el).fontWeight);

    // Workspace/collection switcher label and every breadcrumb folder represent
    // the path leading up to the current request — all should be weight 400.
    await expect.poll(() => weight(page.getByTestId('workspace-switcher-name'))).toBe('400');
    await expect.poll(() => weight(collectionHeader.breadcrumbFolders().first())).toBe('400');
    await expect.poll(() => weight(collectionHeader.breadcrumbFolders().last())).toBe('400');
  });
});
