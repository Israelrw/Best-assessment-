/* ═══════════════════════════════════════════════
   Best Assessment — Navigation Component
   Auto-hide navbar + Profile dropdown
   ═══════════════════════════════════════════════ */

function buildNav(activePage) {
  const user = IA.getCurrentUser();
  if (!user) { window.location.href = 'login.html'; return; }

  const plan = IA.getUserPlan(user);
  const planLabel = IA.plans[plan]?.name || 'Free';

  const initials = (user.firstName[0] + user.lastName[0]).toUpperCase();
  const avatarContent = user.avatar
    ? `<img src="${user.avatar}" alt="avatar"/>`
    : initials;

  const navPages = [
    { id: 'admin',    label: 'Tests',    href: 'tests.html' },
    { id: 'results',  label: 'Results',  href: 'results.html' },
    { id: 'settings', label: 'Settings', href: 'settings.html' },
    { id: 'guide',    label: 'Guide',    href: 'guide.html' },
    { id: 'lessonplan',  label: '📚 Lessons', href: 'lessonplan.html' }
  ];

  const navLinks = navPages.map(p =>
    `<button class="nav-item${activePage === p.id ? ' active' : ''}" onclick="window.location.href='${p.href}'">${p.label}</button>`
  ).join('');

  const headerHTML = `
    <div class="logo">
      <div class="logo-mark">BA</div>
      <span class="logo-text">Best Assessment</span>
    </div>
    <nav class="site-nav" id="siteNav">
      ${navLinks}
      <div class="nav-divider"></div>
      <div class="nav-profile" id="navProfile" onclick="toggleProfileMenu()" title="Profile">${avatarContent}</div>
    </nav>
  `;

  const header = document.querySelector('.site-header');
  if (header) header.innerHTML = headerHTML;

  // Build profile dropdown
  const dd = document.createElement('div');
  dd.className = 'profile-dropdown';
  dd.id = 'profileDropdown';
  dd.innerHTML = `
    <div class="pd-head">
      <div class="pd-avatar" id="pdAvatar" onclick="openChangePhoto()" title="Change photo">
        ${avatarContent}
        <div class="pd-avatar-overlay">📷</div>
      </div>
      <div class="pd-info">
        <div class="pd-name">${user.firstName} ${user.lastName}</div>
        <div class="pd-email">${user.email}</div>
        <div class="pd-plan">${planLabel} Plan</div>
      </div>
    </div>
    <div class="pd-body">
      <div class="pd-item" onclick="openChangeCredentials()">
        <span class="pi-icon">✏️</span> Change Username / Password
      </div>
      <div class="pd-item" onclick="openChangePhoto()">
        <span class="pi-icon">📷</span> Change Profile Photo
      </div>
      <div class="pd-item" onclick="window.location.href='settings.html'">
        <span class="pi-icon">⚙️</span> Settings
      </div>
      <div class="pd-item" onclick="window.location.href='upgrade.html'">
        <span class="pi-icon">⭐</span> Upgrade Plan
      </div>
      <div class="pd-sep"></div>
      <div class="pd-item danger" onclick="IA.logout()">
        <span class="pi-icon">🚪</span> Sign Out
      </div>
    </div>
  `;
  document.body.appendChild(dd);

  // Close dropdown when clicking outside
  document.addEventListener('click', e => {
    if (!e.target.closest('#profileDropdown') && !e.target.closest('#navProfile')) {
      document.getElementById('profileDropdown')?.classList.remove('open');
    }
  });

  // Auto-hide navbar on scroll
  let lastScroll = 0, navVisible = true;
  window.addEventListener('scroll', () => {
    const curr = window.scrollY;
    const hdr = document.querySelector('.site-header');
    if (!hdr) return;
    if (curr > lastScroll + 10 && curr > 80) {
      if (navVisible) { hdr.classList.add('nav-hidden'); navVisible = false; }
    } else if (curr < lastScroll - 5) {
      if (!navVisible) { hdr.classList.remove('nav-hidden'); navVisible = true; }
    }
    lastScroll = curr;
  });

  // Show nav on mouse near top
  document.addEventListener('mousemove', e => {
    if (e.clientY < 20) {
      const hdr = document.querySelector('.site-header');
      if (hdr) { hdr.classList.remove('nav-hidden'); navVisible = true; }
    }
  });
}

function toggleProfileMenu() {
  const dd = document.getElementById('profileDropdown');
  if (dd) dd.classList.toggle('open');
}

