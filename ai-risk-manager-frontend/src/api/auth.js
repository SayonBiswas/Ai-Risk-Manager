import client from './client';

export const register = (name, email, password) =>
  client.post('/auth/register', { name, email, password });

export const login = (email, password) =>
  client.post('/auth/login', { email, password });

export const getMe = (token) =>
  client.get('/auth/me', {
    headers: { Authorization: `Bearer ${token}` }
  });

export const generateApiKey = (token) =>
  client.post('/api-keys/generate', {}, {
    headers: { Authorization: `Bearer ${token}` }
  });

export const getApiKeys = (token) =>
  client.get('/api-keys', {
    headers: { Authorization: `Bearer ${token}` }
  });
