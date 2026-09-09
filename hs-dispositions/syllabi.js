import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { getFirestore, collection, onSnapshot, doc, updateDoc, query, where } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

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

// Restrict Google Sign-In to the school's Google Workspace domain
provider.setCustomParameters({
    hd: 'nido.cl'
});

let currentUser = null;
let coursesData = [];
let unsubscribeEntries = null;
let lastEntries = null;

// Unsaved text the teacher has typed, keyed by entry id. Kept so that a live
// Firestore update to one card does not wipe what they are typing in another.
const drafts = new Map();
// Transient per-card confirmations, keyed by entry id. Also survives re-renders.
const flashes = new Map();
const flashTimers = new Map();

// UI elements
const authSection = document.getElementById('auth-section');
const authMessage = document.getElementById('auth-message');
const syllabiSection = document.getElementById('syllabi-section');
const coursesList = document.getElementById('courses-list');
const emptyState = document.getElementById('empty-state');
const progressSummary = document.getElementById('progress-summary');
const progressFill = document.getElementById('progress-fill');

// Load the course catalog so we can show course code / grade level alongside each entry
fetch('course_catalog.json')
    .then(r => r.json())
    .then(data => {
        coursesData = data;
        // Re-render with the enriched metadata if entries already arrived
        if (lastEntries) renderCourses(lastEntries);
    })
    .catch(err => console.error("Error loading course catalog:", err));

// --- Language toggle (mirrors index.html) ---
document.querySelectorAll('.lang-select').forEach(select => {
    select.addEventListener('change', (e) => {
        const lang = e.target.value;
        document.querySelectorAll('.lang-select').forEach(s => s.value = lang);
        document.body.classList.toggle('show-es', lang === 'es');
    });
});

// --- Auth ---
document.getElementById('sign-in-btn').addEventListener('click', () => {
    authMessage.innerText = '';
    signInWithPopup(auth, provider).catch(error => {
        console.error("Error signing in: ", error);
        authMessage.innerText = "Error signing in. Did you use your school email?";
    });
});

document.getElementById('sign-out-btn').addEventListener('click', () => {
    signOut(auth).catch(err => console.error("Error signing out:", err));
});

onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        document.getElementById('user-name').innerText = user.displayName || '';
        document.getElementById('user-email').innerText = user.email || '';
        authSection.classList.add('hidden');
        syllabiSection.classList.remove('hidden');
        subscribeToMyCourses(user.email);
    } else {
        currentUser = null;
        if (unsubscribeEntries) {
            unsubscribeEntries();
            unsubscribeEntries = null;
        }
        lastEntries = null;
        drafts.clear();
        flashes.clear();
        coursesList.innerHTML = '';
        emptyState.classList.add('hidden');
        syllabiSection.classList.add('hidden');
        authSection.classList.remove('hidden');
    }
});

function subscribeToMyCourses(email) {
    if (unsubscribeEntries) unsubscribeEntries();

    const q = query(collection(db, "hs-dispositions"), where("userEmail", "==", email));
    unsubscribeEntries = onSnapshot(q, (snapshot) => {
        const entries = [];
        snapshot.forEach(docSnap => entries.push({ id: docSnap.id, ...docSnap.data() }));

        // Departments first, then courses, alphabetically within each
        entries.sort((a, b) => {
            const deptCmp = (a.department || '').localeCompare(b.department || '');
            if (deptCmp !== 0) return deptCmp;
            return (a.course || '').localeCompare(b.course || '');
        });

        renderCourses(entries);
    }, (err) => {
        console.error("Error loading your courses:", err);
        coursesList.innerHTML = `<p style="color: var(--nido-red);">Could not load your courses. Please refresh and try again.</p>`;
    });
}

function findCatalogEntry(courseName) {
    return coursesData.find(c => c.course_name === courseName);
}

function isLikelyDriveLink(url) {
    try {
        const parsed = new URL(url);
        if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return false;
        return /(^|\.)(drive|docs|sites)\.google\.com$/.test(parsed.hostname);
    } catch (e) {
        return false;
    }
}

