const projectGrid = document.querySelector('#project-grid');
const contactForm = document.querySelector('#contact-form');
const formStatus = document.querySelector('#form-status');
const adminOverlay = document.querySelector('#admin-overlay');
const liveTime = document.querySelector('#live-time');
const liveDate = document.querySelector('#live-date');
const authOverlay = document.querySelector('#auth-overlay');
const authForm = document.querySelector('#auth-form');
const authStatus = document.querySelector('#auth-status');
const authSwitch = document.querySelector('#auth-switch');
const accountOpen = document.querySelector('#account-open');
const accountMenu = document.querySelector('#account-menu');
const settingsOverlay = document.querySelector('#settings-overlay');
const motionToggle = document.querySelector('#motion-toggle');
const accentSelect = document.querySelector('#accent-select');
const adminLoginOverlay = document.querySelector('#admin-login-overlay');
const adminLoginForm = document.querySelector('#admin-login-form');
const adminLoginStatus = document.querySelector('#admin-login-status');
const adminLoginClose = document.querySelector('#admin-login-close');
const adminLogout = document.querySelector('#admin-logout');
const projectForm = document.querySelector('#project-form');
const projectFormTitle = document.querySelector('#project-form-title');
const projectFormTag = document.querySelector('#project-form-tag');
const projectId = document.querySelector('#project-id');
const projectSubmit = document.querySelector('#project-submit');
const projectCancel = document.querySelector('#project-cancel');
const projectStatus = document.querySelector('#project-status');
const accentPicker = document.querySelector('#project-accent-picker');
const adminState = {projects: [], messages: []};
let authMode = 'login';

function showStatus(element, message, error = false) {
  element.textContent = message;
  element.style.color = error ? '#ff8b8b' : '';
}

function updateClock() {
  const now = new Date();
  liveTime.textContent = now.toLocaleTimeString('tr-TR', {hour12: false});
  liveDate.textContent = now.toLocaleDateString('tr-TR', {day: '2-digit', month: '2-digit', year: 'numeric'});
}

function updateAuthMode() {
  const register = authMode === 'register';
  document.querySelector('#auth-title').textContent = register ? 'Kayıt ol.' : 'Giriş yap.';
  document.querySelector('#auth-subtitle').textContent = register ? 'Yeni hesabını oluştur ve portföy alanına katıl.' : 'Portföy alanına devam etmek için hesabına giriş yap.';
  document.querySelector('#auth-submit').innerHTML = register ? 'Kayıt ol <span>↗</span>' : 'Giriş yap <span>↗</span>';
  authSwitch.textContent = register ? 'Zaten hesabın var mı? Giriş yap' : 'Hesabın yok mu? Kayıt ol';
  authStatus.textContent = '';
}

async function refreshUserSession() {
  const response = await fetch('/api/auth/session');
  const data = await response.json();
  accountOpen.textContent = data.authenticated ? 'Hesabım' : 'Giriş yap';
  document.querySelector('#account-email').textContent = data.email || '—';
  accountOpen.classList.toggle('logged-in', data.authenticated);
}

function applyPreferences() {
  const theme = localStorage.getItem('tottox-theme') || 'dark';
  const accent = localStorage.getItem('tottox-accent') || '#b7ff3d';
  const reducedMotion = localStorage.getItem('tottox-motion') === 'reduced';
  document.documentElement.classList.toggle('light-theme', theme === 'light');
  document.documentElement.classList.toggle('reduced-motion', reducedMotion);
  document.documentElement.style.setProperty('--lime', accent);
  document.querySelectorAll('[data-theme]').forEach((button) => button.classList.toggle('active', button.dataset.theme === theme));
  accentSelect.value = accent;
  motionToggle.checked = !reducedMotion;
}

function renderProjects(projects) {
  projectGrid.replaceChildren();
  projects.forEach((project) => {
    const card = document.createElement('article');
    card.className = 'project-card';
    card.style.setProperty('--accent', project.accent);
    card.innerHTML = `<div class="project-meta"><span class="project-tag">${project.category}</span><span>0${project.id}</span></div><div><h3>${project.title}</h3><p>${project.description}</p></div><div class="project-footer"><span>Selected work</span><span class="project-arrow">↗</span></div>`;
    projectGrid.append(card);
  });
}

