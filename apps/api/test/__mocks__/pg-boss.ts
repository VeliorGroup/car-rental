const mockPgBoss = {
  PgBoss: jest.fn().mockImplementation(() => ({
    start: jest.fn().mockResolvedValue(undefined),
    stop: jest.fn().mockResolvedValue(undefined),
    send: jest.fn().mockResolvedValue('mock-job-id'),
    work: jest.fn().mockResolvedValue(undefined),
    complete: jest.fn().mockResolvedValue(undefined),
    fail: jest.fn().mockResolvedValue(undefined),
    on: jest.fn(),
    off: jest.fn(),
  })),
};

export = mockPgBoss;
