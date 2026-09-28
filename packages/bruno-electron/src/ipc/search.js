const { ipcMain } = require('electron');
const { getSearchIndex } = require('../services/search/search-index');

const searchIndex = getSearchIndex();

const registerSearchIpc = () => {
  ipcMain.handle('renderer:search:get-index', async (event, { collectionPaths = [] } = {}) => {
    const results = [];
    await Promise.allSettled(
      collectionPaths.map(async (collectionPath) => {
        if (!collectionPath) return;
        const items = await searchIndex.getIndex(collectionPath);
        results.push({ collectionPath, items });
      })
    );
    return results;
  });
};

module.exports = { registerSearchIpc, searchIndex };
