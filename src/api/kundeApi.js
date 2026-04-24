import axiosClient from './axiosClient';
import { handleApiError } from './errorHandler';

/**
 * =============================================
 * KUNDE API — CUSTOMER MANAGEMENT
 * =============================================
 * Tüm API hatalarını otomatik olarak ApiError'a
 * dönüştürüp, fieldErrors mapping'ini yapan
 * standardized error handling ile.
 */

export const kundeApi = {
  /**
   * Tüm müşterileri listele (sayfalama & arama)
   * @throws {ApiError}
   */
  getAll: async (page = 1, size = 20, search = '') => {
    try {
      return await axiosClient.get('/kunde', { params: { page, size, search } });
    } catch (error) {
      throw handleApiError(error);
    }
  },

  /**
   * ID ile müşteri getir
   * @throws {ApiError}
   */
  getById: async (id) => {
    try {
      return await axiosClient.get(`/kunde/${id}`);
    } catch (error) {
      throw handleApiError(error);
    }
  },

  /**
   * Yeni müşteri oluştur
   * @param {Object} data - { unternehmen, vorname, nachname, email, ... }
   * @throws {ApiError} - fieldErrors ile validasyon hataları
   */
  create: async (data) => {
    try {
      return await axiosClient.post('/kunde', data);
    } catch (error) {
      throw handleApiError(error);
    }
  },

  /**
   * Müşteri güncelle
   * @throws {ApiError} - fieldErrors ile validasyon hataları
   */
  update: async (id, data) => {
    try {
      return await axiosClient.put(`/kunde/${id}`, data);
    } catch (error) {
      throw handleApiError(error);
    }
  },

  /**
   * Müşteri sil
   * @throws {ApiError}
   */
  delete: async (id) => {
    try {
      return await axiosClient.delete(`/kunde/${id}`);
    } catch (error) {
      throw handleApiError(error);
    }
  },

  /**
   * Logo yükle (multipart form-data)
   * @throws {ApiError}
   */
  uploadLogo: async (id, file) => {
    try {
      const form = new FormData();
      form.append('logoFile', file);
      return await axiosClient.post(`/kunde/${id}/upload-logo`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    } catch (error) {
      throw handleApiError(error);
    }
  },

  /**
   * Logo sil
   * @throws {ApiError}
   */
  deleteLogo: async (id) => {
    try {
      return await axiosClient.delete(`/kunde/${id}/delete-logo`);
    } catch (error) {
      throw handleApiError(error);
    }
  },
};
