// Type declarations for modules without type definitions

declare module 'passport-jwt' {
  import { Strategy as PassportStrategy } from 'passport';
  
  export interface StrategyOptions {
    jwtFromRequest: JwtFromRequestFunction;
    secretOrKey?: string | Buffer;
    secretOrKeyProvider?: SecretOrKeyProvider;
    issuer?: string;
    audience?: string | string[];
    algorithms?: string[];
    ignoreExpiration?: boolean;
    passReqToCallback?: boolean;
    jsonWebTokenOptions?: object;
  }

  export interface VerifiedCallback {
    (error: any, user?: any, info?: any): void;
  }

  export interface JwtFromRequestFunction {
    (req: any): string | null;
  }

  export interface SecretOrKeyProvider {
    (req: any, rawJwtToken: string, done: (err: any, secretOrKey?: string | Buffer) => void): void;
  }

  export class Strategy extends PassportStrategy {
    constructor(options: StrategyOptions, verify: (payload: any, done: VerifiedCallback) => void);
    constructor(options: StrategyOptions, verify: (req: any, payload: any, done: VerifiedCallback) => void);
  }

  export const ExtractJwt: {
    fromHeader(header_name: string): JwtFromRequestFunction;
    fromBodyField(field_name: string): JwtFromRequestFunction;
    fromUrlQueryParameter(param_name: string): JwtFromRequestFunction;
    fromAuthHeaderWithScheme(auth_scheme: string): JwtFromRequestFunction;
    fromAuthHeaderAsBearerToken(): JwtFromRequestFunction;
    fromExtractors(extractors: JwtFromRequestFunction[]): JwtFromRequestFunction;
  };
}

declare module 'pg' {
  export interface PoolConfig {
    connectionString?: string;
    host?: string;
    port?: number;
    database?: string;
    user?: string;
    password?: string;
    ssl?: boolean | object;
    max?: number;
    min?: number;
    idleTimeoutMillis?: number;
    connectionTimeoutMillis?: number;
    application_name?: string;
  }

  export interface QueryResult<T = any> {
    rows: T[];
    fields: FieldDef[];
    command: string;
    rowCount: number | null;
  }

  export interface FieldDef {
    name: string;
    tableID: number;
    columnID: number;
    dataTypeID: number;
    dataTypeSize: number;
    dataTypeModifier: number;
    format: string;
  }

  export interface PoolClient {
    query<T = any>(queryText: string, values?: any[]): Promise<QueryResult<T>>;
    release(err?: Error | boolean): void;
  }

  export class Pool {
    constructor(config?: PoolConfig);
    connect(): Promise<PoolClient>;
    end(): Promise<void>;
    query<T = any>(queryText: string, values?: any[]): Promise<QueryResult<T>>;
    on(event: 'error', listener: (err: Error, client: PoolClient) => void): this;
    on(event: 'connect', listener: (client: PoolClient) => void): this;
    on(event: 'acquire', listener: (client: PoolClient) => void): this;
    on(event: 'remove', listener: (client: PoolClient) => void): this;
  }

  export class Client {
    constructor(config?: PoolConfig);
    connect(): Promise<void>;
    end(): Promise<void>;
    query<T = any>(queryText: string, values?: any[]): Promise<QueryResult<T>>;
  }
}
