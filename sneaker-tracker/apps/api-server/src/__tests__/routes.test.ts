import request from 'supertest';
import app from '../server';

// Mock the DB module so tests don't call real Supabase
jest.mock('../lib/db', () => ({
  getReleases: jest.fn().mockResolvedValue([{ id: 'r1', name: 'Test Release' }]),
  createRelease: jest.fn().mockResolvedValue({ id: 'r2', name: 'Created' }),
  updateRelease: jest.fn().mockResolvedValue({ id: 'r1', name: 'Updated' }),
  deleteRelease: jest.fn().mockResolvedValue(true),
  getRetailers: jest.fn().mockResolvedValue([{ id: 'ret1', name: 'Retailer' }]),
  createRetailer: jest.fn().mockResolvedValue({ id: 'ret2', name: 'CreatedRetailer' }),
  updateRetailer: jest.fn().mockResolvedValue({ id: 'ret1', name: 'UpdatedRetailer' }),
  deleteRetailer: jest.fn().mockResolvedValue(true),
}));

describe('API routes', () => {
  it('GET /api/releases should return releases', async () => {
    const res = await request(app).get('/api/releases');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0]).toHaveProperty('name');
  });

  it('POST /api/releases should create a release', async () => {
    const res = await request(app).post('/api/releases').send({ name: 'New' });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
  });

  it('PUT /api/releases/:id should update a release', async () => {
    const res = await request(app).put('/api/releases/r1').send({ name: 'Updated' });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('name', 'Updated');
  });

  it('DELETE /api/releases/:id should delete a release', async () => {
    const res = await request(app).delete('/api/releases/r1');
    expect(res.status).toBe(204);
  });

  it('GET /api/retailers should return retailers', async () => {
    const res = await request(app).get('/api/retailers');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});
