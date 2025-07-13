import React, { useRef } from 'react';
import UrlTable, { UrlTableRef } from './UrlTable';
import UrlForm from './UrlForm';
import { UrlData } from '../api/api';

const Dashboard: React.FC = () => {
  const urlTableRef = useRef<UrlTableRef>(null);

  const handleUrlAdded = (newUrl: UrlData) => {
    // Immediate refresh after URL is added
    if (urlTableRef.current) {
      urlTableRef.current.refresh();
    }
    
    // Additional refresh after a short delay to catch any status updates
    setTimeout(() => {
      if (urlTableRef.current) {
        urlTableRef.current.refresh();
      }
    }, 2000);
  };

  return (
    <div className="main-content">
      <UrlForm onUrlAdded={handleUrlAdded} />
      <UrlTable ref={urlTableRef} />
    </div>
  );
};

export default Dashboard; 