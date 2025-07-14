import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import AuthForm from '../AuthForm';
import * as api from '../../api/api';

// Mock the api module
jest.mock('../../api/api');
const mockApi = api as jest.Mocked<typeof api>;

describe('AuthForm', () => {
  const mockOnAuthSuccess = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders login form by default', () => {
    render(<AuthForm onAuthSuccess={mockOnAuthSuccess} />);
    
    expect(screen.getByPlaceholderText('Enter your username')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter your password')).toBeInTheDocument();
    expect(screen.getByText('Sign In')).toBeInTheDocument();
    expect(screen.getByText('Need an account? Sign up')).toBeInTheDocument();
  });

  it('switches to register form when toggle button is clicked', () => {
    render(<AuthForm onAuthSuccess={mockOnAuthSuccess} />);
    
    const toggleButton = screen.getByText('Need an account? Sign up');
    fireEvent.click(toggleButton);
    
    expect(screen.getByPlaceholderText('Enter your email')).toBeInTheDocument();
    expect(screen.getByText('Create Account')).toBeInTheDocument();
    expect(screen.getByText('Already have an account? Sign in')).toBeInTheDocument();
  });

  it('submits login form with correct data', async () => {
    const mockResponse: api.AuthResponse = { 
      token: 'test-token', 
      user: { 
        id: 1, 
        username: 'testuser',
        email: 'test@example.com',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z'
      } 
    };
    mockApi.login.mockResolvedValue(mockResponse);

    render(<AuthForm onAuthSuccess={mockOnAuthSuccess} />);
    
    const usernameInput = screen.getByPlaceholderText('Enter your username');
    const passwordInput = screen.getByPlaceholderText('Enter your password');
    const submitButton = screen.getByText('Sign In');

    fireEvent.change(usernameInput, { target: { value: 'testuser' } });
    fireEvent.change(passwordInput, { target: { value: 'password' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockApi.login).toHaveBeenCalledWith({
        username: 'testuser',
        password: 'password'
      });
    });
  });

  it('submits register form with correct data', async () => {
    const mockResponse: api.AuthResponse = { 
      token: 'test-token', 
      user: { 
        id: 1, 
        username: 'testuser', 
        email: 'test@example.com',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z'
      } 
    };
    mockApi.register.mockResolvedValue(mockResponse);

    render(<AuthForm onAuthSuccess={mockOnAuthSuccess} />);
    
    // Switch to register form
    const toggleButton = screen.getByText('Need an account? Sign up');
    fireEvent.click(toggleButton);
    
    const usernameInput = screen.getByPlaceholderText('Enter your username');
    const emailInput = screen.getByPlaceholderText('Enter your email');
    const passwordInput = screen.getByPlaceholderText('Enter your password');
    const submitButton = screen.getByText('Create Account');

    fireEvent.change(usernameInput, { target: { value: 'testuser' } });
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockApi.register).toHaveBeenCalledWith({
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123'
      });
    });
  });

  it('shows validation error for short username on register', async () => {
    render(<AuthForm onAuthSuccess={mockOnAuthSuccess} />);
    
    // Switch to register form
    const toggleButton = screen.getByText('Need an account? Sign up');
    fireEvent.click(toggleButton);
    
    const usernameInput = screen.getByPlaceholderText('Enter your username');
    const emailInput = screen.getByPlaceholderText('Enter your email');
    const passwordInput = screen.getByPlaceholderText('Enter your password');
    const submitButton = screen.getByText('Create Account');

    fireEvent.change(usernameInput, { target: { value: 'ab' } });
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Username must be at least 3 characters long')).toBeInTheDocument();
    });
  });

  it('shows validation error for short password on register', async () => {
    render(<AuthForm onAuthSuccess={mockOnAuthSuccess} />);
    
    // Switch to register form
    const toggleButton = screen.getByText('Need an account? Sign up');
    fireEvent.click(toggleButton);
    
    const usernameInput = screen.getByPlaceholderText('Enter your username');
    const emailInput = screen.getByPlaceholderText('Enter your email');
    const passwordInput = screen.getByPlaceholderText('Enter your password');
    const submitButton = screen.getByText('Create Account');

    fireEvent.change(usernameInput, { target: { value: 'testuser' } });
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: '123' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Password must be at least 6 characters long')).toBeInTheDocument();
    });
  });

  it('shows validation error for invalid email on register', async () => {
    render(<AuthForm onAuthSuccess={mockOnAuthSuccess} />);
    
    // Switch to register form
    const toggleButton = screen.getByText('Need an account? Sign up');
    fireEvent.click(toggleButton);
    
    const usernameInput = screen.getByPlaceholderText('Enter your username');
    const emailInput = screen.getByPlaceholderText('Enter your email');
    const passwordInput = screen.getByPlaceholderText('Enter your password');
    const submitButton = screen.getByText('Create Account');

    fireEvent.change(usernameInput, { target: { value: 'testuser' } });
    fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument();
    });
  });

  it('shows error when login fails', async () => {
    mockApi.login.mockRejectedValue(new Error('Login failed'));

    render(<AuthForm onAuthSuccess={mockOnAuthSuccess} />);
    
    const usernameInput = screen.getByPlaceholderText('Enter your username');
    const passwordInput = screen.getByPlaceholderText('Enter your password');
    const submitButton = screen.getByText('Sign In');

    fireEvent.change(usernameInput, { target: { value: 'testuser' } });
    fireEvent.change(passwordInput, { target: { value: 'wrongpassword' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Login failed')).toBeInTheDocument();
    });
  });

  it('shows loading state during authentication', async () => {
    // Mock login to return a promise that doesn't resolve immediately
    let resolveLogin: (value: api.AuthResponse) => void;
    const loginPromise = new Promise<api.AuthResponse>((resolve) => {
      resolveLogin = resolve;
    });
    mockApi.login.mockReturnValue(loginPromise);

    render(<AuthForm onAuthSuccess={mockOnAuthSuccess} />);
    
    const usernameInput = screen.getByPlaceholderText('Enter your username');
    const passwordInput = screen.getByPlaceholderText('Enter your password');
    const submitButton = screen.getByRole('button', { name: 'Sign In' });

    fireEvent.change(usernameInput, { target: { value: 'testuser' } });
    fireEvent.change(passwordInput, { target: { value: 'password' } });
    fireEvent.click(submitButton);

    // Check loading state
    expect(screen.getByText('Processing...')).toBeInTheDocument();
    expect(submitButton).toBeDisabled();

    // Resolve the promise
    resolveLogin!({ 
      token: 'test-token', 
      user: { 
        id: 1, 
        username: 'testuser',
        email: 'test@example.com',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z'
      } 
    });
  });
}); 