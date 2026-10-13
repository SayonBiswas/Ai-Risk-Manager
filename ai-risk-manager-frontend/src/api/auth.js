import client from './client';

export const register = (name, email, password, security_question, security_answer) =>
  client.post('/auth/register', { name, email, password, security_question, security_answer });

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

export const createApiKey = (token, name, expires_in_days) =>
  client.post('/api-keys', { name, expires_in_days }, {
    headers: { Authorization: `Bearer ${token}` }
  });

export const deleteApiKey = (token, keyId) =>
  client.delete(`/api-keys/${keyId}`, {
    headers: { Authorization: `Bearer ${token}` }
  });

export const updateApiKey = (token, keyId, name) =>
  client.patch(`/api-keys/${keyId}`, { name }, {
    headers: { Authorization: `Bearer ${token}` }
  });

export const forgotPassword = (email) =>
  client.post('/auth/forgot-password', { email });

export const forgotPasswordVerify = (email, security_answer) =>
  client.post('/auth/forgot-password/verify', { email, security_answer });

export const resetPassword = (token, new_password) =>
  client.post('/auth/reset-password', { token, new_password });

export const changePassword = (token, current_password, new_password) =>
  client.post('/auth/change-password', { current_password, new_password }, {
    headers: { Authorization: `Bearer ${token}` }
  });
