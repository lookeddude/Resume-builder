/* =============================================
   APP.JS – Global state, orchestration, init
   ============================================= */

'use strict';

// ─── Global State ───
window.ResumeApp = {
  state: {
    template: 1,
    personal: {
      fullName: '',
      jobTitle: '',
      email: '',
      phone: '',
      phoneCode: '+91',
      address: '',
      linkedin: '',
      summary: ''
    },
    skills: [],
    education: [],
    experience: [],
    projects: [],
    customSections: [],
    sectionOrder: ['skills', 'experience', 'education', 'projects', 'customSections'],
    sectionTitles: {
      summary:    'Professional Summary',
      skills:     'Skills',
      education:  'Education',
      experience: 'Work Experience',
      projects:   'Projects'
    },
    photo: {
      src: null,
      x: 0,
      y: 0,
      scale: 1.0
    }
  },

  // ─── localStorage draft key ───
  _DRAFT_KEY: 'raazlab_resume_draft',

  // ─── Preview debounce timer ───
  _previewTimer: null,

  // ─── Schedule a live preview refresh (also auto-saves draft) ───
  schedulePreview() {
    clearTimeout(this._previewTimer);
    this._previewTimer = setTimeout(() => {
      window.PreviewManager.render();
      this.saveStateDraft(); /* persist every time preview updates */
    }, 80);
  },

  // ─── Save full state to localStorage ───
  saveStateDraft() {
    try {
      const p = this.state.photo;
      const draft = {
        template      : this.state.template,
        personal      : { ...this.state.personal },
        skills        : [...this.state.skills],
        education     : JSON.parse(JSON.stringify(this.state.education)),
        experience    : JSON.parse(JSON.stringify(this.state.experience)),
        projects      : JSON.parse(JSON.stringify(this.state.projects)),
        customSections: JSON.parse(JSON.stringify(this.state.customSections)),
        sectionOrder   : [...(this.state.sectionOrder || [])],
        sectionTitles  : { ...this.state.sectionTitles },
        /* Store only the 4 raw photo fields – NOT croppedSrc (avoids bloating storage) */
        photo         : { src: p.src, x: p.x, y: p.y, scale: p.scale },
        savedAt       : Date.now(),
      };
      localStorage.setItem(this._DRAFT_KEY, JSON.stringify(draft));
    } catch(e) { /* storage might be full or unavailable */ }
  },

  // ─── Restore state from localStorage and repopulate form ───
  restoreStateDraft() {
    try {
      const raw = localStorage.getItem(this._DRAFT_KEY);
      if (!raw) return false;
      const draft = JSON.parse(raw);

      /* Don't restore very old drafts (> 2 hours) */
      if (Date.now() - (draft.savedAt || 0) > 2 * 60 * 60 * 1000) {
        this.clearStateDraft();
        return false;
      }

      /* Check if there's meaningful data to restore */
      const hasData = draft.personal?.fullName ||
                      draft.skills?.length ||
                      draft.education?.length ||
                      draft.experience?.length;
      if (!hasData) return false;

      /* Apply to state */
      this.state.template       = draft.template       ?? this.state.template;
      this.state.personal       = { ...this.state.personal, ...draft.personal };
      this.state.skills         = draft.skills         ?? [];
      this.state.education      = draft.education      ?? [];
      this.state.experience     = draft.experience     ?? [];
      this.state.projects       = draft.projects       ?? [];
      this.state.customSections = draft.customSections ?? [];
      this.state.sectionOrder   = draft.sectionOrder && draft.sectionOrder.length
        ? draft.sectionOrder
        : ['skills', 'experience', 'education', 'projects', 'customSections'];
      this.state.sectionTitles  = Object.keys(draft.sectionTitles || {}).length
        ? { ...this.state.sectionTitles, ...draft.sectionTitles }
        : this.state.sectionTitles;
      this.state.photo          = { ...this.state.photo, ...draft.photo };

      /* Update counters in FormManager so dynamic entries render correctly */
      if (window.FormManager) {
        window.FormManager._counters.education  = this.state.education.length;
        window.FormManager._counters.experience = this.state.experience.length;
        window.FormManager._counters.projects   = this.state.projects.length;
        window.FormManager._counters.custom     = this.state.customSections.length;
      }

      /* Repopulate the form UI */
      window.FormManager?.populateForm?.();

      /* Select correct template card */
      const tplInput = document.querySelector(`input[name="template"][value="${this.state.template}"]`);
      if (tplInput) {
        tplInput.checked = true;
        document.querySelectorAll('.template-card').forEach(c => c.classList.remove('active'));
        tplInput.closest('.template-card')?.classList.add('active');
        this._handleTemplateVisibility();
      }

      /* Rebuild photo editor UI + regenerate croppedSrc if photo was saved */
      if (this.state.photo.src) {
        const photoDropZone = document.getElementById('photoDropZone');
        const photoEditor   = document.getElementById('photoEditor');
        const photoImg      = document.getElementById('photoImg');
        if (photoDropZone) photoDropZone.style.display = 'none';
        if (photoEditor)   photoEditor.style.display   = 'flex';
        if (photoImg) {
          photoImg.src = this.state.photo.src;
          photoImg.onload = () => {
            window.ImageManager?._applyTransform();
            this.schedulePreview();
          };
          /* If image is already cached (data URL), onload may not fire – force it */
          if (photoImg.complete && photoImg.naturalWidth > 0) {
            window.ImageManager?._applyTransform();
          }
        }
      }

      this.schedulePreview();
      return true;
    } catch(e) {
      return false;
    }
  },

  // ─── Clear draft from localStorage ───
  clearStateDraft() {
    try { localStorage.removeItem(this._DRAFT_KEY); } catch(e) {}
  },

  // ─── Show toast notification ───
  showToast(message, type = '', duration = 3000) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast show ${type}`;
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => {
      toast.classList.remove('show', type);
    }, duration);
  },

  // ─── Clear all state ───
  clearAll() {
    if (!confirm('Clear all data? This cannot be undone.')) return;

    this.state.personal = { fullName: '', jobTitle: '', email: '', phone: '', phoneCode: '+91', address: '', linkedin: '', summary: '' };
    this.state.skills = [];
    this.state.education = [];
    this.state.experience = [];
    this.state.projects = [];
    this.state.customSections = [];
    this.state.sectionOrder = ['skills', 'experience', 'education', 'projects', 'customSections'];
    this.state.sectionTitles = { summary: 'Professional Summary', skills: 'Skills', education: 'Education', experience: 'Work Experience', projects: 'Projects' };
    this.state.photo = { src: null, x: 0, y: 0, scale: 1.0 };

    // Reset form fields
    ['fullName','jobTitle','email','phone','address','linkedin','summary'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    document.getElementById('charSummary').textContent = '0 / 600';

    // Clear skill tags
    document.getElementById('tagsContainer').innerHTML = '';

    // Clear dynamic lists
    document.getElementById('educationList').innerHTML = '';
    document.getElementById('experienceList').innerHTML = '';
    document.getElementById('projectsList').innerHTML = '';
    document.getElementById('customSectionsList').innerHTML = '';

    // Clear photo
    window.ImageManager.reset();

    // Reset section order in editor
    window.FormManager?._applyDomOrder?.();

    this.schedulePreview();
    this.showToast('All data cleared', 'success');
  },

  // ─── Load Sample Data ───
  loadSampleData() {
    const t  = this.state.template; // 1 | 2 | 3 | 4
    const fm = window.FormManager;

    /* ══════════════════════════════════════════════════════════
       TEMPLATE 1 – SIMPLE (single column, fits ~3 exp entries)
    ══════════════════════════════════════════════════════════ */
    if (t === 1) {
      this.state.personal = {
        fullName: 'Marcus Webb', jobTitle: 'Full-Stack Software Engineer',
        email: 'marcus.webb@dev.io', phone: '555 012 3456', phoneCode: '+1',
        address: 'Austin, TX', linkedin: 'https://linkedin.com/in/marcuswebb',
        summary: 'Results-driven Full-Stack Engineer with 5+ years building high-performance web apps. Skilled in React, Node.js, and cloud-native architectures. Passionate about clean code, developer experience, and delivering products at scale.'
      };
      this.state.skills = [
        'JavaScript', 'TypeScript', 'React', 'Vue.js', 'Node.js', 'Express',
        'Python', 'PostgreSQL', 'MongoDB', 'Redis', 'Docker', 'AWS', 'Git', 'CI/CD'
      ];
      this.state.education = [
        { _id: 1, degree: 'B.Sc. Computer Science', school: 'University of Texas at Austin',
          field: 'Computer Science', period: '2015 – 2019', gpaType: 'GPA', gpa: '3.78 / 4.0',
          description: "Dean's List every semester. Focus on Distributed Systems and Algorithms." },
        { _id: 2, degree: 'AWS Solutions Architect – Associate', school: 'Amazon Web Services',
          field: 'Cloud Computing', period: 'Apr 2022', gpaType: '', gpa: '',
          description: 'Certified in cloud architecture, security, and cost optimization best practices.' }
      ];
      fm._counters.education = 2;
      this.state.experience = [
        { _id: 1, position: 'Senior Full-Stack Engineer', company: 'Nexus Digital',
          location: 'Austin, TX', period: 'Mar 2022 – Present',
          description: '• Re-architected the monolith to microservices, cutting deployment time by 65%\n• Led a 4-engineer team delivering two major product releases on schedule\n• Implemented GraphQL API reducing client over-fetching by 40%' },
        { _id: 2, position: 'Full-Stack Developer', company: 'Bright Labs',
          location: 'Remote', period: 'Jun 2020 – Feb 2022',
          description: '• Built real-time collaboration features using WebSockets for 30K+ active users\n• Migrated CI/CD pipelines to GitHub Actions, reducing build time from 18 to 5 minutes\n• Developed reusable React component library adopted by 3 product teams' },
        { _id: 3, position: 'Frontend Developer', company: 'Pixel Works',
          location: 'Dallas, TX', period: 'Aug 2019 – May 2020',
          description: '• Delivered 8 client websites using React and Tailwind CSS within budget\n• Integrated Stripe payment gateway and reduced checkout abandonment by 22%' }
      ];
      fm._counters.experience = 3;
      this.state.projects = [
        { _id: 1, name: 'TaskFlow – Project Management SaaS', tech: 'Next.js, Node.js, PostgreSQL, Redis',
          link: 'https://github.com/marcuswebb/taskflow', period: '2023',
          description: '• Kanban-style task manager with real-time updates via WebSockets\n• 400+ GitHub stars; deployed on Vercel with 99.9% uptime\n• Supports team workspaces, role-based access, and audit logging' },
        { _id: 2, name: 'PriceBot – AI Price Tracker', tech: 'Python, FastAPI, TensorFlow, Docker',
          link: '', period: '2022',
          description: '• LSTM-powered price prediction with 91% accuracy on e-commerce datasets\n• REST API serving 15K requests/day with < 80ms avg. response time' },
        { _id: 3, name: 'CodeReview CLI', tech: 'Node.js, OpenAI API, Git',
          link: 'https://github.com/marcuswebb/cr-cli', period: '2021',
          description: '• CLI tool that posts AI-generated code review comments on GitHub PRs\n• 250+ installs via npm within first month of release' }
      ];
      fm._counters.projects = 3;
      this.state.customSections = [];
      fm._counters.custom = 0;
    }

    /* ══════════════════════════════════════════════════════════
       TEMPLATE 2 – MODERN (left: skills+edu | right: sum+exp+proj)
       Balanced: 2 exp, 2 edu, 2 projects, 10 skills
    ══════════════════════════════════════════════════════════ */
    else if (t === 2) {
      this.state.personal = {
        fullName: 'Sofia Reyes', jobTitle: 'Product Designer & Frontend Engineer',
        email: 'sofia.reyes@design.co', phone: '789 654 3210', phoneCode: '+44',
        address: 'London, UK', linkedin: 'https://linkedin.com/in/sofiareyes',
        summary: 'Creative technologist blending UX design with frontend engineering. 4+ years turning complex problems into elegant, accessible interfaces. Expert in Figma-to-code workflows, design systems, and React-based front ends.'
      };
      this.state.skills = [
        'React', 'TypeScript', 'Figma', 'CSS / Tailwind', 'Next.js',
        'Node.js', 'Storybook', 'Accessibility (WCAG)', 'Jest', 'GraphQL'
      ];
      this.state.education = [
        { _id: 1, degree: 'B.A. Human-Computer Interaction', school: 'University College London',
          field: 'HCI & Design', period: '2016 – 2020', gpaType: 'Grade', gpa: 'First Class',
          description: 'Thesis on adaptive UI patterns for low-vision users.' },
        { _id: 2, degree: 'Google UX Design Certificate', school: 'Coursera / Google',
          field: 'UX Design', period: 'Jan 2021', gpaType: '', gpa: '',
          description: 'End-to-end UX process: empathise, define, ideate, prototype, test.' }
      ];
      fm._counters.education = 2;
      this.state.experience = [
        { _id: 1, position: 'Senior Frontend Engineer', company: 'Studio Arc',
          location: 'London', period: 'Feb 2022 – Present',
          description: '• Built and shipped a design system used across 6 products (200+ components)\n• Improved Lighthouse accessibility score from 68 to 97 app-wide\n• Mentored 3 junior engineers in component-driven development' },
        { _id: 2, position: 'UI/UX Developer', company: 'Luminary Labs',
          location: 'Remote', period: 'Sep 2020 – Jan 2022',
          description: '• Prototyped and shipped 4 new product features with Figma + React\n• Reduced user-reported UI bugs by 45% through systematic design-token adoption\n• Ran usability testing sessions with 40+ participants' }
      ];
      fm._counters.experience = 2;
      this.state.projects = [
        { _id: 1, name: 'Palette UI – Design System', tech: 'React, TypeScript, Storybook, Chromatic',
          link: 'https://github.com/sofiareyes/palette-ui', period: '2023',
          description: '• Open-source design system; 180+ GitHub stars\n• Automated visual regression tests via Chromatic CI' },
        { _id: 2, name: 'AccessMap – WCAG Audit Tool', tech: 'Next.js, Puppeteer, Node.js',
          link: '', period: '2022',
          description: '• Crawls websites and generates downloadable WCAG 2.1 compliance reports\n• Used by 3 NGOs to improve digital accessibility' }
      ];
      fm._counters.projects = 2;
      this.state.customSections = [
        { _id: 1, title: 'Tools & Software',
          content: 'Figma · Adobe XD · Zeplin · Notion · Linear · GitHub · Vercel' }
      ];
      fm._counters.custom = 1;
    }

    /* ══════════════════════════════════════════════════════════
       TEMPLATE 3 – PROFESSIONAL (sidebar: skills+edu | main: sum+exp+proj)
       Narrow sidebar – keep skills ≤ 8, edu = 1, main has 2 exp + 2 proj
    ══════════════════════════════════════════════════════════ */
    else if (t === 3) {
      this.state.personal = {
        fullName: 'Daniel Osei', jobTitle: 'Data Engineer & ML Practitioner',
        email: 'd.osei@dataworks.ai', phone: '711 999 8800', phoneCode: '+49',
        address: 'Berlin, Germany', linkedin: 'https://linkedin.com/in/danielosei',
        summary: 'Analytical Data Engineer with 5 years designing robust data pipelines and ML systems. Translates raw data into actionable intelligence. Strong background in Python, Spark, and cloud data warehousing on GCP and AWS.'
      };
      this.state.skills = [
        'Python', 'Apache Spark', 'SQL', 'dbt', 'BigQuery', 'Airflow', 'Kafka', 'Docker'
      ];
      this.state.education = [
        { _id: 1, degree: 'M.Sc. Data Science', school: 'Technical University of Berlin',
          field: 'Machine Learning & Data Engineering', period: '2018 – 2020', gpaType: 'Grade', gpa: '1.2 (Sehr Gut)',
          description: 'Thesis: Real-time anomaly detection in distributed event streams.' }
      ];
      fm._counters.education = 1;
      this.state.experience = [
        { _id: 1, position: 'Senior Data Engineer', company: 'Aleph Analytics',
          location: 'Berlin', period: 'Apr 2021 – Present',
          description: '• Designed ELT pipelines processing 500GB/day using Spark & BigQuery\n• Reduced pipeline execution time by 55% through intelligent partitioning\n• Built real-time dashboards monitoring 20+ KPIs for C-level stakeholders' },
        { _id: 2, position: 'Data Engineer', company: 'Stream Insights GmbH',
          location: 'Munich', period: 'Jul 2020 – Mar 2021',
          description: '• Implemented Kafka-based event streaming for 1M+ events/hour\n• Automated data quality checks reducing incidents by 70%\n• Migrated on-premise DWH to Google BigQuery, saving €80K/year' }
      ];
      fm._counters.experience = 2;
      this.state.projects = [
        { _id: 1, name: 'StreamGuard – Anomaly Detection Engine',
          tech: 'Python, Kafka, Redis, Docker', link: '', period: '2023',
          description: '• Detects statistical anomalies in event streams with 97% precision\n• Open-sourced on GitHub with 320+ stars' },
        { _id: 2, name: 'DataLens – BI Dashboard Builder',
          tech: 'Next.js, FastAPI, BigQuery, Recharts', link: '', period: '2022',
          description: '• Drag-and-drop BI tool generating auto-refresh charts from SQL queries\n• Deployed for a 50-person analytics team' }
      ];
      fm._counters.projects = 2;
      this.state.customSections = [
        { _id: 1, title: 'Certifications',
          content: 'Google Professional Data Engineer\nDatabricks Certified Associate Developer\nApache Kafka Confluent Certified' }
      ];
      fm._counters.custom = 1;
    }

    /* ══════════════════════════════════════════════════════════
       TEMPLATE 4 – PREMIUM (dark sidebar: photo+skills+edu | main: sum+exp+proj+custom)
       Rich sidebar: 10 skills, 1 edu | Main: 2 exp, 2 proj, 2 custom
    ══════════════════════════════════════════════════════════ */
    else {
      this.state.personal = {
        fullName: 'Rajnish Kumar', jobTitle: 'Lead Software Architect',
        email: 'rajnish.kumar@email.dev', phone: '98765 43210', phoneCode: '+91',
        address: 'Mumbai, Maharashtra, India', linkedin: 'https://linkedin.com/in/rajnish-kumar',
        summary: 'Forward-thinking Software Architect with 8+ years designing scalable SaaS platforms. Expert in cloud-native architectures, React/Node.js ecosystems, and engineering leadership. Passionate about building high-performance teams and products that reach millions of users.'
      };
      this.state.skills = [
        'JavaScript (ES6+)', 'TypeScript', 'Go', 'Python', 'SQL',
        'React', 'Node.js', 'Next.js', 'Docker', 'AWS (EC2/S3/Lambda)',
        'PostgreSQL', 'Redis', 'GraphQL', 'Terraform'
      ];
      this.state.education = [
        { _id: 1, degree: 'B.Tech – Computer Science & Engineering',
          school: 'Indian Institute of Technology (IIT Bombay)',
          field: 'CS & Engineering', period: '2012 – 2016', gpaType: 'CGPA', gpa: '9.1 / 10',
          description: 'Graduated with Distinction. Specialised in Algorithms and Distributed Systems.' }
      ];
      fm._counters.education = 1;
      this.state.experience = [
        { _id: 1, position: 'Lead Software Architect', company: 'Tech Solutions Inc.',
          location: 'Mumbai', period: '2021 – Present',
          description: '- Designed cloud-native microservices platform serving 10M+ DAU with 99.99% SLA\n- Led 12-engineer team across 3 squads using SAFe agile methodology\n- Reduced infrastructure spend by ₹2.4Cr/year via right-sizing and auto-scaling strategies' },
        { _id: 2, position: 'Senior Full Stack Developer', company: 'Innovate Hub',
          location: 'Bengaluru', period: '2018 – 2021',
          description: '- Architected multi-tenant SaaS billing engine processing ₹50Cr+ in transactions\n- Delivered 6 major product releases with zero critical post-release defects\n- Mentored 5 junior engineers; 3 promoted within 18 months' }
      ];
      fm._counters.experience = 2;
      this.state.projects = [
        { _id: 1, name: 'CollabDoc – Realtime Editor', tech: 'React, Socket.io, Node.js, Redis',
          link: '', period: '2023',
          description: 'Google-Docs-style collaborative editor using Operational Transformation; 1,500+ GitHub stars.' },
        { _id: 2, name: 'SafePay Gateway Engine', tech: 'Golang, PostgreSQL, Docker, AWS',
          link: '', period: '2022',
          description: 'High-throughput payment router with retry queuing and PCI-DSS compliance; handles 5K TPS.' }
      ];
      fm._counters.projects = 2;
      this.state.customSections = [
        { _id: 1, title: 'Certifications',
          content: 'AWS Certified Solutions Architect – Professional (2022)\nScrum Alliance Certified ScrumMaster (CSM)\nStanford Advanced Data Structures (2021)' },
        { _id: 2, title: 'Languages',
          content: 'English (Fluent)  ·  Hindi (Native)  ·  Marathi (Native)' }
      ];
      fm._counters.custom = 2;
    }

    // Rebuild form UI + preview
    window.FormManager.populateForm();
    this.schedulePreview();
    this.showToast('✨ Sample data loaded!', 'success');
  },

  // ─── Initialization ───
  init() {
    // Template selector
    document.querySelectorAll('input[name="template"]').forEach(radio => {
      radio.addEventListener('change', (e) => {
        this.state.template = parseInt(e.target.value, 10);
        // Update active card styling
        document.querySelectorAll('.template-card').forEach(c => c.classList.remove('active'));
        e.target.closest('.template-card').classList.add('active');
        // Show/hide Template 3 sections
        this._handleTemplateVisibility();
        this.schedulePreview();
      });
    });

    // NOTE: btnClearAll, btnLoadSample, btnMyResumes are now wired in nav.js
    // to avoid duplicate listeners.

    // Generate button (triggers preview + auto-save + scroll to preview on mobile)
    document.getElementById('btnGenerate').addEventListener('click', async () => {
      if (window.FormManager.validate()) {
        window.PreviewManager.render();
        // On mobile, switch to preview tab
        if (window.innerWidth <= 768) {
          document.getElementById('tabPreview').click();
        }
        this.showToast('✅ Resume generated!', 'success');

        // Auto-save to Supabase if logged in
        if (window.AuthManager?.isAuthenticated()) {
          const currentId = window.MyResumesPanel?.getCurrentId() || null;
          const { data, error } = await window.ResumeDB.save(currentId);
          if (!error && data) {
            window.MyResumesPanel?.setCurrentId(data.id);
            this._updateResumeCountBadge();
          }
        }
      }
    });

    // My Resumes button — also wired in nav.js; skip duplicate here

    // Mobile tab switching
    document.getElementById('tabForm').addEventListener('click', () => {
      document.getElementById('tabForm').classList.add('active');
      document.getElementById('tabPreview').classList.remove('active');
      document.getElementById('panelForm').classList.add('active');
      document.getElementById('panelPreview').classList.remove('active');
      document.getElementById('tabForm').setAttribute('aria-selected', 'true');
      document.getElementById('tabPreview').setAttribute('aria-selected', 'false');
    });

    document.getElementById('tabPreview').addEventListener('click', () => {
      document.getElementById('tabPreview').classList.add('active');
      document.getElementById('tabForm').classList.remove('active');
      document.getElementById('panelPreview').classList.add('active');
      document.getElementById('panelForm').classList.remove('active');
      document.getElementById('tabPreview').setAttribute('aria-selected', 'true');
      document.getElementById('tabForm').setAttribute('aria-selected', 'false');
    });

    // Set initial active panel for mobile
    document.getElementById('panelForm').classList.add('active');

    this.schedulePreview();
  },

  _handleTemplateVisibility() {
    const needsPhoto = this.state.template === 3 || this.state.template === 4;
    document.getElementById('photoSection').style.display          = needsPhoto ? 'block' : 'none';
    // Custom sections are available in ALL templates
    document.getElementById('customSectionsWrapper').style.display = 'block';
  },

  async _updateResumeCountBadge() {
    if (!window.ResumeDB || !window.AuthManager?.isAuthenticated()) return;
    const { data } = await window.ResumeDB.fetchAll();
    const count  = data?.length || 0;
    /* Update all count badges via NavManager */
    window.NavManager?.updateCountBadge(count);
    /* Also update legacy single badge if present */
    const badge = document.getElementById('mrCountBadge');
    if (badge) {
      badge.textContent   = count;
      badge.style.display = count > 0 ? 'flex' : 'none';
    }
  },
};

// ─── Boot ───
document.addEventListener('DOMContentLoaded', () => {
  window.ResumeApp.init();
});
