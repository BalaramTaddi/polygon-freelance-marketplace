import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { app } from './server.js';
import { Profile } from './models/Profile.js';

// Mock Mongoose models
vi.mock('./models/Profile.js', () => ({
    Profile: {
        findOne: vi.fn(),
        findOneAndUpdate: vi.fn(),
    }
}));

vi.mock('./models/JobMetadata.js', () => ({
    JobMetadata: {
        find: vi.fn(),
        findOne: vi.fn(),
        create: vi.fn(),
    }
}));

// Mock Mongoose connection to avoid hanging tests
vi.spyOn(mongoose, 'connect').mockResolvedValue(null);

import { JobMetadata } from './models/JobMetadata.js';

describe('Backend API Endpoints (MongoDB Mocked)', () => {
    const testAddress = '0x1234567890123456789012345678901234567890';

    it('GET /api/profiles/:address should return profile if found', async () => {
        Profile.findOne.mockResolvedValue({ address: testAddress, name: 'Alice' });

        const res = await request(app).get(`/api/profiles/${testAddress}`);
        expect(res.statusCode).toEqual(200);
        expect(res.body.name).toBe('Alice');
    });

    it('GET /api/auth/nonce/:address should return a nonce', async () => {
        Profile.findOneAndUpdate.mockResolvedValue({ address: testAddress, nonce: 'test-nonce' });

        const res = await request(app).get(`/api/auth/nonce/${testAddress}`);
        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('nonce');
    });

    it('GET /api/jobs should return a list of jobs', async () => {
        const mockJobs = [{ jobId: 1, title: 'Test Job' }];
        // Mongoose find returns a query object, but in simple mock we just return the value
        JobMetadata.find.mockReturnValue({
            sort: vi.fn().mockResolvedValue(mockJobs)
        });

        const res = await request(app).get('/api/jobs');
        expect(res.statusCode).toEqual(200);
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body[0].title).toBe('Test Job');
    });
});