function openChangeCredentials() {
  document.getElementById('profileDropdown')?.classList.remove('open');
  const user = IA.getCurrentUser();
  const modal = createModal('Change Credentials', `
    <div class="auth-form" style="gap:14px">
      <div class="form-group">
        <label>New Username</label>
        <input type="text" id="ccUser" value="${user.username}" placeholder="username"/>
      </div>
      <div class="form-group">
        <label>New Password <small>(leave blank to keep current)</small></label>
        <div class="pass-input-wrap">
          <input type="password" id="ccPass" placeholder="new password"/>
          <button class="pass-toggle" onclick="togglePass2('ccPass',this)" type="button">👁</button>
        </div>
      </div>
      <div class="form-group">
        <label>Confirm New Password</label>
        <div class="pass-input-wrap">
          <input type="password" id="ccPass2" placeholder="repeat new password"/>
          <button class="pass-toggle" onclick="togglePass2('ccPass2',this)" type="button">👁</button>
        </div>
      </div>
      <button class="btn btn-primary w-full" onclick="saveCredentials()">Save Changes</button>
    </div>
  `);
}

function togglePass2(id, btn) {
  const inp = document.getElementById(id);
  inp.type = inp.type === 'password' ? 'text' : 'password';
  btn.textContent = inp.type === 'password' ? '👁' : '🙈';
}

function saveCredentials() {
  const newUser = document.getElementById('ccUser').value.trim();
  const newPass = document.getElementById('ccPass').value;
  const newPass2 = document.getElementById('ccPass2').value;
  if (!newUser) { IA.toast('Username required','error'); return; }
  if (newPass && newPass !== newPass2) { IA.toast('Passwords do not match','error'); return; }

  const users = IA.getUsers();
  let user = IA.getCurrentUser();
  const idx = users.findIndex(u => u.id === user.id);
  if (idx < 0) return;

  const conflict = users.find((u,i) => i !== idx && u.username === newUser);
  if (conflict) { IA.toast('Username already taken','error'); return; }

  users[idx].username = newUser;
  if (newPass) users[idx].password = btoa(newPass);
  IA.saveUsers(users);
  IA.setCurrentUser(users[idx]);
  closeModal();
  IA.toast('Credentials updated ✓','success');
  setTimeout(() => location.reload(), 600);
}

function openChangePhoto() {
  document.getElementById('profileDropdown')?.classList.remove('open');
  createModal('Change Profile Photo', `
    <div style="text-align:center;display:flex;flex-direction:column;gap:16px;align-items:center">
      <div id="photoPreview" style="width:100px;height:100px;border-radius:50%;background:linear-gradient(135deg,var(--accent3),var(--purple));display:flex;align-items:center;justify-content:center;font-size:36px;font-weight:800;overflow:hidden;border:3px solid var(--border2);">
        ${(() => { const u = IA.getCurrentUser(); return u.avatar ? `<img src="${u.avatar}" style="width:100%;height:100%;object-fit:cover"/>` : (u.firstName[0]+u.lastName[0]).toUpperCase(); })()}
      </div>
      <label class="img-upload-btn" style="cursor:pointer">
        📷 Choose Photo
        <input type="file" accept="image/*" style="display:none" onchange="previewPhoto(this)"/>
      </label>
      <button class="btn btn-danger btn-sm" onclick="removePhoto()">Remove Photo</button>
      <button class="btn btn-primary" onclick="savePhoto()">Save Photo</button>
    </div>
  `);
}

let _photoData = null;
function previewPhoto(inp) {
  if (!inp.files[0]) return;
  const reader = new FileReader();
  reader.onload = e => {
    _photoData = e.target.result;
    document.getElementById('photoPreview').innerHTML = `<img src="${_photoData}" style="width:100%;height:100%;object-fit:cover"/>`;
  };
  reader.readAsDataURL(inp.files[0]);
}

function savePhoto() {
  if (!_photoData) { IA.toast('No photo selected','warn'); return; }
  const users = IA.getUsers();
  const user = IA.getCurrentUser();
  const idx = users.findIndex(u => u.id === user.id);
  if (idx < 0) return;
  users[idx].avatar = _photoData;
  IA.saveUsers(users);
  IA.setCurrentUser(users[idx]);
  closeModal();
  IA.toast('Photo updated ✓','success');
  setTimeout(() => location.reload(), 600);
}

function removePhoto() {
  const users = IA.getUsers();
  const user = IA.getCurrentUser();
  const idx = users.findIndex(u => u.id === user.id);
  if (idx < 0) return;
  users[idx].avatar = null;
  IA.saveUsers(users);
  IA.setCurrentUser(users[idx]);
  closeModal();
  IA.toast('Photo removed','success');
  setTimeout(() => location.reload(), 600);
}

/* ── Modal helpers ── */
function createModal(title, bodyHTML) {
  const existing = document.getElementById('globalModal');
  if (existing) existing.remove();
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay'; overlay.id = 'globalModal';
  overlay.innerHTML = `
    <div class="modal-box">
      <button class="modal-close" onclick="closeModal()">✕</button>
      <div class="modal-title">${title}</div>
      ${bodyHTML}
    </div>
  `;
  overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });
  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('open'));
  return overlay;
}

function closeModal() {
  const m = document.getElementById('globalModal');
  if (m) { m.classList.remove('open'); setTimeout(() => m.remove(), 260); }
}
