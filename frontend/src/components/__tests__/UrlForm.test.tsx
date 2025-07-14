import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import UrlForm from '../UrlForm';
import * as api from '../../api/api';

// Mock the api module
jest.mock('../../api/api');
const mockApi = api as jest.Mocked<typeof api>;

describe('UrlForm', () => {
  const mockOnUrlAdded = jest.fn();
  const mockUrlData: api.UrlData = {
    id: 1,
    user_id: 1,
    url: 'https://example.com',
    html_version: 'HTML5',
    title: 'Example Site',
    h1_count: 1,
    h2_count: 2,
    h3_count: 3,
    internal_links: 10,
    external_links: 5,
    broken_links: 0,
    has_login_form: false,
    status: 'completed',
    error_message: undefined,
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z'
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders URL form correctly', () => {
    render(<UrlForm onUrlAdded={mockOnUrlAdded} />);
    
    expect(screen.getByText('Add New URL for Analysis')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter URL (e.g., https://example.com)')).toBeInTheDocument();
    expect(screen.getByText('Analyze URL')).toBeInTheDocument();
  });

  it('shows error when submitting empty URL', async () => {
    render(<UrlForm onUrlAdded={mockOnUrlAdded} />);
    
    const submitButton = screen.getByText('Analyze URL');
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('Please enter a URL')).toBeInTheDocument();
    });
  });

  it('shows error when submitting invalid URL', async () => {
    render(<UrlForm onUrlAdded={mockOnUrlAdded} />);
    
    const urlInput = screen.getByPlaceholderText('Enter URL (e.g., https://example.com)');
    const submitButton = screen.getByText('Analyze URL');
    
    fireEvent.change(urlInput, { target: { value: 'invalid-url' } });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('Please enter a valid URL')).toBeInTheDocument();
    });
  });

  it('successfully submits valid URL', async () => {
    mockApi.addUrl.mockResolvedValue(mockUrlData);
    
    render(<UrlForm onUrlAdded={mockOnUrlAdded} />);
    
    const urlInput = screen.getByPlaceholderText('Enter URL (e.g., https://example.com)');
    const submitButton = screen.getByText('Analyze URL');
    
    fireEvent.change(urlInput, { target: { value: 'https://example.com' } });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(mockApi.addUrl).toHaveBeenCalledWith('https://example.com');
      expect(mockOnUrlAdded).toHaveBeenCalledWith(mockUrlData);
      expect(screen.getByText('URL added successfully! Analysis started...')).toBeInTheDocument();
    });
  });

  it('shows loading state during submission', async () => {
    // Mock addUrl to return a promise that doesn't resolve immediately
    let resolveAddUrl: (value: api.UrlData) => void;
    const addUrlPromise = new Promise<api.UrlData>((resolve) => {
      resolveAddUrl = resolve;
    });
    mockApi.addUrl.mockReturnValue(addUrlPromise);

    render(<UrlForm onUrlAdded={mockOnUrlAdded} />);
    
    const urlInput = screen.getByPlaceholderText('Enter URL (e.g., https://example.com)');
    const submitButton = screen.getByText('Analyze URL');
    
    fireEvent.change(urlInput, { target: { value: 'https://example.com' } });
    fireEvent.click(submitButton);

    // Check loading state
    expect(screen.getByText('Adding...')).toBeInTheDocument();
    expect(submitButton).toBeDisabled();

    // Resolve the promise
    resolveAddUrl!(mockUrlData);
  });

  it('shows network error when API call fails', async () => {
    mockApi.addUrl.mockRejectedValue(new Error('Network error'));

    render(<UrlForm onUrlAdded={mockOnUrlAdded} />);
    
    const urlInput = screen.getByPlaceholderText('Enter URL (e.g., https://example.com)');
    const submitButton = screen.getByText('Analyze URL');
    
    fireEvent.change(urlInput, { target: { value: 'https://example.com' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });
  });

  it('shows specific error for duplicate URL', async () => {
    mockApi.addUrl.mockRejectedValue(new Error('URL already exists'));

    render(<UrlForm onUrlAdded={mockOnUrlAdded} />);
    
    const urlInput = screen.getByPlaceholderText('Enter URL (e.g., https://example.com)');
    const submitButton = screen.getByText('Analyze URL');
    
    fireEvent.change(urlInput, { target: { value: 'https://example.com' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('This URL has already been analyzed')).toBeInTheDocument();
    });
  });

  it('auto-prefixes URLs with https', async () => {
    mockApi.addUrl.mockResolvedValue(mockUrlData);

    render(<UrlForm onUrlAdded={mockOnUrlAdded} />);
    
    const urlInput = screen.getByPlaceholderText('Enter URL (e.g., https://example.com)');
    const submitButton = screen.getByText('Analyze URL');
    
    fireEvent.change(urlInput, { target: { value: 'example.com' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockApi.addUrl).toHaveBeenCalledWith('https://example.com');
    });
  });

  it('clears form after successful submission', async () => {
    mockApi.addUrl.mockResolvedValue(mockUrlData);

    render(<UrlForm onUrlAdded={mockOnUrlAdded} />);
    
    const urlInput = screen.getByPlaceholderText('Enter URL (e.g., https://example.com)');
    const submitButton = screen.getByText('Analyze URL');
    
    fireEvent.change(urlInput, { target: { value: 'https://example.com' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(urlInput).toHaveValue('');
    });
  });
}); 