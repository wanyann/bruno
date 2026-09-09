import React from 'react';

const BracesIcon = ({ size = 16, color = 'currentColor', ...rest }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      {...rest}
    >
      <text
        x="50"
        y="50"
        dominantBaseline="central"
        fontFamily="Cambria Math, STIX Two Math, Times New Roman, serif"
        fontSize="54"
        fill={color}
        textAnchor="middle"
      >
        {'{{𝑥}}'}
      </text>
    </svg>
  );
};

export default BracesIcon;
