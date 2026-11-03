const assert = require('node:assert/strict');
const { after, before, test } = require('node:test');
const jwt = require('jsonwebtoken');
const app = require('../src/app');
const User = require('../src/models/User');
const { connectDB } = require('../src/config/db');

let server;
let baseUrl;

before(async () => {
    server = app.listen(0, '127.0.0.1');
    await new Promise((resolve, reject) => {
        server.once('listening', resolve);
        server.once('error', reject);
    });
    baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
    if (server) {
        await new Promise((resolve, reject) => {
            server.close((error) => error ? reject(error) : resolve());
        });
    }
});

test('health endpoint reports a disconnected database as unavailable', async () => {
    const response = await fetch(`${baseUrl}/api/health`);
    const body = await response.json();

    assert.equal(response.status, 503);
    assert.equal(body.success, false);
    assert.equal(body.database, 'disconnected');
});

test('registration rejects names outside the model length limits', async () => {
    const response = await fetch(`${baseUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            name: 'A',
            email: 'test@example.com',
            password: 'test-password',
        }),
    });
    const body = await response.json();

    assert.equal(response.status, 400);
    assert.match(body.message, /Name must be between 2 and 80 characters/);
});

test('registration rejects malformed email addresses', async () => {
    const response = await fetch(`${baseUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            name: 'Test User',
            email: 'not-an-email',
            password: 'test-password',
        }),
    });
    const body = await response.json();

    assert.equal(response.status, 400);
    assert.match(body.message, /valid email address/);
});

test('database connection fails when MONGODB_URI is not configured', async () => {
    const originalUri = process.env.MONGODB_URI;
    delete process.env.MONGODB_URI;

    try {
        await assert.rejects(connectDB(), /MONGODB_URI is not configured/);
    } finally {
        if (originalUri === undefined) {
            delete process.env.MONGODB_URI;
        } else {
            process.env.MONGODB_URI = originalUri;
        }
    }
});

test('protected auth route rejects missing and malformed bearer headers', async (t) => {
    for (const authorization of [undefined, 'Bearer', 'BearerToken value']) {
        await t.test(authorization || 'missing authorization', async () => {
            const headers = authorization ? { authorization } : {};
            const response = await fetch(`${baseUrl}/api/auth/me`, { headers });
            const body = await response.json();

            assert.equal(response.status, 401);
            assert.equal(body.message, 'Authentication required');
        });
    }
});

test('database failures in auth middleware reach the server error handler', async () => {
    const originalSecret = process.env.JWT_SECRET;
    const originalFindById = User.findById;
    process.env.JWT_SECRET = 'backend-regression-test-secret';
    User.findById = async () => {
        throw new Error('Database unavailable');
    };

    try {
        const token = jwt.sign(
            { userId: '507f1f77bcf86cd799439011' },
            process.env.JWT_SECRET,
        );
        const response = await fetch(`${baseUrl}/api/auth/me`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        const body = await response.json();

        assert.equal(response.status, 500);
        assert.equal(body.message, 'Internal server error');
    } finally {
        User.findById = originalFindById;
        if (originalSecret === undefined) {
            delete process.env.JWT_SECRET;
        } else {
            process.env.JWT_SECRET = originalSecret;
        }
    }
});
