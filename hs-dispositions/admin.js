import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { getFirestore, collection, addDoc, onSnapshot, doc, updateDoc, deleteDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

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

let currentUser = null;
let isAdmin = false;
let allEntries = [];
let coursesData = [];
let editingId = null;

const allDispositions = ["Empathy", "Reflection", "Curiosity", "Perseverance", "Self-Direction"];

// UI Elements
const authSection = document.getElementById('auth-section');
const dashboardSection = document.getElementById('dashboard-section');
const authMessage = document.getElementById('auth-message');
const tableBody = document.getElementById('table-body');
const filterTeacher = document.getElementById('filter-teacher');
const filterDepartment = document.getElementById('filter-department');
const filterCourse = document.getElementById('filter-course');
const filterDisposition = document.getElementById('filter-disposition');
const evidenceModal = document.getElementById('evidence-modal');
const evidenceContent = document.getElementById('evidence-content');
const editModal = document.getElementById('edit-modal');

// Edit Form Elements
const editDept = document.getElementById('edit-department');
const editCourse = document.getElementById('edit-course');
const editDispositionsList = document.getElementById('edit-dispositions-list');

// Load Courses JSON for the Add/Edit form
fetch('course_catalog.json')
    .then(r => r.json())
    .then(data => {
        coursesData = data;
        const depts = [...new Set(data.map(d => d.department))].filter(Boolean).sort();
        
        // Populate filter dropdowns
        depts.forEach(d => {
            const opt = document.createElement('option');
            opt.value = opt.textContent = d;
            filterDepartment.appendChild(opt);
            
            const opt2 = document.createElement('option');
            opt2.value = opt2.textContent = d;
            editDept.appendChild(opt2);
        });
        
        const courses = [...new Set(data.map(d => d.course_name))].filter(Boolean).sort();
        courses.forEach(c => {
            const opt = document.createElement('option');
            opt.value = opt.textContent = c;
            filterCourse.appendChild(opt);
        });
    });

// Handle edit Dept change to populate courses
editDept.addEventListener('change', () => {
    editCourse.innerHTML = '<option value="">-- Select a Course --</option>';
    const filtered = coursesData.filter(d => d.department === editDept.value).map(d => d.course_name).sort();
    filtered.forEach(c => {
        const opt = document.createElement('option');
        opt.value = opt.textContent = c;
        editCourse.appendChild(opt);
    });
});

// Generate checkboxes for Edit Form
allDispositions.forEach(disp => {
    const label = document.createElement('label');
    label.style.display = 'flex';
    label.style.alignItems = 'center';
    label.style.gap = '0.5rem';
    
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.value = disp;
    cb.className = 'edit-disp-cb';
    
    label.appendChild(cb);
    label.appendChild(document.createTextNode(disp));
    editDispositionsList.appendChild(label);
});

// Auth Listener
document.getElementById('sign-in-btn').addEventListener('click', () => {
    signInWithPopup(auth, provider).catch(err => console.error(err));
});

onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        
        // Check if admin
        try {
            const userDoc = await getDoc(doc(db, "users", user.uid));
            if (userDoc.exists() && userDoc.data().role === 'admin') {
                isAdmin = true;
                authSection.classList.add('hidden');
                dashboardSection.classList.remove('hidden');
                loadData();
            } else {
                authMessage.innerText = "Access Denied. You do not have admin privileges.";
                auth.signOut();
            }
        } catch(e) {
            authMessage.innerText = "Error checking admin status. Make sure Firestore rules allow read access.";
        }
    } else {
        currentUser = null;
        isAdmin = false;
        authSection.classList.remove('hidden');
        dashboardSection.classList.add('hidden');
    }
});

function loadData() {
    onSnapshot(collection(db, "hs-dispositions"), (snapshot) => {
        allEntries = [];
        snapshot.forEach(doc => {
            allEntries.push({ id: doc.id, ...doc.data() });
        });
        renderTable();
    });
}

