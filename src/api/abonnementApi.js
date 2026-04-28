import axiosClient from './axiosClient';
import { handleApiError } from './errorHandler';

export const abonnementApi = {
  getAll: async (page = 1, size = 20) => {
    try {
      return await axiosClient.get('/abonnement', { params: { page, size } });
    } catch (error) {
      throw handleApiError(error);
    }
  },

  getById: async (id) => {
    try {
      return await axiosClient.get(`/abonnement/${id}`);
    } catch (error) {
      throw handleApiError(error);
    }
  },

  create: async (data) => {
    try {
      return await axiosClient.post('/abonnement', data);
    } catch (error) {
      throw handleApiError(error);
    }
  },

  update: async (id, data) => {
    try {
      return await axiosClient.put(`/abonnement/${id}`, data);
    } catch (error) {
      throw handleApiError(error);
    }
  },

  delete: async (id) => {
    try {
      return await axiosClient.delete(`/abonnement/${id}`);
    } catch (error) {
      throw handleApiError(error);
    }
  },

  getPlaene: async () => {
    try {
      return await axiosClient.get('/abonnement/plaene');
    } catch (error) {
      throw handleApiError(error);
    }
  },
};
