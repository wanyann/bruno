import React, { useRef } from 'react';
import { useDispatch } from 'react-redux';
import get from 'lodash/get';
import VarsTable from './VarsTable';
import StyledWrapper from './StyledWrapper';
import { usePersistedState } from 'hooks/usePersistedState';
import { useTrackScroll } from 'hooks/useTrackScroll';
import { sendRequest } from 'providers/ReduxStore/slices/collections/actions';

const Vars = ({ item, collection }) => {
  const dispatch = useDispatch();
  const isDraft = Boolean(item.draft);
  const requestVars = isDraft ? get(item, 'draft.request.vars.req') : get(item, 'request.vars.req');
  const responseVars = isDraft ? get(item, 'draft.request.vars.res') : get(item, 'request.vars.res');

  // When the user hits Cmd/Ctrl+Enter while focused anywhere in the Vars panel,
  // send the currently focused request (brand-collection/folder editors are not
  // reachable here — this panel only renders for an active, focused request).
  const handleKeyDown = (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      if (item && item.requestState !== 'sending' && item.requestState !== 'queued') {
        dispatch(sendRequest(item, collection.uid));
      }
    }
  };

  const wrapperRef = useRef(null);
  const [scroll, setScroll] = usePersistedState({ key: `request-vars-scroll-${item.uid}`, default: 0 });
  useTrackScroll({ ref: wrapperRef, selector: '.flex-boundary', onChange: setScroll, initialValue: scroll });

  return (
    <StyledWrapper className="w-full flex flex-col" ref={wrapperRef} onKeyDown={handleKeyDown}>
      <div>
        <div className="mb-3 title text-xs">Pre Request</div>
        <VarsTable item={item} collection={collection} vars={requestVars} varType="request" initialScroll={scroll} isDraft={isDraft} />
      </div>
      <div>
        <div className="mt-3 mb-3 title text-xs">Post Response</div>
        <VarsTable item={item} collection={collection} vars={responseVars} varType="response" initialScroll={scroll} isDraft={isDraft} />
      </div>
    </StyledWrapper>
  );
};

export default Vars;
