import axiosClient from './axiosClient';
import { handleApiError } from './errorHandler';

/**
 * =============================================
 * BENUTZER API — USER MANAGEMENT
 * =============================================
 * Tüm API hatalarını otomatik olarak ApiError'a
 * dönüştürüp, fieldErrors mapping'ini yapan
 * standardized error handling ile.
 */

export const benutzerApi = {
  /**
   * Tüm kullanıcıları listele (sayfalama & arama)
   * @throws {ApiError}
   */
  getAll: async (page = 1, size = 20, search = '') => {
    try {
      return await axiosClient.get('/benutzer', { params: { page, size, search } });
    } catch (error) {
      throw handleApiError(error);
    }
  },

  /**
   * ID ile kullanıcı getir
   * @throws {ApiError}
   */
  getById: async (id) => {
    try {
      return await axiosClient.get(`/benutzer/${id}`);
    } catch (error) {
      throw handleApiError(error);
    }
  },

  /**
   * Yeni kullanıcı oluştur
   * @param {Object} data - { vorname, nachname, email, rolle, ... }
   * @throws {ApiError} - fieldErrors ile validasyon hataları
   */
  create: async (data) => {
    try {
      return await axiosClient.post('/benutzer', data);
    } catch (error) {
      throw handleApiError(error);
    }
  },

  /**
   * Kullanıcı güncelle
   * @throws {ApiError} - fieldErrors ile validasyon hataları
   */
  update: async (id, data) => {
    try {
      return await axiosClient.put(`/benutzer/${id}`, data);
    } catch (error) {
      throw handleApiError(error);
    }
  },

  /**
   * Kullanıcı sil
   * @throws {ApiError}
   */
  delete: async (id) => {
    try {
      return await axiosClient.delete(`/benutzer/${id}`);
    } catch (error) {
      throw handleApiError(error);
    }
  },

  /**
   * Kullanıcı rolle ata
   * @throws {ApiError}
   */
  assignRole: async (id, rolle) => {
    try {
      return await axiosClient.post(`/benutzer/${id}/rolle`, { rolle });
    } catch (error) {
      throw handleApiError(error);
    }
  },

  /**
   * Avatar yükle (multipart form-data)
   * @throws {ApiError}
   */
  uploadAvatar: async (id, file) => {
    try {
      const form = new FormData();
      form.append('avatarFile', file);
      return await axiosClient.post(`/benutzer/${id}/upload-avatar`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    } catch (error) {
      throw handleApiError(error);
    }
  },

  /**
   * Avatar sil
   * @throws {ApiError}
   */
  deleteAvatar: async (id) => {
    try {
      return await axiosClient.delete(`/benutzer/${id}/delete-avatar`);
    } catch (error) {
      throw handleApiError(error);
    }
  },
};