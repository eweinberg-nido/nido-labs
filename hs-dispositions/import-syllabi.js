import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { getFirestore, collection, getDocs, doc, writeBatch, getDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

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

const COLLECTION = 'course-syllabi';

// Fields the import owns. Anything else on an existing document - notably the
// override fields a teacher will be able to set - is never written here, so a
// re-import cannot undo somebody's correction.
const IMPORT_FIELDS = [
    'courseCode', 'courseName', 'departments', 'gradeRange', 'credit',
    'status', 'confidence', 'syllabusUrl', 'urlKind', 'originalUrl',
    'sourceTitle', 'sectionId', 'materialsUrl', 'note', 'source', 'detectedAt'
];

let currentUser = null;
let payload = null;
let existing = null;   // Map<courseCode, data>
let plan = null;       // { creates:[], updates:[], unchanged:[] }
let backedUp = false;

const $ = (id) => document.getElementById(id);
const show = (el) => el.classList.remove('hidden');
const hide = (el) => el.classList.add('hidden');
const enable = (id) => $(id).setAttribute('aria-disabled', 'false');

function esc(s) {
    return String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

function countsHtml(pairs) {
    return pairs.map(([n, label]) => `<div class="count"><b>${n}</b><span>${label}</span></div>`).join('');
}

/** Only the fields the import owns, so comparisons ignore teacher-owned ones. */
function ownedFields(obj) {
    const out = {};
    for (const k of IMPORT_FIELDS) if (obj[k] !== undefined) out[k] = obj[k];
    return out;
}

function sameAsExisting(incoming, current) {
    if (!current) return false;
    const a = ownedFields(incoming);
    const b = ownedFields(current);
    return JSON.stringify(a) === JSON.stringify(b);
}

// ---- step 1: load the payload ---------------------------------------
function acceptPayload(data) {
    if (!data || !Array.isArray(data.courses)) {
        alert('That file does not look like a course-syllabi export.');
        return;
    }
    payload = data;
    const by = {};
    for (const c of payload.courses) by[c.status] = (by[c.status] || 0) + 1;
    $('payload-counts').innerHTML = countsHtml([
        [payload.courses.length, 'documents'],
        [by.found || 0, 'with a link'],
        [by.missing || 0, 'missing'],
        [by.not_needed || 0, 'not needed'],
    ]);
    show($('payload-counts'));
    $('step-load').classList.add('done');
    enable('step-compare');
}

$('load-btn').addEventListener('click', async () => {
    try {
        const res = await fetch('course-syllabi.json', { cache: 'no-store' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        acceptPayload(await res.json());
    } catch (err) {
        alert(`Could not read course-syllabi.json from this folder (${err.message}).\n\nUse the file picker instead.`);
    }
});

$('file-input').addEventListener('change', async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    try {
        acceptPayload(JSON.parse(await f.text()));
    } catch {
        alert('That file is not valid JSON.');
    }
});

// ---- step 2: compare -------------------------------------------------
$('compare-btn').addEventListener('click', async () => {
    $('compare-btn').disabled = true;
    try {
        const snap = await getDocs(collection(db, COLLECTION));
        existing = new Map();
        snap.forEach(d => existing.set(d.id, d.data()));

        plan = { creates: [], updates: [], unchanged: [] };
        for (const c of payload.courses) {
            const cur = existing.get(c.courseCode);
            if (!cur) plan.creates.push(c);
            else if (sameAsExisting(c, cur)) plan.unchanged.push(c);
            else plan.updates.push({ incoming: c, current: cur });
        }

        const withOverride = [...existing.values()].filter(d => d.overrideUrl).length;

        $('diff-counts').innerHTML = countsHtml([
            [existing.size, 'already in Firestore'],
            [plan.creates.length, 'to create'],
            [plan.updates.length, 'to update'],
            [plan.unchanged.length, 'unchanged'],
            [withOverride, 'teacher overrides (untouched)'],
        ]);
        show($('diff-counts'));

        if (plan.updates.length) {
            const rows = plan.updates.slice(0, 50).map(({ incoming, current }) => `
                <tr>
                  <td>${esc(incoming.courseCode)}</td>
                  <td>${esc(incoming.courseName)}</td>
                  <td class="u">${esc(current.syllabusUrl || '—')}</td>
                  <td class="u">${esc(incoming.syllabusUrl || '—')}</td>
                </tr>`).join('');
            $('diff-table').innerHTML =
                `<table><thead><tr><th>Code</th><th>Course</th><th>Currently</th><th>Will become</th></tr></thead>
                 <tbody>${rows}</tbody></table>` +
                (plan.updates.length > 50 ? `<p class="u" style="padding:0.5rem;">…and ${plan.updates.length - 50} more</p>` : '');
            show($('diff-table'));
        }

        $('step-compare').classList.add('done');
        enable('step-backup');
        if (!existing.size) {
            // Nothing to lose on a first run, so the backup step is a formality.
            backedUp = true;
            $('backup-note').textContent = 'Collection is empty — nothing to back up.';
            $('step-backup').classList.add('done');
            enable('step-apply');
        }
        $('apply-summary').innerHTML =
            `<strong>${plan.creates.length} documents will be created</strong> and ` +
            `<strong>${plan.updates.length} updated</strong>. ` +
            `${plan.unchanged.length} are already correct. Nothing is deleted.`;
    } catch (err) {
        console.error(err);
        alert(err.code === 'permission-denied'
            ? 'Permission denied reading course-syllabi. Check that the updated rules are published.'
            : `Could not read the collection: ${err.message}`);
    } finally {
        $('compare-btn').disabled = false;
    }
});

// ---- step 3: backup --------------------------------------------------
$('backup-btn').addEventListener('click', () => {
    const dump = {
        exportedAt: new Date().toISOString(),
        collection: COLLECTION,
        documents: Object.fromEntries(existing)
    };
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(dump, null, 2)], { type: 'application/json' }));
    a.download = `course-syllabi-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);

    backedUp = true;
    $('backup-note').textContent = `Saved ${existing.size} documents.`;
    $('step-backup').classList.add('done');
    enable('step-apply');
});

// ---- step 4: apply ---------------------------------------------------
$('apply-btn').addEventListener('click', async () => {
    if (!backedUp) return alert('Download the backup first.');
    const total = plan.creates.length + plan.updates.length;
    if (!total) return alert('Nothing to write — everything is already up to date.');
    if (!confirm(`Write ${total} documents to ${COLLECTION}?\n\nNothing will be deleted, and teacher overrides are not touched.`)) return;

    $('apply-btn').disabled = true;
    show($('bar'));
    const bar = $('bar').firstElementChild;

    const toWrite = [...plan.creates, ...plan.updates.map(u => u.incoming)];
    const stamp = { importedAt: new Date().toISOString(), importedBy: currentUser.email };

    try {
        // Firestore caps a batch at 500 writes; chunking keeps this correct if
        // the catalog grows.
        const CHUNK = 400;
        let done = 0;
        for (let i = 0; i < toWrite.length; i += CHUNK) {
            const batch = writeBatch(db);
            for (const c of toWrite.slice(i, i + CHUNK)) {
                batch.set(doc(db, COLLECTION, c.courseCode), { ...ownedFields(c), ...stamp }, { merge: true });
            }
            await batch.commit();
            done += Math.min(CHUNK, toWrite.length - i);
            bar.style.width = `${(done / toWrite.length) * 100}%`;
            $('log').textContent = `${done} / ${toWrite.length} written`;
        }
        $('log').textContent = `Done. ${toWrite.length} documents written to ${COLLECTION}.`;
        $('step-apply').classList.add('done');
    } catch (err) {
        console.error(err);
        $('log').textContent = err.code === 'permission-denied'
            ? 'Permission denied. Only an admin can write course-syllabi.'
            : `Failed: ${err.message}`;
        $('apply-btn').disabled = false;
    }
});

// ---- auth ------------------------------------------------------------
$('sign-in-btn').addEventListener('click', () => {
    signInWithPopup(auth, provider).catch(err => {
        console.error(err);
        alert('Sign-in failed. Please try again with your Nido account.');
    });
});
for (const id of ['sign-out-btn', 'sign-out-btn-2']) {
    $(id).addEventListener('click', () => signOut(auth));
}

function rolesOf(d) {
    const held = new Set(d.roles || []);
    if (d.role) held.add(d.role);
    return held;
}

onAuthStateChanged(auth, async (user) => {
    currentUser = user;
    for (const el of ['auth-section', 'no-access', 'main']) hide($(el));

    if (!user) return show($('auth-section'));

    let mine = {};
    try {
        const snap = await getDoc(doc(db, 'users', user.uid));
        if (snap.exists()) mine = snap.data();
    } catch (err) {
        console.error('Could not read your profile:', err);
    }

    const held = rolesOf(mine);
    if (!held.has('admin') && !held.has('superadmin')) {
        $('na-email').textContent = user.email;
        return show($('no-access'));
    }

    $('who').textContent = `${user.displayName} (${user.email})`;
    show($('main'));
});