async function loadProjects() {
  const response = await fetch('/api/projects');
  renderProjects(await response.json());
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function renderDeleteList(container, items, emptyText, mapItem) {
  container.replaceChildren();
  if (!items.length) {
    container.innerHTML = `<p class="empty">${emptyText}</p>`;
    return;
  }
  items.forEach((item) => container.append(mapItem(item)));
}

async function loadAdmin() {
  const response = await fetch('/api/admin/summary');
  if (response.status === 401) {
    adminState.projects = [];
    adminState.messages = [];
    renderAdminLists();
    throw new Error('Oturum sona erdi.');
  }
  const data = await response.json();
  adminState.projects = data.projects || [];
  adminState.messages = data.messages || [];
  document.querySelector('#metric-messages').textContent = data.message_count;
  document.querySelector('#metric-projects').textContent = data.project_count;
  document.querySelector('#badge-messages').textContent = data.message_count;
  document.querySelector('#badge-projects').textContent = data.project_count;
  document.querySelector('#admin-status-meta').textContent = `proje ${data.project_count} / mesaj ${data.message_count}`;
  renderAdminLists();
}

function renderAdminLists() {
  renderDeleteList(document.querySelector('#message-list'), adminState.messages, 'Henüz mesaj yok.', (message) => {
    const item = document.createElement('div');
    item.className = 'message-item';
    item.innerHTML = `<div><strong>${escapeHtml(message.name)}</strong><small>${escapeHtml(message.email)}</small><p>${escapeHtml(message.message)}</p></div><button class="delete-button" type="button" data-delete="messages" data-id="${message.id}">Sil</button>`;
    return item;
  });
  renderDeleteList(document.querySelector('#project-list'), adminState.projects, 'Henüz proje yok.', (project) => {
    const item = document.createElement('div');
    item.className = 'message-item';
    item.innerHTML = `<div><strong>${escapeHtml(project.title)}</strong><small>${escapeHtml(project.category)} · ${escapeHtml(project.accent)}</small><p>${escapeHtml(project.description)}</p></div><div class="item-actions"><button class="edit-button" type="button" data-edit="${project.id}">Düzenle</button><button class="delete-button" type="button" data-delete="projects" data-id="${project.id}">Sil</button></div>`;
    return item;
  });
}

function switchTab(name) {
  document.querySelectorAll('.admin-tab').forEach((tab) => {
    const active = tab.dataset.tab === name;
    tab.classList.toggle('active', active);
    tab.setAttribute('aria-selected', String(active));
  });
  document.querySelector('#panel-projects').hidden = name !== 'projects';
  document.querySelector('#panel-messages').hidden = name !== 'messages';
}

function resetProjectForm() {
  projectForm.reset();
  projectId.value = '';
  projectFormTitle.textContent = 'Yeni proje';
  projectFormTag.textContent = 'CREATE';
  projectSubmit.innerHTML = 'Projeyi ekle <span>↗</span>';
  projectCancel.hidden = true;
  accentPicker.value = '#b6ff3f';
  showStatus(projectStatus, '');
}

function startProjectEdit(id) {
  const project = adminState.projects.find((entry) => String(entry.id) === String(id));
  if (!project) return;
  switchTab('projects');
  projectId.value = project.id;
  projectForm.elements.title.value = project.title;
  projectForm.elements.category.value = project.category;
  projectForm.elements.description.value = project.description;
  accentPicker.value = project.accent || '#b6ff3f';
  projectForm.elements.accent.value = accentPicker.value;
  projectFormTitle.textContent = 'Projeyi düzenle';
  projectFormTag.textContent = 'UPDATE';
  projectSubmit.innerHTML = 'Değişiklikleri kaydet <span>↗</span>';
  projectCancel.hidden = false;
  showStatus(projectStatus, '');
  projectForm.elements.title.focus();
}

contactForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const button = contactForm.querySelector('button');
  button.disabled = true;
  showStatus(formStatus, 'Gönderiliyor...');
  const data = Object.fromEntries(new FormData(contactForm));
  try {
    const response = await fetch('/api/messages', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(data) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error);
    contactForm.reset();
    showStatus(formStatus, result.message);
  } catch (error) {
    showStatus(formStatus, error.message || 'Bir hata oluştu.', true);
  } finally {
    button.disabled = false;
  }
});

