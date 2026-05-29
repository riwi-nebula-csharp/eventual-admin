/**
 * ============================================================
 *  api.js — Capa de servicios Admin | Gran Teatro
 *  Auth:   https://service.auth.nebula.andrescortes.dev
 *  Events: https://service.events.nebula.andrescortes.dev
 * ============================================================
 */

const AUTH_URL   = 'https://service.auth.nebula.andrescortes.dev';
const EVENTS_URL = 'https://service.events.nebula.andrescortes.dev';

// ─── Token ────────────────────────────────────────────────────
function getToken() {
  return localStorage.getItem('gt_token');
}

// ─── Helper base ──────────────────────────────────────────────
async function request(baseUrl, endpoint, options = {}, requiresAuth = true) {

  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };

  if (requiresAuth) {
    headers['Authorization'] = `Bearer ${getToken()}`;
  }

  try {

    const res = await fetch(`${baseUrl}${endpoint}`, {
      ...options,
      headers,
    });

    const contentType = res.headers.get('Content-Type') || '';

    let body;

    if (contentType.includes('application/json')) {
      body = await res.json();
    } else {
      body = {
        success: false,
        message: await res.text() || 'Respuesta inesperada',
        data: null,
      };
    }

    console.log('================ API DEBUG ================');
    console.log('URL:', `${baseUrl}${endpoint}`);
    console.log('METHOD:', options.method || 'GET');
    console.log('STATUS:', res.status);
    console.log('BODY:', body);
    console.log('===========================================');

    return {
      success: body.success ?? res.ok,
      message: body.message ?? '',
      data: body.data ?? null,
      status: res.status,
    };

  } catch (err) {

    console.error('[API ERROR]', err);

    return {
      success: false,
      message: 'Sin conexión con el servidor.',
      data: null,
      status: 0,
    };
  }
}

// Shortcuts por servicio
const auth   = (ep, opts, a = true)  => request(AUTH_URL,   ep, opts, a);
const events = (ep, opts, a = true)  => request(EVENTS_URL, ep, opts, a);

// ─────────────────────────────────────────────────────────────
//  AUTH — /api/auth  (admin usa token ya guardado por auth.js)
// ─────────────────────────────────────────────────────────────

export async function me() {
  return auth('/api/profile', { method: 'GET' });
}

export async function updateProfile({ name, phone }) {
  return auth('/api/profile', {
    method: 'PUT',
    body:   JSON.stringify({ name, phone }),
  });
}

export async function changePassword({ current_password, password, password_confirmation }) {
  return auth('/api/auth/password', {
    method: 'PUT',
    body:   JSON.stringify({ current_password, password, password_confirmation }),
  });
}

// ─────────────────────────────────────────────────────────────
//  OBRAS — /api/play
// ─────────────────────────────────────────────────────────────

export async function getPlays() {
  return events('/api/play', { method: 'GET' }, false);
}

export async function getPlayById(id) {
  return events(`/api/play/${id}`, { method: 'GET' }, false);
}

export async function getDeletedPlays() {
  return events('/api/play/deleted', { method: 'GET' }, true);
}

export async function createPlay({ name, description = null, posterUrl = null }) {
  const body = { name };
  if (description && description.trim()) body.description = description.trim();
  if (posterUrl && posterUrl.trim())     body.posterUrl   = posterUrl.trim();
  return events('/api/play', { method: 'POST', body: JSON.stringify(body) }, true);
}

export async function updatePlay(id, payload) {
  return events(`/api/play/${id}`, {
    method: 'PUT',
    body:   JSON.stringify(payload),
  }, true);
}

export async function deletePlay(id) {
  return events(`/api/play/${id}`, { method: 'DELETE' }, true);
}

// ─────────────────────────────────────────────────────────────
//  FUNCIONES — /api/performance
// ─────────────────────────────────────────────────────────────

export async function getPerformances() {
  return events('/api/performance', { method: 'GET' }, false);
}

export async function getPerformanceById(id) {
  return events(`/api/performance/${id}`, { method: 'GET' }, false);
}

export async function getDeletedPerformances() {
  return events('/api/performance/deleted', { method: 'GET' }, true);
}

export async function createPerformance({
  playId, performanceDate, startTime, endTime,
  ticketPrice, salesStartDate, salesEndDate,
}) {
  return events('/api/performance', {
    method: 'POST',
    body:   JSON.stringify({
      playId, performanceDate, startTime, endTime,
      ticketPrice, salesStartDate, salesEndDate,
    }),
  }, true);
}

export async function updatePerformance(id, payload) {
  return events(`/api/performance/${id}`, {
    method: 'PUT',
    body:   JSON.stringify(payload),
  }, true);
}

export async function deletePerformance(id) {
  return events(`/api/performance/${id}`, { method: 'DELETE' }, true);
}

export async function getSeatMap(performanceId) {
  return events(`/api/performance/${performanceId}/seats`, { method: 'GET' }, false);
}