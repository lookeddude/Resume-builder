/* =============================================
   NAV.JS – Hamburger drawer + Account dropdown
   Wires all new nav elements introduced in the
   responsive header redesign.
   ============================================= */
'use strict';

window.NavManager = {

  _drawerOpen: false,

  init() {
    this._wireHamburger();
    this._wireAccountDropdown();
    this._wireDrawerItems();
    this._wireDesktopItems();
  },

  /* ── Hamburger / Drawer ── */
  _wireHamburger() {
    const hamburger  = document.getElementById('hamburgerBtn');
    const drawer     = document.getElementById('mobileDrawer');
    const overlay    = document.getElementById('drawerOverlay');
    const closeBtn   = document.getElementById('drawerCloseBtn');
    if (!hamburger || !drawer) return;

    const open = () => {
      drawer.classList.add('open');
      overlay.classList.add('open');
      hamburger.classList.add('open');
      hamburger.setAttribute('aria-expanded', 'true');
      document.body.style.overflow = 'hidden';
      this._drawerOpen = true;
    };
    const close = () => {
      drawer.classList.remove('open');
      overlay.classList.remove('open');
      hamburger.classList.remove('open');
      hamburger.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
      this._drawerOpen = false;
    };

    hamburger.addEventListener('click', () => this._drawerOpen ? close() : open());
    overlay.addEventListener('click', close);
    closeBtn.addEventListener('click', close);
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && this._drawerOpen) close(); });

    this._closeDrawer = close;
  },

  /* ── Account Dropdown ── */
  _wireAccountDropdown() {
    const accountBtn      = document.getElementById('accountBtn');
    const accountDropdown = document.getElementById('accountDropdown');
    if (!accountBtn || !accountDropdown) return;

    const toggle = () => {
      const isOpen = accountDropdown.classList.toggle('open');
      accountBtn.setAttribute('aria-expanded', String(isOpen));
      if (isOpen) {
        /* Align fixed dropdown to the right edge of the account button */
        const rect = accountBtn.getBoundingClientRect();
        accountDropdown.style.right = (window.innerWidth - rect.right) + 'px';
      }
    };

    const close = () => {
      accountDropdown.classList.remove('open');
      accountBtn.setAttribute('aria-expanded', 'false');
    };

    /* Toggle on button click */
    accountBtn.addEventListener('click', (e) => { e.stopPropagation(); toggle(); });
    /* Close when clicking outside */
    document.addEventListener('click', (e) => {
      if (!accountBtn.contains(e.target) && !accountDropdown.contains(e.target)) close();
    });
    /* Close on Escape */
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });

    /* Sign Out */
    document.getElementById('dropdownLogout')?.addEventListener('click', () => {
      close(); window.AuthManager?.signOut?.();
    });
    /* My Resumes */
    document.getElementById('dropdownMyResumes')?.addEventListener('click', () => {
      close(); window.MyResumesPanel?.open?.();
    });
  },

  /* ── Drawer nav items ── */
  _wireDrawerItems() {
    const close = () => this._closeDrawer?.();

    document.getElementById('drawerMyResumes')?.addEventListener('click', () => {
      close();
      window.MyResumesPanel?.open?.();
    });
    document.getElementById('drawerLogin')?.addEventListener('click', () => {
      close();
      window.AuthManager?._showModal?.('login');
    });
    document.getElementById('drawerLogout')?.addEventListener('click', () => {
      close();
      window.AuthManager?.signOut?.();
    });
  },

  /* ── Desktop nav items (header-nav) ── */
  _wireDesktopItems() {
    /* Login button in header-right */
    document.getElementById('navLoginBtn')?.addEventListener('click', () => {
      window.AuthManager?._showModal?.('login');
    });
    /* My Resumes in header-nav */
    document.getElementById('btnMyResumes')?.addEventListener('click', () => {
      window.MyResumesPanel?.open?.();
    });
    /* Quick-action bar buttons (below template) are wired in nav.js too */
    document.getElementById('btnLoadSample')?.addEventListener('click', () => {
      window.ResumeApp?.loadSampleData?.();
    });
    document.getElementById('btnClearAll')?.addEventListener('click', () => {
      window.ResumeApp?.clearAll?.();
    });
  },

  /* ── Update nav state when auth changes ── */
  updateAuthState(user) {
    const loggedIn = !!user;
    const name  = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';
    const email = user?.email || '';
    const initials = name.charAt(0).toUpperCase();

    /* Header right: toggle login vs account */
    const loginBtn   = document.getElementById('navLoginBtn');
    const accountWrap = document.getElementById('accountWrap');
    if (loginBtn)   loginBtn.style.display   = loggedIn ? 'none' : 'flex';
    if (accountWrap) accountWrap.style.display = loggedIn ? 'flex' : 'none';

    /* Account button */
    const accountName  = document.getElementById('accountName');
    const accountAvatar = document.getElementById('accountAvatar');
    if (accountName)   accountName.textContent  = name.split(' ')[0];
    if (accountAvatar) accountAvatar.textContent = initials;

    /* Dropdown user info */
    ['dropdownName',  'drawerName' ].forEach(id => { const el = document.getElementById(id); if (el) el.textContent = name; });
    ['dropdownEmail', 'drawerEmail'].forEach(id => { const el = document.getElementById(id); if (el) el.textContent = email; });
    ['dropdownAvatar','drawerAvatar'].forEach(id => { const el = document.getElementById(id); if (el) el.textContent = initials; });

    /* My Resumes visibility */
    ['btnMyResumes','dropdownMyResumes','drawerMyResumes'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = loggedIn ? (id === 'dropdownMyResumes' ? 'flex' : (id === 'btnMyResumes' ? 'flex' : 'flex')) : 'none';
    });

    /* Drawer user info card */
    const drawerUserInfo = document.getElementById('drawerUserInfo');
    if (drawerUserInfo) drawerUserInfo.style.display = loggedIn ? 'flex' : 'none';

    /* Drawer login/logout */
    const drawerLogin  = document.getElementById('drawerLogin');
    const drawerLogout = document.getElementById('drawerLogout');
    if (drawerLogin)  drawerLogin.style.display  = loggedIn ? 'none' : 'flex';
    if (drawerLogout) drawerLogout.style.display = loggedIn ? 'flex' : 'none';
  },

  /* ── Sync count badges across all badge elements ── */
  updateCountBadge(count) {
    ['mrCountBadge', 'drawerCountBadge'].forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      if (count > 0) {
        el.textContent = count;
        el.style.display = 'inline-flex';
      } else {
        el.style.display = 'none';
      }
    });
  },
};

document.addEventListener('DOMContentLoaded', () => {
  window.NavManager.init();
});
