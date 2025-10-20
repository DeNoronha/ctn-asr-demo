import React, { useState } from 'react';
import './PDFViewer.css';

interface PDFViewerProps {
  url: string;
  title?: string;
}

const PDFViewer: React.FC<PDFViewerProps> = ({ url, title = 'Document Preview' }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const handleLoad = () => {
    setLoading(false);
    setError(false);
  };

  const handleError = () => {
    setLoading(false);
    setError(true);
  };

  const openInNewTab = () => {
    window.open(url, '_blank');
  };

  return (
    <div className="pdf-viewer-container">
      <div className="pdf-viewer-header">
        <span className="pdf-viewer-title">{title}</span>
        <button
          className="pdf-viewer-button"
          onClick={openInNewTab}
          title="Open in new tab"
        >
          ↗ Open in New Tab
        </button>
      </div>

      <div className="pdf-viewer-content">
        {loading && (
          <div className="pdf-viewer-loading">
            <div className="spinner"></div>
            <p>Loading document...</p>
          </div>
        )}

        {error && (
          <div className="pdf-viewer-error">
            <p>⚠️ Unable to load document</p>
            <button onClick={openInNewTab} className="pdf-viewer-button">
              Try opening in new tab
            </button>
          </div>
        )}

        <iframe
          src={url}
          title={title}
          className="pdf-viewer-iframe"
          onLoad={handleLoad}
          onError={handleError}
          style={{ display: loading || error ? 'none' : 'block' }}
        />
      </div>
    </div>
  );
};

export default PDFViewer;
