import axiosClient from './axiosClient';
import { handleApiError } from './errorHandler';

/**
 * =============================================
 * TICKET API — STANDARDIZED ERROR HANDLING
 * =============================================
 * Tüm hatalar ApiError'a dönüştürülür.
 */

export const ticketApi = {
  /** @throws {ApiError} */
  getAll: async (page = 1, size = 20, search = '', status = '') => {
    try {
      return await axiosClient.get('/ticket', { params: { page, size, search, status } });
    } catch (error) {
      throw handleApiError(error);
    }
  },

  /** @throws {ApiError} */
  getById: async (id) => {
    try {
      return await axiosClient.get(`/ticket/${id}`);
    } catch (error) {
      throw handleApiError(error);
    }
  },

  /** @throws {ApiError} - fieldErrors ile validasyon hataları */
  create: async (data) => {
    try {
      return await axiosClient.post('/ticket', data);
    } catch (error) {
      throw handleApiError(error);
    }
  },

  /** @throws {ApiError} - fieldErrors ile validasyon hataları */
  update: async (id, data) => {
    try {
      return await axiosClient.put(`/ticket/${id}`, data);
    } catch (error) {
      throw handleApiError(error);
    }
  },

  /** @throws {ApiError} */
  delete: async (id) => {
    try {
      return await axiosClient.delete(`/ticket/${id}`);
    } catch (error) {
      throw handleApiError(error);
    }
  },

  /** @throws {ApiError} */
  updateStatus: async (id, status) => {
    try {
      return await axiosClient.patch(`/ticket/${id}/status`, null, { params: { status } });
    } catch (error) {
      throw handleApiError(error);
    }
  },

  // Nachrichten
  /** @throws {ApiError} */
  getNachrichten: async (ticketId) => {
    try {
      return await axiosClient.get(`/ticketnachricht/ticket/${ticketId}`);
    } catch (error) {
      throw handleApiError(error);
    }
  },

  /** @throws {ApiError} */
  addNachricht: async (data) => {
    try {
      return await axiosClient.post('/ticketnachricht', data);
    } catch (error) {
      throw handleApiError(error);
    }
  },
};
