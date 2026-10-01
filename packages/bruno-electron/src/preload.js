const { ipcRenderer, contextBridge, webUtils, shell } = require('electron');

const isPlaywright = process.env.PLAYWRIGHT === 'true';

contextBridge.exposeInMainWorld('isPlaywright', isPlaywright);

contextBridge.exposeInMainWorld('ipcRenderer', {
  invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args),
  send: (channel, ...args) => ipcRenderer.send(channel, ...args),
  on: (channel, handler) => {
    // Deliberately strip event as it includes `sender`
    const subscription = (event, ...args) => {
      // Ensure args is always an array to prevent undefined errors
      const safeArgs = args && args.length ? args : [];
      handler(...safeArgs);
    };
    ipcRenderer.on(channel, subscription);

    return () => {
      ipcRenderer.removeListener(channel, subscription);
    };
  },
  getFilePath(file) {
    const path = webUtils.getPathForFile(file);
    return path;
  },
  // During automated Playwright runs, opening a URL externally would launch the
  // user's real browser. Swallow it so tests that exercise "open externally"
  // behaviour don't leave stray browser tabs behind.
  openExternal: (url) => {
    if (isPlaywright) {
      return Promise.resolve();
    }
    return shell.openExternal(url);
  }
});
