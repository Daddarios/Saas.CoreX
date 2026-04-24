import axiosClient from './axiosClient';

export const berichtApi = {
  getAll: (page = 1, size = 20) =>
    axiosClient.get('/bericht', { params: { page, size } }),

  upload: (entityType, entityId, file, titel, version) => {
    const form = new FormData();
    form.append('datei', file);
    if (titel) form.append('titel', titel);
    if (version) form.append('version', version);
    return axiosClient.post(`/bericht/upload/${entityType}/${entityId}`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  download: (id) =>
    axiosClient.get(`/bericht/${id}/download`, { responseType: 'blob' }),

  delete: (id) => axiosClient.delete(`/bericht/${id}`),
};
