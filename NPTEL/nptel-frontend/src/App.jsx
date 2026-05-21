import { useState, useEffect, useCallback } from 'react';
import './App.css';

const API = 'https://nptel-exam-system-production.up.railway.app/api';

// ─── helpers ──────────────────────────────────────────────────
function StatusBadge({ value }) {
    const v = String(value).toUpperCase();
    let cls = 'badge badge-warn';
    if (['ACTIVE', 'SUCCESS', 'SUCCESSFUL', 'COMPLETED', 'ELITE', 'ELITE + GOLD',
        'ELITE + SILVER', 'SUCCESSFULLY COMPLETED', 'APPROVED', 'O', 'A'].some(s => v.includes(s)))
        cls = 'badge badge-ok';
    else if (['FAILED', 'DROPPED', 'NO CERTIFICATE', 'CANCELLED', 'REJECTED', 'U', 'PENDING'].some(s => v.includes(s)))
        cls = 'badge badge-err';
    return <span className={cls}>{value}</span>;
}

const STATUS_COLS = ['STATUS', 'PAYMENT_STATUS', 'CERTIFICATE_TYPE', 'GRADE', 'REG_STATUS'];
function isStatus(col) { return STATUS_COLS.includes(String(col).toUpperCase()); }

function DataTable({ rows }) {
    if (!rows || rows.length === 0)
        return <p className="empty-msg">No records found.</p>;
    const cols = Object.keys(rows[0]);
    return (
        <div className="tbl-wrap">
            <table className="dtbl">
                <thead>
                    <tr><th>#</th>{cols.map(c => <th key={c}>{c.replace(/_/g, ' ')}</th>)}</tr>
                </thead>
                <tbody>
                    {rows.map((r, i) => (
                        <tr key={i}>
                            <td className="rn">{i + 1}</td>
                            {cols.map(c => (
                                <td key={c}>
                                    {r[c] == null ? <span className="null">—</span>
                                        : isStatus(c) ? <StatusBadge value={String(r[c])} />
                                            : String(r[c])}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function useFetch(url) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const load = useCallback(async () => {
        if (!url) { setData(null); return; }
        setLoading(true); setError(null);
        try {
            const res = await fetch(url);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            setData(await res.json());
        } catch (e) { setError(e.message); }
        finally { setLoading(false); }
    }, [url]);
    useEffect(() => { load(); }, [load]);
    return { data, loading, error, reload: load };
}

// ─── Certificate Generator ─────────────────────────────────────
function downloadCertificate(cert) {
    const gradeColors = { O: '#16a34a', A: '#2563eb', B: '#7c3aed', C: '#d97706', U: '#dc2626' };
    const gc = gradeColors[cert.GRADE] || '#2563eb';
    const certTypeColor = cert.CERTIFICATE_TYPE?.includes('Gold') ? '#f59e0b'
        : cert.CERTIFICATE_TYPE?.includes('Silver') ? '#94a3b8'
            : cert.CERTIFICATE_TYPE?.includes('Elite') ? '#3b82f6'
                : '#16a34a';

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <title>NPTEL Certificate — ${cert.COURSE_NAME}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=Inter:wght@300;400;500;600&display=swap');
    * { margin:0; padding:0; box-sizing:border-box; }
    body { background:#f8f5f0; display:flex; justify-content:center; align-items:center; min-height:100vh; font-family:'Inter',sans-serif; }
    .cert { width:860px; background:#fff; border:3px solid #1a1a4e; padding:0; position:relative; overflow:hidden; }
    .header { background:linear-gradient(135deg,#1a1a4e 0%,#2d2d8f 100%); padding:32px 48px; display:flex; align-items:center; gap:24px; }
    .logo { font-family:'Playfair Display',serif; font-size:48px; font-weight:700; color:#fff; letter-spacing:8px; }
    .header-text h1 { color:#fff; font-size:13px; font-weight:400; letter-spacing:3px; text-transform:uppercase; opacity:.8; }
    .header-text h2 { color:#fff; font-size:19px; font-weight:600; margin-top:4px; }
    .gold-bar { height:6px; background:linear-gradient(90deg,#f59e0b,#fcd34d,#f59e0b); }
    .body { padding:48px 56px; }
    .certifies { font-size:13px; color:#64748b; letter-spacing:2px; text-transform:uppercase; text-align:center; margin-bottom:12px; }
    .name { font-family:'Playfair Display',serif; font-size:42px; font-weight:700; color:#1a1a4e; text-align:center; border-bottom:2px solid #e2e8f0; padding-bottom:16px; margin-bottom:16px; }
    .has-completed { font-size:14px; color:#64748b; text-align:center; margin-bottom:8px; }
    .course { font-family:'Playfair Display',serif; font-size:26px; font-weight:700; color:#1e3a8a; text-align:center; margin-bottom:32px; }
    .stats { display:flex; justify-content:center; gap:40px; margin-bottom:36px; }
    .stat { text-align:center; padding:18px 28px; border-radius:12px; border:1px solid #e2e8f0; background:#f8fafc; }
    .stat-val { font-size:32px; font-weight:700; }
    .stat-lbl { font-size:11px; color:#94a3b8; letter-spacing:1px; text-transform:uppercase; margin-top:4px; }
    .cert-type { text-align:center; margin-bottom:32px; }
    .cert-badge { display:inline-block; padding:10px 32px; border-radius:50px; font-size:14px; font-weight:700; letter-spacing:2px; text-transform:uppercase; border:2px solid ${certTypeColor}; color:${certTypeColor}; }
    .footer { display:flex; justify-content:space-between; align-items:flex-end; border-top:1px solid #e2e8f0; padding-top:24px; }
    .foot-item { text-align:center; }
    .foot-val { font-size:14px; font-weight:600; color:#1a1a4e; }
    .foot-lbl { font-size:10px; color:#94a3b8; letter-spacing:1px; text-transform:uppercase; margin-top:4px; }
    .watermark { position:absolute; top:50%; left:50%; transform:translate(-50%,-50%) rotate(-30deg); font-size:90px; font-weight:900; color:rgba(26,26,78,.04); white-space:nowrap; pointer-events:none; font-family:'Playfair Display',serif; letter-spacing:12px; }
    .grade-pill { display:inline-block; width:56px; height:56px; border-radius:50%; background:${gc}; color:#fff; font-size:22px; font-weight:700; line-height:56px; text-align:center; }
  </style>
</head>
<body>
<div class="cert">
  <div class="watermark">NPTEL</div>
  <div class="header">
    <div class="logo">NPTEL</div>
    <div class="header-text">
      <h1>National Programme on Technology Enhanced Learning</h1>
      <h2>Certificate of Achievement</h2>
    </div>
  </div>
  <div class="gold-bar"></div>
  <div class="body">
    <p class="certifies">This is to certify that</p>
    <div class="name">${cert.LEARNER_NAME || cert.learner_name || 'Learner'}</div>
    <p class="has-completed">has successfully completed the course</p>
    <div class="course">${cert.COURSE_NAME || cert.course_name || 'Course'}</div>
    <div class="stats">
      <div class="stat">
        <div class="stat-val" style="color:#2563eb">${Number(cert.FINAL_SCORE || cert.final_score || 0).toFixed(1)}</div>
        <div class="stat-lbl">Final Score</div>
      </div>
      <div class="stat">
        <div class="stat-val"><div class="grade-pill">${cert.GRADE || cert.grade || '—'}</div></div>
        <div class="stat-lbl">Grade</div>
      </div>
      <div class="stat">
        <div class="stat-val" style="color:#7c3aed;font-size:18px">${cert.DISCIPLINE_NAME || cert.discipline_name || '—'}</div>
        <div class="stat-lbl">Discipline</div>
      </div>
    </div>
    <div class="cert-type">
      <span class="cert-badge">${cert.CERTIFICATE_TYPE || cert.certificate_type || '—'}</span>
    </div>
    <div class="footer">
      <div class="foot-item">
        <div class="foot-val">${cert.CERTIFICATE_ID || cert.certificate_id || '—'}</div>
        <div class="foot-lbl">Certificate ID</div>
      </div>
      <div class="foot-item">
        <div class="foot-val">${cert.INSTRUCTOR_INSTITUTION || cert.instructor_institution || 'IIT / IISc'}</div>
        <div class="foot-lbl">Issuing Institution</div>
      </div>
      <div class="foot-item">
        <div class="foot-val">${cert.ISSUE_DATE ? new Date(cert.ISSUE_DATE).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }) : '—'}</div>
        <div class="foot-lbl">Issue Date</div>
      </div>
    </div>
  </div>
</div>
</body>
</html>`;

    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `NPTEL_Certificate_${(cert.COURSE_NAME || 'course').replace(/\s+/g, '_')}.html`;
    a.click();
    URL.revokeObjectURL(url);
}

// ─── GRADE LEGEND ─────────────────────────────────────────────
function GradeLegend() {
    const grades = [
        { g: 'O', label: '≥ 90', color: '#16a34a' },
        { g: 'A', label: '80–89', color: '#2563eb' },
        { g: 'B', label: '55–79', color: '#7c3aed' },
        { g: 'C', label: '40–54', color: '#d97706' },
        { g: 'U', label: '< 40 (Fail)', color: '#dc2626' },
    ];
    return (
        <div className="grade-legend">
            <span className="legend-label">Grade Scale:</span>
            {grades.map(g => (
                <span key={g.g} className="legend-item" style={{ '--gc': g.color }}>
                    <span className="legend-g">{g.g}</span> {g.label}
                </span>
            ))}
        </div>
    );
}

// ─── REGISTRATION PAGE ─────────────────────────────────────────
// Students: self-register → admin approves → account created
// Professors: admin creates account directly after approval
function RegisterPage({ onBack }) {
    const [role, setRole] = useState('STUDENT');
    const [form, setForm] = useState({
        fullName: '', email: '', phone: '', password: '', confirmPassword: '',
        dob: '', gender: 'Male', aadhaarNo: '', category: 'General',
        educationLevel: 'B.Tech', stateOfResidence: '',
        institutionId: '', designation: '',
    });
    const [institutions, setInstitutions] = useState([]);
    const [msg, setMsg] = useState('');
    const [ok, setOk] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetch(`${API}/auth/institutions`)
            .then(r => r.json()).then(setInstitutions).catch(() => { });
    }, []);

    function set(k, v) { setForm(p => ({ ...p, [k]: v })); }

    async function handleSubmit(e) {
        e.preventDefault();
        if (form.password !== form.confirmPassword) { setMsg('Passwords do not match.'); return; }
        if (role === 'STUDENT' && form.aadhaarNo && form.aadhaarNo.length !== 12) {
            setMsg('Aadhaar number must be 12 digits.'); return;
        }
        setLoading(true); setMsg('');
        try {
            const endpoint = role === 'STUDENT' ? 'student' : 'professor';
            const payload = role === 'STUDENT'
                ? {
                    fullName: form.fullName, email: form.email, phone: form.phone, password: form.password,
                    dob: form.dob, gender: form.gender, aadhaarNo: form.aadhaarNo,
                    category: form.category, educationLevel: form.educationLevel,
                    stateOfResidence: form.stateOfResidence, role: 'STUDENT'
                }
                : {
                    fullName: form.fullName, email: form.email, phone: form.phone, password: form.password,
                    institutionId: form.institutionId, designation: form.designation, role: 'PROFESSOR'
                };

            const res = await fetch(`${API}/auth/register/${endpoint}`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const d = await res.json();
            setMsg(d.message);
            setOk(!!d.success);
        } catch { setMsg('Cannot reach backend. Ensure Spring Boot is running on port 8080.'); }
        finally { setLoading(false); }
    }

    return (
        <div className="login-root">
            <div className="login-card" style={{ width: 480 }}>
                <div className="login-logo">
                    <span style={{ color: '#00d4ff' }}>N</span>
                    <span style={{ color: '#a78bfa' }}>P</span>
                    <span style={{ color: '#34d399' }}>T</span>
                    <span style={{ color: '#f59e0b' }}>E</span>
                    <span style={{ color: '#f472b6' }}>L</span>
                </div>
                <p className="login-sub">Create Account</p>

                <div className="role-toggle">
                    {['STUDENT', 'PROFESSOR'].map(r => (
                        <button key={r} type="button" className={`role-tab ${role === r ? 'active' : ''}`}
                            onClick={() => { setRole(r); setMsg(''); setOk(false); }}>
                            {r === 'STUDENT' ? '🎓 Student' : '👨‍🏫 Professor'}
                        </button>
                    ))}
                </div>

                {role === 'PROFESSOR' && (
                    <div className="info-banner">
                        ℹ️ Professor accounts require admin approval before login. Submit your request and wait for activation.
                    </div>
                )}
                {role === 'STUDENT' && (
                    <div className="info-banner">
                        ℹ️ You will get instant access after registration. No admin approval needed!
                    </div>
                )}

                {ok && (
                    <div className="info-banner" style={{ borderColor: '#34d399', color: '#34d399' }}>
                        ✅ {msg}
                    </div>
                )}

                {!ok && (
                    <form onSubmit={handleSubmit} className="login-form" style={{ gap: 8 }}>
                        <label>Full Name</label>
                        <input value={form.fullName} required onChange={e => set('fullName', e.target.value)} placeholder="Your full name" />
                        <label>Email</label>
                        <input type="email" value={form.email} required onChange={e => set('email', e.target.value)} placeholder="email@example.com" />
                        <label>Phone</label>
                        <input value={form.phone} required maxLength={10} onChange={e => set('phone', e.target.value)} placeholder="10-digit phone number" />
                        <label>Password</label>
                        <input type="password" value={form.password} required onChange={e => set('password', e.target.value)} placeholder="Set a password" />
                        <label>Confirm Password</label>
                        <input type="password" value={form.confirmPassword} required onChange={e => set('confirmPassword', e.target.value)} placeholder="Repeat password" />

                        {role === 'STUDENT' && (<>
                            <label>Date of Birth</label>
                            <input type="date" value={form.dob} required onChange={e => set('dob', e.target.value)} />
                            <label>Gender</label>
                            <select value={form.gender} onChange={e => set('gender', e.target.value)}>
                                <option>Male</option><option>Female</option><option>Other</option>
                            </select>
                            <label>Aadhaar Number</label>
                            <input value={form.aadhaarNo} maxLength={12} onChange={e => set('aadhaarNo', e.target.value)} placeholder="12-digit Aadhaar" />
                            <label>Category</label>
                            <select value={form.category} onChange={e => set('category', e.target.value)}>
                                <option>General</option><option>OBC</option><option>SC</option><option>ST</option><option>EWS</option>
                            </select>
                            <label>Education Level</label>
                            <select value={form.educationLevel} onChange={e => set('educationLevel', e.target.value)}>
                                <option>School</option><option>B.Tech</option><option>B.Sc</option>
                                <option>M.Tech</option><option>M.Sc</option><option>PhD</option><option>Other</option>
                            </select>
                            <label>State of Residence</label>
                            <input value={form.stateOfResidence} required onChange={e => set('stateOfResidence', e.target.value)} placeholder="e.g. Tamil Nadu" />
                        </>)}

                        {role === 'PROFESSOR' && (<>
                            <label>Institution</label>
                            <select value={form.institutionId} required onChange={e => set('institutionId', e.target.value)}>
                                <option value="">— select institution —</option>
                                {institutions.map(i => (
                                    <option key={i.INSTITUTION_ID} value={i.INSTITUTION_ID}>{i.INSTITUTION_NAME}</option>
                                ))}
                            </select>
                            <label>Designation</label>
                            <select value={form.designation} onChange={e => set('designation', e.target.value)}>
                                <option>Associate Professor</option>
                                <option>Assistant Professor</option>
                                <option>Professor</option>
                                <option>Research Scholar</option>
                            </select>
                        </>)}

                        {msg && !ok && <p className="err-msg">⚠ {msg}</p>}
                        <button className="btn-login" type="submit" disabled={loading}>
                            {loading ? 'Submitting…' : 'Submit Registration Request'}
                        </button>
                    </form>
                )}

                <p className="register-link" style={{ marginTop: 16, textAlign: 'center' }}>
                    <button className="link-btn" onClick={onBack}>← Back to Login</button>
                </p>
            </div>
        </div>
    );
}

// ─── LOGIN PAGE ───────────────────────────────────────────────
function LoginPage({ onLogin }) {
    const [showRegister, setShowRegister] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    if (showRegister) return <RegisterPage onBack={() => setShowRegister(false)} />;

    async function handleLogin(e) {
        e.preventDefault();
        setLoading(true); setError('');
        try {
            const res = await fetch(`${API}/auth/login`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });
            if (!res.ok) { setError('Invalid email or password.'); return; }
            const d = await res.json();
            if (d.error) { setError(d.error); return; }
            onLogin(d);
        } catch { setError('Cannot reach backend. Ensure Spring Boot is running on port 8080.'); }
        finally { setLoading(false); }
    }

    return (
        <div className="login-root">
            <div className="login-card">
                <div className="login-logo">
                    <span style={{ color: '#00d4ff' }}>N</span>
                    <span style={{ color: '#a78bfa' }}>P</span>
                    <span style={{ color: '#34d399' }}>T</span>
                    <span style={{ color: '#f59e0b' }}>E</span>
                    <span style={{ color: '#f472b6' }}>L</span>
                </div>
                <p className="login-sub">National Programme on Technology Enhanced Learning</p>

                <form onSubmit={handleLogin} className="login-form">
                    <label>Email</label>
                    <input type="email" value={email} required autoFocus
                        onChange={e => setEmail(e.target.value)} placeholder="your@email.com" />
                    <label>Password</label>
                    <input type="password" value={password} required
                        onChange={e => setPassword(e.target.value)} placeholder="••••••••" />
                    {error && <p className="err-msg">⚠ {error}</p>}
                    <button className="btn-login" type="submit" disabled={loading}>
                        {loading ? 'Signing in…' : 'Sign In'}
                    </button>
                </form>

                <div className="login-divider">New here?</div>
                <button className="btn-register-cta" onClick={() => setShowRegister(true)}>
                    Create Account
                </button>

                <div className="login-hint">
                    <p>Demo credentials:</p>
                    <p>Admin: admin@nptel.in / password123</p>
                    <p>Student: amit@example.com / password123</p>
                    <p>Professor: ramesh@iitm.ac.in / password123</p>
                </div>
            </div>
        </div>
    );
}

// ─── SHELL (sidebar layout) ───────────────────────────────────
function Shell({ user, onLogout, navItems, activeNav, setActiveNav, children }) {
    const colors = { ADMIN: '#f59e0b', STUDENT: '#34d399', PROFESSOR: '#a78bfa' };
    const color = colors[user.role] || '#60a5fa';
    return (
        <div className="shell">
            <aside className="sidebar">
                <div className="side-brand">
                    <span className="side-logo">NPTEL</span>
                    <span className="side-role" style={{ color }}>{user.role}</span>
                </div>
                <nav className="side-nav">
                    {navItems.map(n => (
                        <button key={n.id}
                            className={`side-btn ${activeNav === n.id ? 'active' : ''}`}
                            onClick={() => setActiveNav(n.id)}>
                            <span className="side-icon">{n.icon}</span>
                            <span>{n.label}</span>
                        </button>
                    ))}
                </nav>
                <div className="side-footer">
                    <div className="side-user">
                        <div className="side-avatar" style={{ background: color }}>
                            {user.name?.[0] || '?'}
                        </div>
                        <div>
                            <div className="side-name">{user.name}</div>
                            <div className="side-id">{user.refId || 'admin'}</div>
                        </div>
                    </div>
                    <button className="btn-logout" onClick={onLogout}>Logout</button>
                </div>
            </aside>
            <main className="shell-main">{children}</main>
        </div>
    );
}

// ─── Reusable Panel ───────────────────────────────────────────
function Panel({ title, url }) {
    const { data, loading, error, reload } = useFetch(url);
    return (
        <div className="panel-block">
            <div className="panel-hdr">
                <h2>{title}</h2>
                <button className="btn-reload" onClick={reload}>↻ Refresh</button>
            </div>
            {loading && <p className="loading-msg">Loading…</p>}
            {error && <p className="err-msg">⚠ {error}</p>}
            {!loading && !error && <DataTable rows={data} />}
        </div>
    );
}

// ═══════════════════════════════════════════════
//  ADMIN DASHBOARD
// ═══════════════════════════════════════════════
const ADMIN_NAV = [
    { id: 'learners', icon: '👤', label: 'Learners' },
    { id: 'courses', icon: '📚', label: 'Courses' },
    { id: 'create-course', icon: '➕', label: 'Create Course' },
    { id: 'assign-instructor', icon: '🔗', label: 'Assign Instructor' },
    { id: 'requests', icon: '📩', label: 'Reg. Requests' },
    { id: 'instructors', icon: '🎓', label: 'Instructors' },
    { id: 'enrollments', icon: '📋', label: 'Enrollments' },
    { id: 'payments', icon: '💳', label: 'Payments' },
    { id: 'results', icon: '📊', label: 'Results' },
    { id: 'certificates', icon: '🏆', label: 'Certificates' },
    { id: 'grievances', icon: '📣', label: 'Grievances' },
];

function AdminDashboard({ user, onLogout }) {
    const [active, setActive] = useState('learners');

    const [cc, setCc] = useState({ courseName: '', disciplineId: '', durationWeeks: '12', credits: '3', examDate: '' });
    const [ccMsg, setCcMsg] = useState('');
    const { data: disciplines } = useFetch(`${API}/admin/disciplines`);

    const [ai, setAi] = useState({ courseId: '', instructorId: '' });
    const [aiMsg, setAiMsg] = useState('');
    const { data: courses } = useFetch(`${API}/admin/courses`);
    const { data: instructors } = useFetch(`${API}/admin/instructors`);

    const { data: requests, reload: reloadReqs } = useFetch(
        active === 'requests' ? `${API}/admin/requests` : null);
    const [reqMsg, setReqMsg] = useState('');

    const URL_MAP = {
        learners: `${API}/admin/learners`,
        courses: `${API}/admin/courses`,
        instructors: `${API}/admin/instructors`,
        enrollments: `${API}/admin/enrollments`,
        payments: `${API}/admin/payments`,
        results: `${API}/admin/results`,
        certificates: `${API}/admin/certificates`,
        grievances: `${API}/admin/grievances`,
    };
    const TITLES = {
        learners: 'All Learners', courses: 'All Courses', instructors: 'All Instructors',
        enrollments: 'All Enrollments', payments: 'Payments',
        results: 'Exam Results', certificates: 'Issued Certificates', grievances: 'All Grievances',
    };

    async function handleCreateCourse(e) {
        e.preventDefault(); setCcMsg('');
        try {
            const res = await fetch(`${API}/admin/courses/create`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...cc, durationWeeks: Number(cc.durationWeeks), credits: Number(cc.credits) }),
            });
            const d = await res.json();
            setCcMsg(d.message);
            if (d.success) setCc({ courseName: '', disciplineId: '', durationWeeks: '12', credits: '3', examDate: '' });
        } catch { setCcMsg('Network error.'); }
    }

    async function handleAssign(e) {
        e.preventDefault(); setAiMsg('');
        try {
            const res = await fetch(`${API}/admin/courses/assign-instructor`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(ai),
            });
            const d = await res.json();
            setAiMsg(d.message);
        } catch { setAiMsg('Network error.'); }
    }

    async function handleRequest(requestId, action) {
        try {
            const res = await fetch(`${API}/admin/requests/${action}`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ requestId }),
            });
            const d = await res.json();
            setReqMsg(d.message);
            reloadReqs();
        } catch { setReqMsg('Network error.'); }
    }

    async function computeResults() {
        try {
            const res = await fetch(`${API}/admin/compute-results`, { method: 'POST' });
            const d = await res.json();
            alert(d.message);
        } catch { alert('Error computing results.'); }
    }

    return (
        <Shell user={user} onLogout={onLogout}
            navItems={ADMIN_NAV} activeNav={active}
            setActiveNav={t => { setActive(t); setCcMsg(''); setAiMsg(''); setReqMsg(''); }}>

            {URL_MAP[active] && (
                <div className="panel-block">
                    <div className="panel-hdr">
                        <h2>{TITLES[active]}</h2>
                        {active === 'results' && (
                            <button className="btn-reload" onClick={computeResults}
                                style={{ background: 'rgba(52,211,153,.12)', color: '#34d399', border: '1px solid rgba(52,211,153,.3)' }}>
                                ⚡ Compute Results
                            </button>
                        )}
                    </div>
                    <Panel title="" url={URL_MAP[active]} />
                </div>
            )}

            {active === 'create-course' && (
                <div className="panel-block">
                    <h2>Create New Course</h2>
                    <p className="section-desc">Create a course, then assign a professor. Students can enroll and pay the exam fee separately.</p>
                    <div className="section-card" style={{ marginTop: 20, maxWidth: 520 }}>
                        <form onSubmit={handleCreateCourse} className="login-form" style={{ gap: 10 }}>
                            <label>Course Name</label>
                            <input value={cc.courseName} required placeholder="e.g. Introduction to Machine Learning"
                                onChange={e => setCc(p => ({ ...p, courseName: e.target.value }))} />
                            <label>Discipline</label>
                            <select value={cc.disciplineId} required
                                onChange={e => setCc(p => ({ ...p, disciplineId: e.target.value }))}>
                                <option value="">— select discipline —</option>
                                {disciplines?.map(d => (
                                    <option key={d.DISCIPLINE_ID} value={d.DISCIPLINE_ID}>{d.DISCIPLINE_NAME}</option>
                                ))}
                            </select>
                            <label>Duration (weeks)</label>
                            <select value={cc.durationWeeks} onChange={e => setCc(p => ({ ...p, durationWeeks: e.target.value }))}>
                                <option value="4">4 weeks</option>
                                <option value="8">8 weeks</option>
                                <option value="12">12 weeks</option>
                            </select>
                            <label>Credits</label>
                            <input type="number" min={1} max={8} value={cc.credits}
                                onChange={e => setCc(p => ({ ...p, credits: e.target.value }))} />
                            <label>Exam Date</label>
                            <input type="date" value={cc.examDate} required
                                onChange={e => setCc(p => ({ ...p, examDate: e.target.value }))} />
                            {ccMsg && <p className="info-msg">{ccMsg}</p>}
                            <button className="btn-login" type="submit">Create Course</button>
                        </form>
                    </div>
                </div>
            )}

            {active === 'assign-instructor' && (
                <div className="panel-block">
                    <h2>Assign Instructor to Course</h2>
                    <p className="section-desc">Only admin can assign professors to courses.</p>
                    <div className="section-card" style={{ marginTop: 20, maxWidth: 520 }}>
                        <form onSubmit={handleAssign} className="login-form" style={{ gap: 10 }}>
                            <label>Course</label>
                            <select value={ai.courseId} required
                                onChange={e => setAi(p => ({ ...p, courseId: e.target.value }))}>
                                <option value="">— select course —</option>
                                {courses?.map(c => (
                                    <option key={c.COURSE_ID} value={c.COURSE_ID}>{c.COURSE_NAME}</option>
                                ))}
                            </select>
                            <label>Instructor</label>
                            <select value={ai.instructorId} required
                                onChange={e => setAi(p => ({ ...p, instructorId: e.target.value }))}>
                                <option value="">— select instructor —</option>
                                {instructors?.map(i => (
                                    <option key={i.INSTRUCTOR_ID} value={i.INSTRUCTOR_ID}>
                                        {i.FULL_NAME} — {i.INSTITUTION_NAME}
                                    </option>
                                ))}
                            </select>
                            {aiMsg && <p className="info-msg">{aiMsg}</p>}
                            <button className="btn-login" type="submit">Assign Instructor</button>
                        </form>
                    </div>
                </div>
            )}

            {active === 'requests' && (
                <div className="panel-block">
                    <h2>Registration Requests</h2>
                    <p className="section-desc">
                        Students register themselves. Professors submit requests too. Admin approves/rejects both.
                        On approval, accounts are created automatically.
                    </p>
                    {reqMsg && <p className="info-msg" style={{ marginTop: 12 }}>{reqMsg}</p>}
                    {(!requests || requests.length === 0) && (
                        <p className="empty-msg" style={{ marginTop: 16 }}>No pending requests.</p>)}
                    <div className="req-list">
                        {requests?.map(r => (
                            <div className="req-card" key={r.REQUEST_ID}>
                                <div className="req-hdr">
                                    <span className="req-name">{r.FULL_NAME}</span>
                                    <span className={`badge ${r.ROLE === 'PROFESSOR' ? 'badge-warn' : 'badge-ok'}`}>
                                        {r.ROLE}
                                    </span>
                                </div>
                                <div className="req-meta">
                                    <span>📧 {r.EMAIL}</span>
                                    <span>📞 {r.PHONE}</span>
                                    {r.EDUCATION_LEVEL && <span>🎓 {r.EDUCATION_LEVEL}</span>}
                                    {r.INSTITUTION_ID && <span>🏛 {r.INSTITUTION_ID} · {r.DESIGNATION}</span>}
                                    {r.STATE_OF_RESIDENCE && <span>📍 {r.STATE_OF_RESIDENCE}</span>}
                                    {r.CATEGORY && <span>🏷 {r.CATEGORY}</span>}
                                </div>
                                <div className="req-actions">
                                    <button className="btn-approve"
                                        onClick={() => handleRequest(r.REQUEST_ID, 'approve')}>
                                        ✓ Approve
                                    </button>
                                    <button className="btn-reject"
                                        onClick={() => handleRequest(r.REQUEST_ID, 'reject')}>
                                        ✗ Reject
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </Shell>
    );
}

// ═══════════════════════════════════════════════
//  STUDENT DASHBOARD
// ═══════════════════════════════════════════════
const STUDENT_NAV = [
    { id: 'available', icon: '🔍', label: 'Browse Courses' },
    { id: 'my-courses', icon: '📚', label: 'My Courses' },
    { id: 'exam-reg', icon: '📝', label: 'Exam & Payment' },
    { id: 'assignments', icon: '✏️', label: 'Assignments' },
    { id: 'results', icon: '📊', label: 'Results' },
    { id: 'certificates', icon: '🏆', label: 'Certificates' },
    { id: 'grievances', icon: '📣', label: 'Grievances' },
];

function StudentDashboard({ user, onLogout }) {
    const [active, setActive] = useState('available');
    const lid = user.refId;

    const [enrollMsg, setEnrollMsg] = useState('');
    const [enrolling, setEnrolling] = useState(false);
    const [selEnroll, setSelEnroll] = useState('');
    const [submitMsg, setSubmitMsg] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [marksInput, setMarksInput] = useState({});
    const [grvCourse, setGrvCourse] = useState('');
    const [grvType, setGrvType] = useState('Assignment Score');
    const [grvDesc, setGrvDesc] = useState('');
    const [grvMsg, setGrvMsg] = useState('');
    const [grvSubmitting, setGrvSubmitting] = useState(false);
    const [certDownloading, setCertDownloading] = useState('');

    // Exam registration state
    const [examRegForm, setExamRegForm] = useState({ enrollmentId: '', cityPref1: 'Chennai', cityPref2: 'Mumbai' });
    const [examRegMsg, setExamRegMsg] = useState('');
    const [examRegistering, setExamRegistering] = useState(false);
    const [payForm, setPayForm] = useState({ registrationId: '', amountPaid: '' });
    const [payMsg, setPayMsg] = useState('');
    const [paying, setPaying] = useState(false);

    const { data: available, reload: reloadAvail } = useFetch(
        active === 'available' ? `${API}/student/courses/available?learnerId=${lid}` : null);
    const { data: myCourses } = useFetch(
        ['my-courses', 'assignments', 'grievances', 'exam-reg'].includes(active)
            ? `${API}/student/my-courses?learnerId=${lid}` : null);
    const { data: assignments, loading: asgLoad } = useFetch(
        selEnroll ? `${API}/student/assignments?enrollmentId=${selEnroll}` : null);
    const { data: results } = useFetch(
        active === 'results' ? `${API}/student/results?learnerId=${lid}` : null);
    const { data: certs } = useFetch(
        active === 'certificates' ? `${API}/student/certificate?learnerId=${lid}` : null);
    const { data: grievances, reload: reloadGrv } = useFetch(
        active === 'grievances' ? `${API}/student/grievances?learnerId=${lid}` : null);
    const { data: examRegs, reload: reloadExamRegs } = useFetch(
        active === 'exam-reg' ? `${API}/student/exam-registrations?learnerId=${lid}` : null);

    async function handleEnroll(courseId) {
        setEnrolling(true); setEnrollMsg('');
        try {
            const res = await fetch(`${API}/student/enroll`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ learnerId: lid, courseId }),
            });
            const d = await res.json();
            setEnrollMsg(d.message);
            if (d.success) reloadAvail();
        } catch { setEnrollMsg('Network error.'); }
        finally { setEnrolling(false); }
    }

    async function handleSubmit(assignmentId) {
        const marks = parseInt(marksInput[assignmentId]);
        if (isNaN(marks)) { setSubmitMsg('Enter a valid number.'); return; }
        setSubmitting(true); setSubmitMsg('');
        try {
            const res = await fetch(`${API}/student/submit-assignment`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ learnerId: lid, assignmentId, marksObtained: marks }),
            });
            const d = await res.json();
            setSubmitMsg(d.message);
            if (d.success) setMarksInput(p => { const n = { ...p }; delete n[assignmentId]; return n; });
        } catch { setSubmitMsg('Network error.'); }
        finally { setSubmitting(false); }
    }

    async function handleGrievance(e) {
        e.preventDefault();
        if (!grvCourse) { setGrvMsg('Please select a course.'); return; }
        setGrvSubmitting(true); setGrvMsg('');
        try {
            const res = await fetch(`${API}/student/grievance`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ learnerId: lid, courseId: grvCourse, issueType: grvType, description: grvDesc }),
            });
            const d = await res.json();
            setGrvMsg(d.message);
            if (d.success) { setGrvDesc(''); reloadGrv(); }
        } catch { setGrvMsg('Network error.'); }
        finally { setGrvSubmitting(false); }
    }

    async function handleRegisterExam(e) {
        e.preventDefault();
        if (!examRegForm.enrollmentId) { setExamRegMsg('Select an enrollment.'); return; }
        setExamRegistering(true); setExamRegMsg('');
        try {
            const res = await fetch(`${API}/student/register-exam`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    learnerId: lid,
                    enrollmentId: examRegForm.enrollmentId,
                    cityPref1: examRegForm.cityPref1,
                    cityPref2: examRegForm.cityPref2,
                }),
            });
            const d = await res.json();
            setExamRegMsg(d.message);
            if (d.success) {
                reloadExamRegs();
                // Pre-fill payment form
                setPayForm(p => ({ ...p, registrationId: d.registrationId, amountPaid: d.feeAmount }));
            }
        } catch { setExamRegMsg('Network error.'); }
        finally { setExamRegistering(false); }
    }

    async function handlePayment(e) {
        e.preventDefault();
        if (!payForm.registrationId) { setPayMsg('Enter registration ID.'); return; }
        setPaying(true); setPayMsg('');
        try {
            const res = await fetch(`${API}/student/pay-exam-fee`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    registrationId: payForm.registrationId,
                    amountPaid: Number(payForm.amountPaid),
                }),
            });
            const d = await res.json();
            setPayMsg(d.message);
            if (d.success) reloadExamRegs();
        } catch { setPayMsg('Network error.'); }
        finally { setPaying(false); }
    }

    function handleDownloadCertInline(cert) {
        setCertDownloading(cert.CERTIFICATE_ID);
        downloadCertificate({
            ...cert,
            LEARNER_NAME: user.name,
        });
        setTimeout(() => setCertDownloading(''), 1000);
    }

    function switchTab(t) {
        setActive(t); setEnrollMsg(''); setSubmitMsg(''); setGrvMsg('');
        setExamRegMsg(''); setPayMsg('');
    }

    const CITIES = ['Chennai', 'Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Kolkata', 'Pune', 'Ahmedabad'];

    return (
        <Shell user={user} onLogout={onLogout}
            navItems={STUDENT_NAV} activeNav={active} setActiveNav={switchTab}>

            {/* ── Browse & Enroll ── */}
            {active === 'available' && (
                <div className="panel-block">
                    <h2>Browse Available Courses</h2>
                    <p className="section-desc">
                        Enroll in courses for free. After enrollment, register for the proctored exam and pay the fee (₹1000; SC/ST: ₹500).
                        Best 8 of 12 weekly assignments count for 25% of your final score.
                    </p>
                    {enrollMsg && <p className="info-msg">{enrollMsg}</p>}
                    {!available && <p className="loading-msg">Loading…</p>}
                    {available?.length === 0 && (
                        <p className="empty-msg">🎉 You are enrolled in all available courses!</p>)}
                    <div className="course-grid">
                        {available?.map(c => (
                            <div className="course-card" key={c.COURSE_ID}>
                                <div className="cc-top">
                                    <span className="cc-tag">{c.DISCIPLINE_NAME}</span>
                                    <span className="cc-dur">{c.DURATION_WEEKS}w · {c.CREDITS} cr</span>
                                </div>
                                <h3 className="cc-name">{c.COURSE_NAME}</h3>
                                <p className="cc-date">
                                    Exam: {c.EXAM_DATE ? new Date(c.EXAM_DATE).toLocaleDateString() : '—'}
                                </p>
                                <p className="cc-fee">💳 Exam fee: ₹1000 (SC/ST: ₹500)</p>
                                <button className="btn-enroll" disabled={enrolling}
                                    onClick={() => handleEnroll(c.COURSE_ID)}>
                                    + Enroll
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ── My Courses ── */}
            {active === 'my-courses' && (
                <div className="panel-block">
                    <h2>My Enrolled Courses</h2>
                    <DataTable rows={myCourses} />
                </div>
            )}

            {/* ── Exam Registration & Payment ── */}
            {active === 'exam-reg' && (
                <div className="panel-block">
                    <h2>Exam Registration & Payment</h2>
                    <p className="section-desc">
                        Register for the proctored exam for each enrolled course, then complete payment to confirm your seat.
                        Fee: ₹1000 (SC/ST category: ₹500). Results are generated after proctored exam scores are entered.
                    </p>

                    <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', marginTop: 20 }}>
                        {/* Register for Exam */}
                        <div className="section-card" style={{ flex: 1, minWidth: 300 }}>
                            <h3 className="section-title">Step 1: Register for Exam</h3>
                            <form onSubmit={handleRegisterExam} className="login-form" style={{ gap: 10 }}>
                                <label>Select Course Enrollment</label>
                                <select value={examRegForm.enrollmentId}
                                    onChange={e => setExamRegForm(p => ({ ...p, enrollmentId: e.target.value }))} required>
                                    <option value="">— pick a course —</option>
                                    {myCourses?.map(c => (
                                        <option key={c.ENROLLMENT_ID} value={c.ENROLLMENT_ID}>
                                            {c.COURSE_NAME}
                                        </option>
                                    ))}
                                </select>
                                <label>City Preference 1</label>
                                <select value={examRegForm.cityPref1}
                                    onChange={e => setExamRegForm(p => ({ ...p, cityPref1: e.target.value }))}>
                                    {CITIES.map(c => <option key={c}>{c}</option>)}
                                </select>
                                <label>City Preference 2</label>
                                <select value={examRegForm.cityPref2}
                                    onChange={e => setExamRegForm(p => ({ ...p, cityPref2: e.target.value }))}>
                                    {CITIES.map(c => <option key={c}>{c}</option>)}
                                </select>
                                {examRegMsg && <p className="info-msg">{examRegMsg}</p>}
                                <button className="btn-login" type="submit" disabled={examRegistering}>
                                    {examRegistering ? 'Registering…' : '📝 Register for Exam'}
                                </button>
                            </form>
                        </div>

                        {/* Pay Exam Fee */}
                        <div className="section-card" style={{ flex: 1, minWidth: 300 }}>
                            <h3 className="section-title">Step 2: Pay Exam Fee</h3>
                            <form onSubmit={handlePayment} className="login-form" style={{ gap: 10 }}>
                                <label>Registration ID</label>
                                <input value={payForm.registrationId} required
                                    onChange={e => setPayForm(p => ({ ...p, registrationId: e.target.value }))}
                                    placeholder="e.g. EREG_12345" />
                                <label>Amount to Pay (₹)</label>
                                <input type="number" value={payForm.amountPaid} required min={1}
                                    onChange={e => setPayForm(p => ({ ...p, amountPaid: e.target.value }))}
                                    placeholder="1000" />
                                <p className="section-desc" style={{ marginTop: 0, fontSize: 12 }}>
                                    General/OBC/EWS: ₹1000 · SC/ST: ₹500
                                </p>
                                {payMsg && <p className="info-msg">{payMsg}</p>}
                                <button className="btn-login" type="submit" disabled={paying}>
                                    {paying ? 'Processing…' : '💳 Pay Now'}
                                </button>
                            </form>
                        </div>
                    </div>

                    {/* Exam registration history */}
                    <h3 className="section-title" style={{ marginTop: 28 }}>My Exam Registrations</h3>
                    <DataTable rows={examRegs} />
                </div>
            )}

            {/* ── Assignments ── */}
            {active === 'assignments' && (
                <div className="panel-block">
                    <h2>Weekly Assignments</h2>
                    <p className="section-desc">Best 8 out of 12 assignments contribute to 25% of your final score.</p>
                    <div className="select-row">
                        <label>Select Course Enrollment:</label>
                        <select value={selEnroll} onChange={e => setSelEnroll(e.target.value)}>
                            <option value="">— pick a course —</option>
                            {myCourses?.map(c => (
                                <option key={c.ENROLLMENT_ID} value={c.ENROLLMENT_ID}>
                                    {c.COURSE_NAME} ({c.ENROLLMENT_ID})
                                </option>
                            ))}
                        </select>
                    </div>
                    {submitMsg && <p className="info-msg">{submitMsg}</p>}
                    {asgLoad && <p className="loading-msg">Loading assignments…</p>}
                    {!selEnroll && <p className="empty-msg">Select a course above to view assignments.</p>}
                    {selEnroll && assignments?.length === 0 && (
                        <p className="empty-msg">No assignments released yet by professor.</p>)}
                    <div className="asg-list">
                        {assignments?.map(a => (
                            <div className="asg-card" key={a.ASSIGNMENT_ID}>
                                <div className="asg-hdr">
                                    <span className="asg-week">Week {a.WEEK_NUMBER}</span>
                                    <span className="asg-meta">
                                        Deadline: {a.DEADLINE ? new Date(a.DEADLINE).toLocaleDateString() : '—'}
                                    </span>
                                    <span className="asg-meta">Max marks: {a.MAX_MARKS}</span>
                                </div>
                                {a.SUBMISSION_ID
                                    ? <div className="asg-done">✓ Submitted — Score: <strong>{a.MARKS_OBTAINED}</strong> / {a.MAX_MARKS}</div>
                                    : <div className="asg-submit-row">
                                        <input type="number" placeholder={`0 – ${a.MAX_MARKS}`}
                                            min={0} max={a.MAX_MARKS}
                                            value={marksInput[a.ASSIGNMENT_ID] || ''}
                                            onChange={e => setMarksInput(p => ({ ...p, [a.ASSIGNMENT_ID]: e.target.value }))} />
                                        <button className="btn-submit-asg" disabled={submitting}
                                            onClick={() => handleSubmit(a.ASSIGNMENT_ID)}>
                                            Submit
                                        </button>
                                    </div>
                                }
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ── Results ── */}
            {active === 'results' && (
                <div className="panel-block">
                    <h2>My Results</h2>
                    <GradeLegend />
                    <p className="section-desc" style={{ marginTop: 10 }}>
                        Final Score = Assignment Score (25%) + Proctored Exam Score × 0.75.
                        Results are generated by admin after proctored exam.
                    </p>
                    <DataTable rows={results} />
                </div>
            )}

            {/* ── Certificates ── */}
            {active === 'certificates' && (
                <div className="panel-block">
                    <h2>My Certificates</h2>
                    <GradeLegend />
                    {certs?.length === 0 && (
                        <p className="empty-msg" style={{ marginTop: 14 }}>
                            No certificates yet. Complete a course with a passing grade to earn one!
                        </p>)}
                    <div className="cert-grid">
                        {certs?.map(c => (
                            <div className="cert-card" key={c.CERTIFICATE_ID}>
                                <div className="cert-icon">🎓</div>
                                <h3>{c.COURSE_NAME}</h3>
                                <StatusBadge value={c.CERTIFICATE_TYPE || 'Pending'} />
                                <div className="cert-score-row">
                                    <span className="cert-score">{Number(c.FINAL_SCORE || 0).toFixed(1)}</span>
                                    <span className="cert-grade" style={{
                                        color: { O: '#16a34a', A: '#2563eb', B: '#7c3aed', C: '#d97706', U: '#dc2626' }[c.GRADE] || '#94a3b8'
                                    }}>{c.GRADE || '—'}</span>
                                </div>
                                <p className="cert-date">
                                    {c.ISSUE_DATE ? new Date(c.ISSUE_DATE).toLocaleDateString() : '—'}
                                </p>
                                <p className="cert-id">{c.CERTIFICATE_ID}</p>
                                <button className="btn-cert-dl"
                                    disabled={certDownloading === c.CERTIFICATE_ID}
                                    onClick={() => handleDownloadCertInline(c)}>
                                    {certDownloading === c.CERTIFICATE_ID ? 'Generating…' : '⬇ Download Certificate'}
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ── Grievances ── */}
            {active === 'grievances' && (
                <div className="panel-block">
                    <h2>Grievances</h2>
                    <div className="section-card">
                        <h3 className="section-title">File a New Grievance</h3>
                        <form onSubmit={handleGrievance} className="grv-form">
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Course</label>
                                    <select value={grvCourse} onChange={e => setGrvCourse(e.target.value)} required>
                                        <option value="">— select course —</option>
                                        {myCourses?.map(c => (
                                            <option key={c.COURSE_ID} value={c.COURSE_ID}>{c.COURSE_NAME}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Issue Type</label>
                                    <select value={grvType} onChange={e => setGrvType(e.target.value)}>
                                        <option>Assignment Score</option>
                                        <option>Exam Score</option>
                                        <option>Certificate</option>
                                        <option>Payment</option>
                                        <option>Other</option>
                                    </select>
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Description</label>
                                <textarea rows={3} value={grvDesc} required
                                    placeholder="Describe your issue clearly…"
                                    onChange={e => setGrvDesc(e.target.value)} />
                            </div>
                            {grvMsg && <p className="info-msg">{grvMsg}</p>}
                            <button className="btn-grv" type="submit" disabled={grvSubmitting}>
                                {grvSubmitting ? 'Submitting…' : 'Submit Grievance'}
                            </button>
                        </form>
                    </div>
                    <h3 className="section-title" style={{ marginTop: 28 }}>My Grievance History</h3>
                    <DataTable rows={grievances} />
                </div>
            )}
        </Shell>
    );
}

// ═══════════════════════════════════════════════
//  PROFESSOR DASHBOARD
// ═══════════════════════════════════════════════
const PROF_NAV = [
    { id: 'my-courses', icon: '📚', label: 'My Courses' },
    { id: 'post-assignment', icon: '📤', label: 'Post Assignment' },
    { id: 'students', icon: '👥', label: 'Students' },
    { id: 'submissions', icon: '📝', label: 'Submissions' },
    { id: 'results', icon: '📊', label: 'Course Results' },
];

function ProfessorDashboard({ user, onLogout }) {
    const [active, setActive] = useState('my-courses');
    const [selCourse, setSelCourse] = useState('');
    const [scoreMsg, setScoreMsg] = useState('');
    const [scoreInput, setScoreInput] = useState({});
    const [postMsg, setPostMsg] = useState('');
    const [posting, setPosting] = useState(false);
    const [postForm, setPostForm] = useState({ weekNumber: '1', maxMarks: '100', deadline: '' });

    const iid = user.refId;
    const { data: myCourses } = useFetch(`${API}/professor/my-courses?instructorId=${iid}`);
    const { data: students } = useFetch(
        selCourse && active === 'students' ? `${API}/professor/students?courseId=${selCourse}` : null);
    const { data: submissions, loading: subLoad } = useFetch(
        selCourse && active === 'submissions' ? `${API}/professor/assignments?courseId=${selCourse}` : null);
    const { data: results } = useFetch(
        selCourse && active === 'results' ? `${API}/professor/results?courseId=${selCourse}` : null);
    const { data: postedWeeks, reload: reloadWeeks } = useFetch(
        selCourse && active === 'post-assignment'
            ? `${API}/professor/posted-weeks?courseId=${selCourse}` : null);

    async function handleScore(submissionId) {
        const marks = parseInt(scoreInput[submissionId]);
        if (isNaN(marks)) return;
        try {
            const res = await fetch(`${API}/professor/enter-score`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ submissionId, marks }),
            });
            const d = await res.json();
            setScoreMsg(d.message);
        } catch { setScoreMsg('Network error.'); }
    }

    async function handlePostAssignment(e) {
        e.preventDefault();
        if (!selCourse) { setPostMsg('Select a course first.'); return; }
        setPosting(true); setPostMsg('');
        try {
            const res = await fetch(`${API}/professor/post-assignment`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    courseId: selCourse,
                    weekNumber: Number(postForm.weekNumber),
                    maxMarks: Number(postForm.maxMarks),
                    deadline: postForm.deadline,
                }),
            });
            const d = await res.json();
            setPostMsg(d.message);
            if (d.success) reloadWeeks();
        } catch { setPostMsg('Network error.'); }
        finally { setPosting(false); }
    }

    const CourseSelector = () => (
        <div className="select-row">
            <label>Select Course:</label>
            <select value={selCourse} onChange={e => { setSelCourse(e.target.value); setScoreMsg(''); setPostMsg(''); }}>
                <option value="">— pick a course —</option>
                {myCourses?.map(c => (
                    <option key={c.COURSE_ID} value={c.COURSE_ID}>{c.COURSE_NAME}</option>
                ))}
            </select>
        </div>
    );

    const postedWeekNums = new Set((postedWeeks || []).map(w => String(w.WEEK_NUMBER)));

    return (
        <Shell user={user} onLogout={onLogout}
            navItems={PROF_NAV} activeNav={active}
            setActiveNav={t => { setActive(t); setScoreMsg(''); setPostMsg(''); }}>

            {/* ── My Courses ── */}
            {active === 'my-courses' && (
                <div className="panel-block">
                    <h2>Courses I Teach</h2>
                    <p className="section-desc">Courses assigned by admin. Use Post Assignment to release weekly tasks.</p>
                    <DataTable rows={myCourses} />
                </div>
            )}

            {/* ── Post Assignment ── */}
            {active === 'post-assignment' && (
                <div className="panel-block">
                    <h2>Post Weekly Assignment</h2>
                    <p className="section-desc">Post assignments for weeks 1–12. Students submit answers and best 8 count for their grade.</p>
                    <CourseSelector />
                    {selCourse && (
                        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', marginTop: 16 }}>
                            <div className="section-card" style={{ flex: '1', minWidth: 300, maxWidth: 420 }}>
                                <h3 className="section-title">Post New Assignment</h3>
                                <form onSubmit={handlePostAssignment} className="login-form" style={{ gap: 10 }}>
                                    <label>Week Number (1–12)</label>
                                    <select value={postForm.weekNumber}
                                        onChange={e => setPostForm(p => ({ ...p, weekNumber: e.target.value }))}>
                                        {Array.from({ length: 12 }, (_, i) => i + 1).map(w => (
                                            <option key={w} value={w}
                                                disabled={postedWeekNums.has(String(w))}>
                                                Week {w}{postedWeekNums.has(String(w)) ? ' ✓ Posted' : ''}
                                            </option>
                                        ))}
                                    </select>
                                    <label>Max Marks</label>
                                    <input type="number" min={10} max={200} value={postForm.maxMarks}
                                        onChange={e => setPostForm(p => ({ ...p, maxMarks: e.target.value }))} />
                                    <label>Deadline</label>
                                    <input type="date" value={postForm.deadline} required
                                        onChange={e => setPostForm(p => ({ ...p, deadline: e.target.value }))} />
                                    {postMsg && <p className="info-msg">{postMsg}</p>}
                                    <button className="btn-login" type="submit" disabled={posting}>
                                        {posting ? 'Posting…' : '📤 Post Assignment'}
                                    </button>
                                </form>
                            </div>
                            <div style={{ flex: '1', minWidth: 260 }}>
                                <h3 className="section-title" style={{ marginBottom: 12 }}>Assignment Status (12 weeks)</h3>
                                <div className="week-grid">
                                    {Array.from({ length: 12 }, (_, i) => i + 1).map(w => {
                                        const pw = postedWeeks?.find(p => Number(p.WEEK_NUMBER) === w);
                                        return (
                                            <div key={w} className={`week-cell ${pw ? 'week-posted' : 'week-pending'}`}>
                                                <span className="week-num">W{w}</span>
                                                {pw && <span className="week-subs">{pw.SUBMISSIONS_COUNT} subs</span>}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}
                    {!selCourse && <p className="empty-msg">Select a course to manage assignments.</p>}
                </div>
            )}

            {/* ── Students ── */}
            {active === 'students' && (
                <div className="panel-block">
                    <h2>Enrolled Students</h2>
                    <CourseSelector />
                    {!selCourse && <p className="empty-msg">Select a course to view students.</p>}
                    {selCourse && <DataTable rows={students} />}
                </div>
            )}

            {/* ── Submissions ── */}
            {active === 'submissions' && (
                <div className="panel-block">
                    <h2>Assignment Submissions</h2>
                    <CourseSelector />
                    {scoreMsg && <p className="info-msg">{scoreMsg}</p>}
                    {!selCourse && <p className="empty-msg">Select a course to view submissions.</p>}
                    {subLoad && <p className="loading-msg">Loading…</p>}
                    <div className="asg-list">
                        {submissions?.map((a, i) => (
                            <div className="asg-card" key={i}>
                                <div className="asg-hdr">
                                    <span className="asg-week">Week {a.WEEK_NUMBER}</span>
                                    <span className="asg-meta">{a.LEARNER_NAME || '—'}</span>
                                    <span className="asg-meta">Max: {a.MAX_MARKS}</span>
                                    <span className="asg-meta">
                                        Deadline: {a.DEADLINE ? new Date(a.DEADLINE).toLocaleDateString() : '—'}
                                    </span>
                                </div>
                                {a.SUBMISSION_ID
                                    ? <div className="asg-submit-row">
                                        <span className="asg-done">
                                            Score: <strong>{a.MARKS_OBTAINED}</strong>
                                        </span>
                                        <input type="number" placeholder="Override marks"
                                            value={scoreInput[a.SUBMISSION_ID] || ''}
                                            onChange={e => setScoreInput(p => ({ ...p, [a.SUBMISSION_ID]: e.target.value }))} />
                                        <button className="btn-submit-asg"
                                            onClick={() => handleScore(a.SUBMISSION_ID)}>
                                            Update
                                        </button>
                                    </div>
                                    : <span className="asg-not-submitted">Not submitted yet</span>
                                }
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ── Course Results ── */}
            {active === 'results' && (
                <div className="panel-block">
                    <h2>Course Results</h2>
                    <GradeLegend />
                    <CourseSelector />
                    {!selCourse && <p className="empty-msg">Select a course to view results.</p>}
                    {selCourse && <DataTable rows={results} />}
                </div>
            )}
        </Shell>
    );
}

// ═══════════════════════════════════════════════
//  ROOT
// ═══════════════════════════════════════════════
export default function App() {
    const [user, setUser] = useState(() => {
        try { return JSON.parse(sessionStorage.getItem('nptel_user')); }
        catch { return null; }
    });

    function handleLogin(data) {
        sessionStorage.setItem('nptel_user', JSON.stringify(data));
        setUser(data);
    }
    function handleLogout() {
        sessionStorage.removeItem('nptel_user');
        setUser(null);
    }

    if (!user) return <LoginPage onLogin={handleLogin} />;
    if (user.role === 'ADMIN') return <AdminDashboard user={user} onLogout={handleLogout} />;
    if (user.role === 'STUDENT') return <StudentDashboard user={user} onLogout={handleLogout} />;
    if (user.role === 'PROFESSOR') return <ProfessorDashboard user={user} onLogout={handleLogout} />;
    return <p style={{ color: 'red', padding: 24 }}>Unknown role: {user.role}</p>;
}