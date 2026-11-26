const STORAGE_KEY = 'remontzayavki_leads';
const THEME_KEY = 'remontzayavki_theme';

const els = {
  themeToggle: document.getElementById('themeToggle'),
  tabs: document.querySelectorAll('.tab'),
  views: document.querySelectorAll('.view'),
  leadForm: document.getElementById('leadForm'),
  submitBtn: document.getElementById('submitBtn'),
  successCard: document.getElementById('successCard'),
  successId: document.getElementById('successId'),
  newLeadBtn: document.getElementById('newLeadBtn'),
  badgeCount: document.getElementById('badgeCount'),
  leadsList: document.getElementById('leadsList'),
  emptyState: document.getElementById('emptyState'),
  searchInput: document.getElementById('searchInput'),
  statusFilter: document.getElementById('statusFilter'),
  resultsCount: document.getElementById('resultsCount'),
  exportBtn: document.getElementById('exportBtn'),
  clearBtn: document.getElementById('clearBtn'),
};

let leads = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');

function init() {
  setTheme(getSavedTheme());
  els.themeToggle.addEventListener('click', toggleTheme);
  els.tabs.forEach(tab => tab.addEventListener('click', () => switchView(tab.dataset.view)));
  els.leadForm.addEventListener('submit', handleLeadSubmit);
  els.newLeadBtn.addEventListener('click', () => {
    els.successCard.hidden = true;
    els.leadForm.hidden = false;
    els.leadForm.reset();
    clearErrors();
  });
  els.searchInput.addEventListener('input', renderAdmin);
  els.statusFilter.addEventListener('change', renderAdmin);
  els.exportBtn.addEventListener('click', exportCSV);
  els.clearBtn.addEventListener('click', clearAll);
  renderAdmin();
}

function getSavedTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  if (saved) return saved;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function setTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem(THEME_KEY, theme);
  els.themeToggle.textContent = theme === 'dark' ? '☀️' : '🌙';
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  setTheme(current === 'dark' ? 'light' : 'dark');
}

function switchView(view) {
  els.tabs.forEach(t => t.classList.toggle('active', t.dataset.view === view));
  els.views.forEach(v => v.classList.toggle('active', v.id === `view-${view}`));
  if (view === 'admin') renderAdmin();
}

function clearErrors() {
  document.querySelectorAll('.field.invalid').forEach(f => f.classList.remove('invalid'));
  document.querySelectorAll('.error').forEach(e => { e.textContent = ''; e.classList.remove('show'); });
}

function showError(fieldId, message) {
  const field = document.getElementById(fieldId).closest('.field');
  const error = field.querySelector('.error');
  field.classList.add('invalid');
  error.textContent = message;
  error.classList.add('show');
}

function validateForm() {
  clearErrors();
  let valid = true;
  const name = els.leadForm.name.value.trim();
  const phone = els.leadForm.phone.value.trim();
  const type = els.leadForm.type.value;
  if (!name) { showError('f-name', 'Введите имя'); valid = false; }
  const phoneDigits = phone.replace(/\D/g, '');
  if (!phone || phoneDigits.length < 10) { showError('f-phone', 'Введите корректный телефон'); valid = false; }
  if (!type) { showError('f-type', 'Выберите тип работ'); valid = false; }
  return valid;
}

function handleLeadSubmit(e) {
  e.preventDefault();
  if (!validateForm()) return;
  els.submitBtn.disabled = true;
  els.submitBtn.textContent = 'Отправка...';
  setTimeout(() => {
    const lead = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2),
      name: els.leadForm.name.value.trim(),
      phone: els.leadForm.phone.value.trim(),
      type: els.leadForm.type.value,
      area: els.leadForm.area.value.trim(),
      budget: els.leadForm.budget.value.trim(),
      desc: els.leadForm.desc.value.trim(),
      status: 'new',
      createdAt: new Date().toISOString(),
    };
    leads.unshift(lead);
    saveLeads();
    els.submitBtn.disabled = false;
    els.submitBtn.textContent = 'Отправить заявку';
    els.leadForm.hidden = true;
    els.successId.textContent = lead.id;
    els.successCard.hidden = false;
    renderAdmin();
  }, 600);
}

