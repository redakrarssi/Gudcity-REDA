/**
 * Utilities for batching multiple database queries to reduce connection overhead
 */

import sql from '../utils/db'; // Correct import for database service

interface BatchQueryItem<T> {
  id: string;
  query: string;
  params?: any[];
  transform?: (result: any) => T;
}

interface BatchQueryResult<T> {
  id: string;
  data: T;
  error?: Error;
}

/**
 * Executes multiple SQL queries in a single database connection
 * to reduce connection overhead.
 * 
 * @param queries Array of query objects with unique IDs
 * @returns Object with query results mapped by ID
 */
export async function batchDatabaseQueries<T = any>(
  queries: BatchQueryItem<T>[]
): Promise<Record<string, BatchQueryResult<T>>> {
  if (queries.length === 0) {
    return {};
  }

  // Create a batch query that combines multiple queries
  const batchQueryString = queries
    .map(q => {
      // Add query identifier as a comment for debugging
      return `-- Query: ${q.id}\n${q.query};`;
    })
    .join('\n\n');
  
  // Execute the batch query
  try {
    // Use tagged template literal for executing batch query
    const results = await sql`${batchQueryString}`;
    
    // Map results back to their original query IDs
    const resultMap: Record<string, BatchQueryResult<T>> = {};
    
    // Results should be an array of result sets, one for each query
    if (Array.isArray(results) && results.length === queries.length) {
      queries.forEach((query, index) => {
        const rawResult = results[index];
        const data = query.transform ? query.transform(rawResult) : rawResult;
        
        resultMap[query.id] = {
          id: query.id,
          data: data as T,
        };
      });
    } else {
      // Handle unexpected result format
      throw new Error('Batch query returned unexpected result format');
    }
    
    return resultMap;
  } catch (error) {
    // If batch query fails, fall back to individual queries
    console.error('Batch query failed, falling back to individual queries:', error);
    
    const resultMap: Record<string, BatchQueryResult<T>> = {};
    
    // Execute queries individually
    await Promise.all(
      queries.map(async (query) => {
        try {
          // Use tagged template literals instead of sql.query
          let result;
          if (query.params && query.params.length > 0) {
            // Create a dynamic template literal with parameters
            // This is a simplification - ideally we'd parse the query for placeholders
            // and replace them with actual values
            const queryText = query.query;
            // Use a function to create a dynamic template literal with parameters
            result = await executeDynamicQuery(queryText, query.params);
          } else {
            // If no parameters, use simple tagged template
            result = await sql`${query.query}`;
          }
          
          const data = query.transform ? query.transform(result) : result;
          
          resultMap[query.id] = {
            id: query.id,
            data: data as T,
          };
        } catch (err) {
          resultMap[query.id] = {
            id: query.id,
            data: null as unknown as T,
            error: err instanceof Error ? err : new Error(String(err)),
          };
        }
      })
    );
    
    return resultMap;
  }
}

/**
 * Helper function to execute a SQL query with parameters using tagged template literals
 */
async function executeDynamicQuery(queryText: string, params: any[]): Promise<any> {
  // Replace $1, $2, etc. with actual parameters
  const parts = queryText.split(/\$\d+/);
  if (parts.length === 1) {
    // No parameters to replace
    return sql`${queryText}`;
  }
  
  // Build a tagged template by joining query parts with parameters
  let result;
  if (parts.length === 2) {
    // One parameter
    result = sql`${parts[0]}${params[0]}${parts[1]}`;
  } else if (parts.length === 3) {
    // Two parameters
    result = sql`${parts[0]}${params[0]}${parts[1]}${params[1]}${parts[2]}`;
  } else if (parts.length === 4) {
    // Three parameters
    result = sql`${parts[0]}${params[0]}${parts[1]}${params[1]}${parts[2]}${params[2]}${parts[3]}`;
  } else {
    // More than three parameters - fallback to a more complex approach
    let finalQuery = parts[0];
    for (let i = 1; i < parts.length; i++) {
      finalQuery += `${params[i-1]}${parts[i]}`;
    }
    result = sql`${finalQuery}`;
  }
  
  return result;
}

/**
 * Groups multiple related queries for the same entity type
 * to be executed in a single batch.
 * 
 * @param entityIds Array of entity IDs to fetch
 * @param queryBuilder Function that builds a query for a single entity
 * @param idField Field name in the result that contains the entity ID
 * @returns Map of entity ID to entity data
 */
export async function batchEntityQueries<T>(
  entityIds: (string | number)[],
  queryBuilder: (id: string | number) => string,
  idField: string = 'id'
): Promise<Map<string | number, T>> {
  if (entityIds.length === 0) {
    return new Map();
  }
  
  // Deduplicate IDs
  const uniqueIds = [...new Set(entityIds)];
  
  // For small batches (3 or fewer), use individual queries
  if (uniqueIds.length <= 3) {
    const results = await Promise.all(
      uniqueIds.map(async (id) => {
        const query = queryBuilder(id);
        // Use tagged template literal instead of sql.query
        const result = await sql`${query}`;
        return { id, result };
      })
    );
    
    const entityMap = new Map<string | number, T>();
    results.forEach(({ id, result }) => {
      if (result) {
        entityMap.set(id, result as T);
      }
    });
    
    return entityMap;
  }
  
  // For larger batches, use a single query with IN clause using createQuery
  // Break the ID list into parts with commas between them
  const idList = uniqueIds.join(',');
  const queryParts = [
    `SELECT * FROM entities WHERE ${idField} IN (`,
    `)` // Close the IN clause
  ];
  
  // Use the sql.createQuery helper
  const results = await sql.createQuery(queryParts, [idList]);
  
  // Map results by entity ID
  const entityMap = new Map<string | number, T>();
  if (Array.isArray(results)) {
    results.forEach((result: any) => {
      const id = result[idField];
      if (id) {
        entityMap.set(id, result as T);
      }
    });
  }
  
  return entityMap;
} 