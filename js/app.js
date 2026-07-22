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
      address: '',
      linkedin: '',
      summary: ''
    },
    skills: [],
    education: [],
    experience: [],
    projects: [],
    customSections: [],
    photo: {
      src: null,
      x: 0,
      y: 0,
      scale: 1.0
    }
  },

  // ─── Preview debounce timer ───
  _previewTimer: null,

  // ─── Schedule a live preview refresh ───
  schedulePreview() {
    clearTimeout(this._previewTimer);
    this._previewTimer = setTimeout(() => {
      window.PreviewManager.render();
    }, 80);
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

    this.state.personal = { fullName: '', jobTitle: '', email: '', phone: '', address: '', linkedin: '', summary: '' };
    this.state.skills = [];
    this.state.education = [];
    this.state.experience = [];
    this.state.projects = [];
    this.state.customSections = [];
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

    this.schedulePreview();
    this.showToast('All data cleared', 'success');
  },

  // ─── Load Sample Data ───
  loadSampleData() {
    // Set state with rich sample data
    this.state.personal = {
      fullName:  'Alexandra Chen',
      jobTitle:  'Senior Full-Stack Engineer',
      email:     'alex.chen@email.com',
      phone:     '+1 (415) 867-5309',
      address:   'San Francisco, CA',
      linkedin:  'https://linkedin.com/in/alexchen-dev',
      summary:   'Passionate full-stack engineer with 6+ years of experience building scalable web applications and distributed systems. Led cross-functional teams to ship products used by millions of users. Strong expertise in React, Node.js, and cloud infrastructure. Adept at translating complex business requirements into elegant, maintainable solutions.'
    };

    this.state.skills = [
      'JavaScript', 'TypeScript', 'React', 'Node.js',
      'Python', 'PostgreSQL', 'MongoDB', 'GraphQL',
      'Docker', 'Kubernetes', 'AWS', 'CI/CD', 'Git'
    ];

    // Give each entry a unique _id and update counters
    const fm = window.FormManager;
    fm._counters.education = 2;
    fm._counters.experience = 3;
    fm._counters.projects = 3;
    fm._counters.custom = 2;

    this.state.education = [
      {
        _id: 1,
        degree:      'B.Sc. Computer Science',
        school:      'University of California, Berkeley',
        field:       'Computer Science & Engineering',
        period:      '2014 – 2018',
        gpa:         '3.85 / 4.0',
        description: 'Dean\'s List — 4 consecutive years\nThesis: "Optimizing Distributed Consensus Algorithms for Edge Networks"'
      },
      {
        _id: 2,
        degree:      'AWS Certified Solutions Architect',
        school:      'Amazon Web Services',
        field:       'Cloud Computing',
        period:      'Mar 2021',
        gpa:         '',
        description: 'Professional-level certification covering cloud architecture, security, and cost optimization.'
      }
    ];

    this.state.experience = [
      {
        _id: 1,
        position:    'Senior Full-Stack Engineer',
        company:     'TechVision Inc.',
        location:    'San Francisco, CA',
        period:      'Jan 2022 – Present',
        description: '• Led a team of 5 engineers to redesign the core platform, reducing page load times by 60%\n• Architected microservices migration from a monolith, improving deployment frequency by 4×\n• Introduced GraphQL API layer, reducing over-fetching and cutting bandwidth costs by 35%\n• Mentored 3 junior engineers, conducting weekly code reviews and pair programming sessions'
      },
      {
        _id: 2,
        position:    'Full-Stack Developer',
        company:     'DataFlow Labs',
        location:    'Remote',
        period:      'Jun 2020 – Dec 2021',
        description: '• Built real-time analytics dashboard processing 2M+ events/day using React and Apache Kafka\n• Designed and implemented REST APIs serving 50K+ daily active users\n• Reduced infrastructure costs by 28% through strategic AWS resource optimization'
      },
      {
        _id: 3,
        position:    'Frontend Developer',
        company:     'Pixel Studios',
        location:    'New York, NY',
        period:      'Aug 2018 – May 2020',
        description: '• Developed responsive UI components in React used across 12 client projects\n• Integrated third-party APIs (Stripe, Twilio, Mapbox) into production applications\n• Improved test coverage from 40% to 92% using Jest and React Testing Library'
      }
    ];

    this.state.projects = [
      {
        _id: 1,
        name:        'OpenFlow – Workflow Automation',
        tech:        'React, Node.js, PostgreSQL, Docker',
        link:        'https://github.com/alexchen/openflow',
        period:      '2023',
        description: '• Open-source no-code workflow builder with 1,200+ GitHub stars\n• Supports 30+ integrations including Slack, GitHub, and Notion\n• Deployed on AWS ECS with auto-scaling; handles 500K+ workflow runs per month'
      },
      {
        _id: 2,
        name:        'ML Price Predictor',
        tech:        'Python, FastAPI, TensorFlow, Redis',
        link:        'https://github.com/alexchen/ml-price',
        period:      '2022',
        description: '• Real-time price prediction service using LSTM neural networks\n• Achieves 94.2% accuracy on historical test data\n• API serves predictions with < 50ms latency via Redis caching layer'
      },
      {
        _id: 3,
        name:        'DevPulse – Developer Analytics',
        tech:        'Next.js, GraphQL, MongoDB, Vercel',
        link:        'https://devpulse.app',
        period:      '2021',
        description: '• SaaS dashboard aggregating GitHub, Jira, and GitLab metrics for dev teams\n• Acquired 800+ paying customers within 6 months of launch\n• Featured in Product Hunt Top 10 of the day'
      }
    ];

    this.state.customSections = [
      {
        _id: 1,
        title:   'Certifications & Awards',
        content: 'AWS Certified Solutions Architect – Professional (2021)\nGoogle Cloud Professional Data Engineer (2022)\nEmployee of the Quarter — TechVision Inc. (Q3 2023)\nHackathon Winner – Global AI Hackathon 2022 (1st Place out of 340 teams)'
      },
      {
        _id: 2,
        title:   'Languages & Interests',
        content: 'Languages: English (Native), Mandarin (Fluent), Spanish (Conversational)\nInterests: Open-source contribution, technical blogging, competitive programming, hiking'
      }
    ];

    // Rebuild the form UI from the new state
    window.FormManager.populateForm();

    // Render the preview
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

    // Clear button
    document.getElementById('btnClearAll').addEventListener('click', () => this.clearAll());

    // Load Sample button
    document.getElementById('btnLoadSample').addEventListener('click', () => this.loadSampleData());

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

    // My Resumes button
    const mrBtn = document.getElementById('btnMyResumes');
    if (mrBtn) {
      mrBtn.addEventListener('click', () => window.MyResumesPanel?.open());
    }

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
    const isT3 = this.state.template === 3;
    document.getElementById('photoSection').style.display = isT3 ? 'block' : 'none';
    document.getElementById('customSectionsWrapper').style.display = isT3 ? 'block' : 'none';
  },

  async _updateResumeCountBadge() {
    if (!window.ResumeDB || !window.AuthManager?.isAuthenticated()) return;
    const { data } = await window.ResumeDB.fetchAll();
    const count  = data?.length || 0;
    const badge  = document.getElementById('mrCountBadge');
    if (!badge) return;
    badge.textContent  = count;
    badge.style.display = count > 0 ? 'flex' : 'none';
  },
};

// ─── Boot ───
document.addEventListener('DOMContentLoaded', () => {
  window.ResumeApp.init();
});
