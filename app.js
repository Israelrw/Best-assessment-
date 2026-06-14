/* ═══════════════════════════════════════════════
   Best Assessment — Core Application Layer
   Firebase Firestore for real cross-device sync
   ═══════════════════════════════════════════════ */

// ── Firebase config — replace with YOUR project config from console.firebase.google.com ──
// 1. Go to console.firebase.google.com → New Project → Add Web App
// 2. Enable Firestore (Build → Firestore Database → Start in test mode)
// 3. Paste your config below
const FIREBASE_CONFIG = {
  apiKey:            "AIzaSyAYcGqhjzyVD2vOwRMseT6Q_B_gxtopp_8",
  authDomain:        "israel-assessment.firebaseapp.com",
  projectId:         "israel-assessment",
  storageBucket:     "israel-assessment.firebasestorage.app",
  messagingSenderId: "859727274810",
  appId:             "1:859727274810:web:ba1269ae2a217bebe8e603"
};
// Expose globally so all HTML pages can access it
window.FIREBASE_CONFIG = FIREBASE_CONFIG;

const IA = {
  /* ── Storage helpers ── */
  get: k => { try { return JSON.parse(localStorage.getItem('ia_' + k)); } catch { return null; } },
  set: (k, v) => localStorage.setItem('ia_' + k, JSON.stringify(v)),
  sg: k => { try { return JSON.parse(sessionStorage.getItem('ia_' + k)); } catch { return null; } },
  ss: (k, v) => sessionStorage.setItem('ia_' + k, JSON.stringify(v)),

  /* ── Auth ── */
  getUsers: () => IA.get('users') || [],
  saveUsers: u => {
    IA.set('users', u);
    // Also save each user to cloud for cross-device plan persistence
    setTimeout(() => {
      u.forEach(user => IA.saveUserToCloud(user).catch(() => {}));
    }, 1500);
  },
  getCurrentUser: () => IA.get('currentUser'),
  setCurrentUser: u => IA.set('currentUser', u),
  logout: () => { IA.set('currentUser', null); window.location.href = 'login.html'; },

  requireAuth: () => {
    const u = IA.getCurrentUser();
    if (!u) { window.location.href = 'login.html'; return null; }
    return u;
  },

  /* ── Tests (local) ── */
  getTests: () => IA.get('tests') || [],
  saveTests: t => IA.set('tests', t),

  /* ── Results (local cache + Firestore) ── */
  getResults: () => IA.get('results') || [],
  saveResults: r => IA.set('results', r),

  /* ── Firestore: save a result from any device ── */
  saveResultToCloud: async (result) => {
    // Retry up to 5 times waiting for Firebase to initialize
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        const db = IA._getFirestore();
        if (!db) {
          await new Promise(r => setTimeout(r, 800));
          continue;
        }
        const { doc, setDoc } = await IA._firestoreOps();
        await setDoc(doc(db, 'results', result.id), result);
        console.log('[BA] Result saved to Firestore ✓');
        return true;
      } catch(e) {
        console.warn('Firestore save attempt', attempt + 1, 'failed:', e.message);
        await new Promise(r => setTimeout(r, 800));
      }
    }
    return false;
  },

  /* ── Firestore: fetch all results for an admin ── */
  fetchCloudResults: async (adminId) => {
    try {
      const db = IA._getFirestore();
      if (!db) return [];
      const { collection, query, where, getDocs } = await IA._firestoreOps();
      const q = query(collection(db, 'results'), where('adminId', '==', adminId));
      const snap = await getDocs(q);
      return snap.docs.map(d => d.data());
    } catch(e) {
      console.warn('Firestore fetch failed:', e);
      return [];
    }
  },

  /* ── Firestore: save test so students can load it by ID only ── */
  saveTestToCloud: async (test) => {
    try {
      const db = IA._getFirestore();
      if (!db) return false;
      const { doc, setDoc } = await IA._firestoreOps();
      // Strip images from cloud copy to stay within Firestore limits
      const slim = JSON.parse(JSON.stringify(test));
      slim.questions = slim.questions.map(q => { const c = {...q}; delete c.image; return c; });
      await setDoc(doc(db, 'tests', slim.id), slim);
      return true;
    } catch(e) {
      console.warn('Firestore test save failed:', e);
      return false;
    }
  },

  /* ── Firestore: delete a test from cloud ── */
  deleteTestFromCloud: async (testId) => {
    try {
      const db = IA._getFirestore();
      if (!db) return false;
      const { doc } = await IA._firestoreOps();
      const { deleteDoc } = await import('https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js');
      await deleteDoc(doc(db, 'tests', testId));
      return true;
    } catch(e) {
      console.warn('Firestore delete failed:', e);
      return false;
    }
  },

  /* ── Firestore: fetch a test by ID (for students on other devices) ── */
  fetchTestFromCloud: async (testId) => {
    try {
      const db = IA._getFirestore();
      if (!db) return null;
      const { doc, getDoc } = await IA._firestoreOps();
      const snap = await getDoc(doc(db, 'tests', testId));
      return snap.exists() ? snap.data() : null;
    } catch(e) {
      console.warn('Firestore test fetch failed:', e);
      return null;
    }
  },

  /* ── Firestore: save user account (preserves plan across devices) ── */
  saveUserToCloud: async (user) => {
    try {
      const db = IA._getFirestore();
      if (!db) return false;
      const { doc, setDoc } = await IA._firestoreOps();
      const safe = { ...user };
      // Don't store password in plain — keep as is since it's already hashed/local
      await setDoc(doc(db, 'users', user.id), safe);
      return true;
    } catch(e) { console.warn('User cloud save failed:', e.message); return false; }
  },

  /* ── Firestore: restore user from cloud (login from any device) ── */
  fetchUserFromCloud: async (userId) => {
    try {
      const db = IA._getFirestore();
      if (!db) return null;
      const { doc, getDoc } = await IA._firestoreOps();
      const snap = await getDoc(doc(db, 'users', userId));
      return snap.exists() ? snap.data() : null;
    } catch(e) { return null; }
  },

  /* ── Firestore: save ALL tests for this admin ── */
  saveAllTestsToCloud: async (tests) => {
    try {
      const db = IA._getFirestore();
      if (!db) return false;
      const { doc, setDoc } = await IA._firestoreOps();
      for (const test of tests) {
        const slim = JSON.parse(JSON.stringify(test));
        slim.questions = slim.questions.map(q => { const c = {...q}; delete c.image; return c; });
        await setDoc(doc(db, 'tests', slim.id), slim);
      }
      return true;
    } catch(e) { console.warn('Tests cloud save failed:', e.message); return false; }
  },

  /* ── Merge cloud results into local store ── */
  mergeCloudResults: async (adminId) => {
    const cloud = await IA.fetchCloudResults(adminId);
    if (!cloud.length) return 0;
    const local = IA.getResults();
    const ids = new Set(local.map(r => r.id));
    let added = 0;
    cloud.forEach(r => { if (!ids.has(r.id)) { local.push(r); ids.add(r.id); added++; } });
    if (added) IA.saveResults(local);
    return added;
  },

  /* ── Internal Firebase helpers ── */
  _db: null,
  _getFirestore: () => {
    if (IA._db) return IA._db;
    // Fallback to globally initialized db (set by module script after app.js loads)
    if (window._baDb) {
      IA._db = window._baDb;
      if (window._baOps) IA._firestoreOps = async () => window._baOps;
      return IA._db;
    }
    return null;
  },
  _firestoreOps: async () => {
    // Works with Firebase v9 modular SDK
    const m = await import('https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js');
    return m;
  },

  /* ── Subscription Plans ── */
  plans: {
    free:  { name: 'Free',       tests: 5,        lessonPlans: 4,         price: 0,    currency: 'RWF' },
    basic: { name: 'Basic',      tests: 20,        lessonPlans: 60,        price: 2500, currency: 'RWF' },
    plus:  { name: 'Basic Plus', tests: 45,        lessonPlans: 100,       price: 3500, currency: 'RWF' },
    pro:   { name: 'Pro',        tests: Infinity,  lessonPlans: Infinity,  price: 5000, currency: 'RWF' }
  },

  getUserPlan: (user) => {
    if (!user) return 'free';
    if (!user.plan || user.plan === 'free') return 'free';
    if (user.planExpiry && new Date(user.planExpiry) < new Date()) return 'free';
    return user.plan;
  },

  canCreateTest: (user) => {
    const plan = IA.getUserPlan(user);
    const info = IA.plans[plan];
    if (info.tests === Infinity) return true;
    return IA.getTests().filter(t => t.ownerId === user.id).length < info.tests;
  },

  getLessonPlanLimit: (user) => {
    const plan = IA.getUserPlan(user);
    const info = IA.plans[plan];
    return info ? (info.lessonPlans || 4) : 4;
  },

  /* ── Settings ── */
  getSettings: () => IA.get('settings') || {
    bg: 'default', language: 'en', antiCheat: true,
    maxCheatingAttempts: 3, showCorrectAnswers: false,
    mixQuestions: true, mixOptions: true
  },
  saveSettings: s => IA.set('settings', s),

  /* ── Toast ── */
  toast: (msg, type = 'info') => {
    const t = document.createElement('div');
    t.className = `toast toast-${type}`;
    t.innerHTML = `<span>${msg}</span>`;
    document.body.appendChild(t);
    requestAnimationFrame(() => t.classList.add('show'));
    setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 400); }, 3500);
  },

  /* ── SHORT share link — just the test ID, test loaded from Firestore ── */
  generateQuizLink: (testId) => {
    const href = window.location.href;
    const base = href.substring(0, href.lastIndexOf('/') + 1);
    IA.publishTest(testId);
    // Short link: exam.html?t=TESTID  (test data comes from Firestore or localStorage)
    return base + 'exam.html?t=' + encodeURIComponent(testId);
  },

  /* ── Publish test locally (same-browser fast path) ── */
  publishTest: (testId) => {
    try {
      const test = IA.getTests().find(t => t.id === testId);
      if (test) localStorage.setItem('ia_pub_' + testId, JSON.stringify(test));
    } catch(e) {}
  },

  getPublishedTest: (testId) => {
    try {
      const raw = localStorage.getItem('ia_pub_' + testId);
      return raw ? JSON.parse(raw) : null;
    } catch(e) { return null; }
  },

  /* ── Import code (fallback for offline / no Firebase) ── */
  generateImportCode: (testId) => {
    try {
      const test = IA.getTests().find(t => t.id === testId);
      if (!test) return null;
      const slim = JSON.parse(JSON.stringify(test));
      slim.questions = slim.questions.map(q => { const c = {...q}; delete c.image; return c; });
      return btoa(unescape(encodeURIComponent(JSON.stringify(slim))));
    } catch(e) { return null; }
  },

  decodeImportCode: (code) => {
    try { return JSON.parse(decodeURIComponent(escape(atob(code.trim())))); }
    catch(e) { return null; }
  },

  /* ── Utilities ── */
  copyText: async (text) => {
    try { await navigator.clipboard.writeText(text); return true; }
    catch { return false; }
  },

  fmtDate: d => new Date(d).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  }),

  shuffle: arr => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  },

  exportToExcel: (results, filename = 'results') => {
    const headers = ['Student Name','Student ID','Test','Score','Total','Percentage','Pass/Fail','Date','Violations'];
    const rows = results.map(r => [
      r.student?.name || '', r.student?.id || '',
      r.testTitle || '', r.scored, r.total,
      r.percent + '%', r.passed ? 'PASS' : 'FAIL',
      IA.fmtDate(r.date), r.cheatingFlags || 0
    ]);
    const csv = [headers, ...rows]
      .map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename + '_' + new Date().toISOString().slice(0,10) + '.csv';
    a.click();
  }
};

/* Apply background theme */
(function applyTheme() {
  const s = IA.getSettings();
  const bgs = {
    ocean:  'linear-gradient(135deg,#0a1628,#0d2137,#0a1628)',
    forest: 'linear-gradient(135deg,#0a1a0f,#0d2b17,#0a1a0f)',
    sunset: 'linear-gradient(135deg,#1a0a0a,#2b0d1a,#1a0a0a)',
    purple: 'linear-gradient(135deg,#0e0a1a,#1a0d2b,#0e0a1a)',
    dark:   'linear-gradient(135deg,#050505,#111,#050505)'
  };
  if (s.bg && bgs[s.bg]) document.documentElement.style.setProperty('--bg-override', bgs[s.bg]);
})();
