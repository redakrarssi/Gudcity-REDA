/**
 * Browser-compatible polyfill for Node.js 'http' module
 * This provides stub implementations of commonly used http functions
 */

import { EventEmitter } from 'events';

// Define types for HTTP objects
interface HttpRequest extends EventEmitter {
  end: () => HttpRequest;
  write: (data?: any) => boolean;
  headers: Record<string, string>;
  method?: string;
  url?: string;
}

interface HttpResponse extends EventEmitter {
  statusCode: number;
  headers: Record<string, string>;
  setHeader: (name: string, value: string) => void;
  writeHead: (statusCode: number, headers?: Record<string, string>) => void;
  end: (data?: any) => void;
  write: (data?: any) => boolean;
}

// Basic server implementation
class Server extends EventEmitter {
  constructor(requestListener?: (req: HttpRequest, res: HttpResponse) => void) {
    super();
    if (requestListener) {
      this.on('request', requestListener);
    }
  }

  listen(port: number, hostname?: string, callback?: () => void) {
    console.log(`HTTP Server polyfill: Server listening on port ${port}`);
    if (callback) {
      callback();
    }
    return this;
  }

  close(callback?: () => void) {
    console.log('HTTP Server polyfill: Server closed');
    if (callback) {
      callback();
    }
    return this;
  }
}

// Create HTTP server
export function createServer(
  requestListener?: (req: HttpRequest, res: HttpResponse) => void
): Server {
  return new Server(requestListener);
}

// Create a request object
function createRequest(): HttpRequest {
  const req = new EventEmitter() as HttpRequest;
  req.headers = {};
  req.end = () => {
    console.log('HTTP polyfill: request ended');
    return req;
  };
  req.write = () => {
    console.log('HTTP polyfill: request write called');
    return true;
  };
  return req;
}

// Create a response object
function createResponse(): HttpResponse {
  const res = new EventEmitter() as HttpResponse;
  res.statusCode = 200;
  res.headers = {};
  res.setHeader = (name, value) => {
    res.headers[name] = value;
  };
  res.writeHead = (statusCode, headers) => {
    res.statusCode = statusCode;
    if (headers) {
      res.headers = { ...res.headers, ...headers };
    }
  };
  res.write = () => {
    console.log('HTTP polyfill: response write called');
    return true;
  };
  res.end = (data) => {
    console.log('HTTP polyfill: response ended', data);
    res.emit('finish');
  };
  return res;
}

// Basic request function
export function request(
  url: string | object,
  options?: object,
  callback?: (res: HttpResponse) => void
): HttpRequest {
  console.log('HTTP polyfill: request called', url);
  
  if (typeof url === 'function') {
    callback = url as any;
    url = {};
    options = {};
  }
  
  if (typeof options === 'function') {
    callback = options as any;
    options = {};
  }
  
  const req = createRequest();
  
  // Simulate response
  setTimeout(() => {
    if (callback) {
      const res = createResponse();
      callback(res);
      
      res.emit('data', Buffer.from('{}'));
      res.emit('end');
    }
  }, 0);
  
  return req;
}

// Basic get function
export function get(
  url: string | object,
  options?: object,
  callback?: (res: HttpResponse) => void
): HttpRequest {
  return request(url, options, callback);
}

// Export the module
export default {
  createServer,
  request,
  get,
  Server,
  // Common status codes
  STATUS_CODES: {
    200: 'OK',
    201: 'Created',
    204: 'No Content',
    400: 'Bad Request',
    401: 'Unauthorized',
    403: 'Forbidden',
    404: 'Not Found',
    500: 'Internal Server Error'
  }
}; 