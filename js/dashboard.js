/**
 * ============================================================
 *  dashboard.js — Integración con APIs reales
 *  Auth:   https://service.auth.nebula.andrescortes.dev
 *  Events: https://service.events.nebula.andrescortes.dev
 * ============================================================
 */

import {
  getPlays,
  getPerformances,
  createPlay,
  updatePlay,
  deletePlay,
  createPerformance,
  updatePerformance,
  deletePerformance,
} from './api.js';

const AUTH_URL = 'https://service.auth.nebula.andrescortes.dev';

// ── Helpers ──────────────────────────────────────────────────

function getToken() {
  return localStorage.getItem('gt_token');
}

async function authGet(endpoint) {
  const res = await fetch(`${AUTH_URL}${endpoint}`, {
    headers: {
      'Authorization': `Bearer ${getToken()}`,
      'Accept': 'application/json',
    },
  });
  return res.json();
}

async function authPost(endpoint, body) {
  const res = await fetch(`${AUTH_URL}${endpoint}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${getToken()}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify(body),
  });
  return res.json();
}

async function authPut(endpoint, body) {
  const res = await fetch(`${AUTH_URL}${endpoint}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${getToken()}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify(body),
  });
  return res.json();
}

async function authDelete(endpoint) {
  const res = await fetch(`${AUTH_URL}${endpoint}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${getToken()}`,
      'Accept': 'application/json',
    },
  });
  return res.json();
}

