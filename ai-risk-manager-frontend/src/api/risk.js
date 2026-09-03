import client from './client';

export const getApiKey = () => localStorage.getItem('rm_active_api_key');

export const detectFraud = (body) =>
  client.post('/v1/fraud/detect', body, {
    headers: { 'X-API-Key': getApiKey() }
  });

export const scoreReturn = (body) =>
  client.post('/v1/returns/score', body, {
    headers: { 'X-API-Key': getApiKey() }
  });

export const respondChargeback = (body) =>
  client.post('/v1/chargebacks/respond', body, {
    headers: { 'X-API-Key': getApiKey() }
  });

export const getChargebackStatus = (transactionId) =>
  client.get(`/v1/chargebacks/${transactionId}/status`, {
    headers: { 'X-API-Key': getApiKey() }
  });