function openAdminLogin() {
  adminLoginStatus.textContent = '';
  adminLoginOverlay.classList.add('open');
  adminLoginOverlay.setAttribute('aria-hidden', 'false');
  adminLoginForm.elements.password.value = '';
  adminLoginForm.elements.password.focus();
}

function closeAdminLogin() {
  adminLoginOverlay.classList.remove('open');
  adminLoginOverlay.setAttribute('aria-hidden', 'true');
}

async function openAdminPanel() {
  const sessionResponse = await fetch('/api/admin/session');
  const currentSession = await sessionResponse.json();
  if (!currentSession.authenticated) {
    openAdminLogin();
    return;
  }
  adminOverlay.classList.add('open');
  adminOverlay.setAttribute('aria-hidden', 'false');
  resetProjectForm();
  try {
    await loadAdmin();
  } catch {
    adminOverlay.classList.remove('open');
    adminOverlay.setAttribute('aria-hidden', 'true');
    openAdminLogin();
  }
}

document.querySelector('#admin-open').addEventListener('click', () => {
  openAdminPanel().catch(() => openAdminLogin());
});

adminLoginClose.addEventListener('click', closeAdminLogin);
adminLoginOverlay.addEventListener('click', (event) => {
  if (event.target === adminLoginOverlay) closeAdminLogin();
});

adminLoginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const button = adminLoginForm.querySelector('button');
  const password = adminLoginForm.elements.password.value;
  button.disabled = true;
  showStatus(adminLoginStatus, 'Kontrol ediliyor...');
  try {
    const response = await fetch('/api/admin/login', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({password})
    });
    const result = await response.json();
    if (!response.ok) {
      showStatus(adminLoginStatus, result.error || 'Giriş yapılamadı.', true);
      adminLoginForm.elements.password.select();
      return;
    }
    closeAdminLogin();
    showStatus(adminLoginStatus, '');
    adminOverlay.classList.add('open');
    adminOverlay.setAttribute('aria-hidden', 'false');
    resetProjectForm();
    await loadAdmin();
  } catch {
    showStatus(adminLoginStatus, 'Sunucuya ulaşılamadı.', true);
  } finally {
    button.disabled = false;
  }
});

adminLogout.addEventListener('click', async () => {
  await fetch('/api/admin/logout', {method: 'POST'});
  adminOverlay.classList.remove('open');
  adminOverlay.setAttribute('aria-hidden', 'true');
  resetProjectForm();
  openAdminLogin();
});

document.querySelectorAll('.admin-tab').forEach((tab) => {
  tab.addEventListener('click', () => switchTab(tab.dataset.tab));
});

projectCancel.addEventListener('click', resetProjectForm);

accentPicker.addEventListener('input', () => {
  projectForm.elements.accent.value = accentPicker.value;
});
projectForm.elements.accent.addEventListener('input', (event) => {
  const value = event.target.value.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(value)) accentPicker.value = value;
});

projectForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const editingId = projectId.value;
  const payload = {
    title: projectForm.elements.title.value,
    category: projectForm.elements.category.value,
    description: projectForm.elements.description.value,
    accent: projectForm.elements.accent.value
  };
  projectSubmit.disabled = true;
  showStatus(projectStatus, 'Kaydediliyor...');
  try {
    const response = await fetch(
      editingId ? `/api/admin/projects/${editingId}` : '/api/admin/projects',
      {method: editingId ? 'PUT' : 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(payload)}
    );
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      showStatus(projectStatus, result.error || 'Kaydedilemedi.', true);
      return;
    }
    resetProjectForm();
    showStatus(projectStatus, result.message);
    await loadAdmin();
    await loadProjects();
  } catch {
    showStatus(projectStatus, 'Sunucuya ulaşılamadı.', true);
  } finally {
    projectSubmit.disabled = false;
  }
});
document.querySelector('#admin-close').addEventListener('click', () => {
  adminOverlay.classList.remove('open');
  adminOverlay.setAttribute('aria-hidden', 'true');
});
adminOverlay.addEventListener('click', (event) => {
  if (event.target === adminOverlay) adminOverlay.classList.remove('open');
});
document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape') return;
  if (adminLoginOverlay.classList.contains('open')) closeAdminLogin();
  adminOverlay.classList.remove('open');
  adminOverlay.setAttribute('aria-hidden', 'true');
});

