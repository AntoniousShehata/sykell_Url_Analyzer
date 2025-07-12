import React, { useState, useRef } from 'react';
import UrlTable, { UrlTableRef } from './UrlTable';
import UrlForm from './UrlForm';
import { UrlData } from '../api/api';

const Dashboard: React.FC = () => {
  const [refreshKey, setRefreshKey] = useState(0);
  const urlTableRef = useRef<UrlTableRef>(null);

  const handleUrlAdded = (newUrl: UrlData) => {
    setTimeout(() => {
      if (urlTableRef.current) {
        setRefreshKey(prev => prev + 1);
        urlTableRef.current.refresh();
      }
    }, 5000);
  };

  return (
    <div className="main-content">
      <UrlForm onUrlAdded={handleUrlAdded} />
      <UrlTable key={refreshKey} ref={urlTableRef} />
    </div>
  );
};

export default Dashboard; 