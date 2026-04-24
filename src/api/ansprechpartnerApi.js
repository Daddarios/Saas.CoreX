import axiosClient from './axiosClient';

export const ansprechpartnerApi = {
  getByKunde: (kundeId) =>
    axiosClient.get(`/ansprechpartner/kunde/${kundeId}`),

  create: (data) => axiosClient.post('/ansprechpartner', data),

  update: (id, data) => axiosClient.put(`/ansprechpartner/${id}`, data),

  delete: (id) => axiosClient.delete(`/ansprechpartner/${id}`),
};
