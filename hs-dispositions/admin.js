import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { getFirestore, collection, onSnapshot, doc, getDoc, updateDoc, deleteField } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

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

// Order matters: it is the display order and the stored order, so two writes
// of the same set of roles produce an identical array.
const ROLES = ['teacher', 'coach', 'admin', 'superadmin'];

const ROLE_HELP = {
    teacher: 'Informational. Dispositions are open to all @nido.cl accounts.',
    coach: 'Will gate the Coaching Log once that change is published.',
    admin: 'Can moderate entries on the Browse page.',
    superadmin: 'Can manage roles on this page. Implies admin and coach.'
};

let currentUser = null;
let users = [];
let unsubscribe = null;

const authSection = document.getElementById('auth-section');
const noAccess = document.getElementById('no-access');
const adminSection = document.getElementById('admin-section');
const userRows = document.getElementById('user-rows');
const emptyState = document.getElementById('empty-state');
const countsEl = document.getElementById('counts');
const flashEl = document.getElementById('flash');
const qInput = document.getElementById('q');
const onlyRoles = document.getElementById('only-roles');

let flashTimer = null;
function flash(kind, message) {
    flashEl.textContent = message;
    flashEl.className = kind;
    clearTimeout(flashTimer);
    flashTimer = setTimeout(() => flashEl.className = 'hidden', 5000);
}

/**
 * The roles a profile effectively holds.
 *
 * Reads the `roles` array and folds in the legacy single `role` string, which
 * AssessmentCalendar, BlockScheduler and the Browse page still check. That way
 * existing admins show up correctly here before anything has been migrated.
 */
function rolesOf(data) {
    const held = new Set((data.roles || []).filter(r => ROLES.includes(r)));
    if (data.role && ROLES.includes(data.role)) held.add(data.role);
    return ROLES.filter(r => held.has(r));
}

/**
 * Write a new role set.
 *
 * `roles` is authoritative. `role` is kept in step as a compatibility mirror
 * purely so the three apps that still read `role === 'admin'` keep working;
 * it can be dropped once they read `roles`.
 */
async function setRoles(uid, roles) {
    const grantsAdmin = roles.includes('admin') || roles.includes('superadmin');
    await updateDoc(doc(db, 'users', uid), {
        roles,
        role: grantsAdmin ? 'admin' : deleteField()
    });
}

async function toggleRole(user, role) {
    const held = rolesOf(user.data);
    const adding = !held.includes(role);
    const next = adding ? ROLES.filter(r => held.includes(r) || r === role)
                        : held.filter(r => r !== role);

    // Removing your own superadmin would leave nobody able to hand it back
    // except by editing Firestore directly. Block it rather than warn.
    if (!adding && role === 'superadmin' && user.id === currentUser.uid) {
        flash('err', 'You cannot remove your own superadmin role. Ask another superadmin, or change it in the Firebase console.');
        return;
    }

    if (role === 'superadmin') {
        const who = user.data.displayName || user.data.email || user.id;
        const ok = confirm(
            `${adding ? 'Grant' : 'Revoke'} superadmin for ${who}?\n\n` +
            `Superadmins can grant and revoke any role, including their own.`
        );
        if (!ok) return;
    }

    try {
        await setRoles(user.id, next);
        flash('ok', `${adding ? 'Granted' : 'Revoked'} ${role} for ${user.data.email || user.id}.`);
    } catch (err) {
        console.error('Role write failed:', err);
        flash('err', err.code === 'permission-denied'
            ? 'Permission denied. The updated Firestore rules may not be published yet.'
            : `Could not save: ${err.message}`);
    }
}

function visibleUsers() {
    const q = qInput.value.trim().toLowerCase();
    return users.filter(u => {
        const held = rolesOf(u.data);
        if (onlyRoles.checked && held.length === 0) return false;
        if (!q) return true;
        return [u.data.displayName, u.data.email, ...held].join(' ').toLowerCase().includes(q);
    });
}

function renderCounts() {
    const tally = Object.fromEntries(ROLES.map(r => [r, 0]));
    for (const u of users) for (const r of rolesOf(u.data)) tally[r]++;
    countsEl.innerHTML =
        `<div class="count"><b>${users.length}</b><span>profiles</span></div>` +
        ROLES.map(r => `<div class="count"><b>${tally[r]}</b><span>${r}</span></div>`).join('');
}

