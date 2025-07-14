import React, { useState, useEffect, useCallback, forwardRef, useImperativeHandle, useRef } from 'react';
import { Link } from 'react-router-dom';
import { fetchUrls, deleteUrl, reanalyzeUrl, bulkDeleteUrls, UrlData } from '../api/api';

interface PaginationInfo {
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
}

export interface UrlTableRef {
  refresh: () => void;
  addNewUrl: (url: UrlData) => void;
}

const UrlTable = forwardRef<UrlTableRef>((props, ref) => {
  const [data, setData] = useState<UrlData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedUrls, setSelectedUrls] = useState<Set<number>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    per_page: 10,
    total: 0,
    total_pages: 0
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [processingUrls, setProcessingUrls] = useState<Set<number>>(new Set());
  const [analysisProgress, setAnalysisProgress] = useState<Map<number, number>>(new Map());
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastUpdateRef = useRef<number>(0);

  const loadUrls = useCallback(async (page?: number, limit?: number, forceRefresh = false) => {
    try {
      if (forceRefresh || data.length === 0) {
        setLoading(true);
      }
      setError(null);
      
      const params = {
        page: page || currentPage,
        limit: limit || pagination.per_page,
        ...(searchTerm && { search: searchTerm })
      };

      const response = await fetchUrls(params);
      const newData = response.data;
      
      // Check for newly completed analyses
      const previousData = data;
      newData.forEach(newUrl => {
        const previousUrl = previousData.find(prev => prev.id === newUrl.id);
        if (previousUrl && 
            (previousUrl.status === 'running' || previousUrl.status === 'queued') && 
            (newUrl.status === 'completed' || newUrl.status === 'error')) {
          // Analysis just completed - show notification
          console.log(`Analysis completed for: ${newUrl.url}`);
        }
      });
      
      setData(newData);
      
      setPagination(prev => ({
        page: response.pagination.page,
        per_page: limit || prev.per_page,
        total: response.pagination.total,
        total_pages: Math.ceil(response.pagination.total / response.pagination.limit)
      }));
      
      // Update processing state and analysis progress
      setProcessingUrls(prev => {
        const newProcessing = new Set(prev);
        const newProgress = new Map(analysisProgress);
        
        newData.forEach(url => {
          if (url.status === 'running') {
            newProcessing.add(url.id);
            // Simulate progress for running analyses
            const currentProgress = newProgress.get(url.id) || 0;
            if (currentProgress < 90) {
              newProgress.set(url.id, Math.min(90, currentProgress + Math.random() * 15));
            }
          } else if (url.status === 'queued') {
            newProcessing.add(url.id);
            newProgress.set(url.id, 5);
          } else if (url.status === 'completed' || url.status === 'error') {
            newProcessing.delete(url.id);
            newProgress.delete(url.id);
          }
        });
        
        setAnalysisProgress(newProgress);
        return newProcessing;
      });
      
      lastUpdateRef.current = Date.now();
      
    } catch (err) {
      console.error('Error loading URLs:', err);
      setError('Failed to load URLs');
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchTerm, pagination.per_page, data, analysisProgress]);

  // Enhanced polling with dynamic intervals
  useEffect(() => {
    const hasActiveAnalysis = data.some(url => url.status === 'running' || url.status === 'queued');
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    if (hasActiveAnalysis) {
      // Faster polling during active analysis
      const pollInterval = 1500; // 1.5 seconds for active analysis
      intervalRef.current = setInterval(() => {
        loadUrls(currentPage, pagination.per_page, false);
      }, pollInterval);
    } else {
      // Slower polling for general updates
      const pollInterval = 10000; // 10 seconds for general updates
      intervalRef.current = setInterval(() => {
        loadUrls(currentPage, pagination.per_page, false);
      }, pollInterval);
    }
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [data, loadUrls, currentPage, pagination.per_page]);

  // Add method to handle new URL additions
  const addNewUrl = useCallback((newUrl: UrlData) => {
    setData(prevData => {
      // Add the new URL to the beginning of the list
      const updatedData = [newUrl, ...prevData.slice(0, pagination.per_page - 1)];
      return updatedData;
    });
    
    // Set it as processing
    setProcessingUrls(prev => new Set([...Array.from(prev), newUrl.id]));
    setAnalysisProgress(prev => new Map([...Array.from(prev), [newUrl.id, 5]]));
    
    // Force immediate refresh
    setTimeout(() => {
      loadUrls(currentPage, pagination.per_page, true);
    }, 500);
  }, [pagination.per_page, currentPage, loadUrls]);

  useImperativeHandle(ref, () => ({
    refresh: () => loadUrls(currentPage, pagination.per_page, true),
    addNewUrl: addNewUrl
  }));

  useEffect(() => {
    loadUrls();
  }, [loadUrls]);

  const perPageRef = useRef(pagination.per_page);
  useEffect(() => {
    if (perPageRef.current !== pagination.per_page) {
      perPageRef.current = pagination.per_page;
      setCurrentPage(1);
      loadUrls(1, pagination.per_page, true);
    }
  }, [pagination.per_page, loadUrls]);

  const handleReanalyze = async (id: number) => {
    try {
      setProcessingUrls(prev => new Set([...Array.from(prev), id]));
      setAnalysisProgress(prev => new Map([...Array.from(prev), [id, 5]]));
      
      await reanalyzeUrl(id);
      
      // Immediate refresh to show the updated status
      setTimeout(() => {
        loadUrls(currentPage, pagination.per_page, true);
      }, 200);
      
    } catch (err) {
      console.error('Error reanalyzing URL:', err);
      setProcessingUrls(prev => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
      setAnalysisProgress(prev => {
        const newMap = new Map(prev);
        newMap.delete(id);
        return newMap;
      });
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this URL?')) {
      return;
    }

    try {
      await deleteUrl(id);
      loadUrls(currentPage, pagination.per_page, true);
    } catch (err) {
      console.error('Error deleting URL:', err);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedUrls.size === 0) return;
    
    if (!window.confirm(`Are you sure you want to delete ${selectedUrls.size} URL(s)?`)) {
      return;
    }

    try {
      const urlsArray = Array.from(selectedUrls);
      await bulkDeleteUrls(urlsArray);
      setSelectedUrls(new Set());
      loadUrls(currentPage, pagination.per_page, true);
    } catch (err) {
      console.error('Error deleting URLs:', err);
    }
  };

  const handleBulkReanalyze = async () => {
    if (selectedUrls.size === 0) return;
    
    try {
      // Mark all selected URLs as processing
      setProcessingUrls(prev => new Set([...Array.from(prev), ...Array.from(selectedUrls)]));
      const newProgress = new Map(analysisProgress);
      Array.from(selectedUrls).forEach(id => newProgress.set(id, 5));
      setAnalysisProgress(newProgress);
      
      // Start reanalysis for each URL
      const promises = Array.from(selectedUrls).map(id => reanalyzeUrl(id));
      await Promise.all(promises);
      
      setSelectedUrls(new Set());
      
      // Immediate refresh
      setTimeout(() => {
        loadUrls(currentPage, pagination.per_page, true);
      }, 200);
      
    } catch (err) {
      console.error('Error reanalyzing URLs:', err);
    }
  };

  const toggleSelectAll = () => {
    if (selectedUrls.size === data.length) {
      setSelectedUrls(new Set());
    } else {
      setSelectedUrls(new Set(data.map(url => url.id)));
    }
  };

  const toggleSelectUrl = (id: number) => {
    const newSelected = new Set(selectedUrls);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedUrls(newSelected);
  };

  const getStatusDisplay = (status: string, urlId: number) => {
    const isProcessing = processingUrls.has(urlId);
    const progress = analysisProgress.get(urlId) || 0;
    
    if (isProcessing || status === 'running') {
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div className="spinner" style={{
            width: '16px',
            height: '16px',
            border: '2px solid #e5e7eb',
            borderTop: '2px solid #3b82f6',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }}></div>
          <span style={{ color: '#3b82f6' }}>
            {status === 'running' ? `Analyzing... ${Math.round(progress)}%` : 'Processing...'}
          </span>
        </div>
      );
    }
    
    if (status === 'queued') {
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '16px',
            height: '16px',
            border: '2px solid #f59e0b',
            borderRadius: '50%',
            animation: 'pulse 2s ease-in-out infinite'
          }}></div>
          <span style={{ color: '#f59e0b' }}>Queued</span>
        </div>
      );
    }
    
    switch (status) {
      case 'completed':
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: '#10b981', fontSize: '16px' }}>✓</span>
            <span style={{ color: '#10b981' }}>Completed</span>
          </div>
        );
      case 'error':
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: '#ef4444', fontSize: '16px' }}>✗</span>
            <span style={{ color: '#ef4444' }}>Error</span>
          </div>
        );
      default:
        return <span style={{ color: '#6b7280' }}>Unknown</span>;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    // If it's today, show relative time
    if (diffDays === 1) {
      const diffHours = Math.ceil(diffTime / (1000 * 60 * 60));
      if (diffHours < 1) {
        const diffMinutes = Math.ceil(diffTime / (1000 * 60));
        return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} ago`;
      } else if (diffHours < 24) {
        return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
      }
    }
    
    // For other dates, show friendly format
    const options: Intl.DateTimeFormatOptions = {
      month: 'short',
      day: 'numeric', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    };
    
    return date.toLocaleDateString('en-US', options);
  };

  const getWebsiteName = (url: string) => {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.replace('www.', '');
    } catch (error) {
      // Fallback for malformed URLs
      const match = url.match(/^(?:https?:\/\/)?(?:www\.)?([^/]+)/);
      const hostname = match ? match[1] : 'Unknown';
      return hostname.length > 30 ? hostname.substring(0, 30) + '...' : hostname;
    }
  };

  const truncateUrl = (url: string, maxLength: number = 80) => {
    if (url.length <= maxLength) return url;
    return url.substring(0, maxLength) + '...';
  };

  const getTitleDisplay = (title: string | null, url: string) => {
    if (!title || title === 'No title') {
      // Extract a readable title from URL
      try {
        const urlObj = new URL(url);
        const path = urlObj.pathname;
        if (path && path !== '/') {
          const pathParts = path.split('/').filter(part => part);
          if (pathParts.length > 0) {
            return pathParts[pathParts.length - 1].replace(/[-_]/g, ' ');
          }
        }
        return urlObj.hostname.replace('www.', '');
      } catch {
        return 'No title';
      }
    }
    return title.length > 60 ? title.substring(0, 60) + '...' : title;
  };

  if (loading && data.length === 0) {
    return <div>Loading URLs...</div>;
  }

  return (
    <div className="url-table-container">
      <div className="table-header">
        <h2>URL Analysis Results ({data.length} {data.length === 1 ? 'result' : 'results'})</h2>
        
        {error && (
          <div className="error-message">
            Error: {error}
          </div>
        )}
        
        <div className="table-controls">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search URLs..."
            className="search-input"
          />
          
          <select
            value={pagination.per_page}
            onChange={(e) => setPagination(prev => ({ ...prev, per_page: parseInt(e.target.value) }))}
            className="per-page-select"
          >
            <option value={10}>10 per page</option>
            <option value={25}>25 per page</option>
            <option value={50}>50 per page</option>
            <option value={100}>100 per page</option>
          </select>
        </div>
        
        {selectedUrls.size > 0 && (
          <div className="bulk-actions">
            <button 
              onClick={handleBulkDelete} 
              className="bulk-delete-btn"
              disabled={processingUrls.size > 0}
            >
              Delete Selected ({selectedUrls.size})
            </button>
            <button 
              onClick={handleBulkReanalyze} 
              className="bulk-reanalyze-btn"
              disabled={processingUrls.size > 0}
            >
              Reanalyze Selected ({selectedUrls.size})
            </button>
          </div>
        )}
      </div>

      <div className="table-wrapper">
        <table className="url-table">
          <thead>
            <tr>
              <th className="checkbox-header">
                <input
                  type="checkbox"
                  checked={selectedUrls.size === data.length && data.length > 0}
                  onChange={toggleSelectAll}
                />
              </th>
              <th className="title-header">📄 Title</th>
              <th className="status-header">📊 Status</th>
              <th className="links-header">🔗 Links Analysis</th>
              <th className="date-header">📅 Created</th>
              <th className="actions-header">⚙️ Actions</th>
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
                  No URLs found. Add a URL above to get started.
                </td>
              </tr>
            ) : (
              data.map((url) => {
                try {
                  return (
                    <tr key={url.id}>
                      <td className="checkbox-cell">
                        <input
                          type="checkbox"
                          checked={selectedUrls.has(url.id)}
                          onChange={() => toggleSelectUrl(url.id)}
                        />
                      </td>
                      <td className="title-cell">
                        <a 
                          href={url.url} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="title-link"
                          title={url.title || url.url}
                        >
                          <div className="title-content">
                            <div className="title-text">{getTitleDisplay(url.title, url.url)}</div>
                            <div className="website-name">{getWebsiteName(url.url)}</div>
                          </div>
                        </a>
                      </td>
                      <td className="status-cell">
                        {getStatusDisplay(url.status, url.id)}
                      </td>
                      <td className="links-cell">
                        <div className="links-stats">
                          <span className="internal-links">
                            <span className="label">Internal:</span>
                            <span className="count">{url.internal_links || 0}</span>
                          </span>
                          <span className="external-links">
                            <span className="label">External:</span>
                            <span className="count">{url.external_links || 0}</span>
                          </span>
                          {url.broken_links > 0 && (
                            <span className="broken-links">
                              <span className="label">Broken:</span>
                              <span className="count">{url.broken_links || 0}</span>
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="date-cell">{formatDate(url.created_at)}</td>
                      <td className="actions-cell">
                        <Link to={`/url/${url.id}`} className="view-details-btn">
                          📊 Details
                        </Link>
                        <button
                          onClick={() => handleReanalyze(url.id)}
                          className="reanalyze-btn"
                          title="Reanalyze this URL"
                          disabled={processingUrls.has(url.id) || url.status === 'running'}
                        >
                          🔄 Reanalyze
                        </button>
                        <button
                          onClick={() => handleDelete(url.id)}
                          className="delete-btn"
                          title="Delete this URL"
                          disabled={processingUrls.has(url.id)}
                        >
                          🗑️ Delete
                        </button>
                      </td>
                    </tr>
                  );
                } catch (error) {
                  console.error('Error rendering URL row:', error);
                  return (
                    <tr key={url.id}>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '10px', color: '#ef4444' }}>
                        Error displaying URL data
                      </td>
                    </tr>
                  );
                }
              })
            )}
          </tbody>
        </table>
      </div>

      {pagination.total_pages > 1 && (
        <div className="pagination">
          <button
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="pagination-btn"
          >
            Previous
          </button>
          <span className="pagination-info">
            Page {currentPage} of {pagination.total_pages} ({pagination.total} total URLs)
          </span>
          <button
            onClick={() => setCurrentPage(Math.min(pagination.total_pages, currentPage + 1))}
            disabled={currentPage === pagination.total_pages}
            className="pagination-btn"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
});

export default UrlTable;
