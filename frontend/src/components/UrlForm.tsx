import React, { useState } from 'react';
import { addUrl, UrlData } from '../api/api';

interface UrlFormProps {
  onUrlAdded: (url: UrlData) => void;
}

const UrlForm: React.FC<UrlFormProps> = ({ onUrlAdded }) => {
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!url.trim()) {
      setError('Please enter a URL');
      return;
    }

    try {
      new URL(url);
    } catch {
      setError('Please enter a valid URL');
      return;
    }

    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      const newUrl = await addUrl(url);
      setSuccess('URL submitted successfully! Analysis in progress...');
      setUrl('');
      onUrlAdded(newUrl);
      
      setTimeout(() => {
        setSuccess('');
      }, 5000);
    } catch (err: any) {
      setError(err.message || 'Failed to analyze URL');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="url-form">
      <h3>Add New URL for Analysis</h3>
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Enter URL (e.g., https://example.com)"
            className="url-input"
            disabled={isLoading}
          />
        </div>
        
        <button
          type="submit"
          disabled={isLoading || !url.trim()}
          className="submit-btn"
        >
          {isLoading ? 'Analyzing...' : 'Analyze URL'}
        </button>
      </form>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {success && (
        <div className="success-message">
          {success}
        </div>
      )}
    </div>
  );
};

export default UrlForm; 