import axiosClient from './axiosClient';

export const authApi = {
  login: (email, passwort) =>
    axiosClient.post('/auth/login', { email, passwort }),

  verifyCode: (email, code) =>
    axiosClient.post('/auth/verify', { email, code }),

  refresh: () => axiosClient.post('/auth/refresh'),

  me: () => axiosClient.get('/auth/me'),

  logout: () => axiosClient.post('/auth/logout'),

  getLockedUsers: () => axiosClient.get('/auth/locked-users'),

  unlockUser: (email) => axiosClient.post(`/auth/unlock/${encodeURIComponent(email)}`),
};
