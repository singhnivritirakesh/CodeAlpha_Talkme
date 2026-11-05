import axiosClient from './axiosClient';

export const authApi = {
  signup: async (userData) => {
    const response = await axiosClient.post('/auth/signup', userData);
    return response.data;
  },

  login: async (credentials) => {
    const response = await axiosClient.post('/auth/login', credentials);
    return response.data;
  },

  guestLogin: async (guestName) => {
    const response = await axiosClient.post('/auth/guest', { guestName });
    return response.data;
  },

  logout: async () => {
    const response = await axiosClient.post('/auth/logout');
    return response.data;
  },

  getMe: async () => {
    const response = await axiosClient.get('/auth/me');
    return response.data;
  }
};

