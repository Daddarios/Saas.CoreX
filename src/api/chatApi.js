import axiosClient from './axiosClient';

export const chatApi = {
  getRaeume: () => axiosClient.get('/chat/raeume'),

  getNachrichten: (raumId, page = 1, size = 50) =>
    axiosClient.get(`/chat/raum/${raumId}/nachrichten`, { params: { page, size } }),

  getOrCreateDirektChat: (zielBenutzerId) =>
    axiosClient.post(`/chat/direktchat/${zielBenutzerId}`),

  updateNachricht: (nachrichtId, inhalt) =>
    axiosClient.put(`/chat/nachricht/${nachrichtId}`, { inhalt }),

  deleteNachricht: (nachrichtId) =>
    axiosClient.delete(`/chat/nachricht/${nachrichtId}`),

  addReaktion: (nachrichtId, emoji) =>
    axiosClient.post(`/chat/nachricht/${nachrichtId}/reaktion`, { emoji }),
};
