/* =============================================
   AUTH.JS – Full Supabase authentication
   ─────────────────────────────────────────────
   Modes: Email+Password | Email OTP | Google OAuth
   Features:
   • Session persistence
   • OTP with resend cooldown
   • Google OAuth redirect
   • Header user badge + sign-out
   • Intercepts PDF download
   • Auto-save resume on successful login
   ============================================= */
'use strict';

window.AuthManager = {

  SUPABASE_URL : 'https://ymacxzoocqusbdruyqfk.supabase.co',
  SUPABASE_KEY : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InltYWN4em9vY3F1c2JkcnV5cWZrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ1OTk2ODIsImV4cCI6MjEwMDE3NTY4Mn0.RmmjrvhlvxBPeiuUFRZBF6ag79uF2Sn_MecEaw-CAb4',

  /* Production URL — email verification links & OAuth redirects go here */
  SITE_URL : 'https://resume-builder-three-pied-84.vercel.app/',

  _client            : null,
  _user              : null,
  _mode              : 'login',   /* login | signup | otp */
  _otpEmail          : null,      /* email OTP was sent to */
  _otpStep           : 'send',    /* send | verify */
  _resendTimer       : null,
  _resendSeconds     : 0,
  _onSuccessCallback : null,

  /* ════════════════════════════════════════════
     INIT
  ════════════════════════════════════════════ */
  async init() {
    if (typeof window.supabase === 'undefined') {
      setTimeout(() => this.init(), 500);
      return;
    }

    this._client = window.supabase.createClient(this.SUPABASE_URL, this.SUPABASE_KEY, {
      auth: {
        persistSession   : true,
        autoRefreshToken : true,
        detectSessionInUrl: true,   /* Handles OAuth + Magic Link redirects */
      }
    });

    /* Restore existing session */
    const { data: { session } } = await this._client.auth.getSession();
    if (session?.user) {
      this._user = session.user;
      this._updateHeaderUI();
    }

    /* Handle OAuth / Magic Link callback in URL */
    this._handleAuthCallback();

    /* Listen for auth changes */
    this._client.auth.onAuthStateChange((event, session) => {
      this._user = session?.user ?? null;
      this._updateHeaderUI();
      window.NavManager?.updateAuthState(this._user);

      if (event === 'SIGNED_IN' && this._user) {
        /* Auto-close modal if open */
        const backdrop = document.getElementById('authBackdrop');
        if (backdrop && backdrop.style.display !== 'none') {
          this._onLoginSuccess();
        }
      }
    });

    this._injectModal();
    this._interceptDownloadButton();
    /* Apply initial nav state (may already be logged in via session) */
    window.NavManager?.updateAuthState(this._user);
  },

  isAuthenticated() { return !!this._user; },

  /* ════════════════════════════════════════════
     HANDLE OAuth / OTP REDIRECT CALLBACK
  ════════════════════════════════════════════ */
  async _handleAuthCallback() {
    const hash   = window.location.hash;
    const params = new URLSearchParams(window.location.search);

    /* OAuth redirects back with access_token in hash — Supabase handles automatically.
       We just need to clean up the URL if session established. */
    if (hash.includes('access_token') || params.get('code')) {
      await new Promise(r => setTimeout(r, 500)); /* Let Supabase parse the URL */
      const { data: { session } } = await this._client.auth.getSession();
      if (session?.user) {
        this._user = session.user;
        this._updateHeaderUI();
        /* Clean URL */
        history.replaceState(null, '', window.location.pathname);
        window.ResumeApp?.showToast('✅ Signed in successfully!', 'success');
        /* Resume callback if any */
        if (typeof this._onSuccessCallback === 'function') {
          setTimeout(() => this._onSuccessCallback(), 300);
        }
      }
    }
  },

  /* ════════════════════════════════════════════
     INTERCEPT DOWNLOAD BUTTON
     — Guards against duplicate listeners and
       double-clicks during export.
  ════════════════════════════════════════════ */
  _interceptDownloadButton() {
    const btn = document.getElementById('btnDownloadPDF');
    if (!btn || btn.dataset.authListenerBound) return; /* prevent duplicate listeners */
    btn.dataset.authListenerBound = '1';

    btn.addEventListener('click', async (e) => {
      e.stopImmediatePropagation();
      e.preventDefault();

      /* Block if already exporting */
      if (window.PDFManager?._isExporting) return;

      if (this.isAuthenticated()) {
        window.PDFManager.exportPDF();
      } else {
        this._showModal('login', () => window.PDFManager.exportPDF());
      }
    }, true); /* capture phase — runs before any other click listener */
  },

  /* ════════════════════════════════════════════
     MODAL INJECTION
  ════════════════════════════════════════════ */
  _injectModal() {
    if (document.getElementById('authBackdrop')) return;
    document.body.insertAdjacentHTML('beforeend', `
      <div class="auth-backdrop" id="authBackdrop" style="display:none;" role="dialog" aria-modal="true" aria-labelledby="authModalTitle">
        <div class="auth-modal" id="authModal">

          <div class="auth-header">
            <button class="auth-close-btn" id="authCloseBtn" aria-label="Close">×</button>
            <div class="auth-logo">📄</div>
            <h2 id="authModalTitle">Welcome to ResumeForge</h2>
            <p id="authModalSubtitle">Sign in to download your resume</p>
          </div>

          <div class="auth-body">

            <!-- Tab row -->
            <div class="auth-tabs" role="tablist">
              <button class="auth-tab-btn active" id="authTabLogin"  role="tab">Login</button>
              <button class="auth-tab-btn"        id="authTabSignup" role="tab">Sign Up</button>
              <button class="auth-tab-btn"        id="authTabOtp"    role="tab">Magic Link</button>
            </div>

            <!-- Google button -->
            <button class="auth-google-btn" id="authGoogleBtn">
              <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
              Continue with Google
            </button>

            <div class="auth-divider"><span>or</span></div>

            <!-- Error -->
            <div class="auth-error-msg" id="authErrorMsg" role="alert">
              <span>⚠</span><span id="authErrorText"></span>
            </div>

            <!-- ── Password form (login / signup) ── -->
            <form id="authForm" novalidate autocomplete="on">

              <div class="auth-field" id="authNameField" style="display:none;">
                <label for="authNameInput">Full Name</label>
                <div class="auth-input-wrap">
                  <span class="auth-input-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></span>
                  <input class="auth-input" type="text" id="authNameInput" placeholder="Jane Smith" autocomplete="name"/>
                </div>
              </div>

              <div class="auth-field">
                <label for="authEmailInput">Email Address</label>
                <div class="auth-input-wrap">
                  <span class="auth-input-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg></span>
                  <input class="auth-input" type="email" id="authEmailInput" placeholder="you@example.com" autocomplete="email" required/>
                </div>
              </div>

              <div class="auth-field" id="authPasswordField">
                <label for="authPasswordInput">Password</label>
                <div class="auth-input-wrap">
                  <span class="auth-input-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg></span>
                  <input class="auth-input" type="password" id="authPasswordInput" placeholder="Min. 6 characters" autocomplete="current-password" required/>
                  <button type="button" class="auth-pw-toggle" id="authPwToggle" aria-label="Toggle password">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" id="eyeIcon"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  </button>
                </div>
              </div>

              <button type="submit" class="auth-submit-btn" id="authSubmitBtn">
                <div class="btn-spinner"></div>
                <span class="btn-text" id="authSubmitText">Login</span>
              </button>
            </form>

            <!-- ── OTP form ── -->
            <div id="otpSection" style="display:none;">

              <!-- Step 1: Enter email to send OTP -->
              <div id="otpSendStep">
                <div class="auth-field">
                  <label for="otpEmailInput">Email Address</label>
                  <div class="auth-input-wrap">
                    <span class="auth-input-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg></span>
                    <input class="auth-input" type="email" id="otpEmailInput" placeholder="you@example.com" autocomplete="email"/>
                  </div>
                </div>
                <button class="auth-submit-btn" id="otpSendBtn">
                  <div class="btn-spinner"></div>
                  <span class="btn-text">Send Magic Link / OTP</span>
                </button>
              </div>

              <!-- Step 2: Enter OTP code -->
              <div id="otpVerifyStep" style="display:none;">
                <div class="otp-sent-info" id="otpSentInfo">
                  <span>✉️</span>
                  <span>OTP sent to <strong id="otpSentEmail"></strong>. Check your inbox (and spam folder).</span>
                </div>
                <div class="auth-field">
                  <label for="otpCodeInput">Enter 6-digit OTP Code</label>
                  <div class="auth-input-wrap">
                    <span class="auth-input-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg></span>
                    <input class="auth-input auth-otp-input" type="text" id="otpCodeInput" placeholder="123456" maxlength="6" inputmode="numeric" autocomplete="one-time-code"/>
                  </div>
                </div>
                <button class="auth-submit-btn" id="otpVerifyBtn">
                  <div class="btn-spinner"></div>
                  <span class="btn-text">Verify OTP</span>
                </button>
                <div class="otp-resend-row">
                  <button class="otp-resend-btn" id="otpResendBtn" disabled>
                    Resend OTP (<span id="otpCountdown">60</span>s)
                  </button>
                  <button class="otp-back-btn" id="otpBackBtn">← Change email</button>
                </div>
              </div>
            </div>

            <!-- Switch mode footer -->
            <p class="auth-footer-link" id="authFooterLink">
              Don't have an account?
              <button type="button" id="authSwitchBtn">Sign Up</button>
            </p>

          </div>
        </div>
      </div>
    `);
    this._bindModalEvents();
  },

  /* ════════════════════════════════════════════
     MODAL EVENTS
  ════════════════════════════════════════════ */
  _bindModalEvents() {
    document.getElementById('authCloseBtn').addEventListener('click', () => this._hideModal());
    document.getElementById('authBackdrop').addEventListener('click', (e) => {
      if (e.target.id === 'authBackdrop') this._hideModal();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && document.getElementById('authBackdrop').style.display !== 'none') {
        this._hideModal();
      }
    });

    /* Tabs */
    document.getElementById('authTabLogin').addEventListener('click',  () => this._setMode('login'));
    document.getElementById('authTabSignup').addEventListener('click', () => this._setMode('signup'));
    document.getElementById('authTabOtp').addEventListener('click',    () => this._setMode('otp'));

    /* Footer switch */
    document.getElementById('authSwitchBtn').addEventListener('click', () => {
      this._setMode(this._mode === 'login' ? 'signup' : 'login');
    });

    /* Password toggle */
    document.getElementById('authPwToggle').addEventListener('click', () => {
      const inp  = document.getElementById('authPasswordInput');
      const icon = document.getElementById('eyeIcon');
      if (inp.type === 'password') {
        inp.type     = 'text';
        icon.innerHTML = `<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/>`;
      } else {
        inp.type     = 'password';
        icon.innerHTML = `<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>`;
      }
    });

    /* Password form */
    document.getElementById('authForm').addEventListener('submit', (e) => {
      e.preventDefault();
      this._handlePasswordSubmit();
    });

    /* Google */
    document.getElementById('authGoogleBtn').addEventListener('click', () => this._doGoogle());

    /* OTP */
    document.getElementById('otpSendBtn').addEventListener('click', () => this._sendOtp());
    document.getElementById('otpVerifyBtn').addEventListener('click', () => this._verifyOtp());
    document.getElementById('otpResendBtn').addEventListener('click', () => this._resendOtp());
    document.getElementById('otpBackBtn').addEventListener('click',   () => this._resetOtpToSend());
  },

  /* ════════════════════════════════════════════
     SHOW / HIDE MODAL
  ════════════════════════════════════════════ */
  _showModal(mode = 'login', onSuccess = null) {
    this._onSuccessCallback = onSuccess;
    this._setMode(mode);
    this._clearError();
    ['authEmailInput','authPasswordInput','authNameInput','otpEmailInput','otpCodeInput']
      .forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
    this._resetOtpToSend();
    document.getElementById('authBackdrop').style.display = 'flex';
    setTimeout(() => document.getElementById('authEmailInput').focus(), 120);
  },

  _hideModal() {
    const b = document.getElementById('authBackdrop');
    b.classList.add('hiding');
    setTimeout(() => { b.style.display = 'none'; b.classList.remove('hiding'); }, 220);
    this._stopResendTimer();
  },

  /* ════════════════════════════════════════════
     MODE SWITCHING
  ════════════════════════════════════════════ */
  _setMode(mode) {
    this._mode = mode;
    const isOtp    = mode === 'otp';
    const isSignup = mode === 'signup';
    const isLogin  = mode === 'login';

    ['authTabLogin','authTabSignup','authTabOtp'].forEach(id => {
      const tab = document.getElementById(id);
      const active = (id === 'authTabLogin' && isLogin)
                  || (id === 'authTabSignup' && isSignup)
                  || (id === 'authTabOtp' && isOtp);
      tab.classList.toggle('active', active);
      tab.setAttribute('aria-selected', String(active));
    });

    document.getElementById('authForm').style.display      = isOtp ? 'none' : 'block';
    document.getElementById('otpSection').style.display    = isOtp ? 'block' : 'none';
    document.getElementById('authNameField').style.display = isSignup ? 'block' : 'none';
    document.getElementById('authFooterLink').style.display = isOtp ? 'none' : 'block';

    document.getElementById('authSubmitText').textContent = isLogin ? 'Login' : 'Create Account';

    if (!isOtp) {
      const footer = document.getElementById('authFooterLink');
      footer.childNodes[0].textContent = isLogin ? "Don't have an account? " : 'Already have an account? ';
      document.getElementById('authSwitchBtn').textContent = isLogin ? 'Sign Up' : 'Login';
    }

    document.getElementById('authModalSubtitle').textContent = isOtp
      ? 'Get a one-time code sent to your email'
      : isSignup
        ? 'Create a free account to save & download resumes'
        : 'Sign in to save & download your resume';

    document.getElementById('authPasswordInput').autocomplete = isLogin ? 'current-password' : 'new-password';
    this._clearError();
  },

  /* ════════════════════════════════════════════
     EMAIL + PASSWORD AUTH
  ════════════════════════════════════════════ */
  async _handlePasswordSubmit() {
    const email    = document.getElementById('authEmailInput').value.trim();
    const password = document.getElementById('authPasswordInput').value;
    const name     = document.getElementById('authNameInput').value.trim();
    const btn      = document.getElementById('authSubmitBtn');

    if (!this._validateEmail(email)) return this._showError('Please enter a valid email address.');
    if (!password || password.length < 6) return this._showError('Password must be at least 6 characters.');
    if (this._mode === 'signup' && !name)  return this._showError('Please enter your full name.');

    this._clearError();
    this._setLoading(btn, true);

    try {
      if (this._mode === 'login') {
        await this._doLogin(email, password);
      } else {
        await this._doSignup(email, password, name);
      }
    } catch (err) {
      this._showError(err.message);
    } finally {
      this._setLoading(btn, false);
    }
  },

  async _doLogin(email, password) {
    const { data, error } = await this._client.auth.signInWithPassword({ email, password });
    if (error) {
      if (error.message.includes('Invalid login credentials')) throw new Error('Incorrect email or password. Please try again.');
      if (error.message.includes('Email not confirmed'))       throw new Error('Please verify your email first. Check your inbox.');
      throw new Error(error.message);
    }
    this._user = data.user;
    this._onLoginSuccess();
  },

  async _doSignup(email, password, name) {
    const { data, error } = await this._client.auth.signUp({
      email, password,
      options: {
        data: { full_name: name },
        /* After email verification, redirect to the production app */
        emailRedirectTo: this.SITE_URL,
      }
    });
    if (error) {
      if (error.message.includes('already registered') || error.message.includes('already exists'))
        throw new Error('This email is already registered. Please login instead.');
      throw new Error(error.message);
    }
    if (data.session) {
      this._user = data.user;
      this._onLoginSuccess();
    } else {
      this._showEmailConfirmState(email);
    }
  },

  /* ════════════════════════════════════════════
     GOOGLE OAUTH
  ════════════════════════════════════════════ */
  async _doGoogle() {
    const btn = document.getElementById('authGoogleBtn');
    btn.disabled = true;
    btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> Connecting…`;

    const { error } = await this._client.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo : this.SITE_URL,
        queryParams: { access_type: 'offline', prompt: 'consent' },
      }
    });

    btn.disabled = false;
    btn.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
      </svg> Continue with Google`;

    if (error) {
      /* Check if it's the "provider not enabled" error */
      const isNotEnabled = error.message?.includes('provider is not enabled')
        || error.message?.includes('Unsupported provider')
        || error.status === 400;

      if (isNotEnabled) {
        this._showGoogleSetupGuide();
      } else {
        this._showError('Google sign-in failed: ' + error.message);
      }
    }
    /* If no error → browser redirects to Google */
  },

  /* ─── Show Google setup instructions ─── */
  _showGoogleSetupGuide() {
    /* Replace error box with a setup guide */
    const el = document.getElementById('authErrorMsg');
    el.classList.add('visible');
    el.style.background   = '#FFF7ED';
    el.style.borderColor  = '#FED7AA';
    el.style.color        = '#92400E';
    el.innerHTML = `
      <div style="width:100%">
        <div style="font-weight:800;margin-bottom:8px;font-size:0.85rem;">⚙️ Google Sign-In needs one-time setup</div>
        <div style="font-size:0.78rem;line-height:1.7;">
          <b>Step 1:</b> Go to
          <a href="https://console.cloud.google.com/apis/credentials" target="_blank"
             style="color:#1D4ED8;text-decoration:underline;">Google Cloud Console</a>
          → Create OAuth 2.0 credentials<br>
          <b>Step 2:</b> Set Authorized redirect URI to:<br>
          <code style="background:#FEF3C7;padding:2px 6px;border-radius:4px;font-size:0.75rem;display:block;margin:4px 0;word-break:break-all;">https://ymacxzoocqusbdruyqfk.supabase.co/auth/v1/callback</code>
          <b>Step 3:</b> Go to
          <a href="https://supabase.com/dashboard/project/ymacxzoocqusbdruyqfk/auth/providers" target="_blank"
             style="color:#1D4ED8;text-decoration:underline;">Supabase Dashboard → Auth → Providers → Google</a><br>
          → Enable Google → Paste Client ID &amp; Secret → Save<br><br>
          <b>💡 For now, use Email/Password or Magic Link — they work perfectly!</b>
        </div>
      </div>
    `;
  },


  /* ════════════════════════════════════════════
     OTP / MAGIC LINK
  ════════════════════════════════════════════ */
  async _sendOtp() {
    const email = document.getElementById('otpEmailInput').value.trim();
    if (!this._validateEmail(email)) {
      return this._showError('Please enter a valid email address.');
    }
    this._clearError();
    const btn = document.getElementById('otpSendBtn');
    this._setLoading(btn, true);

    const { error } = await this._client.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
        /* Magic link clicks redirect to the production app */
        emailRedirectTo: this.SITE_URL,
      }
    });

    this._setLoading(btn, false);

    if (error) {
      this._showError('Failed to send OTP: ' + error.message);
      return;
    }

    this._otpEmail = email;
    this._otpStep  = 'verify';
    document.getElementById('otpSentEmail').textContent = email;
    document.getElementById('otpSendStep').style.display   = 'none';
    document.getElementById('otpVerifyStep').style.display = 'block';
    document.getElementById('otpCodeInput').focus();
    this._startResendTimer(60);
  },

  async _verifyOtp() {
    const token = document.getElementById('otpCodeInput').value.trim().replace(/\s/g, '');
    if (!token || token.length < 6) {
      return this._showError('Please enter the 6-digit OTP from your email.');
    }
    this._clearError();
    const btn = document.getElementById('otpVerifyBtn');
    this._setLoading(btn, true);

    const { data, error } = await this._client.auth.verifyOtp({
      email: this._otpEmail,
      token,
      type : 'email',
    });

    this._setLoading(btn, false);

    if (error) {
      if (error.message.includes('expired'))
        this._showError('OTP has expired. Please request a new one.');
      else if (error.message.includes('invalid') || error.message.includes('Invalid'))
        this._showError('Invalid OTP code. Please check and try again.');
      else
        this._showError(error.message);
      return;
    }

    this._user = data.user;
    this._stopResendTimer();
    this._onLoginSuccess();
  },

  async _resendOtp() {
    document.getElementById('otpCodeInput').value = '';
    this._clearError();
    await this._sendOtp();
  },

  _resetOtpToSend() {
    this._otpEmail = null;
    this._otpStep  = 'send';
    this._stopResendTimer();
    const send   = document.getElementById('otpSendStep');
    const verify = document.getElementById('otpVerifyStep');
    if (send)   send.style.display   = 'block';
    if (verify) verify.style.display = 'none';
    const inp = document.getElementById('otpEmailInput');
    if (inp) inp.value = '';
    const code = document.getElementById('otpCodeInput');
    if (code) code.value = '';
  },

  /* ─── Resend countdown timer ─── */
  _startResendTimer(seconds) {
    this._resendSeconds = seconds;
    const btn       = document.getElementById('otpResendBtn');
    const countdown = document.getElementById('otpCountdown');
    btn.disabled    = true;

    this._resendTimer = setInterval(() => {
      this._resendSeconds--;
      if (countdown) countdown.textContent = this._resendSeconds;
      if (this._resendSeconds <= 0) {
        this._stopResendTimer();
        if (btn) {
          btn.disabled     = false;
          btn.textContent  = 'Resend OTP';
        }
      }
    }, 1000);
  },

  _stopResendTimer() {
    if (this._resendTimer) {
      clearInterval(this._resendTimer);
      this._resendTimer = null;
    }
  },

  /* ════════════════════════════════════════════
     POST-LOGIN SUCCESS
  ════════════════════════════════════════════ */
  _onLoginSuccess() {
    this._updateHeaderUI();
    window.NavManager?.updateAuthState(this._user);
    this._hideModal();
    window.ResumeApp?.showToast('✅ Welcome! You are signed in.', 'success');
    /* Update My Resumes count badge */
    setTimeout(() => window.ResumeApp?._updateResumeCountBadge?.(), 500);
    setTimeout(() => {
      if (typeof this._onSuccessCallback === 'function') {
        this._onSuccessCallback();
      }
    }, 300);
  },

  /* ─── Email confirmation prompt (signup without auto-confirm) ─── */
  _showEmailConfirmState(email) {
    document.getElementById('authForm').style.display       = 'none';
    document.getElementById('authFooterLink').style.display = 'none';
    /* Reuse error message area as an info block */
    this._showError(`Account created! A confirmation email was sent to ${email}. Click the link to verify, then login.`);
    document.getElementById('authErrorMsg').style.background = '#EFF6FF';
    document.getElementById('authErrorMsg').style.borderColor = '#BFDBFE';
    document.getElementById('authErrorMsg').style.color = '#1D4ED8';
  },

  /* ─── Legacy _injectHeaderUI (no-op — handled by nav.js) ─── */
  _injectHeaderUI() { /* NavManager handles header UI now */ },

  /* ─── Legacy _updateHeaderUI (delegates to NavManager) ─── */
  _updateHeaderUI() {
    window.NavManager?.updateAuthState(this._user);
  },

  /* ─── Public signOut (called by NavManager buttons) ─── */
  async signOut() { await this._signOut(); },

  async _signOut() {
    await this._client.auth.signOut();
    this._user = null;
    window.NavManager?.updateAuthState(null);
    window.MyResumesPanel?.setCurrentId(null);
    window.ResumeApp?.showToast('👋 Signed out successfully');
  },

  /* ════════════════════════════════════════════
     HELPERS
  ════════════════════════════════════════════ */
  _showError(msg) {
    const el = document.getElementById('authErrorMsg');
    document.getElementById('authErrorText').textContent = msg;
    el.classList.add('visible');
    el.style.cssText = '';   /* Reset any custom styles from confirm state */
  },
  _clearError() {
    document.getElementById('authErrorMsg')?.classList.remove('visible');
  },
  _validateEmail(e) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e); },
  _setLoading(btn, on) {
    btn.disabled = on;
    btn.classList.toggle('loading', on);
  },
};

document.addEventListener('DOMContentLoaded', () => {
  window.AuthManager.init();
});
