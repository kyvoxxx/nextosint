process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'super-secret-test-key-32-chars-long';
process.env.ANTHROPIC_API_KEY = 'test-api-key';
process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/testdb';
process.env.ALLOWED_ORIGIN = 'http://localhost:3000';
process.env.REDIS_URL = 'redis://localhost:6379';
