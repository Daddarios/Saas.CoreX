import axiosClient from './axiosClient';

export const chatApi = {
  getRaeume: () => axiosClient.get('/chat/raeume'),

  getNachrichten: (raumId, page = 1, size = 50) =>
    axiosClient.get(`/chat/raum/${raumId}/nachrichten`, { params: { page, size } }),
};
