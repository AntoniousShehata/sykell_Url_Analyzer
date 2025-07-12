import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import AuthForm from '../AuthForm';
import * as api from '../../api/api';

// Mock the API
jest.mock('../../api/api', () => ({
  login: jest.fn(),
  register: jest.fn(),
}));

const mockLogin = api.login as jest.MockedFunction<typeof api.login>;
const mockRegister = api.register as jest.MockedFunction<typeof api.register>;

describe('AuthForm', () => {
  const mockOnAuthSuccess = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders login form by default', () => {
    render(<AuthForm onAuthSuccess={mockOnAuthSuccess} />);
    
    expect(screen.getByText('Login')).toBeInTheDocument();
    expect(screen.getByLabelText('Username:')).toBeInTheDocument();
    expect(screen.getByLabelText('Password:')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Login' })).toBeInTheDocument();
    expect(screen.getByText('Need an account? Register')).toBeInTheDocument();
  });

  test('switches to register form when clicking toggle', () => {
    render(<AuthForm onAuthSuccess={mockOnAuthSuccess} />);
    
    const toggleButton = screen.getByText('Need an account? Register');
    fireEvent.click(toggleButton);
    
    expect(screen.getByText('Register')).toBeInTheDocument();
    expect(screen.getByLabelText('Username:')).toBeInTheDocument();
    expect(screen.getByLabelText('Email:')).toBeInTheDocument();
    expect(screen.getByLabelText('Password:')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Register' })).toBeInTheDocument();
    expect(screen.getByText('Already have an account? Login')).toBeInTheDocument();
  });

  test('successfully logs in user', async () => {
    const mockAuthResponse = {
      token: 'fake-token',
      user: {
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
      },
    };

    mockLogin.mockResolvedValueOnce(mockAuthResponse);

    render(<AuthForm onAuthSuccess={mockOnAuthSuccess} />);
    
    const usernameInput = screen.getByLabelText('Username:');
    const passwordInput = screen.getByLabelText('Password:');
    const loginButton = screen.getByRole('button', { name: 'Login' });
    
    fireEvent.change(usernameInput, { target: { value: 'testuser' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(loginButton);
    
    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith({
        username: 'testuser',
        password: 'password123',
      });
      expect(mockOnAuthSuccess).toHaveBeenCalled();
    });
  });

  test('successfully registers user', async () => {
    const mockAuthResponse = {
      token: 'fake-token',
      user: {
        id: 1,
        username: 'newuser',
        email: 'new@example.com',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
      },
    };

    mockRegister.mockResolvedValueOnce(mockAuthResponse);

    render(<AuthForm onAuthSuccess={mockOnAuthSuccess} />);
    
    // Switch to register form
    const toggleButton = screen.getByText('Need an account? Register');
    fireEvent.click(toggleButton);
    
    const usernameInput = screen.getByLabelText('Username:');
    const emailInput = screen.getByLabelText('Email:');
    const passwordInput = screen.getByLabelText('Password:');
    const registerButton = screen.getByRole('button', { name: 'Register' });
    
    fireEvent.change(usernameInput, { target: { value: 'newuser' } });
    fireEvent.change(emailInput, { target: { value: 'new@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(registerButton);
    
    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalledWith({
        username: 'newuser',
        email: 'new@example.com',
        password: 'password123',
      });
      expect(mockOnAuthSuccess).toHaveBeenCalled();
    });
  });

  test('shows validation error for short username on register', async () => {
    render(<AuthForm onAuthSuccess={mockOnAuthSuccess} />);
    
    // Switch to register form
    const toggleButton = screen.getByText('Need an account? Register');
    fireEvent.click(toggleButton);
    
    const usernameInput = screen.getByLabelText('Username:');
    const emailInput = screen.getByLabelText('Email:');
    const passwordInput = screen.getByLabelText('Password:');
    const registerButton = screen.getByRole('button', { name: 'Register' });
    
    fireEvent.change(usernameInput, { target: { value: 'ab' } }); // Too short
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(registerButton);
    
    await waitFor(() => {
      expect(screen.getByText('Username must be at least 3 characters long')).toBeInTheDocument();
    });
  });

  test('shows validation error for short password on register', async () => {
    render(<AuthForm onAuthSuccess={mockOnAuthSuccess} />);
    
    // Switch to register form
    const toggleButton = screen.getByText('Need an account? Register');
    fireEvent.click(toggleButton);
    
    const usernameInput = screen.getByLabelText('Username:');
    const emailInput = screen.getByLabelText('Email:');
    const passwordInput = screen.getByLabelText('Password:');
    const registerButton = screen.getByRole('button', { name: 'Register' });
    
    fireEvent.change(usernameInput, { target: { value: 'testuser' } });
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: '123' } }); // Too short
    fireEvent.click(registerButton);
    
    await waitFor(() => {
      expect(screen.getByText('Password must be at least 6 characters long')).toBeInTheDocument();
    });
  });

  test('shows validation error for invalid email on register', async () => {
    render(<AuthForm onAuthSuccess={mockOnAuthSuccess} />);
    
    // Switch to register form
    const toggleButton = screen.getByText('Need an account? Register');
    fireEvent.click(toggleButton);
    
    const usernameInput = screen.getByLabelText('Username:');
    const emailInput = screen.getByLabelText('Email:');
    const passwordInput = screen.getByLabelText('Password:');
    const registerButton = screen.getByRole('button', { name: 'Register' });
    
    fireEvent.change(usernameInput, { target: { value: 'testuser' } });
    fireEvent.change(emailInput, { target: { value: 'invalid-email' } }); // Invalid email
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(registerButton);
    
    await waitFor(() => {
      expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument();
    });
  });

  test('shows error when login fails', async () => {
    mockLogin.mockRejectedValueOnce(new Error('Invalid credentials'));

    render(<AuthForm onAuthSuccess={mockOnAuthSuccess} />);
    
    const usernameInput = screen.getByLabelText('Username:');
    const passwordInput = screen.getByLabelText('Password:');
    const loginButton = screen.getByRole('button', { name: 'Login' });
    
    fireEvent.change(usernameInput, { target: { value: 'testuser' } });
    fireEvent.change(passwordInput, { target: { value: 'wrongpassword' } });
    fireEvent.click(loginButton);
    
    await waitFor(() => {
      expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
    });
  });

  test('shows loading state during authentication', async () => {
    mockLogin.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

    render(<AuthForm onAuthSuccess={mockOnAuthSuccess} />);
    
    const usernameInput = screen.getByLabelText('Username:');
    const passwordInput = screen.getByLabelText('Password:');
    const loginButton = screen.getByRole('button', { name: 'Login' });
    
    fireEvent.change(usernameInput, { target: { value: 'testuser' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(loginButton);
    
    // Check loading state
    expect(screen.getByText('Processing...')).toBeInTheDocument();
    expect(loginButton).toBeDisabled();
  });
}); 