adminOverlay.addEventListener('click', async (event) => {
  const editButton = event.target.closest('[data-edit]');
  if (editButton) {
    startProjectEdit(editButton.dataset.edit);
    return;
  }
  const button = event.target.closest('[data-delete]');
  if (!button) return;
  const kind = button.dataset.delete;
  const id = button.dataset.id;
  const label = kind === 'projects' ? 'projeyi' : 'mesajı';
  if (!window.confirm(`Bu ${label} silmek istiyor musun?`)) return;
  button.disabled = true;
  const response = await fetch(`/api/admin/${kind}/${id}`, { method: 'DELETE' });
  if (!response.ok) {
    const result = await response.json().catch(() => ({}));
    window.alert(result.error || 'Silinemedi.');
    button.disabled = false;
    return;
  }
  await loadAdmin();
  if (kind === 'projects') await loadProjects();
});

loadProjects().catch(() => showStatus(formStatus, 'Projeler yüklenemedi.', true));
refreshUserSession();
applyPreferences();
updateClock();
setInterval(updateClock, 1000);

accountOpen.addEventListener('click', async () => {
  const response = await fetch('/api/auth/session');
  const data = await response.json();
  if (data.authenticated) {
    accountMenu.classList.toggle('open');
    accountMenu.setAttribute('aria-hidden', String(!accountMenu.classList.contains('open')));
    return;
  }
  authMode = 'login';
  updateAuthMode();
  authOverlay.classList.add('open');
  authOverlay.setAttribute('aria-hidden', 'false');
});

document.querySelector('#logout-button').addEventListener('click', async () => {
  await fetch('/api/auth/logout', {method: 'POST'});
  accountMenu.classList.remove('open');
  await refreshUserSession();
});
document.querySelector('#settings-open').addEventListener('click', () => {
  accountMenu.classList.remove('open');
  settingsOverlay.classList.add('open');
  settingsOverlay.setAttribute('aria-hidden', 'false');
});
document.querySelector('#settings-close').addEventListener('click', () => {
  settingsOverlay.classList.remove('open');
  settingsOverlay.setAttribute('aria-hidden', 'true');
});
settingsOverlay.addEventListener('click', (event) => {
  if (event.target === settingsOverlay) settingsOverlay.classList.remove('open');
});
document.addEventListener('click', (event) => {
  if (!event.target.closest('.account-area')) accountMenu.classList.remove('open');
});
document.querySelectorAll('[data-theme]').forEach((button) => button.addEventListener('click', () => {
  localStorage.setItem('tottox-theme', button.dataset.theme);
  applyPreferences();
}));
accentSelect.addEventListener('change', () => {
  localStorage.setItem('tottox-accent', accentSelect.value);
  applyPreferences();
});
motionToggle.addEventListener('change', () => {
  localStorage.setItem('tottox-motion', motionToggle.checked ? 'full' : 'reduced');
  applyPreferences();
});

document.querySelector('#auth-close').addEventListener('click', () => {
  authOverlay.classList.remove('open');
  authOverlay.setAttribute('aria-hidden', 'true');
});
authOverlay.addEventListener('click', (event) => {
  if (event.target === authOverlay) authOverlay.classList.remove('open');
});
authSwitch.addEventListener('click', () => {
  authMode = authMode === 'login' ? 'register' : 'login';
  updateAuthMode();
});
authForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(authForm));
  const endpoint = authMode === 'register' ? '/api/auth/register' : '/api/auth/login';
  const response = await fetch(endpoint, {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(data)});
  const result = await response.json();
  if (!response.ok) {
    showStatus(authStatus, result.error, true);
    return;
  }
  authOverlay.classList.remove('open');
  authOverlay.setAttribute('aria-hidden', 'true');
  authForm.reset();
  await refreshUserSession();
});