function isValidUrl(url) {
    try {
        const parsed = new URL(url);
        return parsed.protocol === 'https:' || parsed.protocol === 'http:';
    } catch (e) {
        return false;
    }
}

function formatDate(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d)) return '';
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

// Shows a message on one card in a way that survives the re-render triggered
// by the Firestore snapshot listener.
function showFlash(entryId, type, en, es) {
    flashes.set(entryId, { type, en, es });
    if (flashTimers.has(entryId)) clearTimeout(flashTimers.get(entryId));
    flashTimers.set(entryId, setTimeout(() => {
        flashes.delete(entryId);
        flashTimers.delete(entryId);
        if (lastEntries) renderCourses(lastEntries);
    }, 5000));
    if (lastEntries) renderCourses(lastEntries);
}

function renderCourses(entries) {
    lastEntries = entries;
    coursesList.innerHTML = '';

    if (entries.length === 0) {
        emptyState.classList.remove('hidden');
        updateProgress(0, 0);
        return;
    }
    emptyState.classList.add('hidden');

    entries.forEach(entry => coursesList.appendChild(buildCourseCard(entry)));

    const linked = entries.filter(e => e.syllabusUrl && e.syllabusUrl.trim()).length;
    updateProgress(linked, entries.length);
}

function updateProgress(linked, total) {
    const pct = total > 0 ? Math.round((linked / total) * 100) : 0;
    progressSummary.innerHTML = `
        <span class="lang-en">${linked} of ${total} course${total === 1 ? '' : 's'} linked to a syllabus (${pct}%)</span>
        <span class="lang-es">${linked} de ${total} curso${total === 1 ? '' : 's'} con programa vinculado (${pct}%)</span>
    `;
    progressFill.style.width = `${pct}%`;
}

