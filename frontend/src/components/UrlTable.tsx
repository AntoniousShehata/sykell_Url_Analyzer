import React, { useState, useEffect, useCallback, forwardRef, useImperativeHandle, useRef } from 'react';
import { Link } from 'react-router-dom';
import { fetchUrls, deleteUrl, reanalyzeUrl, bulkDeleteUrls, bulkReanalyzeUrls, UrlData } from '../api/api';

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

  const loadUrls = useCallback(async (page?: number, limit?: number) => {
    try {
      setLoading(true);
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
        per_page: prev.per_page,
        total: response.pagination.total,
        total_pages: Math.ceil(response.pagination.total / response.pagination.limit)
      }));
    } catch (err) {
      console.error('Error loading URLs:', err);
      setError('Failed to load URLs');
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchTerm]);

  useEffect(() => {
    loadUrls();
  }, [loadUrls]);

  const perPageRef = useRef(pagination.per_page);
  useEffect(() => {
    if (perPageRef.current !== pagination.per_page) {
      perPageRef.current = pagination.per_page;
      setCurrentPage(1);
      loadUrls(1, pagination.per_page);
    }
  }, [pagination.per_page, loadUrls]);

  const refreshFromFirstPage = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setCurrentPage(1);
      
      const params = {
        page: 1,
        limit: pagination.per_page,
        ...(searchTerm && { search: searchTerm })
      };

      const response = await fetchUrls(params);
      setData([...response.data]);
      
      const newPagination = {
        page: response.pagination.page,
        per_page: response.pagination.limit,
        total: response.pagination.total,
        total_pages: Math.ceil(response.pagination.total / response.pagination.limit)
      };
      
      setPagination(newPagination);
    } catch (err) {
      console.error('Error during refresh:', err);
      setError('Failed to load URLs');
    } finally {
      setLoading(false);
    }
  }, [pagination.per_page, searchTerm]);

  useImperativeHandle(ref, () => ({
    refresh: () => {
      setData([]);
      setCurrentPage(1);
      setSelectedUrls(new Set());
      setLoading(true);
      setError(null);
      
      setTimeout(() => {
        refreshFromFirstPage();
      }, 100);
    }
  }));

  const handleDelete = useCallback(async (id: number) => {
    try {
      setError(null);
      await deleteUrl(id);
      refreshFromFirstPage();
    } catch (err) {
      console.error('Error deleting URL:', err);
      setError('Failed to delete URL');
    }
  }, [refreshFromFirstPage]);

  const handleReanalyze = useCallback(async (id: number) => {
    try {
      setError(null);
      await reanalyzeUrl(id);
      
      setTimeout(() => {
        refreshFromFirstPage();
      }, 5000);
      
    } catch (err) {
      console.error('Error reanalyzing URL:', err);
      setError('Failed to reanalyze URL');
    }
  }, [refreshFromFirstPage]);

  const handleBulkDelete = async () => {
    if (selectedUrls.size === 0) return;

    try {
      setError(null);
      await bulkDeleteUrls(Array.from(selectedUrls));
      setSelectedUrls(new Set());
      refreshFromFirstPage();
    } catch (err) {
      console.error('Error bulk deleting URLs:', err);
      setError('Failed to delete URLs');
    }
  };

  const handleBulkReanalyze = async () => {
    if (selectedUrls.size === 0) return;

    try {
      setError(null);
      await bulkReanalyzeUrls(Array.from(selectedUrls));
      setSelectedUrls(new Set());
      
      setTimeout(() => {
        refreshFromFirstPage();
      }, 5000);
      
    } catch (err) {
      console.error('Error bulk reanalyzing URLs:', err);
      setError('Failed to reanalyze URLs');
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

  const getStatusDisplay = (status: string) => {
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
    return new Date(dateString).toLocaleString();
  };

  if (loading && data.length === 0) {
    return <div>Loading URLs...</div>;
  }

  return (
    <div className="url-table-container">
      <div className="table-header">
        <h2>URL Analysis Results ({pagination.total} total)</h2>
        
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
            <button onClick={handleBulkDelete} className="bulk-delete-btn">
              Delete Selected ({selectedUrls.size})
            </button>
            <button onClick={handleBulkReanalyze} className="bulk-reanalyze-btn">
              Reanalyze Selected ({selectedUrls.size})
            </button>
          </div>
        )}
      </div>

      <div className="table-wrapper">
        <table className="url-table">
          <thead>
            <tr>
              <th>
                <input
                  type="checkbox"
                  checked={selectedUrls.size === data.length && data.length > 0}
                  onChange={toggleSelectAll}
                />
              </th>
              <th>URL</th>
              <th>Title</th>
              <th>Status</th>
              <th>Links</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {data.map((url) => (
              <tr key={url.id}>
                <td>
                  <input
                    type="checkbox"
                    checked={selectedUrls.has(url.id)}
                    onChange={() => toggleSelectUrl(url.id)}
                  />
                </td>
                <td>
                  <a href={url.url} target="_blank" rel="noopener noreferrer">
                    {url.url}
                  </a>
                </td>
                <td>
                  <Link to={`/url/${url.id}`} className="url-title-link">
                    {url.title || 'No title'}
                  </Link>
                </td>
                <td>{getStatusDisplay(url.status)}</td>
                <td>
                  <span>Internal: {url.internal_links}</span>
                  <span>External: {url.external_links}</span>
                </td>
                <td>{formatDate(url.created_at)}</td>
                <td>
                  <button
                    onClick={() => handleReanalyze(url.id)}
                    className="reanalyze-btn"
                  >
                    Reanalyze
                  </button>
                  <button
                    onClick={() => handleDelete(url.id)}
                    className="delete-btn"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
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
