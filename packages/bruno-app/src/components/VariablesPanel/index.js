import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { IconX, IconChevronRight } from '@tabler/icons';
import find from 'lodash/find';
import { produce } from 'immer';
import {
  findItemInCollection,
  findItemInCollectionByPathname,
  getGlobalEnvironmentVariables,
  getGlobalEnvironmentVariablesMasked,
  getVariablesUsedInRequest,
  getAllVariablesByScope
} from 'utils/collections';
import { updateVariableInScope } from 'providers/ReduxStore/slices/collections/actions';
import { setVariablesPanelOpen } from 'providers/ReduxStore/slices/app';
import VariableRow from './VariableRow';
import ScopeBadge from './ScopeBadge';
import StyledWrapper from './StyledWrapper';

const DEFAULT_PANEL_WIDTH = 340;
const MIN_PANEL_WIDTH = 260;
const MAX_PANEL_WIDTH = 640;
const WIDTH_LS_KEY = 'bruno.variables-panel.width';

const clampWidth = (value) => Math.min(MAX_PANEL_WIDTH, Math.max(MIN_PANEL_WIDTH, value));

const loadPersistedWidth = () => {
  try {
    const stored = parseInt(localStorage.getItem(WIDTH_LS_KEY), 10);
    if (!Number.isNaN(stored)) return clampWidth(stored);
  } catch {}
  return DEFAULT_PANEL_WIDTH;
};

const VariableGroup = ({ title, scope, variables, collection, item, onSave }) => {
  return (
    <>
      <div className="vp-group-title">
        <ScopeBadge type={scope} />
        <span className="vp-group-title-text">{title}</span>
      </div>
      {variables.length === 0 ? (
        <div className="vp-empty">No variables defined</div>
      ) : (
        <div className="vp-table">
          {variables.map((v) => (
            <VariableRow
              key={`${v.scopeInfo?.type}-${v.name}`}
              name={v.name}
              scopeInfo={v.scopeInfo}
              collection={collection}
              item={item}
              showScope={false}
              onSave={(newValue) => onSave(v.name, v.scopeInfo, newValue)}
            />
          ))}
        </div>
      )}
    </>
  );
};

