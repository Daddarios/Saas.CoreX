import client from './axiosClient';

export const filialeApi = {
  // Get all Filialen with pagination
  getAll: (page = 1, pageSize = 10) =>
    client.get('/filiale', { params: { page, pageSize } }),

  // Get Filialen by Kunde ID
  getByKunde: (kundeId) =>
    client.get(`/filiale/kunde/${kundeId}`),

  // Get single Filiale by ID
  getById: (id) =>
    client.get(`/filiale/${id}`),

  // Create new Filiale
  create: (data) =>
    client.post('/filiale', data),

  // Update existing Filiale
  update: (id, data) =>
    client.put(`/filiale/${id}`, data),

  // Delete Filiale
  delete: (id) =>
    client.delete(`/filiale/${id}`),
};
