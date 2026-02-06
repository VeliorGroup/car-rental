declare global {
  namespace Express {
    interface User {
      id: string;
      tenantId: string;
      email: string;
      role: string;
      firstName?: string;
      lastName?: string;
    }
    
    interface Request {
      tenantId?: string;
      user?: User;
    }
  }
}

export {};

