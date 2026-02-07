import { supabase } from './supabaseClient';

const API_BASE = 'http://localhost:8000';

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
    await supabase.auth.signOut();
    window.location.href = '/login';
    throw new Error('Session expired');
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
    await supabase.auth.signOut();
    window.location.href = '/login';
    throw new Error('Session expired');
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
    await supabase.auth.signOut();
    window.location.href = '/login';
    throw new Error('Session expired');
  }
  return res;
}
