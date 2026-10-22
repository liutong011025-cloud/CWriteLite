import assert from 'node:assert/strict';
import { test } from 'node:test';
import { POST } from '../app/api/auth/route';
import { prisma } from '../lib/prisma';
import { REGISTRATION_DISABLED_MESSAGE } from '../lib/auth-config';

function authRequest(body: Record<string, unknown>) {
    return new Request('http://localhost/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
}

test('public student and teacher registration is blocked before database access', async () => {
    const findUnique = prisma.user.findUnique;
    const create = prisma.user.create;
    let databaseCalls = 0;
    const unexpectedDatabaseAccess = async () => {
        databaseCalls++;
        throw new Error('Registration must not access the database');
    };
    prisma.user.findUnique = unexpectedDatabaseAccess as unknown as typeof findUnique;
    prisma.user.create = unexpectedDatabaseAccess as unknown as typeof create;
    try {
        for (const role of ['student', 'teacher']) {
            for (const fields of [
                { name: 'New user', email: 'user@example.test', password: 'Example123' },
                {},
            ]) {
                const response = await POST(authRequest({ action: 'register', role, ...fields }));
                assert.equal(response.status, 403);
                assert.deepEqual(await response.json(), {
                    error: REGISTRATION_DISABLED_MESSAGE,
                    code: 'REGISTRATION_DISABLED',
                });
            }
        }
        assert.equal(databaseCalls, 0);
    } finally {
        prisma.user.findUnique = findUnique;
        prisma.user.create = create;
    }
});

test('existing account login still validates credentials and looks up the username', async () => {
    const invalid = await POST(authRequest({ username: 'Existing user', password: '' }));
    assert.equal(invalid.status, 400);

    const findUnique = prisma.user.findUnique;
    const received: unknown[] = [];
    prisma.user.findUnique = (async (args: unknown) => {
        received.push(args);
        return null;
    }) as typeof findUnique;
    try {
        const response = await POST(authRequest({ username: 'Existing user', password: 'Example123' }));
        assert.equal(response.status, 401);
        assert.deepEqual(await response.json(), { error: 'Username or password is incorrect.' });
        assert.deepEqual(received, [{ where: { username: 'Existing user' } }]);
    } finally {
        prisma.user.findUnique = findUnique;
    }
});
