import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  IconSearch,
  IconX,
  IconFolder,
  IconBox,
  IconFileText,
  IconBook
} from '@tabler/icons';
import {
  findParentItemInCollection,
  findItemInCollectionByPathname,
  getDefaultRequestPaneTab,
  flattenItems
} from 'utils/collections';
import { addTab, focusTab, isRequestTabType } from 'providers/ReduxStore/slices/tabs';
import { toggleCollectionItem, toggleCollection } from 'providers/ReduxStore/slices/collections';
import { mountCollection } from 'providers/ReduxStore/slices/collections/actions';
import store from 'providers/ReduxStore';
import { normalizePath } from 'utils/common/path';
import { normalizeQuery, isValidQuery, highlightText, sortResults, getTypeLabel } from './utils/searchUtils';
import { SEARCH_TYPES, MATCH_TYPES, SEARCH_CONFIG, DOCUMENTATION_RESULT } from './constants';
import StyledWrapper from './StyledWrapper';

const GlobalSearchModal = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [results, setResults] = useState([]);
  const [searchIndexVersion, setSearchIndexVersion] = useState(0);
  const [isIndexLoading, setIsIndexLoading] = useState(false);
  const [unresolvedRecentCount, setUnresolvedRecentCount] = useState(0);
  const [expectedRecentCount, setExpectedRecentCount] = useState(0);
  const inputRef = useRef(null);
  const resultsRef = useRef(null);
  const debounceTimeoutRef = useRef(null);
  const searchIndexRef = useRef(new Map()); // collectionPath -> items[]
  const dispatch = useDispatch();

  const allCollections = useSelector((state) => state.collections.collections);
  const { workspaces, activeWorkspaceUid } = useSelector((state) => state.workspaces);
  const tabs = useSelector((state) => state.tabs.tabs);
  const recentRequests = useSelector((state) => state.tabs.recentRequests || []);
  const activeTabUid = useSelector((state) => state.tabs.activeTabUid);

  const activeWorkspace = workspaces.find((w) => w.uid === activeWorkspaceUid);

  // The active tab, used to exclude the currently open request from the recents
  // list. Its uid can temporarily be the file pathname right after a restart
  // (before the collection mounts and the uid is synced), so we also compare by
  // pathname for request tabs.
  const activeTab = useMemo(() => tabs.find((t) => t.uid === activeTabUid), [tabs, activeTabUid]);
  const activeRequestPath
    = activeTab && isRequestTabType(activeTab.type) && activeTab.pathname
      ? normalizePath(activeTab.pathname)
      : null;

  const collections = useMemo(() => {
    if (!activeWorkspace) return allCollections;

    const workspacePaths = new Set(
      activeWorkspace.collections?.map((wc) => normalizePath(wc.path)) || []
    );
    return allCollections.filter((c) => workspacePaths.has(normalizePath(c.pathname)));
  }, [activeWorkspace, allCollections, workspaces]);

  // Look up collection metadata (uid/name) for a given collection pathname.
  const collectionByPath = useMemo(() => {
    const map = new Map();
    collections.forEach((c) => map.set(normalizePath(c.pathname), c));
    return map;
  }, [collections]);

  // Synchronous lookup of request items already loaded into Redux (mounted
  // collections). Recent requests are resolved from here first so the Cmd+K
  // list can render immediately, without waiting for the disk search index.
  const reduxRequestLookup = useMemo(() => {
    const byPath = new Map();
    const byUid = new Map();
    collections.forEach((collection) => {
      flattenItems(collection.items || []).forEach((item) => {
        if (!item) return;
        const entry = { it: item, collection };
        if (item.uid) byUid.set(item.uid, entry);
        if (item.pathname) byPath.set(normalizePath(item.pathname), entry);
      });
    });
    return { byPath, byUid };
  }, [collections]);

  // Normalize a request method the same way the disk index does, so a recent
  // item rendered from Redux matches its indexed counterpart (esp. gRPC).
  const normalizeIndexMethod = (item) => {
    const request = item?.request || {};
    if (request.type === 'grpc') {
      return (request.methodType || request.method || 'UNARY').toLowerCase().replace(/_/g, '-');
    }
    return request.method || '';
  };

  // Convert a request descriptor from the disk search index into a result item
  // shaped like search results so it renders with the same markup.
  const indexItemToResult = (indexItem, collection) => {
    if (!collection || !indexItem) return null;

    return {
      type: SEARCH_TYPES.REQUEST,
      item: {
        uid: indexItem.uid,
        name: indexItem.name,
        type: indexItem.type,
        pathname: indexItem.pathname,
        request: { method: indexItem.method, url: indexItem.url, type: indexItem.type }
      },
      name: indexItem.name,
      path: indexItem.pathname,
      matchType: MATCH_TYPES.REQUEST,
      method: indexItem.method || '',
      collectionUid: collection.uid
    };
  };

  // Convert a request item already loaded into Redux into a result item shaped
  // like search results so it renders with the same markup. Used to show recent
  // requests instantly, before the disk index has loaded.
  const reduxItemToResult = (item, collection) => {
    if (!collection || !item) return null;

    return {
      type: SEARCH_TYPES.REQUEST,
      item: {
        uid: item.uid,
        name: item.name,
        type: item.type,
        pathname: item.pathname,
        request: { method: normalizeIndexMethod(item), url: item.request?.url || '', type: item.type }
      },
      name: item.name,
      path: item.pathname,
      matchType: MATCH_TYPES.REQUEST,
      method: normalizeIndexMethod(item),
      collectionUid: collection.uid
    };
  };

  // Single source of truth for search: the per-collection request index read
  // from disk (works for unmounted collections). resolvedCollections is the
  // array of { items, collection } pairs.
  const resolvedCollections = useMemo(() => {
    const out = [];
    searchIndexRef.current.forEach((items, collectionPath) => {
      const collection = collectionByPath.get(normalizePath(collectionPath));
      if (!collection) return;
      out.push({ items: items || [], collection });
    });
    return out;
  }, [collectionByPath, searchIndexVersion]);

  // Recent requests are resolved synchronously from Redux (mounted collections)
  // first, falling back to the disk index for unmounted/not-yet-loaded ones.
  // Returns the matched results plus how many recent entries could not be
  // resolved yet (used to decide whether to show loading skeletons).
  const createRecentTabsResults = () => {
    const indexByUid = new Map();
    const indexByPath = new Map();
    resolvedCollections.forEach(({ items, collection }) => {
      items.forEach((it) => {
        indexByUid.set(it.uid, { it, collection });
        if (it.pathname) {
          indexByPath.set(normalizePath(it.pathname), { it, collection });
        }
      });
    });

    const resolveEntry = (recent, recentPath) => {
      // Redux first (already-loaded collection trees), then disk index.
      const reduxEntry = (recentPath && reduxRequestLookup.byPath.get(normalizePath(recentPath)))
        || reduxRequestLookup.byUid.get(recent.uid);
      if (reduxEntry) {
        return reduxItemToResult(reduxEntry.it, reduxEntry.collection);
      }
      const indexEntry = (recentPath && indexByPath.get(normalizePath(recentPath)))
        || indexByUid.get(recent.uid);
      if (indexEntry) {
        return indexItemToResult(indexEntry.it, indexEntry.collection);
      }
      return null;
    };

    // recentRequests is deduplicated by request uid and newest-first.
    // Match by stable absolute pathname (survives request uid re-derivation
    // across restarts), falling back to uid. Some persisted entries stored the
    // request's file path as its uid; treat those as a path lookup too.
    const results = [];
    let unresolvedCount = 0;
    // Number of recent entries that will be listed (pass the skip filters),
    // independent of whether their index entry has resolved yet. Used so the
    // loading skeletons match the final row count exactly.
    let expectedCount = 0;
    for (const recent of recentRequests) {
      if (!recent || !recent.uid || recent.uid === activeTabUid) continue;
      const recentPath = recent.pathname || (typeof recent.uid === 'string' && recent.uid.includes('/') ? recent.uid : null);
      const normalizedRecentPath = recentPath ? normalizePath(recentPath) : null;
      // Skip the currently open request. Its tab uid can still be the file
      // pathname right after a restart, so match by pathname too (request tabs
      // only — an example tab shares the parent request's pathname but is a
      // different tab and must not hide the request).
      if (activeRequestPath && normalizedRecentPath === activeRequestPath) continue;
      if (expectedCount >= 8) break;
      expectedCount += 1;
      const result = resolveEntry(recent, recentPath);
      if (!result) {
        unresolvedCount += 1;
      } else {
        results.push(result);
      }
    }

    return { results, unresolvedCount, expectedCount };
  };

  const searchInCollections = (searchTerms, enablePathMatch) => {
    const results = [];

    // Check for documentation match
    const queryLower = searchTerms.join(' ');
    if (['documentation', 'docs', 'bruno docs'].some((term) => term.includes(queryLower))) {
      results.push(DOCUMENTATION_RESULT);
    }

    resolvedCollections.forEach(({ items, collection }) => {
      // Search collection name
      if (searchTerms.every((term) => collection.name.toLowerCase().includes(term))) {
        results.push({
          type: SEARCH_TYPES.COLLECTION,
          item: collection,
          name: collection.name,
          path: collection.name,
          matchType: MATCH_TYPES.COLLECTION,
          collectionUid: collection.uid
        });
      }

      // Search request items (flat, from the disk index)
      items.forEach((item) => {
        const nameMatch = searchTerms.every((term) => (item.name || '').toLowerCase().includes(term));
        const urlMatch = searchTerms.every((term) => (item.url || '').toLowerCase().includes(term));
        const pathnameLower = (item.pathname || '').toLowerCase();
        const pathMatch = enablePathMatch && searchTerms.every((term) => pathnameLower.includes(term));

        if (nameMatch || urlMatch || pathMatch) {
          results.push({
            type: SEARCH_TYPES.REQUEST,
            item: {
              uid: item.uid,
              name: item.name,
              type: item.type,
              pathname: item.pathname,
              request: { method: item.method, url: item.url, type: item.type }
            },
            name: item.name,
            path: item.pathname,
            matchType: nameMatch ? MATCH_TYPES.REQUEST : urlMatch ? MATCH_TYPES.URL : MATCH_TYPES.PATH,
            method: item.method || '',
            collectionUid: collection.uid
          });
        }
      });
    });

    return results;
  };

  const performSearch = (searchQuery) => {
    const normalizedQuery = normalizeQuery(searchQuery);

    if (!normalizedQuery) {
      const { results: recentResults, unresolvedCount, expectedCount } = createRecentTabsResults();
      setResults(recentResults);
      setUnresolvedRecentCount(unresolvedCount);
      setExpectedRecentCount(expectedCount);
      return;
    }

    setUnresolvedRecentCount(0);
    setExpectedRecentCount(0);

    if (!isValidQuery(normalizedQuery)) {
      setResults([]);
      return;
    }

    const searchTerms = normalizedQuery.toLowerCase().split(/[\s\/]+/).filter(Boolean);
    if (!searchTerms.length) {
      setResults([]);
      return;
    }

    const enablePathMatch = normalizedQuery.includes('/');
    const searchResults = searchInCollections(searchTerms, enablePathMatch);
    const sortedResults = sortResults(searchResults);

    setResults(sortedResults);
    setSelectedIndex(0);
  };

  const debouncedSearch = useCallback((searchQuery) => {
    // Clear existing timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    // Set new timeout
    debounceTimeoutRef.current = setTimeout(() => {
      performSearch(searchQuery);
    }, SEARCH_CONFIG.DEBOUNCE_DELAY);
  }, [collections, searchIndexVersion, reduxRequestLookup]); // Refresh when the disk index (re)loads or collections finish mounting

  // Expands the collection and every ancestor folder of the result so it is
  // visible in the sidebar. Must be called after the collection is mounted, as
  // its item tree arrives asynchronously with the mount.
  const expandItemPath = (collectionUid, result) => {
    const state = store.getState();
    const collection = state.collections.collections.find((c) => c.uid === collectionUid);
    if (!collection) return;

    if (collection.collapsed) {
      dispatch(toggleCollection(collection.uid));
    }

    let currentItem = result.type === SEARCH_TYPES.FOLDER
      ? findItemInCollectionByPathname(collection, result.item.pathname)
      : findParentItemInCollection(collection, result.item.uid);

    while (currentItem?.type === 'folder') {
      if (currentItem.collapsed) {
        dispatch(toggleCollectionItem({ collectionUid: collection.uid, itemUid: currentItem.uid }));
      }
      currentItem = findParentItemInCollection(collection, currentItem.uid);
    }
  };

  // Poll until the collection's item tree contains the target pathname (the
  // tree is populated asynchronously right after mounting), then expand the
  // ancestor folders. Best-effort: if it never loads, we just skip expanding.
  const revealResultInSidebar = async (collectionUid, result, attempts = 12) => {
    const targetPathname = result.item.pathname;
    for (let i = 0; i < attempts; i += 1) {
      const state = store.getState();
      const collection = state.collections.collections.find((c) => c.uid === collectionUid);
      const item = collection?.pathname && targetPathname
        ? findItemInCollectionByPathname(collection, targetPathname)
        : null;
      // For a folder result, findItemInCollectionByPathname also matches folders.
      if (item || (result.type === SEARCH_TYPES.FOLDER && collection?.items?.length)) {
        expandItemPath(collectionUid, result);
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  };

  // Mount the target collection and resolve once it is mounted. Concurrent
  // callers (e.g. repeated Enter while mounting) share the same in-flight
  // promise so the collection is never mounted twice.
  const mountPromisesRef = useRef(new Map());
  const ensureCollectionIsMounted = (collection) => {
    if (!collection || collection.mountStatus === 'mounted') {
      return Promise.resolve();
    }

    const inFlight = mountPromisesRef.current.get(collection.uid);
    if (inFlight) return inFlight;

    const promise = Promise.resolve(
      dispatch(mountCollection({
        collectionUid: collection.uid,
        collectionPathname: collection.pathname,
        brunoConfig: collection.brunoConfig
      }))
    ).finally(() => {
      mountPromisesRef.current.delete(collection.uid);
    });

    mountPromisesRef.current.set(collection.uid, promise);
    return promise;
  };

  const handleKeyNavigation = (e) => {
    const handlers = {
      ArrowDown: () => {
        e.preventDefault();
        setSelectedIndex((prev) => prev < results.length - 1 ? prev + 1 : 0);
      },
      ArrowUp: () => {
        e.preventDefault();
        setSelectedIndex((prev) => prev > 0 ? prev - 1 : results.length - 1);
      },
      Enter: () => {
        e.preventDefault();
        if (results[selectedIndex]) {
          void handleResultSelection(results[selectedIndex]);
        }
      },
      Escape: () => {
        e.preventDefault();
        onClose();
      },
      PageDown: () => {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 5, results.length - 1));
      },
      PageUp: () => {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 5, 0));
      },
      Home: () => {
        e.preventDefault();
        setSelectedIndex(0);
      },
      End: () => {
        e.preventDefault();
        setSelectedIndex(results.length - 1);
      }
    };

    const handler = handlers[e.key];
    if (handler) handler();
  };

  const handleResultSelection = async (result) => {
    if (result.type === SEARCH_TYPES.DOCUMENTATION) {
      window.open('https://docs.usebruno.com/', '_blank');
      onClose();
      return;
    }

    const targetCollection = collections.find((c) => c.uid === result.collectionUid);

    // Wait for the collection to mount before opening the tab. Mounting
    // restores the collection's persisted tabs (restoreTabs), which otherwise
    // would land after — and clobber — the tab we just opened, switching the
    // active tab to the first persisted one (e.g. a folder-settings tab).
    await ensureCollectionIsMounted(targetCollection);

    if (result.type === SEARCH_TYPES.REQUEST || result.type === SEARCH_TYPES.FOLDER) {
      // Reveal in the sidebar once the item tree has loaded.
      revealResultInSidebar(result.collectionUid, result);
    }

    if (result.type === SEARCH_TYPES.REQUEST) {
      const state = store.getState();
      const existingTab = state.tabs.tabs.find((tab) => tab.uid === result.item.uid);

      if (existingTab) {
        dispatch(focusTab({ uid: existingTab.uid }));
      } else {
        dispatch(addTab({
          uid: result.item.uid,
          collectionUid: result.collectionUid,
          requestPaneTab: getDefaultRequestPaneTab(result.item),
          type: result.item.type,
          pathname: result.item.pathname
        }));
      }
    } else if (result.type === SEARCH_TYPES.FOLDER) {
      dispatch(addTab({
        uid: result.item.uid,
        collectionUid: result.collectionUid,
        type: 'folder-settings',
        pathname: result.item.pathname
      }));
    } else if (result.type === SEARCH_TYPES.COLLECTION) {
      dispatch(addTab({
        uid: result.item.uid,
        collectionUid: result.collectionUid,
        type: 'collection-settings'
      }));
    }

    onClose();
  };

  const handleQueryChange = (e) => {
    const newQuery = e.target.value;
    setQuery(newQuery);

    if (newQuery.trim()) {
      debouncedSearch(newQuery);
    } else {
      // For empty queries, search immediately to show collections
      performSearch(newQuery);
    }
  };

  const clearSearch = () => {
    // Clear any pending debounced search
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    setQuery('');
    performSearch('');
  };

  // Initialize modal when opened
  useEffect(() => {
    if (isOpen) {
      const timeoutId = setTimeout(() => inputRef.current?.focus(), SEARCH_CONFIG.FOCUS_DELAY);
      setQuery('');
      setResults([]);
      setSelectedIndex(0);
      setUnresolvedRecentCount(0);
      setExpectedRecentCount(0);

      // Resolve recent requests synchronously from Redux so the list can show
      // immediately, before the disk index resolves.
      performSearch('');

      // Refresh the disk search index from main (fast, cached) and search.
      const hasIpc = Boolean(window.ipcRenderer?.invoke);
      setIsIndexLoading(hasIpc);
      if (hasIpc) {
        const collectionPaths = collections.map((c) => c.pathname).filter(Boolean);
        window.ipcRenderer
          .invoke('renderer:search:get-index', { collectionPaths })
          .then((result) => {
            if (!Array.isArray(result)) return;
            const next = new Map();
            result.forEach((entry) => {
              if (entry && entry.collectionPath) {
                next.set(normalizePath(entry.collectionPath), Array.isArray(entry.items) ? entry.items : []);
              }
            });
            searchIndexRef.current = next;
            setSearchIndexVersion((v) => v + 1);
          })
          .catch((err) => {
            console.error('Failed to load search index:', err);
          })
          .finally(() => {
            setIsIndexLoading(false);
          });
      }

      return () => clearTimeout(timeoutId);
    } else {
      setIsIndexLoading(false);
      // Clear any pending debounced search when modal closes
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Re-run search once the disk index has been (re)loaded.
  useEffect(() => {
    if (isOpen) {
      performSearch(query);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchIndexVersion]);

  // Re-run search when the synchronous Redux item lookup changes (e.g. a
  // collection finished mounting), so recents upgrade in place.
  useEffect(() => {
    if (isOpen) {
      performSearch(query);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduxRequestLookup]);

  // Auto-scroll selected item into view
  useEffect(() => {
    if (resultsRef.current && results.length > 0) {
      const selectedElement = resultsRef.current.children[selectedIndex];
      selectedElement?.scrollIntoView({
        behavior: SEARCH_CONFIG.SCROLL_BEHAVIOR,
        block: SEARCH_CONFIG.SCROLL_BLOCK
      });
    }
  }, [selectedIndex, results]);

  // Cleanup debounce timeout on unmount or modal close
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  // Shorten HTTP/gRPC method names to fit the fixed-size (5ch) method tag.
  const methodShortLabel = (method) => {
    if (!method) return '';
    const upper = method.toUpperCase().replace(/-/g, '');
    const map = {
      DELETE: 'DEL',
      OPTIONS: 'OPT',
      CONNECT: 'CONN',
      PATCH: 'PTCH',
      TRACE: 'TRAC',
      CLIENTSTREAMING: 'CLNT',
      SERVERSTREAMING: 'SRVR',
      BIDISTREAMING: 'BIDI',
      UNARY: 'UNARY'
    };
    return map[upper] || upper;
  };

  const getResultIcon = (type) => {
    const iconMap = {
      [SEARCH_TYPES.DOCUMENTATION]: IconBook,
      [SEARCH_TYPES.COLLECTION]: IconBox,
      [SEARCH_TYPES.FOLDER]: IconFolder,
      [SEARCH_TYPES.REQUEST]: IconFileText
    };
    const IconComponent = iconMap[type] || IconFileText;
    return <IconComponent size={18} stroke={1.5} />;
  };

  if (!isOpen) return null;

  return (
    <StyledWrapper>
      <div
        className="command-k-overlay"
        onClick={onClose}
        role="dialog"
        aria-modal="true"
        aria-labelledby="search-modal-title"
        aria-describedby="search-modal-description"
      >
        <div className="command-k-modal" onClick={(e) => e.stopPropagation()}>
          <h1 id="search-modal-title" className="sr-only">Global Search</h1>
          <p id="search-modal-description" className="sr-only">
            Search through collections, requests, folders, and documentation. Use arrow keys to navigate results and Enter to select.
          </p>
          <div aria-live="polite" aria-atomic="true" className="sr-only">
            {results.length > 0 && query
              ? `${results.length} result${results.length === 1 ? '' : 's'} found`
              : query && results.length === 0
                ? 'No results found'
                : ''}
          </div>
          <div className="command-k-header">
            <div className="search-input-container">
              <IconSearch size={20} className="search-icon" aria-hidden="true" />
              <input
                ref={inputRef}
                type="text"
                placeholder="Search collections, requests, or documentation..."
                value={query}
                onChange={handleQueryChange}
                onKeyDown={handleKeyNavigation}
                className="search-input"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck="false"
                aria-label="Search collections, requests, or documentation"
                aria-expanded={results.length > 0}
                aria-controls="search-results"
                aria-activedescendant={results.length > 0 ? `search-result-${selectedIndex}` : undefined}
                role="combobox"
                aria-autocomplete="list"
                data-testid="global-search-input"
              />
              {query && (
                <button
                  onClick={clearSearch}
                  className="clear-button"
                  aria-label="Clear search query"
                  type="button"
                >
                  <IconX size={16} aria-hidden="true" />
                </button>
              )}
            </div>
          </div>

          <div
            className="command-k-results"
            ref={resultsRef}
            id="search-results"
            role="listbox"
            aria-label="Search results"
          >
            {!query && isIndexLoading && unresolvedRecentCount > 0 ? (
              <div className="skeleton-list" data-testid="recent-requests-skeleton" aria-hidden="true">
                {Array.from({ length: Math.min(expectedRecentCount || unresolvedRecentCount, 8) }).map((_, index) => (
                  <div className="skeleton-item" key={`skeleton-${index}`}>
                    <div className="skeleton-method" />
                    <div className="skeleton-content">
                      <div className="skeleton-line skeleton-line-name" />
                      <div className="skeleton-line skeleton-line-path" />
                    </div>
                  </div>
                ))}
              </div>
            ) : results.length === 0 && query ? (
              <div className="no-results">
                <p>
                  No results found for "{query}".
                  <br />
                  <span className="block mt-2">
                    The item might not exist yet, or its collection isn’t mounted. Press <strong>Enter</strong> here (or open it from the sidebar) to mount the collection automatically.
                  </span>
                </p>
              </div>
            ) : results.length === 0 ? (
              <div className="empty-state">
                <p>
                  No recent requests yet.
                  <br />
                  <span className="block mt-2">
                    Open a request from the sidebar and it will show up here. Type above to search all collections and documentation.
                  </span>
                </p>
              </div>
            ) : (
              results.map((result, index) => {
                const isSelected = index === selectedIndex;
                const typeLabel = getTypeLabel(result.type);

                let resultLeft = null;
                if (result.type === SEARCH_TYPES.REQUEST && result.method) {
                  resultLeft = (
                    <span
                      className={`method-tag ${result.method.toLowerCase()}`}
                      aria-label={`HTTP method ${result.method.toUpperCase().replace(/-/g, ' ')}`}
                    >
                      {methodShortLabel(result.method)}
                    </span>
                  );
                } else if (typeLabel) {
                  resultLeft = (
                    <span className={`type-icon-tag ${result.type}`} aria-label={`Item type ${typeLabel}`}>
                      {getResultIcon(result.type)}
                    </span>
                  );
                }

                return (
                  <div
                    key={`${result.type}-${result.item.id || result.item.uid}-${index}`}
                    id={`search-result-${index}`}
                    className={`result-item ${isSelected ? 'selected' : ''}`}
                    onClick={() => handleResultSelection(result)}
                    data-selected={isSelected}
                    data-type={result.type}
                    role="option"
                    aria-selected={isSelected}
                    aria-label={`${result.name}, ${typeLabel || result.type}${result.method ? `, ${result.method}` : ''}`}
                    tabIndex={-1}
                  >
                    <div className="result-method">
                      {resultLeft}
                    </div>
                    <div className="result-content">
                      <div className="result-info">
                        <div className="result-name">
                          {highlightText(result.name, query)}
                        </div>
                        <div className="result-path">
                          {result.type === SEARCH_TYPES.DOCUMENTATION
                            ? result.description
                            : highlightText(result.item.request?.url || '', query)}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="command-k-footer">
            <div className="keyboard-hints" role="region" aria-label="Keyboard shortcuts">
              <span aria-label="Use up and down arrows to navigate">
                <span className="keycap" aria-hidden="true">↑</span>
                <span className="keycap" aria-hidden="true">↓</span>
                <span className="hint-label">to navigate</span>
              </span>
              <span aria-label="Press Enter to select">
                <span className="keycap" aria-hidden="true">↵</span>
                <span className="hint-label">to select</span>
              </span>
              <span aria-label="Press Escape to close">
                <span className="keycap" aria-hidden="true">esc</span>
                <span className="hint-label">to close</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </StyledWrapper>
  );
};

export default GlobalSearchModal;
