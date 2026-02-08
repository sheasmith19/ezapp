import { supabase } from './supabaseClient';

// Use /api prefix which Vite proxies to localhost:8000
const API_BASE = '/api';

/**
 * Get the current Supabase access token (JWT) to send to our backend.
 */
async function getToken() {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

async function authHeaders() {
  const token = await getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function apiGet(path) {
  const headers = await authHeaders();
  const res = await fetch(`${API_BASE}${path}`, { headers });
  if (res.status === 401) {
    console.error('API 401 on', path, '- token may be invalid');
  }
  return res;
}

export async function apiPost(path, body) {
  const headers = await authHeaders();
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
  if (res.status === 401) {
    console.error('API 401 on', path, '- token may be invalid');
  }
  return res;
}

export async function apiDelete(path) {
  const headers = await authHeaders();
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'DELETE',
    headers,
  });
  if (res.status === 401) {
    console.error('API 401 on', path, '- token may be invalid');
  }
  return res;
}
