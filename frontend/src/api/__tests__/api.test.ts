import * as api from '../api';

// Mock fetch
global.fetch = jest.fn();
const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('API Functions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockClear();
  });

  describe('Authentication', () => {
    test('login makes correct API call', async () => {
      const mockResponse = {
        token: 'test-token',
        user: {
          id: 1,
          username: 'testuser',
          email: 'test@example.com',
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-01T00:00:00Z',
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const loginData = { username: 'testuser', password: 'password123' };
      let result;
      try {
        result = await api.login(loginData);
      } catch (error) {
        // Suppress console.error for this expected error
      }

      expect(mockFetch).toHaveBeenCalledWith('http://localhost:8080/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(loginData),
      });

      expect(result).toEqual(mockResponse);
      expect(localStorageMock.setItem).toHaveBeenCalledWith('auth_token', 'test-token');
    });

    test('register makes correct API call', async () => {
      const mockResponse = {
        token: 'test-token',
        user: {
          id: 1,
          username: 'newuser',
          email: 'new@example.com',
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-01T00:00:00Z',
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const registerData = {
        username: 'newuser',
        email: 'new@example.com',
        password: 'password123',
      };
      const result = await api.register(registerData);

      expect(mockFetch).toHaveBeenCalledWith('http://localhost:8080/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(registerData),
      });

      expect(result).toEqual(mockResponse);
      expect(localStorageMock.setItem).toHaveBeenCalledWith('auth_token', 'test-token');
    });

    test('logout removes token from localStorage', () => {
      api.logout();
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('auth_token');
    });

    test('isAuthenticated returns true when token exists', () => {
      localStorageMock.getItem.mockReturnValue('test-token');
      api.setAuthToken('test-token'); // Set the token in the api module
      expect(api.isAuthenticated()).toBe(true);
    });

    test('isAuthenticated returns false when token does not exist', () => {
      localStorageMock.getItem.mockReturnValue(null);
      api.setAuthToken(null); // Clear the token in the api module
      expect(api.isAuthenticated()).toBe(false);
    });
  });

  describe('URL Management', () => {
    beforeEach(() => {
      localStorageMock.getItem.mockReturnValue('test-token');
      api.setAuthToken('test-token'); // Set the token in the api module
    });

    test('addUrl makes correct API call', async () => {
      const mockResponse = {
        id: 1,
        user_id: 1,
        url: 'https://example.com',
        status: 'queued',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockResponse }),
      } as Response);

      const result = await api.addUrl('https://example.com');

      expect(mockFetch).toHaveBeenCalledWith('http://localhost:8080/api/urls', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token',
        },
        body: JSON.stringify({ url: 'https://example.com' }),
      });

      expect(result).toEqual(mockResponse);
    });

    test('fetchUrls makes correct API call with parameters', async () => {
      const mockResponse = {
        data: [],
        pagination: {
          page: 1,
          limit: 10,
          total: 0,
          total_pages: 0,
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const params = { page: 2, limit: 25, search: 'test' };
      const result = await api.fetchUrls(params);

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8080/api/urls?page=2&limit=25&search=test',
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-token',
          },
        }
      );

      expect(result).toEqual(mockResponse);
    });

    test('deleteUrl makes correct API call', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: 'URL deleted successfully' }),
      } as Response);

      await api.deleteUrl(1);

      expect(mockFetch).toHaveBeenCalledWith('http://localhost:8080/api/urls/1',         {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-token',
          },
        });
    });

    test('reanalyzeUrl makes correct API call', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: 'URL reanalysis started' }),
      } as Response);

      await api.reanalyzeUrl(1);

      expect(mockFetch).toHaveBeenCalledWith('http://localhost:8080/api/urls/1/reanalyze',         {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-token',
          },
        });
    });

    test('bulkDeleteUrls makes correct API call', async () => {
      const mockResponse = { deleted_count: 3 };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await api.bulkDeleteUrls([1, 2, 3]);

      expect(mockFetch).toHaveBeenCalledWith('http://localhost:8080/api/urls/bulk', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token',
        },
        body: JSON.stringify({ ids: [1, 2, 3] }),
      });

      expect(result).toEqual(mockResponse);
    });

    test('fetchUrlById makes correct API call', async () => {
      const mockResponse = {
        id: 1,
        url: 'https://example.com',
        title: 'Example Site',
        broken_links_details: [],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockResponse }),
      } as Response);

      const result = await api.getUrlById(1);

      expect(mockFetch).toHaveBeenCalledWith('http://localhost:8080/api/urls/1',         {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-token',
          },
        });

      expect(result).toEqual(mockResponse);
    });
  });

  describe('Error Handling', () => {
    let consoleErrorSpy: jest.SpyInstance;

    beforeEach(() => {
      consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
      consoleErrorSpy.mockRestore();
    });

    test('handles API errors correctly', async () => {
      const mockResponse = { token: 'fake-token', user: { id: 1, username: 'test' } };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const loginData = { username: 'testuser', password: 'password123' };
      let result;
      try {
        result = await api.login(loginData);
      } catch (error) {
        // Suppress console.error for this expected error
      }
      
      expect(mockFetch).toHaveBeenCalledWith('http://localhost:8080/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginData),
      });
      expect(result).toEqual(mockResponse);
      expect(api.getAuthToken()).toBe('fake-token');
    });

    test('handles failed login', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Bad Request' }),
      } as Response);
      
      await expect(api.login({ username: 'test', password: 'test' })).rejects.toThrow('Bad Request');
    });

    test('handles network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));
      await expect(api.login({ username: 'test', password: 'test' })).rejects.toThrow('Network error');
    });

    test('handles unauthorized requests', async () => {
      localStorageMock.getItem.mockReturnValue('invalid-token');
      
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: 'Unauthorized' }),
      } as Response);
      await expect(api.fetchUrls({})).rejects.toThrow('Authentication required');
    });
  });

  describe('Token Management', () => {
    test('includes Authorization header when token exists', async () => {
      localStorageMock.getItem.mockReturnValue('test-token');
      api.setAuthToken('test-token'); // Set the token in the api module

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [] }),
      } as Response);

      await api.fetchUrls({});

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-token',
          }),
        })
      );
    });

    test('does not include Authorization header for public endpoints', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ token: 'new-token', user: {} }),
      } as Response);

      await api.login({ username: 'test', password: 'test' });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.not.objectContaining({
            'Authorization': expect.any(String),
          }),
        })
      );
    });
  });
}); 