async function authPatch(endpoint, body) {
  const res = await fetch(`${AUTH_URL}${endpoint}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${getToken()}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify(body),
  });
  return res.json();
}

// ── Formatters ───────────────────────────────────────────────

function formatDate(dateStr) {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('es-CO', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  } catch { return dateStr; }
}

function formatTime(timeStr) {
  if (!timeStr) return '—';
  return timeStr.substring(0, 5);
}

function formatCurrency(amount) {
  if (amount == null) return '—';
  return new Intl.NumberFormat('es-CO', {
    style: 'currency', currency: 'COP', minimumFractionDigits: 0,
  }).format(amount);
}

function statusBadge(status) {
  const map = {
    scheduled: { label: 'PROGRAMADA', cls: 'bg-primary text-on-primary' },
    on_sale:   { label: 'EN VENTA',   cls: 'bg-tertiary text-on-tertiary' },
    sold_out:  { label: 'AGOTADA',    cls: 'bg-error text-on-error' },
    finished:  { label: 'FINALIZADA', cls: 'bg-surface-variant text-on-surface-variant' },
  };
  const s = map[status] || {
    label: (typeof status === 'string' ? status.toUpperCase() : String(status ?? '—')),
    cls: 'bg-surface-variant text-on-surface-variant',
  };
  return `<span class="px-3 py-1 ${s.cls} rounded-full text-label-sm font-bold shadow-lg">${s.label}</span>`;
}

function getInitials(name) {
  return (name || 'E')
    .split(' ')
    .map(n => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function showToast(message, type = 'success') {
  let toast = document.getElementById('app-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'app-toast';
    toast.className = 'fixed bottom-6 right-6 z-[200] px-5 py-3 rounded-xl text-sm font-bold shadow-xl transition-all duration-300 opacity-0 translate-y-2';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.className = toast.className.replace(/bg-\S+/g, '');
  if (type === 'success') {
    toast.classList.add('bg-tertiary', 'text-on-tertiary');
  } else {
    toast.classList.add('bg-error', 'text-on-error');
  }
  toast.classList.remove('opacity-0', 'translate-y-2');
  clearTimeout(toast._hideTimeout);
  toast._hideTimeout = setTimeout(() => {
    toast.classList.add('opacity-0', 'translate-y-2');
  }, 3000);
}

// ── State ────────────────────────────────────────────────────

let _plays        = [];
let _performances = [];
let _employees    = [];
let _editingPlay  = null;
let _editingPerf  = null;
let _editingEmp   = null;

// ── OBRAS ────────────────────────────────────────────────────

async function loadPlays() {
  const res = await getPlays();
  if (!res.success) { showToast('Error cargando obras', 'error'); return; }
  _plays = res.data || [];
  renderFunciones();
  renderObrasGrid();
  renderDashboardTopPlays();
}

// ── FUNCIONES ────────────────────────────────────────────────

async function loadPerformances() {
  const res = await getPerformances();
  if (!res.success) { showToast('Error cargando funciones', 'error'); return; }
  _performances = (res.data || []).map(p => ({
    ...p,
    status: p.status != null ? String(p.status) : '',
  }));
  renderFuncionesCards();
  renderDashboardStats();
  renderDashboardActivePerformances();
  renderObrasGrid();
}

function renderDashboardStats() {
  const total     = _performances.length;
  const onSale    = _performances.filter(p => p.status === 'on_sale').length;
  const scheduled = _performances.filter(p => p.status === 'scheduled').length;
  const finished  = _performances.filter(p => p.status === 'finished').length;

  setStatCard('stat-total-funciones', total);
  setStatCard('stat-en-venta',        onSale);
  setStatCard('stat-programadas',     scheduled);
  setStatCard('stat-finalizadas',     finished);
}

function setStatCard(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function renderDashboardTopPlays() {
  const el = document.getElementById('dashboard-top-plays');
  if (!el) return;

  if (_plays.length === 0) {
    el.innerHTML = '<p class="text-on-surface-variant text-sm">Sin obras registradas.</p>';
    return;
  }

  el.innerHTML = _plays.slice(0, 3).map(play => `
    <div class="flex items-center gap-4">
      <div class="w-12 h-12 bg-surface-container-highest rounded-lg overflow-hidden flex items-center justify-center flex-shrink-0">
        ${play.posterUrl
          ? `<img src="${play.posterUrl}" alt="${play.name}" class="w-full h-full object-cover">`
          : `<span class="material-symbols-outlined text-primary">theater_comedy</span>`}
      </div>
      <div class="flex-1 min-w-0">
        <p class="font-bold text-on-surface truncate">${play.name}</p>
        <p class="text-xs text-on-surface-variant">${
          _performances.filter(p => p.playId === play.id).length
        } función(es)</p>
      </div>
    </div>
  `).join('');
}

function renderDashboardActivePerformances() {
  const el = document.getElementById('dashboard-active-performances');
  if (!el) return;

  const active = _performances.filter(p => p.status === 'on_sale' || p.status === 'scheduled');

  if (active.length === 0) {
    el.innerHTML = '<p class="text-on-surface-variant text-sm">No hay funciones activas actualmente.</p>';
    return;
  }

  el.innerHTML = active.slice(0, 6).map(perf => `
    <div class="flex items-center gap-4 p-3 bg-surface-container-high rounded-lg">
      <div class="w-10 h-10 bg-surface-container-highest rounded-lg flex items-center justify-center flex-shrink-0">
        <span class="material-symbols-outlined text-primary">theater_comedy</span>
      </div>
      <div class="flex-1 min-w-0">
        <p class="font-bold text-on-surface truncate">${perf.playName || '—'}</p>
        <p class="text-xs text-on-surface-variant">${formatDate(perf.performanceDate)} · ${formatTime(perf.startTime)}</p>
      </div>
      <div class="text-right flex-shrink-0">
        <p class="text-sm font-bold text-tertiary">${formatCurrency(perf.ticketPrice)}</p>
        <p class="text-xs text-on-surface-variant">${perf.status === 'on_sale' ? 'En venta' : 'Programada'}</p>
      </div>
    </div>
  `).join('');
}

function renderFuncionesCards() {
  const container = document.getElementById('funciones-grid');
  if (!container) return;

  container.querySelectorAll('.obra-section').forEach(c => c.remove());
  const placeholder = container.querySelector('.new-event-placeholder');

  _plays.forEach(play => {
    const functionsForPlay = _performances.filter(p => p.playId === play.id);
    
    const obraSection = document.createElement('div');
    obraSection.className = 'obra-section border border-outline-variant/20 rounded-xl overflow-hidden';
    
    obraSection.innerHTML = `
      <div class="flex flex-col lg:flex-row gap-gutter p-gutter bg-surface-container-low">
        <!-- Obra Card con imagen -->
        <div class="lg:w-1/3 flex flex-col">
          <div class="obra-card bg-surface-container rounded-xl overflow-hidden h-full flex flex-col">
            <div class="relative h-48 overflow-hidden bg-surface-container-highest flex items-center justify-center">
              ${play.posterUrl
                ? `<img src="${play.posterUrl}" alt="${play.name}" class="w-full h-full object-cover">`
                : `<span class="material-symbols-outlined text-6xl opacity-20">auto_stories</span>`}
            </div>
            <div class="p-5 flex-1 flex flex-col">
              <h3 class="font-headline-md text-body-lg mb-2">${play.name}</h3>
              ${play.description
                ? `<p class="text-sm text-on-surface-variant mb-3 line-clamp-2">${play.description}</p>`
                : ''}
              <p class="text-xs text-on-surface-variant mb-auto">${functionsForPlay.length} función(es)</p>
              <div class="flex gap-2 mt-4">
                <button onclick="openEditPlayModal(${play.id})"
                  class="flex-1 py-2 bg-surface-variant text-on-surface font-bold rounded-lg hover:bg-primary hover:text-on-primary transition-colors text-sm">
                  Editar Obra
                </button>
                <button onclick="confirmDeletePlay(${play.id})"
                  class="p-2 border border-outline-variant text-on-surface-variant rounded-lg hover:text-error hover:border-error transition-colors">
                  <span class="material-symbols-outlined text-sm">delete</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Funciones sin imagen -->
        <div class="lg:w-2/3 flex flex-col">
          ${functionsForPlay.length > 0
            ? `<div class="space-y-3 flex-1">
                ${functionsForPlay.map(perf => `
                  <div class="performance-card bg-surface-container rounded-lg p-4 border border-outline-variant/30 hover:border-primary/50 transition-colors">
                    <div class="flex justify-between items-start mb-3">
                      <h4 class="font-headline-md text-body-md flex-1">${perf.playName || '—'}</h4>
                      <div>${statusBadge(perf.status)}</div>
                    </div>
                    <div class="grid grid-cols-2 gap-3 mb-4">
                      <div class="flex items-center gap-2 text-on-surface-variant text-sm">
                        <span class="material-symbols-outlined text-sm">calendar_today</span>
                        <span>${formatDate(perf.performanceDate)}</span>
                      </div>
                      <div class="flex items-center gap-2 text-on-surface-variant text-sm">
                        <span class="material-symbols-outlined text-sm">schedule</span>
                        <span>${formatTime(perf.startTime)} – ${formatTime(perf.endTime)}</span>
                      </div>
                      <div class="flex items-center gap-2 text-on-surface-variant text-sm col-span-2">
                        <span class="material-symbols-outlined text-sm">sell</span>
                        <span>${formatCurrency(perf.ticketPrice)}</span>
                      </div>
                    </div>
                    <div class="flex gap-2">
                      <button
                        onclick="openEditPerformanceModal(${perf.id})"
                        class="flex-1 py-2 bg-surface-variant text-on-surface font-bold rounded-lg text-sm hover:bg-primary hover:text-on-primary transition-colors">
                        Editar
                      </button>
                      <button
                        onclick="confirmDeletePerformance(${perf.id})"
                        class="p-2 border border-outline-variant text-on-surface-variant rounded-lg hover:text-error hover:border-error transition-colors">
                        <span class="material-symbols-outlined text-sm">delete</span>
                      </button>
                    </div>
                  </div>
                `).join('')}
              </div>`
            : `<div class="flex items-center justify-center h-full text-on-surface-variant italic">
                <span class="material-symbols-outlined text-4xl opacity-20 mr-3">event_note</span>
                Sin funciones asignadas
              </div>`
          }
        </div>
      </div>
    `;
    
    container.insertBefore(obraSection, placeholder);
  });
}

function renderFunciones() {
  const select = document.getElementById('perf-play-id');
  if (!select) return;
  select.innerHTML = _plays.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
}

function renderObrasGrid() {
  const container = document.getElementById('obras-grid');
  if (!container) return;

  container.querySelectorAll('.obra-card').forEach(c => c.remove());
  const placeholder = container.querySelector('.new-play-placeholder');

  _plays.forEach(play => {
    const card = document.createElement('div');
    card.className = 'obra-card group bg-surface-container rounded-xl overflow-hidden hover:scale-[1.02] transition-transform duration-300';
    card.innerHTML = `
      <div class="relative h-48 overflow-hidden bg-surface-container-highest flex items-center justify-center">
        ${play.posterUrl
          ? `<img src="${play.posterUrl}" alt="${play.name}" class="w-full h-full object-cover">`
          : `<span class="material-symbols-outlined text-6xl opacity-20">auto_stories</span>`}
      </div>
      <div class="p-5">
        <h4 class="font-headline-md text-body-lg mb-2">${play.name}</h4>
        ${play.description
          ? `<p class="text-sm text-on-surface-variant mb-3 line-clamp-2">${play.description}</p>`
          : ''}
        <p class="text-xs text-on-surface-variant mb-4">${
          _performances.filter(p => p.playId === play.id).length
        } función(es)</p>
        <div class="flex gap-2">
          <button onclick="openEditPlayModal(${play.id})"
            class="flex-1 py-2 bg-surface-variant text-on-surface font-bold rounded-lg hover:bg-primary hover:text-on-primary transition-colors">
            Editar
          </button>
          <button onclick="confirmDeletePlay(${play.id})"
            class="p-2 border border-outline-variant text-on-surface-variant rounded-lg hover:text-error hover:border-error transition-colors">
            <span class="material-symbols-outlined">delete</span>
          </button>
        </div>
      </div>
    `;
    container.insertBefore(card, placeholder);
  });
}

// ── EMPLEADOS ────────────────────────────────────────────────

async function loadEmployees() {
  const res = await authGet('/api/employees');
  if (!res.success) { showToast('Error cargando empleados', 'error'); return; }
  _employees = (res.data?.data || res.data) || [];
  renderEmployeesTable();
  renderEmployeeStats();
}

function renderEmployeeStats() {
  setStatCard('emp-total',   _employees.length);
  setStatCard('emp-activos', _employees.filter(e => e.status === 'active').length);
}

function renderEmployeesTable() {
  const tbody = document.getElementById('employees-tbody');
  if (!tbody) return;

  if (_employees.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" class="px-6 py-8 text-center text-on-surface-variant">No hay empleados registrados.</td></tr>`;
    return;
  }

  tbody.innerHTML = _employees.map(emp => {
    const initials   = getInitials(emp.name);
    const permLabels = (emp.permissions || [])
      .map(p => p === 'tickets' ? 'Tickets' : p === 'access' ? 'Acceso' : p)
      .join(', ') || '—';
    const isActive   = emp.status === 'active';

    const statusHtml = isActive
      ? `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-tertiary-container/20 text-tertiary-fixed border border-tertiary/20">
           <span class="w-1.5 h-1.5 rounded-full bg-tertiary mr-1.5"></span>Activo
         </span>`
      : `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-error/10 text-error border border-error/20">
           <span class="w-1.5 h-1.5 rounded-full bg-error mr-1.5"></span>Inactivo
         </span>`;

    return `
      <tr class="hover:bg-surface-variant/30 transition-colors">
        <td class="px-6 py-4 font-label-sm text-on-surface-variant">EMP-${String(emp.id).padStart(3,'0')}</td>
        <td class="px-6 py-4">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center font-bold text-xs">${initials}</div>
            <div>
              <p class="font-bold text-on-surface">${emp.name}</p>
              <p class="text-sm text-on-surface-variant">${emp.email}</p>
              <p class="text-xs text-on-surface-variant opacity-60">${permLabels}</p>
            </div>
          </div>
        </td>
        <td class="px-6 py-4">${statusHtml}</td>
        <td class="px-6 py-4 text-right">
          <div class="flex items-center justify-end gap-2">
            <button onclick="openEditEmployeeModal(${emp.id})" class="material-symbols-outlined text-[18px] hover:text-primary transition-colors cursor-pointer">edit</button>
            <button onclick="toggleEmployeeStatus(${emp.id}, '${emp.status}')" class="material-symbols-outlined text-[18px] hover:text-error transition-colors cursor-pointer" title="${isActive ? 'Desactivar' : 'Activar'}">${isActive ? 'block' : 'check_circle'}</button>
            <button onclick="confirmDeleteEmployee(${emp.id})" class="material-symbols-outlined text-[18px] hover:text-error transition-colors cursor-pointer">delete</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

// ── PERFIL ───────────────────────────────────────────────────

async function loadProfile() {
  const res = await authGet('/api/profile');
  if (!res.success) return;
  const user = res.data;
  const nameInput  = document.getElementById('settings-name');
  const emailInput = document.getElementById('settings-email');
  const phoneInput = document.getElementById('settings-phone');
  if (nameInput)  nameInput.value  = user.name  || '';
  if (emailInput) emailInput.value = user.email || '';
  if (phoneInput) phoneInput.value = user.phone || '';
}

async function saveProfile(e) {
  e.preventDefault();
  const name  = document.getElementById('settings-name')?.value.trim();
  const phone = document.getElementById('settings-phone')?.value.trim();
  const btn   = e.target.querySelector('button[type="submit"]');
  if (btn) { btn.disabled = true; btn.textContent = 'Guardando...'; }

  const res = await authPut('/api/profile', { name, phone });

  if (btn) { btn.disabled = false; btn.textContent = 'Guardar Cambios'; }

  if (res.success) {
    showToast('Perfil actualizado correctamente');
    try {
      const stored = JSON.parse(localStorage.getItem('gt_user') || '{}');
      localStorage.setItem('gt_user', JSON.stringify({ ...stored, ...res.data }));
      const nameEl = document.getElementById('user-name-display');
      if (nameEl) nameEl.textContent = res.data.name || name;
    } catch {}
  } else {
    showToast(res.message || 'Error al actualizar perfil', 'error');
  }
}

// ── MODAL: FUNCIONES ─────────────────────────────────────────

function openNewPerformanceModal() {
  _editingPerf = null;
  document.getElementById('perf-modal-title').textContent = 'Nueva Función';
  document.getElementById('perf-form').reset();
  renderFunciones();
  toggleModal('perf-modal');
}

function openEditPerformanceModal(id) {
  const perf = _performances.find(p => p.id === id);
  if (!perf) return;
  _editingPerf = id;
  renderFunciones();
  document.getElementById('perf-modal-title').textContent   = 'Editar Función';
  document.getElementById('perf-play-id').value             = perf.playId         || '';
  document.getElementById('perf-date').value                = perf.performanceDate || '';
  document.getElementById('perf-start-time').value          = perf.startTime      || '';
  document.getElementById('perf-end-time').value            = perf.endTime        || '';
  document.getElementById('perf-price').value               = perf.ticketPrice    || '';
  document.getElementById('perf-sales-start').value         = (perf.salesStartDate || '').substring(0, 16);
  document.getElementById('perf-sales-end').value           = (perf.salesEndDate   || '').substring(0, 16);
  toggleModal('perf-modal');
}

async function savePerformance(e) {
  e.preventDefault();
  const payload = {
    playId:          parseInt(document.getElementById('perf-play-id').value),
    performanceDate: document.getElementById('perf-date').value,
    startTime:       document.getElementById('perf-start-time').value,
    endTime:         document.getElementById('perf-end-time').value,
    ticketPrice:     parseFloat(document.getElementById('perf-price').value),
    salesStartDate:  document.getElementById('perf-sales-start').value,
    salesEndDate:    document.getElementById('perf-sales-end').value,
  };

  const btn = e.target.querySelector('button[type="submit"]');
  if (btn) { btn.disabled = true; btn.textContent = 'Guardando...'; }

  const res = _editingPerf
    ? await updatePerformance(_editingPerf, payload)
    : await createPerformance(payload);

  if (btn) { btn.disabled = false; btn.textContent = 'Guardar'; }

  if (res.success) {
    showToast(_editingPerf ? 'Función actualizada' : 'Función creada');
    toggleModal('perf-modal');
    await loadPerformances();
  } else {
    showToast(res.message || 'Error al guardar función', 'error');
  }
}

async function confirmDeletePerformance(id) {
  if (!confirm('¿Eliminar esta función? Esta acción no se puede deshacer.')) return;
  const res = await deletePerformance(id);
  if (res.success) {
    showToast('Función eliminada');
    await loadPerformances();
  } else {
    showToast(res.message || 'Error al eliminar función', 'error');
  }
}

// ── MODAL: OBRAS ─────────────────────────────────────────────

function openNewPlayModal() {
  _editingPlay = null;
  document.getElementById('play-modal-title').textContent = 'Nueva Obra';
  document.getElementById('play-form').reset();
  toggleModal('play-modal');
}

function openEditPlayModal(id) {
  const play = _plays.find(p => p.id === id);
  if (!play) return;
  _editingPlay = id;
  document.getElementById('play-modal-title').textContent = 'Editar Obra';
  document.getElementById('play-name').value              = play.name        || '';
  document.getElementById('play-description').value       = play.description || '';
  document.getElementById('play-poster').value            = play.posterUrl   || '';
  toggleModal('play-modal');
}

// ── Helpers ──────────────────────────────────────────────────

function isValidHttpUrl(str) {
  try {
    const url = new URL(str);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

// ── SAVE PLAY FIX ────────────────────────────────────────────

async function savePlay(e) {
  e.preventDefault();

  const name = document.getElementById('play-name').value.trim();
  const description = document.getElementById('play-description').value.trim();
  const poster = document.getElementById('play-poster').value.trim();

  // Validación básica
  if (!name) {
    showToast('El nombre es requerido', 'error');
    return;
  }

  // Payload base
  const payload = {
    name,
    description: description || undefined,
  };

  // Validar posterUrl
  if (poster) {

    // Bloquear Base64
    if (poster.startsWith('data:image')) {
      showToast(
        'No puedes enviar imágenes en Base64. Usa una URL pública.',
        'error'
      );
      return;
    }

    // Validar URL
    if (!isValidHttpUrl(poster)) {
      showToast('La imagen debe ser una URL válida', 'error');
      return;
    }

    payload.posterUrl = poster;
  }

  console.log('TOKEN:', getToken());
  console.log('PAYLOAD:', payload);

  const btn = e.target.querySelector('button[type="submit"]');

  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Guardando...';
  }

  try {

    const res = _editingPlay
      ? await updatePlay(_editingPlay, payload)
      : await createPlay(payload);

    console.log('RESPONSE:', res);

    if (res.success) {

      showToast(
        _editingPlay
          ? 'Obra actualizada correctamente'
          : 'Obra creada correctamente'
      );

      toggleModal('play-modal');

      await loadPlays();
      await loadPerformances();

    } else {

      console.error('ERROR BACKEND:', res);

      showToast(
        res.message ||
        'Error al guardar la obra',
        'error'
      );
    }

  } catch (err) {

    console.error('SAVE PLAY ERROR:', err);

    showToast(
      'Error inesperado al guardar la obra',
      'error'
    );

  } finally {

    if (btn) {
      btn.disabled = false;
      btn.textContent = 'Guardar';
    }
  }
}
async function confirmDeletePlay(id) {
  if (!confirm('¿Eliminar esta obra? Esta acción no se puede deshacer.')) return;
  const res = await deletePlay(id);
  if (res.success) {
    showToast('Obra eliminada');
    await loadPlays();
  } else {
    showToast(res.message || 'Error al eliminar obra', 'error');
  }
}

// ── MODAL: EMPLEADOS ─────────────────────────────────────────

function openNewEmployeeModal() {
  _editingEmp = null;
  document.getElementById('emp-modal-title').textContent = 'Nuevo Empleado';
  document.getElementById('emp-form').reset();
  document.getElementById('emp-password').placeholder = 'Contraseña (mín. 8 caracteres)';
  toggleModal('emp-modal');
}

function openEditEmployeeModal(id) {
  const emp = _employees.find(e => e.id === id);
  if (!emp) return;
  _editingEmp = id;
  document.getElementById('emp-modal-title').textContent    = 'Editar Empleado';
  document.getElementById('emp-name').value                 = emp.name  || '';
  document.getElementById('emp-email').value                = emp.email || '';
  document.getElementById('emp-phone').value                = emp.phone || '';
  document.getElementById('emp-password').value             = '';
  document.getElementById('emp-password').placeholder       = 'Dejar en blanco para no cambiar';
  document.getElementById('emp-perm-tickets').checked       = (emp.permissions || []).includes('tickets');
  document.getElementById('emp-perm-access').checked        = (emp.permissions || []).includes('access');
  toggleModal('emp-modal');
}

async function saveEmployee(e) {
  e.preventDefault();
  const permissions = [];
  if (document.getElementById('emp-perm-tickets').checked) permissions.push('tickets');
  if (document.getElementById('emp-perm-access').checked)  permissions.push('access');

  const payload = {
    name:        document.getElementById('emp-name').value.trim(),
    email:       document.getElementById('emp-email').value.trim(),
    phone:       document.getElementById('emp-phone').value.trim() || undefined,
    permissions,
  };
  const pw = document.getElementById('emp-password').value;
  if (pw) payload.password = pw;

  const btn = e.target.querySelector('button[type="submit"]');
  if (btn) { btn.disabled = true; btn.textContent = 'Guardando...'; }

  let res;
  if (_editingEmp) {
    res = await authPut(`/api/employees/${_editingEmp}`, payload);
  } else {
    if (!payload.password) {
      showToast('La contraseña es requerida para nuevos empleados', 'error');
      if (btn) { btn.disabled = false; btn.textContent = 'Guardar'; }
      return;
    }
    res = await authPost('/api/employees', payload);
  }

  if (btn) { btn.disabled = false; btn.textContent = 'Guardar'; }

  if (res.success) {
    showToast(_editingEmp ? 'Empleado actualizado' : 'Empleado creado');
    toggleModal('emp-modal');
    await loadEmployees();
  } else {
    const msg = res.message || (res.errors ? Object.values(res.errors).flat().join(' ') : 'Error al guardar empleado');
    showToast(msg, 'error');
  }
}

async function toggleEmployeeStatus(id, currentStatus) {
  const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
  if (!confirm(`¿Deseas ${newStatus === 'inactive' ? 'desactivar' : 'activar'} este empleado?`)) return;
  const res = await authPatch(`/api/employees/${id}/status`, { status: newStatus });
  if (res.success) {
    showToast(`Empleado ${newStatus === 'active' ? 'activado' : 'desactivado'}`);
    await loadEmployees();
  } else {
    showToast(res.message || 'Error al cambiar estado', 'error');
  }
}

async function confirmDeleteEmployee(id) {
  if (!confirm('¿Eliminar este empleado?')) return;
  const res = await authDelete(`/api/employees/${id}`);
  if (res.success) {
    showToast('Empleado eliminado');
    await loadEmployees();
  } else {
    showToast(res.message || 'Error al eliminar empleado', 'error');
  }
}

// ── Exponer al scope global (onclick= en HTML) ────────────────

window.openNewPerformanceModal  = openNewPerformanceModal;
window.openEditPerformanceModal = openEditPerformanceModal;
window.confirmDeletePerformance = confirmDeletePerformance;
window.openNewPlayModal         = openNewPlayModal;
window.openEditPlayModal        = openEditPlayModal;
window.confirmDeletePlay        = confirmDeletePlay;
window.openNewEmployeeModal     = openNewEmployeeModal;
window.openEditEmployeeModal    = openEditEmployeeModal;
window.toggleEmployeeStatus     = toggleEmployeeStatus;
window.confirmDeleteEmployee    = confirmDeleteEmployee;
window.openNewFunctionModal     = openNewPerformanceModal; // alias legacy

// ── Init (los módulos ES tienen defer automático) ─────────────

document.getElementById('perf-form')
  ?.addEventListener('submit', savePerformance);
document.getElementById('play-form')
  ?.addEventListener('submit', savePlay);
document.getElementById('emp-form')
  ?.addEventListener('submit', saveEmployee);
document.getElementById('settings-profile-form')
  ?.addEventListener('submit', saveProfile);

document.getElementById('btn-nueva-funcion')
  ?.addEventListener('click', openNewPerformanceModal);
document.getElementById('btn-nueva-obra')
  ?.addEventListener('click', openNewPlayModal);
document.getElementById('btn-nuevo-empleado')
  ?.addEventListener('click', openNewEmployeeModal);

loadPlays();
loadPerformances();
loadEmployees();
loadProfile();