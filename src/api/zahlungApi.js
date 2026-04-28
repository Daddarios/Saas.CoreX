import axiosClient from './axiosClient';
import { handleApiError } from './errorHandler';

export const zahlungApi = {
  getAll: async (page = 1, size = 20) => {
    try {
      return await axiosClient.get('/zahlung', { params: { page, size } });
    } catch (error) {
      throw handleApiError(error);
    }
  },

  getById: async (id) => {
    try {
      return await axiosClient.get(`/zahlung/${id}`);
    } catch (error) {
      throw handleApiError(error);
    }
  },

  create: async (data) => {
    try {
      return await axiosClient.post('/zahlung', data);
    } catch (error) {
      throw handleApiError(error);
    }
  },

  updateStatus: async (id, status) => {
    try {
      return await axiosClient.patch(`/zahlung/${id}/status`, { status });
    } catch (error) {
      throw handleApiError(error);
    }
  },
};
