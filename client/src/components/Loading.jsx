import React from 'react';

export default function Loading({ text = 'Yukleniyor...' }) {
  return (
    <div className="loading-container">
      <div className="spinner" />
      <p className="loading-text">{text}</p>
    </div>
  );
}