function saveLeads() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(leads));
  els.badgeCount.textContent = leads.length;
}

function renderAdmin() {
  const q = els.searchInput.value.toLowerCase();
  const status = els.statusFilter.value;
  const filtered = leads.filter(l => {
    const matchText = [l.name, l.phone, l.type, l.desc].join(' ').toLowerCase().includes(q);
    const matchStatus = status === 'all' || l.status === status;
    return matchText && matchStatus;
  });
  els.leadsList.innerHTML = '';
  if (filtered.length === 0) {
    els.emptyState.hidden = false;
    els.resultsCount.textContent = 'Нет совпадений';
    return;
  }
  els.emptyState.hidden = true;
  els.resultsCount.textContent = `Найдено: ${filtered.length}`;
  filtered.forEach(l => {
    const card = document.createElement('article');
    card.className = 'lead-card';
    card.dataset.id = l.id;
    const date = new Date(l.createdAt).toLocaleString('ru-RU');
    card.innerHTML = `
      <div class="lead-head">
        <div>
          <div style="font-weight:700">${escapeHtml(l.name)}</div>
          <div style="font-size:0.9rem;color:var(--text-muted)">${escapeHtml(l.phone)}</div>
        </div>
        <span class="status-badge status-${l.status}">${statusLabel(l.status)}</span>
      </div>
      <div class="lead-meta">
        <span>Тип: ${escapeHtml(l.type)}</span>
        ${l.area ? `<span>Площадь: ${escapeHtml(l.area)}</span>` : ''}
        ${l.budget ? `<span>Бюджет: ${escapeHtml(l.budget)} ₽</span>` : ''}
        <span>Дата: ${date}</span>
      </div>
      ${l.desc ? `<div style="font-size:0.9rem;color:var(--text);margin-top:6px">${escapeHtml(l.desc)}</div>` : ''}
      <div class="lead-actions">
        <select class="status-select" data-id="${l.id}">
          <option value="new" ${l.status === 'new' ? 'selected' : ''}>Новая</option>
          <option value="progress" ${l.status === 'progress' ? 'selected' : ''}>В работе</option>
          <option value="done" ${l.status === 'done' ? 'selected' : ''}>Закрыта</option>
        </select>
        <button class="btn-ghost danger delete-lead" data-id="${l.id}" style="padding:6px 10px;font-size:0.85rem">Удалить</button>
      </div>
    `;
    els.leadsList.appendChild(card);
  });
}

function statusLabel(s) { return { new: 'Новая', progress: 'В работе', done: 'Закрыта' }[s] || s; }

function escapeHtml(t) { return String(t).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;" }[c])); }

els.leadsList.addEventListener('change', e => {
  if (e.target.classList.contains('status-select')) {
    const id = e.target.dataset.id;
    const lead = leads.find(l => l.id === id);
    if (lead) { lead.status = e.target.value; saveLeads(); renderAdmin(); }
  }
});

els.leadsList.addEventListener('click', e => {
  const btn = e.target.closest('.delete-lead');
  if (!btn) return;
  if (!confirm('Удалить заявку безвозвратно?')) return;
  leads = leads.filter(l => l.id !== btn.dataset.id);
  saveLeads();
  renderAdmin();
});

function exportCSV() {
  if (leads.length === 0) { alert('Нет данных для экспорта'); return; }
  const headers = ['ID','Имя','Телефон','Тип работ','Площадь','Бюджет','Описание','Статус','Дата'];
  const rows = leads.map(l => [
    l.id, l.name, l.phone, l.type, l.area, l.budget, l.desc, statusLabel(l.status), new Date(l.createdAt).toLocaleString('ru-RU')
  ]);
  const csv = [headers.join(';'), ...rows.map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(';'))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `remont-zayavki-${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function clearAll() {
  if (!confirm('Очистить все заявки? Это нельзя отменить.')) return;
  leads = [];
  saveLeads();
  renderAdmin();
}

document.addEventListener('DOMContentLoaded', init);
