import React from 'react';

const SCOPE_BADGE = {
  environment: { letter: 'E', color: '#6CDD9A', background: '#013614' },
  global: { letter: 'G', color: '#74AEF7', background: '#112749' },
  collection: { letter: 'C', color: '#FFE47E', background: '#886001' }
};

const ScopeBadge = ({ type, title }) => {
  const config = SCOPE_BADGE[type];
  if (!config) return null;

  return (
    <span
      className="vp-scope-badge"
      title={title}
      style={{
        color: config.color,
        background: config.background,
        width: 18,
        height: 18,
        flexShrink: 0,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 3,
        fontSize: 11,
        lineHeight: 1,
        fontWeight: 600
      }}
    >
      {config.letter}
    </span>
  );
};

export default ScopeBadge;
