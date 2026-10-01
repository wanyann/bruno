import reducer, { addTab, restoreTabs, setRecentRequests } from 'providers/ReduxStore/slices/tabs';

const COLLECTION_UID = 'col-1';
const MOCK_SERVER_UID = 'mock-server-1';

const makeCollection = () => ({
  uid: COLLECTION_UID,
  pathname: '/workspace/collections/demo'
});

describe('tabs mock-server dedup', () => {
  it('addTab focuses existing mock-server tab for the same mockServerUid', () => {
    let state = reducer(undefined, addTab({
      uid: MOCK_SERVER_UID,
      collectionUid: COLLECTION_UID,
      mockServerUid: MOCK_SERVER_UID,
      tabName: 'Dog API',
      type: 'mock-server'
    }));

    state = reducer(state, addTab({
      uid: 'other-uid',
      collectionUid: COLLECTION_UID,
      mockServerUid: MOCK_SERVER_UID,
      tabName: 'Dog API',
      type: 'mock-server'
    }));

    expect(state.tabs).toHaveLength(1);
    expect(state.tabs[0].uid).toBe(MOCK_SERVER_UID);
    expect(state.activeTabUid).toBe(MOCK_SERVER_UID);
  });

  it('addTab focuses legacy mock-server-dashboard tab and migrates type to mock-server', () => {
    const legacyState = {
      tabs: [{
        uid: MOCK_SERVER_UID,
        collectionUid: COLLECTION_UID,
        mockServerUid: MOCK_SERVER_UID,
        type: 'mock-server-dashboard',
        tabName: 'Dog API'
      }],
      activeTabUid: null,
      recentlyClosedTabs: []
    };

    const state = reducer(legacyState, addTab({
      uid: 'new-uid',
      collectionUid: COLLECTION_UID,
      mockServerUid: MOCK_SERVER_UID,
      tabName: 'Dog API',
      type: 'mock-server'
    }));

    expect(state.tabs).toHaveLength(1);
    expect(state.tabs[0].type).toBe('mock-server');
    expect(state.activeTabUid).toBe(MOCK_SERVER_UID);
  });

  it('addTab focuses legacy mocker tab and migrates type to mock-server', () => {
    const legacyState = {
      tabs: [{
        uid: MOCK_SERVER_UID,
        collectionUid: COLLECTION_UID,
        mockServerUid: MOCK_SERVER_UID,
        type: 'mocker',
        tabName: 'Dog API'
      }],
      activeTabUid: null,
      recentlyClosedTabs: []
    };

    const state = reducer(legacyState, addTab({
      uid: 'new-uid',
      collectionUid: COLLECTION_UID,
      mockServerUid: MOCK_SERVER_UID,
      tabName: 'Dog API',
      type: 'mock-server'
    }));

    expect(state.tabs).toHaveLength(1);
    expect(state.tabs[0].type).toBe('mock-server');
    expect(state.activeTabUid).toBe(MOCK_SERVER_UID);
  });

  it('restoreTabs skips duplicate mock-server snapshots for the same mockServerUid', () => {
    const collection = makeCollection();
    const snapshotTabs = [
      { type: 'mock-server', mockServerUid: MOCK_SERVER_UID, name: 'Dog API', permanent: true },
      { type: 'mock-server', mockServerUid: MOCK_SERVER_UID, name: 'Dog API copy', permanent: true }
    ];

    const state = reducer(undefined, restoreTabs({
      collection,
      tabs: snapshotTabs,
      activeTab: { accessor: 'type::mockServerUid', value: MOCK_SERVER_UID }
    }));

    expect(state.tabs).toHaveLength(1);
    expect(state.tabs[0].mockServerUid).toBe(MOCK_SERVER_UID);
    expect(state.activeTabUid).toBe(MOCK_SERVER_UID);
  });
});

describe('recentRequests excludes transient requests', () => {
  it('does not record a transient request when its tab is opened', () => {
    const state = reducer(undefined, addTab({
      uid: 'req-1',
      collectionUid: COLLECTION_UID,
      type: 'http-request',
      pathname: '/home/user/Library/Application Support/Bruno/tmp/transient/bruno-abc/Untitled 1.yml'
    }));

    expect(state.recentRequests).toHaveLength(0);
  });

  it('records a normal (non-transient) request', () => {
    const state = reducer(undefined, addTab({
      uid: 'req-2',
      collectionUid: COLLECTION_UID,
      type: 'http-request',
      pathname: '/home/user/collections/demo/req.yml'
    }));

    expect(state.recentRequests).toHaveLength(1);
    expect(state.recentRequests[0].pathname).toBe('/home/user/collections/demo/req.yml');
  });

  it('drops persisted transient entries when restoring from a snapshot', () => {
    const state = reducer(undefined, setRecentRequests([
      { uid: 'a', collectionUid: COLLECTION_UID, pathname: '/home/user/collections/demo/a.yml' },
      { uid: 'b', collectionUid: COLLECTION_UID, pathname: '/home/user/Library/Application Support/Bruno/tmp/transient/bruno-abc/Untitled 1.yml' },
      { uid: 'c', collectionUid: COLLECTION_UID, pathname: 'C:\\Users\\me\\AppData\\Roaming\\Bruno\\tmp\\transient\\bruno-xyz\\Untitled 1.yml' }
    ]));

    expect(state.recentRequests).toHaveLength(1);
    expect(state.recentRequests[0].uid).toBe('a');
  });
});
