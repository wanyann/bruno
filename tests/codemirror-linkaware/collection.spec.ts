import { Page, test } from '../../playwright';
import { buildCommonLocators, closeAllCollections, closeAllTabs, LINK_AWARE_COLLECTION_NAME as COLLECTION_NAME, expectNoLinkMark, openCollectionFromDialog, openRequest } from '../utils/page';

const settings = (page: Page) => buildCommonLocators(page).paneTabs.collectionSettingsContent();

const openCollectionSettingsTab = async (page: Page, key: string) => {
  const locators = buildCommonLocators(page);
  await locators.sidebar.collection(COLLECTION_NAME).hover();
  await locators.actions.collectionActions(COLLECTION_NAME).click();
  await locators.dropdown.item('Settings').click();
  await locators.paneTabs.collectionSettingsTab(key).click();
};

test.describe('CodeMirror link-aware — Collection settings', () => {
  test.beforeEach(async ({ page, electronApp, collectionFixturePath }) => {
    await openCollectionFromDialog(page, electronApp, collectionFixturePath!);
    // Opening a request first is the concrete "collection fully loaded" signal (same
    // watcher scan that parses collection.bru's headers/auth/vars/script/tests) —
    // otherwise Settings can race ahead of collection.root being populated.
    await openRequest(page, COLLECTION_NAME, 'http-request');
    await closeAllTabs(page);
  });

  test.afterEach(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('Vars: URL is plain text (not a link)', async ({ page }) => {
    await openCollectionSettingsTab(page, 'vars');
    const cm = buildCommonLocators(page).codeMirror.valueCellAt(settings(page));
    await expectNoLinkMark(cm);
  });

  test('Pre-Request-Script: URL is plain text (not a link)', async ({ page }) => {
    const locators = buildCommonLocators(page);
    await openCollectionSettingsTab(page, 'script');
    await locators.paneTabs.tabTrigger('pre-request').click();
    const cm = locators.codeMirror.byTestId('collection-pre-request-script-editor');
    await expectNoLinkMark(cm);
  });

  test('Post-Response-Script: URL is plain text (not a link)', async ({ page }) => {
    const locators = buildCommonLocators(page);
    await openCollectionSettingsTab(page, 'script');
    await locators.paneTabs.tabTrigger('post-response').click();
    const cm = locators.codeMirror.byTestId('collection-post-response-script-editor');
    await expectNoLinkMark(cm);
  });

  test('Tests: URL is plain text (not a link)', async ({ page }) => {
    await openCollectionSettingsTab(page, 'tests');
    const cm = buildCommonLocators(page).codeMirror.within(settings(page));
    await expectNoLinkMark(cm);
  });
});
