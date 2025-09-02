/**
 * Browser-compatible Express polyfill
 * This provides a minimal implementation of Express for browser environments
 */

// Basic types
export interface Request {
  method: string;
  url: string;
  path: string;
  query: Record<string, any>;
  params: Record<string, any>;
  body: any;
  headers: Record<string, string>;
  ip?: string;
  socket?: {
    remoteAddress?: string;
  };
  originalUrl?: string;
  connection?: {
    remoteAddress?: string;
  };
}

export interface Response {
  statusCode: number;
  headers: Record<string, string>;
  status(code: number): Response;
  send(body: any): Response;
  json(body: any): Response;
  setHeader(name: string, value: string | number | readonly string[]): Response;
  end(data?: any): Response;
  cookie(name: string, value: string, options?: any): Response;
  clearCookie(name: string, options?: any): Response;
  redirect(url: string): Response;
  redirect(status: number, url: string): Response;
}

export interface NextFunction {
  (err?: any): void;
}

export interface Router {
  get(path: string, ...handlers: Function[]): Router;
  post(path: string, ...handlers: Function[]): Router;
  put(path: string, ...handlers: Function[]): Router;
  delete(path: string, ...handlers: Function[]): Router;
  patch(path: string, ...handlers: Function[]): Router;
  use(path: string | Function, ...handlers: Function[]): Router;
  route(path: string): Router;
}

export interface Express {
  request: Request;
  response: Response;
  Router(): Router;
  use(path: string | Function, ...handlers: Function[]): Express;
  get(path: string, ...handlers: Function[]): Express;
  post(path: string, ...handlers: Function[]): Express;
  put(path: string, ...handlers: Function[]): Express;
  delete(path: string, ...handlers: Function[]): Express;
  patch(path: string, ...handlers: Function[]): Express;
  listen(port: number, callback?: Function): any;
  json(): Function;
  urlencoded(options?: { extended?: boolean }): Function;
  static(path: string): Function;
}

// Create a router class implementation
class RouterImpl implements Router {
  get(path: string, ...handlers: Function[]): Router {
    console.log(`Router.get called with path ${path}`);
    return this;
  }
  
  post(path: string, ...handlers: Function[]): Router {
    console.log(`Router.post called with path ${path}`);
    return this;
  }
  
  put(path: string, ...handlers: Function[]): Router {
    console.log(`Router.put called with path ${path}`);
    return this;
  }
  
  delete(path: string, ...handlers: Function[]): Router {
    console.log(`Router.delete called with path ${path}`);
    return this;
  }
  
  patch(path: string, ...handlers: Function[]): Router {
    console.log(`Router.patch called with path ${path}`);
    return this;
  }
  
  use(path: string | Function, ...handlers: Function[]): Router {
    console.log(`Router.use called with path ${typeof path === 'string' ? path : '[Function]'}`);
    return this;
  }
  
  route(path: string): Router {
    console.log(`Router.route called with path ${path}`);
    return this;
  }
}

// Create Express polyfill
function createExpressPolyfill(): Express & Function {
  // Create a router factory
  const createRouter = (): Router => {
    return new RouterImpl();
  };

  // Create a response object
  const createResponse = (): Response => {
    return {
      statusCode: 200,
      headers: {},
      status(code) {
        this.statusCode = code;
        return this;
      },
      send(body) {
        console.log('Express polyfill: Response.send called with', body);
        return this;
      },
      json(body) {
        console.log('Express polyfill: Response.json called with', body);
        return this;
      },
      setHeader(name, value) {
        if (Array.isArray(value)) {
          this.headers[name] = value.join(', ');
        } else {
          this.headers[name] = String(value);
        }
        return this;
      },
      end(data) {
        console.log('Express polyfill: Response.end called with', data);
        return this;
      },
      cookie(name, value) {
        console.log(`Express polyfill: Setting cookie ${name}=${value}`);
        return this;
      },
      clearCookie(name) {
        console.log(`Express polyfill: Clearing cookie ${name}`);
        return this;
      },
      redirect(status, url?) {
        if (url === undefined) {
          url = status as unknown as string;
          status = 302;
        }
        console.log(`Express polyfill: Redirecting to ${url} with status ${status}`);
        return this;
      }
    };
  };

  // Create a request object
  const createRequest = (): Request => {
    return {
      method: 'GET',
      url: '/',
      path: '/',
      query: {},
      params: {},
      body: {},
      headers: {},
      ip: '127.0.0.1',
      socket: {
        remoteAddress: '127.0.0.1'
      },
      originalUrl: '/'
    };
  };

  // Create the app
  const router = createRouter();
  const app = function(req: Request | undefined, res: Response | undefined, next: NextFunction | undefined) {
    // Handle undefined parameters
    if (!req) {
      req = createRequest();
    }
    if (!res) {
      res = createResponse();
    }
    if (!next) {
      next = () => {};
    }
    
    try {
      console.log('Express polyfill: App called with request', req.url || '/');
      next();
    } catch (error) {
      console.error('Express polyfill: Error in app function', error);
    }
  } as unknown as Express & Function;

  // Add properties and methods
  app.request = createRequest();
  app.response = createResponse();
  app.Router = createRouter;
  app.use = function(path: string | Function, ...handlers: Function[]): Express {
    console.log(`Express polyfill: app.use called with ${typeof path === 'string' ? path : 'middleware function'}`);
    return app;
  };
  app.get = () => app;
  app.post = () => app;
  app.put = () => app;
  app.delete = () => app;
  app.patch = () => app;
  app.listen = (port, callback) => {
    console.log(`Express polyfill: Server listening on port ${port}`);
    if (callback) callback();
    return { close: () => {} };
  };
  app.json = () => (req: Request, res: Response, next: NextFunction) => {
    console.log('Express polyfill: json middleware called');
    next();
  };
  app.urlencoded = () => (req: Request, res: Response, next: NextFunction) => {
    console.log('Express polyfill: urlencoded middleware called');
    next();
  };
  app.static = () => (req: Request, res: Response, next: NextFunction) => {
    console.log('Express polyfill: static middleware called');
    next();
  };

  return app;
}

// Create the express instance
const express = createExpressPolyfill();

// Add static methods
express.json = () => (req: Request, res: Response, next: NextFunction) => {
  console.log('Express polyfill: json middleware called');
  next();
};

express.urlencoded = (options = { extended: false }) => (req: Request, res: Response, next: NextFunction) => {
  console.log('Express polyfill: urlencoded middleware called with options', options);
  next();
};

express.static = (path: string) => (req: Request, res: Response, next: NextFunction) => {
  console.log(`Express polyfill: static middleware called for path ${path}`);
  next();
};

// Export the Router implementation as the Router export
const Router = express.Router;

// Export all the necessary components
export { express, Router };
export default express; 