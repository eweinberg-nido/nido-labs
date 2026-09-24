import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { getFirestore, collection, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyAFhiLa94zjP8IakzEd4nvtJOH-HRX10fI",
    authDomain: "nido-teaching-learning.firebaseapp.com",
    projectId: "nido-teaching-learning",
    storageBucket: "nido-teaching-learning.firebasestorage.app",
    messagingSenderId: "167104058821",
    appId: "1:167104058821:web:7ca1f5c91ddcb68df1a7ac"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();
provider.setCustomParameters({ hd: 'nido.cl' });

let courses = [];
let unsubscribe = null;

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const isEs = () => document.body.classList.contains('show-es');

/**
 * The link to show for a course.
 *
 * A teacher's own correction wins over the crawl result. `overrideUrl` is
 * written by the course's owner and is never touched by the import, so the
 * crawl can be re-run without undoing anybody's fix.
 */
function effectiveLink(c) {
    if (c.overrideUrl) {
        return { url: c.overrideUrl, kind: 'override', by: c.overrideBy || null };
    }
    if (c.syllabusUrl) {
        return { url: c.syllabusUrl, kind: c.urlKind || 'link', by: null };
    }
    return { url: null, kind: null, by: null };
}

function statusOf(c) {
    if (c.status === 'not_needed') return 'not_needed';
    return effectiveLink(c).url ? 'found' : 'missing';
}

// --- Language toggle (mirrors index.html) ---
document.querySelectorAll('.lang-select').forEach(select => {
    select.addEventListener('change', (e) => {
        const lang = e.target.value;
        document.querySelectorAll('.lang-select').forEach(s => s.value = lang);
        document.body.classList.toggle('show-es', lang === 'es');
        render();
    });
});

function renderCounts() {
    const tally = { found: 0, missing: 0, not_needed: 0 };
    for (const c of courses) tally[statusOf(c)]++;
    const withLink = tally.found;
    const expected = courses.length - tally.not_needed;
    const pct = expected ? Math.round((withLink / expected) * 100) : 0;

    const labels = isEs()
        ? { total: 'cursos', found: 'con programa', missing: 'sin programa', na: 'no aplica', pct: 'completado' }
        : { total: 'courses', found: 'with a syllabus', missing: 'missing', na: 'not needed', pct: 'complete' };

    $('counts').innerHTML = [
        [courses.length, labels.total],
        [tally.found, labels.found],
        [tally.missing, labels.missing],
        [tally.not_needed, labels.na],
        [`${pct}%`, labels.pct],
    ].map(([n, l]) => `<div class="count"><b>${n}</b><span>${esc(l)}</span></div>`).join('');
}

function renderDepartments() {
    const sel = $('dept');
    const current = sel.value;
    const all = new Set();
    for (const c of courses) for (const d of c.departments || []) all.add(d);
    const allLabel = isEs() ? 'Todos los departamentos' : 'All departments';
    sel.innerHTML = `<option value="">${esc(allLabel)}</option>` +
        [...all].sort().map(d => `<option${d === current ? ' selected' : ''}>${esc(d)}</option>`).join('');
}

function filtered() {
    const q = $('q').value.trim().toLowerCase();
    const dept = $('dept').value;
    const status = $('status').value;
    return courses.filter(c => {
        if (dept && !(c.departments || []).includes(dept)) return false;
        if (status && statusOf(c) !== status) return false;
        if (q) {
            const hay = [c.courseCode, c.courseName, ...(c.departments || []), c.sourceTitle]
                .join(' ').toLowerCase();
            if (!hay.includes(q)) return false;
        }
        return true;
    });
}

function renderRows() {
    const rows = filtered();
    $('empty-state').classList.toggle('hidden', rows.length > 0);
    const tbody = $('rows');
    tbody.innerHTML = '';

    const t = isEs()
        ? { open: 'Abrir programa', none: 'Sin programa aún', na: 'No requiere programa',
            materials: 'página de materiales', fixed: 'corregido por un profesor' }
        : { open: 'Open syllabus', none: 'No syllabus yet', na: 'No syllabus needed',
            materials: 'materials page', fixed: 'corrected by a teacher' };

    for (const c of rows) {
        const link = effectiveLink(c);
        const status = statusOf(c);
        const tr = document.createElement('tr');
        if (status === 'not_needed') tr.className = 'is-na';

        // A materials-page link is a stand-in: the syllabus is a file uploaded
        // to Schoology, whose direct URL needs an API key and 401s in a browser.
        const tags = [];
        if (link.kind === 'materials-page') tags.push(t.materials);
        if (link.kind === 'override') tags.push(t.fixed);

        let cell;
        if (status === 'not_needed') {
            cell = `<span class="pill na">${esc(t.na)}</span>` +
                   (c.note ? ` <span class="u">${esc(c.note)}</span>` : '');
        } else if (link.url) {
            cell = `<a href="${esc(link.url)}" target="_blank" rel="noopener">${esc(c.sourceTitle || t.open)}</a>` +
                   tags.map(x => `<span class="tag">${esc(x)}</span>`).join('') +
                   `<div class="u">${esc(link.url)}</div>`;
        } else {
            cell = `<span class="pill none">${esc(t.none)}</span>` +
                   (c.materialsUrl
                       ? ` <a class="u" href="${esc(c.materialsUrl)}" target="_blank" rel="noopener">${esc(t.materials)}</a>`
                       : '');
        }

        tr.innerHTML =
            `<td class="code">${esc(c.courseCode)}</td>` +
            `<td><div class="cname">${esc(c.courseName)}</div>` +
              `<div class="u">${esc(c.gradeRange ? (isEs() ? 'Grado ' : 'Grade ') + c.gradeRange : '')}</div></td>` +
            `<td class="dept">${esc((c.departments || []).join(', '))}</td>` +
            `<td>${cell}</td>`;
        tbody.appendChild(tr);
    }
}

function render() {
    renderCounts();
    renderDepartments();
    renderRows();
    const stamp = courses.find(c => c.importedAt)?.importedAt;
    $('footer-note').textContent = stamp
        ? (isEs() ? `Actualizado desde Schoology el ${new Date(stamp).toLocaleDateString('es-CL')}`
                  : `Updated from Schoology on ${new Date(stamp).toLocaleDateString()}`)
        : '';
}

function subscribe() {
    if (unsubscribe) unsubscribe();
    unsubscribe = onSnapshot(collection(db, 'course-syllabi'), (snap) => {
        courses = [];
        snap.forEach(d => courses.push({ id: d.id, ...d.data() }));
        courses.sort((a, b) =>
            (a.courseCode || '').localeCompare(b.courseCode || '', undefined, { numeric: true }));
        $('empty-collection').classList.toggle('hidden', courses.length > 0);
        render();
    }, (err) => {
        console.error('Could not load syllabi:', err);
        $('empty-collection').classList.remove('hidden');
        $('empty-collection').textContent = err.code === 'permission-denied'
            ? 'You do not have permission to read the syllabi collection.'
            : 'Could not load the syllabi. Please refresh and try again.';
    });
}

for (const id of ['q', 'dept', 'status']) {
    $(id).addEventListener('input', renderRows);
    $(id).addEventListener('change', renderRows);
}

$('sign-in-btn').addEventListener('click', () => {
    signInWithPopup(auth, provider).catch(err => {
        console.error(err);
        alert('Sign-in failed. Please try again with your Nido account.');
    });
});
$('sign-out-btn').addEventListener('click', () => signOut(auth));

onAuthStateChanged(auth, (user) => {
    if (!user) {
        if (unsubscribe) { unsubscribe(); unsubscribe = null; }
        courses = [];
        $('browse-section').classList.add('hidden');
        $('auth-section').classList.remove('hidden');
        return;
    }
    $('who').textContent = `${user.displayName} (${user.email})`;
    $('auth-section').classList.add('hidden');
    $('browse-section').classList.remove('hidden');
    subscribe();
});