function renderTable() {
    tableBody.innerHTML = '';
    
    const termTeacher = filterTeacher.value.toLowerCase();
    const termDept = filterDepartment.value;
    const termCourse = filterCourse.value;
    const termDisp = filterDisposition.value;

    const filtered = allEntries.filter(entry => {
        if (termTeacher && !(entry.userName?.toLowerCase().includes(termTeacher) || entry.userEmail?.toLowerCase().includes(termTeacher))) return false;
        if (termDept && entry.department !== termDept) return false;
        if (termCourse && entry.course !== termCourse) return false;
        if (termDisp && (!entry.dispositions || !entry.dispositions.includes(termDisp))) return false;
        return true;
    });

    filtered.forEach(entry => {
        const tr = document.createElement('tr');
        
        const tdTeacher = document.createElement('td');
        tdTeacher.innerHTML = `<strong>${entry.userName || 'Unknown'}</strong><br><span style="font-size:0.8rem; color:#666;">${entry.userEmail || ''}</span>`;
        
        const tdDept = document.createElement('td');
        tdDept.innerText = entry.department || '';

        const tdCourse = document.createElement('td');
        tdCourse.innerText = entry.course || '';

        const tdDisp = document.createElement('td');
        tdDisp.innerText = (entry.dispositions || []).join(', ');

        const tdActions = document.createElement('td');
        
        // Evidence Button
        const viewBtn = document.createElement('button');
        viewBtn.className = 'action-btn btn-view';
        viewBtn.innerText = 'Evidence';
        viewBtn.onclick = () => showEvidence(entry);
        
        // Edit Button
        const editBtn = document.createElement('button');
        editBtn.className = 'action-btn btn-edit';
        editBtn.innerText = 'Edit';
        editBtn.onclick = () => openEditModal(entry);

        // Delete Button
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'action-btn btn-delete';
        deleteBtn.innerText = 'Delete';
        deleteBtn.onclick = async () => {
            if(confirm('Are you sure you want to delete this entry?')) {
                await deleteDoc(doc(db, "hs-dispositions", entry.id));
            }
        };

        tdActions.appendChild(viewBtn);
        tdActions.appendChild(editBtn);
        tdActions.appendChild(deleteBtn);

        tr.append(tdTeacher, tdDept, tdCourse, tdDisp, tdActions);
        tableBody.appendChild(tr);
    });
}

[filterTeacher, filterDepartment, filterCourse, filterDisposition].forEach(el => {
    el.addEventListener('input', renderTable);
    el.addEventListener('change', renderTable);
});

function showEvidence(entry) {
    evidenceContent.innerHTML = '';
    const map = entry.evidenceMap || {};
    let hasEvidence = false;
    
    Object.keys(map).forEach(dispName => {
        if (map[dispName].trim()) {
            hasEvidence = true;
            const block = document.createElement('div');
            block.className = 'evidence-box';
            block.innerHTML = `<strong>${dispName}:</strong><p style="margin: 0.5rem 0 0 0;">${map[dispName]}</p>`;
            evidenceContent.appendChild(block);
        }
    });

    if (!hasEvidence) {
        evidenceContent.innerHTML = '<p class="text-nido-dark">No evidence recorded for this entry.</p>';
    }
    
    evidenceModal.classList.remove('hidden');
}

document.getElementById('add-entry-btn').addEventListener('click', () => {
    openEditModal(null);
});

function openEditModal(entry) {
    editingId = entry ? entry.id : null;
    document.getElementById('modal-title').innerText = entry ? 'Edit Entry' : 'Add New Entry';
    
    document.getElementById('edit-teacher-name').value = entry ? entry.userName : '';
    document.getElementById('edit-teacher-email').value = entry ? entry.userEmail : '';
    
    editDept.value = entry ? entry.department : '';
    // Trigger course population
    editDept.dispatchEvent(new Event('change'));
    
    setTimeout(() => {
        editCourse.value = entry ? entry.course : '';
    }, 50);

    const checkedDisps = entry ? (entry.dispositions || []) : [];
    document.querySelectorAll('.edit-disp-cb').forEach(cb => {
        cb.checked = checkedDisps.includes(cb.value);
    });

    editModal.classList.remove('hidden');
}

document.getElementById('modal-cancel-btn').addEventListener('click', () => {
    editModal.classList.add('hidden');
});

document.getElementById('modal-save-btn').addEventListener('click', async () => {
    const userName = document.getElementById('edit-teacher-name').value.trim();
    const userEmail = document.getElementById('edit-teacher-email').value.trim();
    const department = editDept.value;
    const course = editCourse.value;
    
    const dispositions = [];
    document.querySelectorAll('.edit-disp-cb:checked').forEach(cb => dispositions.push(cb.value));

    if (!userName || !userEmail || !department || !course || dispositions.length === 0) {
        alert("Please fill out all fields and select at least one disposition.");
        return;
    }

    const data = {
        userName,
        userEmail,
        department,
        course,
        dispositions,
        timestamp: new Date().toISOString()
    };

    try {
        if (editingId) {
            await updateDoc(doc(db, "hs-dispositions", editingId), data);
        } else {
            data.evidenceMap = {};
            await addDoc(collection(db, "hs-dispositions"), data);
        }
        editModal.classList.add('hidden');
    } catch(err) {
        console.error(err);
        alert("Error saving entry. Check console.");
    }
});
