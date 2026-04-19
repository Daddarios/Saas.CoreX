import axiosClient from './axiosClient';

export const ticketApi = {
  getAll: (page = 1, size = 20, search = '', status = '') =>
    axiosClient.get('/ticket', { params: { page, size, search, status } }),

  getById: (id) => axiosClient.get(`/ticket/${id}`),

  create: (data) => axiosClient.post('/ticket', data),

  update: (id, data) => axiosClient.put(`/ticket/${id}`, data),

  delete: (id) => axiosClient.delete(`/ticket/${id}`),

  updateStatus: (id, status) =>
    axiosClient.patch(`/ticket/${id}/status`, null, { params: { status } }),

  // Nachrichten
  getNachrichten: (ticketId) =>
    axiosClient.get(`/ticketnachricht/ticket/${ticketId}`),

  addNachricht: (data) => axiosClient.post('/ticketnachricht', data),
};
