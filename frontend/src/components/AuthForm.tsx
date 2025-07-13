import React, { useState } from 'react';
import { login, register, LoginRequest, RegisterRequest } from '../api/api';

interface AuthFormProps {
  onAuthSuccess: () => void;
}

const AuthForm: React.FC<AuthFormProps> = ({ onAuthSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    if (!isLogin) {
      if (formData.username.length < 3) {
        setError('Username must be at least 3 characters long');
        setIsLoading(false);
        return;
      }
      if (formData.password.length < 6) {
        setError('Password must be at least 6 characters long');
        setIsLoading(false);
        return;
      }
      if (!formData.email.includes('@')) {
        setError('Please enter a valid email address');
        setIsLoading(false);
        return;
      }
    }

    try {
      if (isLogin) {
        const loginData: LoginRequest = {
          username: formData.username,
          password: formData.password,
        };
        await login(loginData);
      } else {
        const registerData: RegisterRequest = {
          username: formData.username,
          email: formData.email,
          password: formData.password,
        };
        await register(registerData);
      }
      onAuthSuccess();
    } catch (error: any) {
      setError(error.message || 'Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="futuristic-auth-container">
      <div className="auth-background">
        <div className="auth-image-section">
          <div className="futuristic-overlay">
            <div className="floating-elements">
              <div className="floating-circle circle-1"></div>
              <div className="floating-circle circle-2"></div>
              <div className="floating-circle circle-3"></div>
            </div>
            <div className="welcome-content">
              <h1 className="futuristic-title">URL Analysis Tool</h1>
              <p className="futuristic-subtitle">Advanced Web Intelligence Platform</p>
            </div>
          </div>
        </div>
        
        <div className="auth-form-section">
          <div className="auth-form-modern">
            <div className="auth-header">
              <h2 className="auth-title">{isLogin ? 'Welcome Back' : 'Join Us'}</h2>
              <p className="auth-description">
                {isLogin ? 'Sign in to your account' : 'Create your account'}
              </p>
            </div>
            
            <form onSubmit={handleSubmit} className="modern-form">
              <div className="form-group-modern">
                <label className="modern-label">
                  <span className="label-text">Username</span>
                  <div className="input-wrapper">
                    <input
                      type="text"
                      name="username"
                      value={formData.username}
                      onChange={handleInputChange}
                      required
                      minLength={3}
                      maxLength={50}
                      placeholder="Enter your username"
                      className="modern-input"
                    />
                    <div className="input-border"></div>
                  </div>
                </label>
              </div>

              {!isLogin && (
                <div className="form-group-modern">
                  <label className="modern-label">
                    <span className="label-text">Email</span>
                    <div className="input-wrapper">
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        required
                        placeholder="Enter your email"
                        className="modern-input"
                      />
                      <div className="input-border"></div>
                    </div>
                  </label>
                </div>
              )}

              <div className="form-group-modern">
                <label className="modern-label">
                  <span className="label-text">Password</span>
                  <div className="input-wrapper">
                    <input
                      type="password"
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      required
                      minLength={6}
                      placeholder="Enter your password"
                      className="modern-input"
                    />
                    <div className="input-border"></div>
                  </div>
                </label>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="futuristic-submit-btn"
              >
                <span className="btn-text">
                  {isLoading ? 'Processing...' : (isLogin ? 'Sign In' : 'Create Account')}
                </span>
                <div className="btn-glow"></div>
              </button>
            </form>

            {error && (
              <div className="error-message-modern">
                <span className="error-icon">⚠️</span>
                <span className="error-text">{error}</span>
              </div>
            )}

            <div className="auth-toggle-modern">
              <button
                type="button"
                onClick={() => setIsLogin(!isLogin)}
                className="toggle-btn-modern"
              >
                {isLogin ? 'Need an account? Sign up' : 'Already have an account? Sign in'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthForm; 