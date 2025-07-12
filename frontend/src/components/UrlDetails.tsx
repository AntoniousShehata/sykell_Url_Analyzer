import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { getUrlById, UrlWithBrokenLinks } from '../api/api';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

const UrlDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [urlData, setUrlData] = useState<UrlWithBrokenLinks | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUrlDetails = async () => {
      if (!id) return;
      
      try {
        setLoading(true);
        setError(null);
        const data = await getUrlById(parseInt(id));
        setUrlData(data);
      } catch (err: any) {
        console.error('Error fetching URL details:', err);
        setError(err.message || 'Failed to fetch URL details');
      } finally {
        setLoading(false);
      }
    };

    fetchUrlDetails();
  }, [id]);

  if (loading) {
    return <div className="url-details-loading">Loading URL details...</div>;
  }

  if (error) {
    return (
      <div className="url-details-error">
        <h2>Error Loading URL Details</h2>
        <p>{error}</p>
        <button onClick={() => navigate('/')} className="back-btn">
          Back to Dashboard
        </button>
      </div>
    );
  }

  if (!urlData) {
    return (
      <div className="url-details-not-found">
        <h2>URL Not Found</h2>
        <button onClick={() => navigate('/')} className="back-btn">
          Back to Dashboard
        </button>
      </div>
    );
  }

  const linkData = [
    { name: 'Internal Links', value: urlData.internal_links },
    { name: 'External Links', value: urlData.external_links },
  ];

  const headingData = [
    { level: 'H1', count: urlData.h1_count },
    { level: 'H2', count: urlData.h2_count },
    { level: 'H3', count: urlData.h3_count },
  ];

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return '#10b981';
      case 'running': return '#3b82f6';
      case 'queued': return '#f59e0b';
      case 'error': return '#ef4444';
      default: return '#6b7280';
    }
  };

  return (
    <div className="url-details">
      <div className="url-details-header">
        <button onClick={() => navigate('/')} className="back-btn">
          ← Back to Dashboard
        </button>
        <h1>URL Analysis Details</h1>
      </div>

      <div className="url-details-content">
        <div className="url-info-card">
          <h2>Basic Information</h2>
          <div className="url-info-grid">
            <div className="info-item">
              <label>URL:</label>
              <a href={urlData.url} target="_blank" rel="noopener noreferrer">
                {urlData.url}
              </a>
            </div>
            <div className="info-item">
              <label>Title:</label>
              <span>{urlData.title || 'No title'}</span>
            </div>
            <div className="info-item">
              <label>HTML Version:</label>
              <span>{urlData.html_version}</span>
            </div>
            <div className="info-item">
              <label>Status:</label>
              <span style={{ color: getStatusColor(urlData.status) }}>
                {urlData.status.toUpperCase()}
              </span>
            </div>
            <div className="info-item">
              <label>Has Login Form:</label>
              <span>{urlData.has_login_form ? 'Yes' : 'No'}</span>
            </div>
            <div className="info-item">
              <label>Created:</label>
              <span>{formatDate(urlData.created_at)}</span>
            </div>
            <div className="info-item">
              <label>Updated:</label>
              <span>{formatDate(urlData.updated_at)}</span>
            </div>
          </div>
        </div>

        <div className="charts-section">
          <div className="chart-container">
            <h3>Link Distribution</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={linkData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {linkData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="chart-container">
            <h3>Heading Distribution</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={headingData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="level" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="count" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {urlData.broken_links_details && urlData.broken_links_details.length > 0 && (
          <div className="broken-links-section">
            <h3>Broken Links ({urlData.broken_links_details.length})</h3>
            <div className="broken-links-table">
              <table>
                <thead>
                  <tr>
                    <th>URL</th>
                    <th>Status Code</th>
                    <th>Error Message</th>
                    <th>Checked At</th>
                  </tr>
                </thead>
                <tbody>
                  {urlData.broken_links_details.map((link, index) => (
                    <tr key={index}>
                      <td>
                        <a href={link.link_url} target="_blank" rel="noopener noreferrer">
                          {link.link_url}
                        </a>
                      </td>
                      <td>
                        {link.status_code ? (
                          <span className="status-code error">
                            {link.status_code}
                          </span>
                        ) : (
                          <span className="status-code unknown">N/A</span>
                        )}
                      </td>
                      <td>{link.error_message || 'N/A'}</td>
                      <td>{formatDate(link.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {urlData.error_message && (
          <div className="error-section">
            <h3>Error Details</h3>
            <div className="error-message">
              {urlData.error_message}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UrlDetails; 