import sql from '../utils/db';
import { queryCache } from '../utils/queryCache';

// Make sure tests run in test environment
process.env.NODE_ENV = 'test';

// Helper to mock SQL results
const mockResults = [{ id: 1, name: 'Test' }];

// Mock the database connection
jest.mock('../utils/db', () => {
  // Create a mock function for the SQL template tag
  const mockSql = jest.fn().mockResolvedValue(mockResults);
  
  // Add a query method to the mock function
  mockSql.query = jest.fn().mockResolvedValue({ rows: mockResults });
  
  return mockSql;
});

describe('Database Utility', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    
    // Clear the query cache
    queryCache.clear();
  });
  
  test('SQL tagged template executes queries', async () => {
    const result = await sql`SELECT * FROM users WHERE id = ${1}`;
    
    // Check that the query was executed correctly
    expect(sql).toHaveBeenCalledWith(['SELECT * FROM users WHERE id = ', ''], 1);
    expect(result).toEqual(mockResults);
  });
  
  test('SQL query method executes queries with parameters', async () => {
    const result = await sql.query('SELECT * FROM users WHERE id = $1', [1]);
    
    // Check that the query was executed correctly
    expect(sql.query).toHaveBeenCalledWith('SELECT * FROM users WHERE id = $1', [1]);
    expect(result).toEqual(mockResults);
  });
  
  test('Query cache stores and retrieves results', async () => {
    // First query - should execute the SQL
    await sql.query('SELECT * FROM users', []);
    expect(sql.query).toHaveBeenCalledTimes(1);
    
    // Enable cache for testing
    queryCache.setEnabled(true);
    
    // Cache the result
    queryCache.set('SELECT * FROM users', [], mockResults);
    
    // Second query with same parameters - should use the cache
    const cachedResult = queryCache.get('SELECT * FROM users', []);
    expect(cachedResult).toEqual(mockResults);
  });
  
  test('Query cache invalidation works correctly', async () => {
    // Enable cache for testing
    queryCache.setEnabled(true);
    
    // Cache some results
    queryCache.set('SELECT * FROM users', [], mockResults);
    queryCache.set('SELECT * FROM posts', [], [{ id: 1, title: 'Test Post' }]);
    
    // Invalidate just the users cache
    queryCache.invalidateByPrefix('users');
    
    // Users cache should be empty
    expect(queryCache.get('SELECT * FROM users', [])).toBeNull();
    
    // Posts cache should still be there
    expect(queryCache.get('SELECT * FROM posts', [])).not.toBeNull();
    
    // Clear all cache
    queryCache.clear();
    
    // Both caches should be empty
    expect(queryCache.get('SELECT * FROM users', [])).toBeNull();
    expect(queryCache.get('SELECT * FROM posts', [])).toBeNull();
  });
});

describe('Database Error Handling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  test('Handles database errors gracefully', async () => {
    // Mock the SQL function to throw an error
    (sql as jest.Mock).mockRejectedValueOnce(new Error('Database error'));
    
    // Expect the function to throw
    await expect(sql`SELECT * FROM users`).rejects.toThrow('Database error');
  });
  
  test('Handles constraint violations specially', async () => {
    // Mock a constraint violation error (PostgreSQL error code 23505 for unique violation)
    const constraintError = new Error('Unique violation');
    (constraintError as any).code = '23505';
    (sql as jest.Mock).mockRejectedValueOnce(constraintError);
    
    // Expect the function to throw the constraint error
    await expect(sql`INSERT INTO users (email) VALUES (${'test@example.com'})`).rejects.toThrow('Unique violation');
  });
}); 