function buildCourseCard(entry) {
    const card = document.createElement('div');
    const hasLink = !!(entry.syllabusUrl && entry.syllabusUrl.trim());
    card.className = `course-card ${hasLink ? 'is-linked' : 'is-unlinked'}`;

    const titleText = entry.course ? entry.course : `${entry.department} (General)`;
    const catalog = entry.course ? findCatalogEntry(entry.course) : null;

    const metaBits = [entry.department];
    if (catalog && catalog.course_code) metaBits.push(`Code ${catalog.course_code}`);
    if (catalog && catalog.grade_range) metaBits.push(`Grade ${catalog.grade_range}`);

    const head = document.createElement('div');
    head.className = 'course-head';
    head.innerHTML = `
        <div>
            <div class="font-bold text-nido-blue" style="font-size: 1.15rem;"></div>
            <div class="course-meta"></div>
        </div>
        <span class="status-pill ${hasLink ? 'status-linked' : 'status-unlinked'}">
            ${hasLink
                ? `<span class="lang-en">Syllabus linked</span><span class="lang-es">Programa vinculado</span>`
                : `<span class="lang-en">No syllabus yet</span><span class="lang-es">Sin programa aún</span>`}
        </span>
    `;
    head.querySelector('.font-bold').innerText = titleText;
    head.querySelector('.course-meta').innerText = metaBits.filter(Boolean).join(' · ');
    card.appendChild(head);

    // Dispositions this teacher selected for the course, for context
    if (Array.isArray(entry.dispositions) && entry.dispositions.length) {
        const chips = document.createElement('div');
        chips.style.marginTop = '0.5rem';
        entry.dispositions.forEach(d => {
            const chip = document.createElement('span');
            chip.className = 'chip';
            chip.innerText = d;
            chips.appendChild(chip);
        });
        card.appendChild(chips);
    }

    // Link input row
    const label = document.createElement('label');
    label.className = 'form-label text-nido-blue';
    label.style.fontSize = '0.9rem';
    label.style.marginTop = '1rem';
    label.style.marginBottom = '0';
    label.htmlFor = `syllabus-${entry.id}`;
    label.innerHTML = `
        <span class="lang-en">Google Drive link to syllabus:</span>
        <span class="lang-es">Enlace de Google Drive al programa:</span>
    `;
    card.appendChild(label);

    const row = document.createElement('div');
    row.className = 'link-row';

    const input = document.createElement('input');
    input.type = 'url';
    input.className = 'form-control';
    input.id = `syllabus-${entry.id}`;
    input.placeholder = 'https://drive.google.com/...';
    input.value = drafts.has(entry.id) ? drafts.get(entry.id) : (entry.syllabusUrl || '');
    input.addEventListener('input', () => drafts.set(entry.id, input.value));

    const saveBtn = document.createElement('button');
    saveBtn.className = 'btn-nido-blue';
    saveBtn.innerHTML = `<span class="lang-en">Save</span><span class="lang-es">Guardar</span>`;

    const openLink = document.createElement('a');
    openLink.className = 'btn-ghost';
    openLink.target = '_blank';
    openLink.rel = 'noopener noreferrer';
    openLink.innerHTML = `<span class="lang-en">Open</span><span class="lang-es">Abrir</span>`;
    openLink.href = entry.syllabusUrl || '#';
    if (!hasLink) openLink.classList.add('hidden');

    row.append(input, saveBtn, openLink);
    card.appendChild(row);

    const msg = document.createElement('div');
    const flash = flashes.get(entry.id);
    if (flash) {
        msg.className = `row-msg ${flash.type}`;
        msg.innerHTML = `
            <span class="lang-en">${flash.en}</span>
            <span class="lang-es">${flash.es}</span>
        `;
    } else {
        msg.className = 'row-msg info';
        if (entry.syllabusUpdatedAt) {
            const when = formatDate(entry.syllabusUpdatedAt);
            msg.innerHTML = `
                <span class="lang-en">Last updated ${when}</span>
                <span class="lang-es">Última actualización ${when}</span>
            `;
        }
    }
    card.appendChild(msg);

    // A blank input clears the link; anything else must be a usable URL.
    saveBtn.addEventListener('click', async () => {
        const url = input.value.trim();

        if (url && !isValidUrl(url)) {
            showFlash(entry.id, 'err',
                'That does not look like a valid link. It should start with https://',
                'Ese enlace no parece válido. Debe comenzar con https://');
            document.getElementById(`syllabus-${entry.id}`)?.focus();
            return;
        }

        if (url && !isLikelyDriveLink(url)) {
            const proceed = confirm(
                "This link is not a Google Drive / Docs link. Save it anyway?\n\n" +
                "Este enlace no es de Google Drive / Docs. ¿Guardarlo de todas formas?"
            );
            if (!proceed) return;
        }

        saveBtn.disabled = true;
        const originalHTML = saveBtn.innerHTML;
        saveBtn.innerHTML = `<span class="lang-en">Saving…</span><span class="lang-es">Guardando…</span>`;

        try {
            await updateDoc(doc(db, "hs-dispositions", entry.id), {
                syllabusUrl: url || null,
                syllabusUpdatedAt: url ? new Date().toISOString() : null,
                syllabusUpdatedBy: url ? currentUser.email : null
            });
            // The saved value is now authoritative, so drop the pending draft.
            drafts.delete(entry.id);
            saveBtn.disabled = false;
            saveBtn.innerHTML = originalHTML;
            showFlash(entry.id, 'ok',
                url ? 'Saved.' : 'Link removed.',
                url ? 'Guardado.' : 'Enlace eliminado.');
        } catch (error) {
            console.error("Error saving syllabus link:", error);
            saveBtn.disabled = false;
            saveBtn.innerHTML = originalHTML;
            showFlash(entry.id, 'err',
                'Could not save. Please try again.',
                'No se pudo guardar. Inténtalo de nuevo.');
        }
    });

    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') saveBtn.click();
    });

    return card;
}
