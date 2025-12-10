import axios from 'axios';
import type { CompanyConfig } from '@repo/shared';

export const createApiClient = (config: CompanyConfig) => {
  const api = axios.create({
    baseURL: config.apiUrl,
    headers: {
      'x-api-key': config.apiKey,
      'Content-Type': 'application/json',
    },
  });

  api.interceptors.response.use(
    (response) => response,
    (error) => {
      // Handle 401/403 maybe?
      return Promise.reject(error);
    }
  );

  return api;
};

export const validateConnection = async (url: string) => {
  try {
    // Health check usually doesn't need auth, but let's check if we can reach the server
    const res = await axios.get(`${url}/health`);
    return res.status === 200;
  } catch {
    return false;
  }
};