const PanelSection = ({ title, expanded, onToggle, collapsible = true, children }) => {
  if (!collapsible) {
    return (
      <div className="vp-section-header non-collapsible expanded">
        <span>{title}</span>
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        className={`vp-section-header ${expanded ? 'expanded' : ''}`}
        onClick={onToggle}
        aria-expanded={expanded}
      >
        <IconChevronRight size={14} strokeWidth={2} className="vp-section-chevron" />
        <span>{title}</span>
      </button>
      {expanded && children}
    </>
  );
};

const VariablesPanel = () => {
  const dispatch = useDispatch();
  const activeTabUid = useSelector((state) => state.tabs.activeTabUid);
  const tabs = useSelector((state) => state.tabs.tabs);
  const _collections = useSelector((state) => state.collections.collections);
  const { globalEnvironments, activeGlobalEnvironmentUid } = useSelector((state) => state.globalEnvironments);
  const variablesPanelOpen = useSelector((state) => state.app.variablesPanelOpen);

  const focusedTab = find(tabs, (t) => t.uid === activeTabUid);

  const [width, setWidth] = useState(DEFAULT_PANEL_WIDTH);
  const [allVarsExpanded, setAllVarsExpanded] = useState(true);
  const resizingRef = useRef(false);

  const isOpen = variablesPanelOpen;

  // Load persisted width on mount
  useEffect(() => {
    setWidth(loadPersistedWidth());
  }, []);

  // Build collection with global environment variables merged in (like RequestTabPanel)
  const collection = produce(_collections, (draft) => {
    const c = find(draft, (col) => col.uid === focusedTab?.collectionUid);
    if (c) {
      c.globalEnvironmentVariables = getGlobalEnvironmentVariables({ globalEnvironments, activeGlobalEnvironmentUid });
      c.globalEnvSecrets = getGlobalEnvironmentVariablesMasked({ globalEnvironments, activeGlobalEnvironmentUid });
      c.globalEnvironments = globalEnvironments;
      c.activeGlobalEnvironmentUid = activeGlobalEnvironmentUid;
    }
  });

  const activeCollection = find(collection, (c) => c.uid === focusedTab?.collectionUid) || null;

  // Resolve the active item (request) for "variables used in request"
  let item = null;
  if (activeCollection && focusedTab?.uid) {
    item = findItemInCollection(activeCollection, focusedTab.itemUid)
      || findItemInCollection(activeCollection, focusedTab.uid)
      || (focusedTab.pathname ? findItemInCollectionByPathname(activeCollection, focusedTab.pathname) : null);
  }

  const hasRequestTab = focusedTab && ['request', 'http-request', 'grpc-request', 'ws-request', 'graphql-request'].includes(focusedTab.type);

  const usedInRequest = useMemo(
    () => (hasRequestTab && activeCollection && item ? getVariablesUsedInRequest(activeCollection, item) : []),
    [activeCollection, item, hasRequestTab]
  );

  const allByScope = useMemo(
    () => (activeCollection ? getAllVariablesByScope(activeCollection, item) : { environment: [], collection: [], global: [] }),
    [activeCollection, item]
  );

  const handleSave = useCallback((name, scopeInfo, newValue) => {
    if (!activeCollection || !scopeInfo) return;
    dispatch(updateVariableInScope(name, newValue, scopeInfo, activeCollection.uid)).catch(() => {});
  }, [activeCollection, dispatch]);

  const closePanel = useCallback(() => {
    dispatch(setVariablesPanelOpen(false));
  }, [dispatch]);

  // Resize handling
  const handleResizeStart = useCallback((e) => {
    e.preventDefault();
    resizingRef.current = true;

    const onMove = (ev) => {
      if (!resizingRef.current) return;
      const newWidth = clampWidth(window.innerWidth - ev.clientX);
      setWidth(newWidth);
    };

    const onUp = (ev) => {
      resizingRef.current = false;
      try { localStorage.setItem(WIDTH_LS_KEY, String(width)); } catch {}
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [width]);

  if (!isOpen) {
    return null;
  }

  // When there is no active collection (ManageWorkspace / ApiSpec / empty),
  // show only Environment and Globals groups.
  const showCollectionGroup = !!activeCollection;

  return (
    <StyledWrapper style={{ width }}>
      <div className="variables-panel-resize-handle" onMouseDown={handleResizeStart} role="separator" aria-orientation="vertical" aria-label="Resize Variables panel">
        <div className="drag-border" />
      </div>
      <div className="variables-panel" data-testid="variables-panel">
        <div className="vp-header">
          <div className="vp-header-title">
            <span>Variables</span>
          </div>
          <button type="button" className="vp-close-btn" onClick={closePanel} title="Close" data-testid="variables-panel-close">
            <IconX size={16} strokeWidth={1.5} />
          </button>
        </div>

        <div className="vp-scroll">
          {hasRequestTab && (
            <PanelSection
              title="Variables in request"
              expanded
              onToggle={() => {}}
              collapsible={false}
            >
              {usedInRequest.length === 0 ? (
                <div className="vp-empty" data-testid="vp-request-empty">No variables used yet</div>
              ) : (
                <div className="vp-table">
                  {usedInRequest.map((v) => (
                    <VariableRow
                      key={`${v.scopeInfo?.type}-${v.name}`}
                      name={v.name}
                      scopeInfo={v.scopeInfo}
                      collection={activeCollection}
                      item={item}
                      onSave={(nv) => handleSave(v.name, v.scopeInfo, nv)}
                    />
                  ))}
                </div>
              )}
            </PanelSection>
          )}

          <PanelSection
            title="All Variables"
            expanded={allVarsExpanded}
            onToggle={() => setAllVarsExpanded((v) => !v)}
          >
            <VariableGroup
              key="env"
              title="Environment"
              scope="environment"
              variables={allByScope.environment}
              collection={activeCollection}
              item={item}
              onSave={(name, si, nv) => handleSave(name, si, nv)}
            />
            {showCollectionGroup && (
              <VariableGroup
                key="collection"
                title={activeCollection?.name || 'Collection'}
                scope="collection"
                variables={allByScope.collection}
                collection={activeCollection}
                item={item}
                onSave={(name, si, nv) => handleSave(name, si, nv)}
              />
            )}
            <VariableGroup
              key="global"
              title="Globals"
              scope="global"
              variables={allByScope.global}
              collection={activeCollection}
              item={item}
              onSave={(name, si, nv) => handleSave(name, si, nv)}
            />
          </PanelSection>
        </div>
      </div>
    </StyledWrapper>
  );
};

export default VariablesPanel;
