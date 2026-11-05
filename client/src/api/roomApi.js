import axiosClient from './axiosClient';

export const roomApi = {
  createRoom: async (roomData = {}) => {
    const response = await axiosClient.post('/rooms/create', roomData);
    return response.data;
  },

  getRoom: async (roomId) => {
    const response = await axiosClient.get(`/rooms/${roomId}`);
    return response.data;
  },

  getIceServers: async () => {
    const response = await axiosClient.get('/rooms/ice-servers');
    return response.data;
  },

  uploadFile: async (formData, onProgress) => {
    const response = await axiosClient.post('/files/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(percent);
        }
      }
    });
    return response.data;
  }
};

