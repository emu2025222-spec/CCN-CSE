
import { FormEvent, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import {
  BookOpen, Search, ShieldCheck, Sparkles, GraduationCap, Code2,
  X, Plus, Pencil, Trash2, LogOut, Eye, EyeOff, Layers3,
  CircleHelp, ArrowUpRight, Copy, Check, Filter, Terminal,
  ChevronRight
} from 'lucide-react';

const API = (
  (import.meta as ImportMeta & { env?: { VITE_API_URL?: string } }).env?.VITE_API_URL
  || 'http://localhost:5000/api'
).replace(/\/$/, '');

const http = axios.create({ baseURL: API, withCredentials: true });

type Q = {
  _id: string;
  title: string;
  questionText: string;
  answer: string;
  batch?: string;
  semester: number;
  subject: string;
  courseCode?: string;
  examType: string;
  questionType: string;
  answerType?: string;
  codeLanguage?: string;
  code?: string;
  explanation?: string;
  sampleInput?: string;
  sampleOutput?: string;
  solutionSteps?: string[];
  tags: string[];
  published: boolean;
  updatedAt: string;
};

type QuestionForm = {
  title: string;
  questionText: string;
  answer: string;
  batch: string;
  semester: number;
  subject: string;
  courseCode: string;
  examType: string;
  questionType: string;
  answerType: string;
  codeLanguage: string;
  code: string;
  explanation: string;
  sampleInput: string;
  sampleOutput: string;
  solutionSteps: string;
  tags: string;
  published: boolean;
};

const blank: QuestionForm = {
  title: '',
  questionText: '',
  answer: '',
  batch: '18th Batch',
  semester: 1,
  subject: '',
  courseCode: '',
  examType: 'Final',
  questionType: 'Theory',
  answerType: 'text',
  codeLanguage: 'none',
  code: '',
  explanation: '',
  sampleInput: '',
  sampleOutput: '',
  solutionSteps: '',
  tags: '',
  published: false
};

const semesters = [1, 2, 3, 4, 5, 6, 7, 8];
const examTypes = ['CT', 'Midterm', 'Final', 'Lab', 'Assignment', 'Other'];
const questionTypes = ['Theory', 'Math', 'Programming', 'Lab', 'MCQ', 'Other'];
const languages = [
  ['none', 'Not applicable'],
  ['c', 'C'],
  ['cpp', 'C++'],
  ['java', 'Java'],
  ['python', 'Python'],
  ['javascript', 'JavaScript'],
  ['typescript', 'TypeScript'],
  ['sql', 'SQL'],
  ['other', 'Other']
];

export default function App() {
  const [questions, setQuestions] = useState<Q[]>([]);
  const [search, setSearch] = useState('');
  const [batch, setBatch] = useState('all');
  const [semester, setSemester] = useState('all');
  const [subject, setSubject] = useState('all');
  const [kind, setKind] = useState('all');
  const [exam, setExam] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [active, setActive] = useState<Q | null>(null);
  const [adminOpen, setAdminOpen] = useState(false);
  const [admin, setAdmin] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [adminQuestions, setAdminQuestions] = useState<Q[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState<QuestionForm>({ ...blank });
  const [saving, setSaving] = useState(false);
  const [showAnswer, setShowAnswer] = useState(true);
  const [copied, setCopied] = useState(false);

  async function loadQuestions() {
    setLoading(true);
    setError('');

    try {
      const response = await http.get('/questions');
      setQuestions(Array.isArray(response.data) ? response.data : []);
    } catch {
      setError('Could not load questions. Check the API connection and try again.');
    } finally {
      setLoading(false);
    }
  }

  async function checkAdmin() {
    try {
      await http.get('/auth/me');
      setAdmin(true);
      const response = await http.get('/admin/questions');
      setAdminQuestions(Array.isArray(response.data) ? response.data : []);
    } catch {
      setAdmin(false);
    }
  }

  useEffect(() => {
    void loadQuestions();
    void checkAdmin();
  }, []);

  const allQuestions = admin ? adminQuestions : questions;

  const batches = useMemo(
    () => Array.from(new Set([
      '17th Batch', '18th Batch', '19th Batch',
      ...questions.map(q => q.batch).filter((v): v is string => Boolean(v))
    ])).sort(),
    [questions]
  );

  const subjects = useMemo(
    () => Array.from(new Set(questions.map(q => q.subject).filter(Boolean))).sort(),
    [questions]
  );

  const filtered = useMemo(() => questions.filter(q => {
    const text = [
      q.title, q.questionText, q.answer, q.subject, q.courseCode,
      q.code, q.explanation, ...(q.tags || [])
    ].join(' ').toLowerCase();

    return (
      (batch === 'all' || (q.batch || '18th Batch') === batch) &&
      (semester === 'all' || String(q.semester) === semester) &&
      (subject === 'all' || q.subject === subject) &&
      (kind === 'all' || q.questionType === kind) &&
      (exam === 'all' || q.examType === exam) &&
      (!search.trim() || text.includes(search.trim().toLowerCase()))
    );
  }), [questions, batch, semester, subject, kind, exam, search]);

  function clearFilters() {
    setSearch('');
    setBatch('all');
    setSemester('all');
    setSubject('all');
    setKind('all');
    setExam('all');
  }

  async function login(e: FormEvent) {
    e.preventDefault();
    setLoginError('');

    try {
      await http.post('/auth/login', { email, password });
      setAdmin(true);
      setPassword('');
      const response = await http.get('/admin/questions');
      setAdminQuestions(Array.isArray(response.data) ? response.data : []);
    } catch {
      setLoginError('Login failed. Check your email and password.');
    }
  }

  async function logout() {
    try {
      await http.post('/auth/logout');
    } finally {
      setAdmin(false);
      setAdminQuestions([]);
      setAdminOpen(false);
    }
  }

  function startNew() {
    setEditing(null);
    setForm({ ...blank });
  }

  function startEdit(q: Q) {
    setEditing(q._id);
    setForm({
      ...blank,
      ...q,
      batch: q.batch || '18th Batch',
      courseCode: q.courseCode || '',
      answerType: q.answerType || 'text',
      codeLanguage: q.codeLanguage || 'none',
      code: q.code || '',
      explanation: q.explanation || '',
      sampleInput: q.sampleInput || '',
      sampleOutput: q.sampleOutput || '',
      solutionSteps: (q.solutionSteps || []).join('\n'),
      tags: (q.tags || []).join(', ')
    });
  }

  async function saveQuestion(e: FormEvent) {
    e.preventDefault();
    setSaving(true);

    const payload = {
      ...form,
      semester: Number(form.semester),
      tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
      solutionSteps: form.solutionSteps.split('\n').map(s => s.trim()).filter(Boolean)
    };

    try {
      if (editing) {
        await http.put(`/admin/questions/${editing}`, payload);
      } else {
        await http.post('/admin/questions', payload);
      }

      const response = await http.get('/admin/questions');
      setAdminQuestions(Array.isArray(response.data) ? response.data : []);
      await loadQuestions();
      startNew();
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        alert(err.response?.data?.message || 'Could not save question.');
      } else {
        alert('Could not save question.');
      }
    } finally {
      setSaving(false);
    }
  }

  async function deleteQuestion(id: string) {
    if (!window.confirm('Delete this question permanently?')) return;

    try {
      await http.delete(`/admin/questions/${id}`);
      setAdminQuestions(previous => previous.filter(q => q._id !== id));
      await loadQuestions();
      if (active?._id === id) setActive(null);
    } catch {
      alert('Could not delete question.');
    }
  }

  async function copyCode(code: string) {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      alert('Copy failed. Please select and copy the code manually.');
    }
  }

  return (
    <div className="app-shell">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />

      <header className="topbar">
        <a className="brand" href="#top">
          <span className="brand-mark"><GraduationCap size={23} /></span>
          <span>
            <b>CCN-UST <i>CSE</i> HUB</b>
            <small>LEARN · PRACTICE · ACHIEVE</small>
          </span>
        </a>

        <nav>
          <a href="#library">Question Library</a>
          <a href="#about">About</a>
          <button className="admin-trigger" onClick={() => setAdminOpen(true)}>
            <ShieldCheck size={16} />
            {admin ? 'Admin Dashboard' : 'Admin Login'}
          </button>
        </nav>
      </header>

      <main id="top">

        <section className="hero real-hero">
          <div className="hero-copy">
            <div className="eyebrow">
              CCN UNIVERSITY OF SCIENCE & TECHNOLOGY
            </div>

            <p className="real-location">KOTBARI, CUMILLA, BANGLADESH</p>

            <h1>
              CCN CSE <span>HUB</span>
            </h1>

            <h2 className="real-subtitle">
              A study space for CSE students.
            </h2>

            <p>
              Organize semester-wise questions, review previous exam
              topics, practise programming problems and prepare for
              your next assessment — all in one place.
            </p>

            <div className="hero-actions">
              <a className="primary-btn" href="#library">
                Browse question bank <ArrowUpRight size={17} />
              </a>

              <a
                className="secondary-btn"
                href="https://ccnust.ac.bd/cse-page"
                target="_blank"
                rel="noreferrer"
              >
                Official CSE Department <ArrowUpRight size={16} />
              </a>
            </div>

            <div className="real-info-row">
              <div>
                <strong>01–08</strong>
                <span>Semester filters</span>
              </div>
              <div>
                <strong>CSE</strong>
                <span>Course-focused study</span>
              </div>
              <div>
                <strong>24/7</strong>
                <span>Online access</span>
              </div>
            </div>
          </div>

          <div className="real-campus-card">
            <div className="campus-card-top">
              <GraduationCap size={26} />
              <span>STUDENT STUDY PORTAL</span>
            </div>

            <div className="campus-card-body">
              <p className="eyebrow">YOUR ACADEMIC WORKSPACE</p>
              <h2>Study smarter.<br />Prepare with purpose.</h2>
              <p>
                Questions, solutions and programming practice,
                organized around your semester and course.
              </p>

              <a href="#library" className="campus-card-link">
                Explore resources <ArrowUpRight size={17} />
              </a>
            </div>

            <div className="campus-card-footer">
              <span>Independent student project</span>
              <span>CCN · CSE</span>
            </div>
          </div>
        </section>

        <section className="trust-strip real-trust-strip">
          <span><BookOpen size={17} /> Semester-wise questions</span>
          <span><Code2 size={17} /> Programming practice</span>
          <span><ShieldCheck size={17} /> Student-managed resources</span>
        </section>


        <section className="trust-strip">
          <span><ShieldCheck size={17} /> Student-focused resources</span>
          <span><BookOpen size={17} /> Theory · Math · Programming · Lab</span>
          <span><Sparkles size={17} /> Built for your study flow</span>
        </section>

        <section id="library" className="library-section">
          <div className="section-heading">
            <div>
              <div className="eyebrow">THE KNOWLEDGE LIBRARY</div>
              <h2>Find the <span>answer.</span></h2>
              <p>Search topics, filter by batch, and jump into the solution.</p>
            </div>
            <div className="count-pill"><span className="count-dot" />{filtered.length} questions found</div>
          </div>

          <div className="search-bar">
            <Search size={20} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search questions, subjects, code, keywords..."
              aria-label="Search questions"
            />
            {search && <button onClick={() => setSearch('')} aria-label="Clear search"><X size={17} /></button>}
          </div>

          <div className="filters">
            <label><span>BATCH</span>
              <select value={batch} onChange={e => setBatch(e.target.value)}>
                <option value="all">All batches</option>
                {batches.map(b => <option key={b}>{b}</option>)}
              </select>
            </label>
            <label><span>SEMESTER</span>
              <select value={semester} onChange={e => setSemester(e.target.value)}>
                <option value="all">All semesters</option>
                {semesters.map(s => <option key={s} value={s}>Semester {s}</option>)}
              </select>
            </label>
            <label><span>SUBJECT</span>
              <select value={subject} onChange={e => setSubject(e.target.value)}>
                <option value="all">All subjects</option>
                {subjects.map(s => <option key={s}>{s}</option>)}
              </select>
            </label>
            <label><span>QUESTION TYPE</span>
              <select value={kind} onChange={e => setKind(e.target.value)}>
                <option value="all">All types</option>
                {questionTypes.map(k => <option key={k}>{k}</option>)}
              </select>
            </label>
            <label><span>EXAM</span>
              <select value={exam} onChange={e => setExam(e.target.value)}>
                <option value="all">All exams</option>
                {examTypes.map(k => <option key={k}>{k}</option>)}
              </select>
            </label>
            <button className="clear-filters" onClick={clearFilters}><Filter size={15} /> Reset filters</button>
          </div>

          {loading ? (
            <div className="empty-state"><div className="loader" /><h3>Opening the library…</h3></div>
          ) : error ? (
            <div className="empty-state">
              <CircleHelp size={30} /><h3>Library unavailable</h3><p>{error}</p>
              <button className="secondary-btn" onClick={loadQuestions}>Try again</button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon"><BookOpen size={25} /></div>
              <h3>{questions.length ? 'No matching questions yet' : 'Your study library starts here.'}</h3>
              <p>{questions.length ? 'Try another keyword or change the filters.' : 'Questions will appear here once the administrator publishes them.'}</p>
              {questions.length > 0 && <button className="secondary-btn" onClick={clearFilters}>Clear all filters</button>}
            </div>
          ) : (
            <div className="question-grid">
              {filtered.map((q, i) => (
                <article
                  className="question-card"
                  key={q._id}
                  style={{ animationDelay: `${Math.min(i, 10) * 45}ms` }}
                  onClick={() => { setActive(q); setShowAnswer(true); setCopied(false); }}
                  tabIndex={0}
                  onKeyDown={e => { if (e.key === 'Enter') setActive(q); }}
                >
                  <div className="card-top">
                    <span className="type-pill">{q.questionType}</span>
                    <span className="semester-pill">SEM {q.semester}</span>
                  </div>
                  <h3>{q.title}</h3>
                  <p>{q.questionText}</p>
                  <div className="card-subject">
                    <span>{q.subject}</span><span>·</span><span>{q.examType}</span>
                  </div>
                  {q.courseCode && <div className="course-code-label">{q.courseCode}</div>}
                  <div className="card-footer">
                    <span>Explore solution</span>
                    <span className="card-arrow"><ArrowUpRight size={17} /></span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="study-banner">
          <div className="banner-icon"><Sparkles size={25} /></div>
          <div>
            <div className="eyebrow">SMALL STEPS. BIG PROGRESS.</div>
            <h2>Understand it. Practice it. <span>Own it.</span></h2>
            <p>Build a stronger foundation, one question at a time.</p>
          </div>
          <a href="#library" className="banner-link">Start learning <ArrowUpRight size={16} /></a>
        </section>

        <section id="about" className="about-section">
          <div className="about-emblem"><GraduationCap size={32} /></div>
          <div className="about-copy">
            <div className="eyebrow">MADE FOR OUR LEARNING COMMUNITY</div>
            <h2>Built by a student, <span>for students.</span></h2>
            <p>
              CCN CSE HUB is a student-led study resource for organizing questions
              and helpful answers across semesters. Verify course titles and
              materials against official university sources.
            </p>
          </div>
          <div className="founder-card">
            <div className="founder-avatar">EI</div>
            <div><small>DEVELOPER</small><h3>Emon Islam</h3><p>CSE · 18th Batch</p><span>CCN UST</span></div>
          </div>
        </section>
      </main>

      <footer>
        <a className="brand footer-brand" href="#top">
          <span className="brand-mark"><GraduationCap size={19} /></span>
          <span><b>CCN <i>CSE</i> HUB</b><small>LEARN · PRACTICE · ACHIEVE</small></span>
        </a>
        <p>Independent student learning resource · Not an official university website.</p>
        <span>© {new Date().getFullYear()} Emon Islam</span>
      </footer>

      {active && (
        <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) setActive(null); }}>
          <section className="answer-modal">
            <button className="modal-close" onClick={() => setActive(null)} aria-label="Close"><X size={20} /></button>
            <div className="modal-kicker">
              {active.batch || 'CSE'} <span>·</span> {active.subject} <span>·</span> Semester {active.semester}
            </div>
            <h2>{active.title}</h2>
            <div className="modal-meta">
              <span>{active.questionType}</span><span>{active.examType}</span>
              {active.courseCode && <span>{active.courseCode}</span>}
            </div>

            <div className="content-block">
              <h4>QUESTION</h4><p className="preserve-text">{active.questionText}</p>
            </div>

            <div className="answer-heading">
              <h4>SOLUTION</h4>
              <button onClick={() => setShowAnswer(v => !v)}>
                {showAnswer ? <><EyeOff size={15} /> Hide</> : <><Eye size={15} /> Show</>}
              </button>
            </div>

            {showAnswer ? (
              <div className="solution-stack">
                {active.answer && <div className="answer-content preserve-text">{active.answer}</div>}

                {active.solutionSteps && active.solutionSteps.length > 0 && (
                  <div className="solution-steps">
                    <h4>STEP-BY-STEP SOLUTION</h4>
                    <ol>{active.solutionSteps.map((step, i) => <li key={`${i}-${step}`}>{step}</li>)}</ol>
                  </div>
                )}

                {active.explanation && (
                  <div className="explanation-block">
                    <h4>EXPLANATION</h4><p className="preserve-text">{active.explanation}</p>
                  </div>
                )}

                {active.code && (
                  <div className="code-panel">
                    <div className="code-panel-head">
                      <span><Terminal size={15} /> {(active.codeLanguage || 'code').toUpperCase()}</span>
                      <button onClick={() => void copyCode(active.code || '')}>
                        {copied ? <Check size={15} /> : <Copy size={15} />}
                        {copied ? 'Copied' : 'Copy code'}
                      </button>
                    </div>
                    <pre><code>{active.code}</code></pre>
                  </div>
                )}

                {(active.sampleInput || active.sampleOutput) && (
                  <div className="sample-grid">
                    {active.sampleInput && <div><h4>SAMPLE INPUT</h4><pre>{active.sampleInput}</pre></div>}
                    {active.sampleOutput && <div><h4>SAMPLE OUTPUT</h4><pre>{active.sampleOutput}</pre></div>}
                  </div>
                )}
              </div>
            ) : <div className="answer-hidden">Answer hidden for self-testing.</div>}

            {active.tags?.length > 0 && <div className="tag-row">{active.tags.map(t => <span key={t}>#{t}</span>)}</div>}
          </section>
        </div>
      )}

      {adminOpen && (
        <div className="modal-backdrop admin-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) setAdminOpen(false); }}>
          <section className="admin-modal">
            <button className="modal-close" onClick={() => setAdminOpen(false)} aria-label="Close"><X size={20} /></button>

            {!admin ? (
              <>
                <div className="admin-icon"><ShieldCheck size={25} /></div>
                <div className="eyebrow">RESTRICTED ACCESS</div>
                <h2>Admin sign in</h2>
                <p className="admin-intro">Manage questions and answers in the public library.</p>
                <form onSubmit={login} className="admin-login">
                  <label>Email address<input type="email" autoComplete="username" value={email} onChange={e => setEmail(e.target.value)} required placeholder="admin@example.com" /></label>
                  <label>Password<input type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="Your admin password" /></label>
                  {loginError && <p className="form-error">{loginError}</p>}
                  <button className="primary-btn full-btn">Sign in securely <ArrowUpRight size={16} /></button>
                </form>
                <p className="privacy-note"><ShieldCheck size={14} /> Credentials are verified by the server.</p>
              </>
            ) : (
              <>
                <div className="admin-title-row">
                  <div><div className="eyebrow">CONTENT CONTROL</div><h2>Admin workspace</h2><p className="admin-intro">Create, edit, publish or remove questions.</p></div>
                  <button className="secondary-btn logout-btn" onClick={() => void logout()}><LogOut size={15} /> Sign out</button>
                </div>

                <div className="admin-workspace">
                  <div className="admin-list">
                    <div className="admin-list-head">
                      <b>Questions ({adminQuestions.length})</b>
                      <button className="mini-add" onClick={startNew}><Plus size={15} /> New</button>
                    </div>
                    {adminQuestions.map(q => (
                      <div className={`admin-item ${editing === q._id ? 'selected' : ''}`} key={q._id}>
                        <button className="admin-item-title" onClick={() => startEdit(q)}>
                          <span>{q.title}</span><small>{q.published ? 'Published' : 'Draft'} · Sem {q.semester}</small>
                        </button>
                        <button className="icon-action" aria-label="Edit" onClick={() => startEdit(q)}><Pencil size={14} /></button>
                        <button className="icon-action danger" aria-label="Delete" onClick={() => void deleteQuestion(q._id)}><Trash2 size={14} /></button>
                      </div>
                    ))}
                  </div>

                  <form className="question-form" onSubmit={saveQuestion}>
                    <h3>{editing ? 'Edit question' : 'Add a question'}</h3>

                    <label>Question title<input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required maxLength={300} placeholder="e.g. Explain binary search" /></label>
                    <label>Question text<textarea value={form.questionText} onChange={e => setForm({ ...form, questionText: e.target.value })} required rows={3} placeholder="Write the full question..." /></label>
                    <label>Text answer<textarea value={form.answer} onChange={e => setForm({ ...form, answer: e.target.value })} required rows={4} placeholder="Write the main answer..." /></label>

                    <div className="form-row">
                      <label>Batch<input value={form.batch} onChange={e => setForm({ ...form, batch: e.target.value })} required placeholder="e.g. 18th Batch" /></label>
                      <label>Semester<select value={form.semester} onChange={e => setForm({ ...form, semester: Number(e.target.value) })}>{semesters.map(s => <option key={s} value={s}>Semester {s}</option>)}</select></label>
                    </div>

                    <div className="form-row">
                      <label>Subject<input value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} required placeholder="Verified subject name" /></label>
                      <label>Course code<input value={form.courseCode} onChange={e => setForm({ ...form, courseCode: e.target.value })} placeholder="Optional course code" /></label>
                    </div>

                    <div className="form-row">
                      <label>Question type<select value={form.questionType} onChange={e => setForm({ ...form, questionType: e.target.value })}>{questionTypes.map(k => <option key={k}>{k}</option>)}</select></label>
                      <label>Exam type<select value={form.examType} onChange={e => setForm({ ...form, examType: e.target.value })}>{examTypes.map(k => <option key={k}>{k}</option>)}</select></label>
                    </div>

                    <div className="form-row">
                      <label>Answer format<select value={form.answerType} onChange={e => setForm({ ...form, answerType: e.target.value })}>{[['text', 'Text'], ['code', 'Code'], ['math', 'Math'], ['mixed', 'Mixed']].map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
                      <label>Programming language<select value={form.codeLanguage} onChange={e => setForm({ ...form, codeLanguage: e.target.value })}>{languages.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
                    </div>

                    <label>Code<textarea className="code-input" value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} rows={7} spellCheck={false} placeholder={'# Paste code here\nprint("Hello, CCN CSE HUB!")'} /></label>
                    <label>Explanation<textarea value={form.explanation} onChange={e => setForm({ ...form, explanation: e.target.value })} rows={3} placeholder="Explain the logic or concept..." /></label>

                    <div className="form-row">
                      <label>Sample input<textarea value={form.sampleInput} onChange={e => setForm({ ...form, sampleInput: e.target.value })} rows={3} /></label>
                      <label>Sample output<textarea value={form.sampleOutput} onChange={e => setForm({ ...form, sampleOutput: e.target.value })} rows={3} /></label>
                    </div>

                    <label>Solution steps <small>(one step per line)</small><textarea value={form.solutionSteps} onChange={e => setForm({ ...form, solutionSteps: e.target.value })} rows={4} placeholder={'Step 1: Identify the problem.\nStep 2: Apply the formula.\nStep 3: Write the result.'} /></label>
                    <label>Tags <small>(comma separated)</small><input value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })} placeholder="algorithm, sorting, programming" /></label>

                    <label className="publish-toggle">
                      <input type="checkbox" checked={Boolean(form.published)} onChange={e => setForm({ ...form, published: e.target.checked })} />
                      <span><b>Publish to public library</b><small>Turn off to save as a private draft.</small></span>
                    </label>

                    <div className="form-actions">
                      <button type="button" className="secondary-btn" onClick={startNew}>Clear form</button>
                      <button className="primary-btn" disabled={saving}>{saving ? 'Saving…' : editing ? 'Save changes' : 'Save question'} <ArrowUpRight size={16} /></button>
                    </div>
                  </form>
                </div>
              </>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
