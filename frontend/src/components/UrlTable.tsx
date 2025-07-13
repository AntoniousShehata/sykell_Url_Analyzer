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
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

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
      setData(response.data);
      
      setPagination(prev => ({
        page: response.pagination.page,
        per_page: limit || prev.per_page,
        total: response.pagination.total,
        total_pages: Math.ceil(response.pagination.total / response.pagination.limit)
      }));
      
      // Clear processing state for completed URLs
      setProcessingUrls(prev => {
        const newProcessing = new Set(prev);
        response.data.forEach(url => {
          if (url.status === 'completed' || url.status === 'error') {
            newProcessing.delete(url.id);
          }
        });
        return newProcessing;
      });
      
    } catch (err) {
      console.error('Error loading URLs:', err);
      setError('Failed to load URLs');
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchTerm, pagination.per_page, data.length]);

  // Set up polling for real-time updates
  useEffect(() => {
    const hasRunningUrls = data.some(url => url.status === 'running' || url.status === 'queued');
    
    if (hasRunningUrls) {
      intervalRef.current = setInterval(() => {
        loadUrls(currentPage, pagination.per_page, false);
      }, 3000); // Poll every 3 seconds
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [data, loadUrls, currentPage, pagination.per_page]);

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

  const refreshFromFirstPage = useCallback(async () => {
    setCurrentPage(1);
    await loadUrls(1, pagination.per_page, true);
    setSelectedUrls(new Set());
  }, [loadUrls, pagination.per_page]);

  useImperativeHandle(ref, () => ({
    refresh: refreshFromFirstPage
  }));

  const handleDelete = useCallback(async (id: number) => {
    try {
      setError(null);
      setProcessingUrls(prev => new Set(prev).add(id));
      
      await deleteUrl(id);
      
      // Immediate UI update - remove the deleted item
      setData(prev => prev.filter(url => url.id !== id));
      setPagination(prev => ({
        ...prev,
        total: prev.total - 1
      }));
      
      setSelectedUrls(prev => {
        const newSelected = new Set(prev);
        newSelected.delete(id);
        return newSelected;
      });
      
      // Refresh to get accurate data
      setTimeout(() => {
        refreshFromFirstPage();
      }, 500);
      
    } catch (err) {
      console.error('Error deleting URL:', err);
      setError('Failed to delete URL');
    } finally {
      setProcessingUrls(prev => {
        const newProcessing = new Set(prev);
        newProcessing.delete(id);
        return newProcessing;
      });
    }
  }, [refreshFromFirstPage]);

  const handleReanalyze = useCallback(async (id: number) => {
    try {
      setError(null);
      setProcessingUrls(prev => new Set(prev).add(id));
      
      await reanalyzeUrl(id);
      
      // Immediate UI update - set status to queued
      setData(prev => prev.map(url => 
        url.id === id ? { ...url, status: 'queued' as const } : url
      ));
      
      // Refresh to get updated data
      setTimeout(() => {
        loadUrls(currentPage, pagination.per_page, false);
      }, 1000);
      
    } catch (err) {
      console.error('Error reanalyzing URL:', err);
      setError('Failed to reanalyze URL');
    } finally {
      setTimeout(() => {
        setProcessingUrls(prev => {
          const newProcessing = new Set(prev);
          newProcessing.delete(id);
          return newProcessing;
        });
      }, 1000);
    }
  }, [currentPage, pagination.per_page, loadUrls]);

  const handleBulkDelete = async () => {
    if (selectedUrls.size === 0) return;

    try {
      setError(null);
      const idsToDelete = Array.from(selectedUrls);
      
      // Set processing state for all selected URLs
      setProcessingUrls(prev => {
        const newProcessing = new Set(prev);
        idsToDelete.forEach(id => newProcessing.add(id));
        return newProcessing;
      });
      
      await bulkDeleteUrls(idsToDelete);
      
      // Immediate UI update - remove deleted items
      setData(prev => prev.filter(url => !selectedUrls.has(url.id)));
      setPagination(prev => ({
        ...prev,
        total: prev.total - selectedUrls.size
      }));
      
      setSelectedUrls(new Set());
      
      // Refresh to get accurate data
      setTimeout(() => {
        refreshFromFirstPage();
      }, 500);
      
    } catch (err) {
      console.error('Error bulk deleting URLs:', err);
      setError('Failed to delete URLs');
    } finally {
      setProcessingUrls(new Set());
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
    
    if (isProcessing) {
      return <span style={{ color: '#3b82f6' }}>Processing...</span>;
    }
    
    switch (status) {
      case 'queued':
        return <span style={{ color: '#f59e0b' }}>Queued</span>;
      case 'running':
        return <span style={{ color: '#3b82f6' }}>Running...</span>;
      case 'completed':
        return <span style={{ color: '#10b981' }}>Completed</span>;
      case 'error':
        return <span style={{ color: '#ef4444' }}>Error</span>;
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
                  // Handle rendering errors for problematic URLs
                  console.error('Error rendering URL:', url.id, error);
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
                        <div className="title-content">
                          <div className="title-text">Error loading URL</div>
                          <div className="website-name">Problem with URL data</div>
                        </div>
                      </td>
                      <td className="status-cell">
                        <span style={{ color: '#ef4444' }}>Error</span>
                      </td>
                      <td className="links-cell">
                        <div className="links-stats">
                          <span>Unable to display</span>
                        </div>
                      </td>
                      <td className="date-cell">-</td>
                      <td className="actions-cell">
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
                }
              })
            )}
          </tbody>
        </table>
      </div>

      {pagination.total_pages > 1 && (
        <div className="pagination">
          <button
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
          >
            Previous
          </button>
          <span>
            Page {currentPage} of {pagination.total_pages}
          </span>
          <button
            onClick={() => setCurrentPage(prev => Math.min(pagination.total_pages, prev + 1))}
            disabled={currentPage === pagination.total_pages}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
});

export default UrlTable;
