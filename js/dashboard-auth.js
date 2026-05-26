// ─────────────────────────────────────────────
//  dashboard-auth.js  —  Gran Teatro Admin
//  Guard de sesión, info del usuario y logout
// ─────────────────────────────────────────────

const AUTH_BASE_URL = 'https://service.auth.nebula.andrescortes.dev';

const STORAGE_KEYS = {
  TOKEN: 'gt_token',
  USER:  'gt_user',
};

// ── Helpers de sesión ──────────────────────────

function getToken() {
  return localStorage.getItem(STORAGE_KEYS.TOKEN);
}

function getUser() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.USER));
  } catch {
    return null;
  }
}

function clearSession() {
  localStorage.removeItem(STORAGE_KEYS.TOKEN);
  localStorage.removeItem(STORAGE_KEYS.USER);
}

function decodeJwtPayload(token) {
  try {
    const base64Payload = token.split('.')[1];
    const decoded = atob(base64Payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

function isSessionValid() {
  const token = getToken();
  if (!token) return false;
  const payload = decodeJwtPayload(token);
  if (!payload) return false;
  return payload.exp * 1000 > Date.now();
}

// ── Auth Guard ─────────────────────────────────
// Si no hay sesión válida, redirigir al login

function guardSession() {
  if (!isSessionValid()) {
    clearSession();
    window.location.href = '../index.html';
    return false;
  }
  return true;
}

// ── Poblar UI con datos del usuario ───────────

function loadUserIntoUI() {
  const user = getUser();
  if (!user) return;

  // Nombre en el header
  const nameEl = document.getElementById('user-name-display');
  if (nameEl) nameEl.textContent = user.name || 'Administrador';

  // Rol/label debajo del nombre
  const roleEl = document.getElementById('user-role-display');
  if (roleEl) {
    const roleLabels = { admin: 'Superusuario', employee: 'Empleado', client: 'Cliente' };
    roleEl.textContent = roleLabels[user.role] || user.role;
  }

  // Avatar
  const avatarEl = document.getElementById('user-avatar');
  if (avatarEl && user.avatar_url) {
    avatarEl.src = user.avatar_url;
    avatarEl.alt = user.name || 'Avatar';
  } else if (avatarEl) {
    // Iniciales como fallback si no hay avatar
    const initials = (user.name || 'A')
      .split(' ')
      .map(n => n[0])
      .slice(0, 2)
      .join('');
    avatarEl.style.display = 'none';
    const sibling = avatarEl.nextElementSibling;
    if (sibling && sibling.classList.contains('avatar-fallback')) {
      sibling.textContent = initials;
    }
  }
}

// ── Logout ─────────────────────────────────────

async function logout() {
  const btn = document.getElementById('logout-btn');
  if (btn) {
    btn.style.pointerEvents = 'none';
    btn.style.opacity = '0.6';
  }

  try {
    await fetch(`${AUTH_BASE_URL}/api/auth/logout`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${getToken()}`,
        'Accept': 'application/json',
      },
    });
  } catch (err) {
    // El logout es stateless: aunque falle la petición, limpiamos localmente
    console.warn('[dashboard-auth] logout request failed, clearing session anyway:', err);
  } finally {
    clearSession();
    window.location.href = '../index.html';
  }
}

// ── Init ───────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  if (!guardSession()) return;

  loadUserIntoUI();

  document.getElementById('logout-btn')
    ?.addEventListener('click', (e) => { e.preventDefault(); logout(); });
});