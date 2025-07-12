import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import UrlForm from '../UrlForm';
import * as api from '../../api/api';

// Mock the API
jest.mock('../../api/api', () => ({
  addUrl: jest.fn(),
}));

const mockAddUrl = api.addUrl as jest.MockedFunction<typeof api.addUrl>;

describe('UrlForm', () => {
  const mockOnUrlAdded = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders form with input and submit button', () => {
    render(<UrlForm onUrlAdded={mockOnUrlAdded} />);
    
    expect(screen.getByText('Add New URL for Analysis')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter URL (e.g., https://example.com)')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Analyze URL' })).toBeInTheDocument();
  });

  test('shows error when submitting empty URL', async () => {
    render(<UrlForm onUrlAdded={mockOnUrlAdded} />);
    
    const submitButton = screen.getByRole('button', { name: 'Analyze URL' });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('Please enter a URL')).toBeInTheDocument();
    });
  });

  test('shows error when submitting invalid URL', async () => {
    render(<UrlForm onUrlAdded={mockOnUrlAdded} />);
    
    const urlInput = screen.getByPlaceholderText('Enter URL (e.g., https://example.com)');
    const submitButton = screen.getByRole('button', { name: 'Analyze URL' });
    
    fireEvent.change(urlInput, { target: { value: 'invalid-url' } });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('Please enter a valid URL')).toBeInTheDocument();
    });
  });

  test('successfully submits valid URL', async () => {
    const mockUrlData = {
      id: 1,
      user_id: 1,
      url: 'https://example.com',
      html_version: 'HTML5',
      title: 'Example Site',
      h1_count: 1,
      h2_count: 2,
      h3_count: 3,
      internal_links: 5,
      external_links: 10,
      broken_links: 0,
      has_login_form: false,
      status: 'queued' as const,
      created_at: '2023-01-01T00:00:00Z',
      updated_at: '2023-01-01T00:00:00Z',
    };

    mockAddUrl.mockResolvedValueOnce(mockUrlData);

    render(<UrlForm onUrlAdded={mockOnUrlAdded} />);
    
    const urlInput = screen.getByPlaceholderText('Enter URL (e.g., https://example.com)');
    const submitButton = screen.getByRole('button', { name: 'Analyze URL' });
    
    fireEvent.change(urlInput, { target: { value: 'https://example.com' } });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(mockAddUrl).toHaveBeenCalledWith('https://example.com');
      expect(mockOnUrlAdded).toHaveBeenCalledWith(mockUrlData);
      expect(screen.getByText('URL submitted successfully! Analysis in progress...')).toBeInTheDocument();
    });
    
    // Check that the form is cleared
    expect(urlInput).toHaveValue('');
  });

  test('shows loading state during submission', async () => {
    mockAddUrl.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

    render(<UrlForm onUrlAdded={mockOnUrlAdded} />);
    
    const urlInput = screen.getByPlaceholderText('Enter URL (e.g., https://example.com)');
    const submitButton = screen.getByRole('button', { name: 'Analyze URL' });
    
    fireEvent.change(urlInput, { target: { value: 'https://example.com' } });
    fireEvent.click(submitButton);
    
    // Check loading state
    expect(screen.getByText('Analyzing...')).toBeInTheDocument();
    expect(submitButton).toBeDisabled();
  });

  test('shows error when API call fails', async () => {
    mockAddUrl.mockRejectedValueOnce(new Error('Network error'));

    render(<UrlForm onUrlAdded={mockOnUrlAdded} />);
    
    const urlInput = screen.getByPlaceholderText('Enter URL (e.g., https://example.com)');
    const submitButton = screen.getByRole('button', { name: 'Analyze URL' });
    
    fireEvent.change(urlInput, { target: { value: 'https://example.com' } });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });
  });
}); 