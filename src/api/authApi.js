import axiosClient from './axiosClient';

export const authApi = {
  login: (email, passwort) =>
    axiosClient.post('/auth/login', { email, passwort }),

  verifyCode: (email, code) =>
    axiosClient.post('/auth/verify', { email, code }),

  refresh: () => axiosClient.post('/auth/refresh'),

  logout: () => axiosClient.post('/auth/logout'),
};
