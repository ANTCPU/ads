import React from 'react';

export default function Card({ children, style = {} }: {
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <div style={{
      background: '#fff',
      border: '1px solid #e5e5e5',
      borderRadius: '14px',
      padding: '1.5rem',
      marginBottom: '1.25rem',
      ...style,
    }}>
      {children}
    </div>
  );
}