function renderRows() {
    const rows = visibleUsers();
    emptyState.classList.toggle('hidden', rows.length > 0);
    userRows.innerHTML = '';

    for (const u of rows) {
        const held = rolesOf(u.data);
        const tr = document.createElement('tr');

        const tdUser = document.createElement('td');
        const name = document.createElement('div');
        name.className = 'uname';
        name.textContent = u.data.displayName || '(no name)';
        if (u.id === currentUser.uid) {
            const you = document.createElement('span');
            you.className = 'legacy';
            you.textContent = 'you';
            name.appendChild(you);
        }
        const email = document.createElement('div');
        email.className = 'uemail';
        email.textContent = u.data.email || u.id;
        tdUser.append(name, email);

        const tdRoles = document.createElement('td');
        const wrap = document.createElement('div');
        wrap.className = 'role-toggles';
        for (const role of ROLES) {
            const btn = document.createElement('button');
            const on = held.includes(role);
            btn.className = 'role-btn' + (on ? ' on' : '') + (role === 'superadmin' ? ' super' : '');
            btn.textContent = role;
            btn.title = ROLE_HELP[role];
            if (on && role === 'superadmin' && u.id === currentUser.uid) {
                btn.disabled = true;
                btn.title = 'You cannot remove your own superadmin role.';
            }
            btn.addEventListener('click', () => toggleRole(u, role));
            wrap.appendChild(btn);
        }
        tdRoles.appendChild(wrap);

        // Surface a legacy-only admin so it is obvious why the chip is lit
        // before this profile has ever been written from here.
        if (u.data.role && !(u.data.roles || []).length) {
            const tag = document.createElement('span');
            tag.className = 'legacy';
            tag.textContent = `legacy role: ${u.data.role}`;
            tdRoles.appendChild(tag);
        }

        const tdSeen = document.createElement('td');
        tdSeen.className = 'uemail';
        tdSeen.textContent = u.data.lastLogin
            ? new Date(u.data.lastLogin).toLocaleDateString()
            : '—';

        tr.append(tdUser, tdRoles, tdSeen);
        userRows.appendChild(tr);
    }
}

function render() {
    renderCounts();
    renderRows();
}

function subscribe() {
    if (unsubscribe) unsubscribe();
    unsubscribe = onSnapshot(collection(db, 'users'), (snap) => {
        users = [];
        snap.forEach(d => users.push({ id: d.id, data: d.data() }));
        users.sort((a, b) =>
            (a.data.displayName || a.data.email || '').localeCompare(
                b.data.displayName || b.data.email || ''));
        render();
    }, (err) => {
        console.error('Could not load users:', err);
        flash('err', 'Could not load the user list. Check that you are signed in with a superadmin account.');
    });
}

function show(section) {
    for (const el of [authSection, noAccess, adminSection]) el.classList.add('hidden');
    section.classList.remove('hidden');
}

document.getElementById('sign-in-btn').addEventListener('click', () => {
    signInWithPopup(auth, provider).catch(err => {
        console.error('Sign-in failed:', err);
        alert('Sign-in failed. Please try again with your Nido account.');
    });
});

for (const id of ['sign-out-btn', 'sign-out-btn-2']) {
    document.getElementById(id).addEventListener('click', () => signOut(auth));
}

qInput.addEventListener('input', renderRows);
onlyRoles.addEventListener('change', renderRows);

onAuthStateChanged(auth, async (user) => {
    currentUser = user;

    if (!user) {
        if (unsubscribe) { unsubscribe(); unsubscribe = null; }
        users = [];
        show(authSection);
        return;
    }

    // Read our own profile to decide what to show. The Firestore rules are what
    // actually enforce this; hiding the UI just avoids offering actions that
    // would fail.
    let mine = {};
    try {
        const snap = await getDoc(doc(db, 'users', user.uid));
        if (snap.exists()) mine = snap.data();
    } catch (err) {
        console.error('Could not read your profile:', err);
    }

    if (!rolesOf(mine).includes('superadmin')) {
        document.getElementById('na-email').textContent = user.email;
        show(noAccess);
        return;
    }

    document.getElementById('who').textContent = `${user.displayName} (${user.email})`;
    show(adminSection);
    subscribe();
});
