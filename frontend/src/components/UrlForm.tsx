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

    // Basic URL validation
    let validUrl = url.trim();
    if (!validUrl.startsWith('http://') && !validUrl.startsWith('https://')) {
      validUrl = 'https://' + validUrl;
    }

    try {
      new URL(validUrl);
    } catch {
      setError('Please enter a valid URL');
      return;
    }

    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      const newUrl = await addUrl(validUrl);
      setSuccess('URL added successfully! Analysis started...');
      setUrl('');
      
      // Immediately notify parent component
      onUrlAdded(newUrl);
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess('');
      }, 3000);
      
    } catch (err: any) {
      console.error('Error adding URL:', err);
      
      if (err.message.includes('already exists')) {
        setError('This URL has already been analyzed');
      } else {
        setError(err.message || 'Failed to add URL for analysis');
      }
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
            type="text"
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
          {isLoading ? 'Adding...' : 'Analyze URL'}
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