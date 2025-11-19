import request from 'supertest';
import { app } from '../../api-server/src/server'; // Adjust the import based on your server setup

describe('Releases API', () => {
  it('should return a list of releases', async () => {
    const response = await request(app).get('/api/releases');
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });

  it('should return a specific release by ID', async () => {
    const releaseId = 1; // Replace with a valid release ID
    const response = await request(app).get(`/api/releases/${releaseId}`);
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('id', releaseId);
  });

  it('should return a 404 for a non-existent release', async () => {
    const response = await request(app).get('/api/releases/9999'); // Assuming 9999 does not exist
    expect(response.status).toBe(404);
  });

  it('should create a new release', async () => {
    const newRelease = {
      name: 'Test Sneaker',
      releaseDate: '2023-10-01',
      retailerId: 1, // Replace with a valid retailer ID
    };
    const response = await request(app).post('/api/releases').send(newRelease);
    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('id');
  });

  it('should update an existing release', async () => {
    const releaseId = 1; // Replace with a valid release ID
    const updatedRelease = {
      name: 'Updated Sneaker',
    };
    const response = await request(app).put(`/api/releases/${releaseId}`).send(updatedRelease);
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('name', updatedRelease.name);
  });

  it('should delete a release', async () => {
    const releaseId = 1; // Replace with a valid release ID
    const response = await request(app).delete(`/api/releases/${releaseId}`);
    expect(response.status).toBe(204);
  });
});