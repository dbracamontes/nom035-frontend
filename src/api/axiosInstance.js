import axios from 'axios';

const baseURL = process.env.REACT_APP_API_URL || 'http://localhost:8080';

export function createApiClient(username, password) {
  const authHeader = username && password ? { Authorization: 'Basic ' + btoa(`${username}:${password}`) } : {};
  const client = axios.create({
    baseURL,
    headers: {
      ...authHeader,
      'Content-Type': 'application/json'
    }
  });

  // attach interceptors similar to existing nom035.js behavior if needed
  client.interceptors.request.use(
    (config) => {
      // ensure JSON content-type for post/put
      if (config.method === 'post' || config.method === 'put') {
        config.headers['Content-Type'] = config.headers['Content-Type'] || 'application/json';
      }
      return config;
    },
    (error) => Promise.reject(error)
  );

  return client;
}

export default createApiClient;
