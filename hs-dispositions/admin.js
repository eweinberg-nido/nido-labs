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
const filterGrade = document.getElementById('filter-grade');
const filterDisposition = document.getElementById('filter-disposition');
const filterStatus = document.getElementById('filter-status');
const resultCount = document.getElementById('result-count');
const exportCsvBtn = document.getElementById('export-csv-btn');
const clearFiltersBtn = document.getElementById('clear-filters-btn');
const evidenceModal = document.getElementById('evidence-modal');

clearFiltersBtn.addEventListener('click', () => {
    filterStatus.value = 'all';
    filterTeacher.value = '';
    
    // Deselect multi-selects explicitly
    Array.from(filterDepartment.options).forEach(opt => opt.selected = false);
    Array.from(filterCourse.options).forEach(opt => opt.selected = false);
    Array.from(filterGrade.options).forEach(opt => opt.selected = false);
    Array.from(filterDisposition.options).forEach(opt => opt.selected = false);
    
    renderTable();
});

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

// Event listeners for filters
filterTeacher.addEventListener('input', renderTable);
filterDepartment.addEventListener('change', renderTable);
filterCourse.addEventListener('change', renderTable);
filterGrade.addEventListener('change', renderTable);
filterDisposition.addEventListener('change', renderTable);
filterStatus.addEventListener('change', renderTable);

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
                document.getElementById('add-entry-btn').style.display = 'inline-block';
            } else {
                isAdmin = false;
                document.getElementById('add-entry-btn').style.display = 'none';
            }
        } catch(e) {
            console.error("Error checking admin status:", e);
            isAdmin = false;
            document.getElementById('add-entry-btn').style.display = 'none';
        }
        
        // Let everyone see the dashboard
        authSection.classList.add('hidden');
        dashboardSection.classList.remove('hidden');
        loadData();
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

function getSelectedValues(selectEl) {
    return Array.from(selectEl.selectedOptions).map(opt => opt.value).filter(val => val !== "");
}

function getGradesFromRange(rangeStr) {
    if (!rangeStr) return [];
    let s = String(rangeStr).trim();
    if (s.includes("/")) {
        return s.split("/").map(g => parseInt(g, 10));
    }
    if (s.includes("-")) {
        const parts = s.split("-").map(g => parseInt(g, 10));
        if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
            const grades = [];
            for (let i = parts[0]; i <= parts[1]; i++) {
                grades.push(i);
            }
            return grades;
        }
    }
    return [parseInt(s, 10)];
}

let currentFilteredData = []; // Store globally for export

function renderTable() {
    tableBody.innerHTML = '';
    
    const termTeacher = filterTeacher.value.toLowerCase();
    const termStatus = filterStatus.value;
    const termDepts = getSelectedValues(filterDepartment);
    const termCourses = getSelectedValues(filterCourse);
    const termGrades = getSelectedValues(filterGrade).map(g => parseInt(g, 10));
    const termDisps = getSelectedValues(filterDisposition);

    // Build missing entries from coursesData
    const missingEntries = [];
    coursesData.forEach(catalog => {
        const exists = allEntries.some(e => e.course === catalog.course_name && e.department === catalog.department);
        if (!exists) {
            missingEntries.push({
                id: 'missing',
                userName: 'No Data',
                userEmail: '',
                department: catalog.department,
                course: catalog.course_name,
                dispositions: [],
                evidenceMap: {},
                isMissing: true
            });
        }
    });

    // Combine entered data and missing data
    let combined = [...allEntries, ...missingEntries];

    // Apply Filters
    const filtered = combined.filter(entry => {
        if (termStatus === 'entered' && entry.isMissing) return false;
        if (termStatus === 'missing' && !entry.isMissing) return false;
        if (termTeacher && !(entry.userName?.toLowerCase().includes(termTeacher) || entry.userEmail?.toLowerCase().includes(termTeacher))) return false;
        if (termDepts.length > 0 && !termDepts.includes(entry.department)) return false;
        if (termCourses.length > 0 && !termCourses.includes(entry.course)) return false;
        
        if (termGrades.length > 0) {
            const catalogInfo = coursesData.find(c => c.course_name === entry.course && c.department === entry.department) 
                             || coursesData.find(c => c.course_name === entry.course);
            if (!catalogInfo) return false;
            const courseGrades = getGradesFromRange(catalogInfo.grade_range);
            const matchesGrade = termGrades.some(g => courseGrades.includes(g));
            if (!matchesGrade) return false;
        }

        if (termDisps.length > 0) {
            const entryDisps = entry.dispositions || [];
            if (!termDisps.some(d => entryDisps.includes(d))) return false;
        }
        return true;
    });

    currentFilteredData = filtered;
    resultCount.innerText = `Showing ${filtered.length} entries`;

    filtered.forEach(entry => {
        const tr = document.createElement('tr');
        if (entry.isMissing) {
            tr.style.backgroundColor = '#fff3cd'; // highlight missing rows in warning yellow
        }
        
        const tdTeacher = document.createElement('td');
        if (entry.isMissing) {
            tdTeacher.innerHTML = `<span style="color: #856404; font-weight: bold;">Not Entered</span>`;
        } else {
            tdTeacher.innerHTML = `<strong>${entry.userName || 'Unknown'}</strong><br><span style="font-size:0.8rem; color:#666;">${entry.userEmail || ''}</span>`;
        }
        
        const tdDept = document.createElement('td');
        tdDept.innerText = entry.department || '';

        const tdCourse = document.createElement('td');
        tdCourse.innerText = entry.course || '';

        // Teachers add these on syllabi.html; show a link only once one exists.
        if (entry.syllabusUrl) {
            const syllabusLink = document.createElement('a');
            syllabusLink.href = entry.syllabusUrl;
            syllabusLink.target = '_blank';
            syllabusLink.rel = 'noopener noreferrer';
            syllabusLink.className = 'syllabus-link';
            syllabusLink.innerText = 'Syllabus \u2197';
            syllabusLink.title = entry.syllabusUrl;
            tdCourse.appendChild(document.createElement('br'));
            tdCourse.appendChild(syllabusLink);
        }

        const tdDisp = document.createElement('td');
        tdDisp.innerText = entry.isMissing ? 'N/A' : (entry.dispositions || []).join(', ');

        const tdEvidence = document.createElement('td');
        tdEvidence.style.fontSize = "0.85rem";
        if (entry.isMissing) {
            tdEvidence.innerText = 'N/A';
        } else {
            let evHTML = '';
            if (entry.evidenceMap) {
                Object.entries(entry.evidenceMap).forEach(([disp, text]) => {
                    if (text.trim()) {
                        evHTML += `<strong>${disp}:</strong> ${text}<br><br>`;
                    }
                });
            }
            tdEvidence.innerHTML = evHTML || '<span style="color:#999;">No evidence provided.</span>';
        }

        const tdActions = document.createElement('td');
        
        if (isAdmin) {
            if (entry.isMissing) {
                // Add immediately button
                const addBtn = document.createElement('button');
                addBtn.className = 'action-btn btn-edit';
                addBtn.innerText = '+ Add Entry';
                addBtn.onclick = () => openEditModal({ department: entry.department, course: entry.course });
                tdActions.appendChild(addBtn);
            } else {
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

                tdActions.appendChild(editBtn);
                tdActions.appendChild(deleteBtn);
            }
        } else {
            tdActions.innerText = '-';
            tdActions.style.color = '#999';
            tdActions.style.textAlign = 'center';
        }

        tr.append(tdTeacher, tdDept, tdCourse, tdDisp, tdEvidence, tdActions);
        tableBody.appendChild(tr);
    });

    updateAdminVisualization(filtered);
}

[filterTeacher, filterDepartment, filterCourse, filterDisposition, filterStatus].forEach(el => {
    el.addEventListener('input', renderTable);
    el.addEventListener('change', renderTable);
});

// --- ADMIN D3 VISUALIZATION ---
const adminVizContainer = document.getElementById('admin-d3-container');
const adminVizGroupSelect = document.getElementById('admin-viz-group');
const adminTooltip = d3.select("#admin-d3-tooltip");
const adminWidth = 1000;
const adminHeight = 500;

const adminSvg = d3.select("#admin-d3-container").append("svg")
    .attr("width", "100%")
    .attr("height", "100%")
    .attr("viewBox", `0 0 ${adminWidth} ${adminHeight}`)
    .attr("preserveAspectRatio", "xMidYMid meet");

const adminNodeGroup = adminSvg.append("g").attr("class", "nodes");
const adminLabelGroup = adminSvg.append("g").attr("class", "labels");

const adminColorScale = d3.scaleOrdinal([
    "#1f77b4", "#aec7e8", "#ff7f0e", "#ffbb78", "#2ca02c",
    "#98df8a", "#d62728", "#ff9896", "#9467bd", "#c5b0d5",
    "#8c564b", "#c49c94", "#e377c2", "#f7b6d2", "#7f7f7f",
    "#c7c7c7", "#bcbd22", "#dbdb8d", "#17becf", "#9edae5"
]);

let adminNodes = [];
let adminFoci = {};
let currentAdminVizMode = "disposition";

adminVizGroupSelect.addEventListener('change', (e) => {
    currentAdminVizMode = e.target.value;
    updateAdminVisualization(currentFilteredData);
});

const adminSimulation = d3.forceSimulation()
    .force("charge", d3.forceManyBody().strength(-10))
    .force("collide", d3.forceCollide().radius(d => d.radius + 1).iterations(2))
    .force("x", d3.forceX(d => getAdminFocalPoint(d).x).strength(0.12))
    .force("y", d3.forceY(d => getAdminFocalPoint(d).y).strength(0.12))
    .on("tick", adminTicked);

function getUmbrellaDept(dept) {
    if (!dept) return "Unknown";
    const arts = ["Visual Arts", "Visual Art", "Theater", "Music", "Digital Film and production", "Digital Design & Film"];
    if (arts.some(a => dept.toLowerCase().includes(a.toLowerCase()))) return "Arts";
    return dept.replace(" (International)", "").replace(" National Plan", "");
}

function getAdminFocalPoint(d) {
    const key = currentAdminVizMode === "disposition" ? d.disp : d.dept;
    return adminFoci[key] || { x: adminWidth / 2, y: adminHeight / 2 };
}

function updateAdminVisualization(filteredData) {
    adminNodes = [];
    const termDisps = getSelectedValues(filterDisposition); // Read current multi-select filter
    const validEntries = filteredData.filter(e => !e.isMissing);
    
    validEntries.forEach(entry => {
        let deptShort = getUmbrellaDept(entry.department);
        if (entry.dispositions && Array.isArray(entry.dispositions)) {
            entry.dispositions.forEach(disp => {
                if (termDisps.length > 0 && !termDisps.includes(disp)) return; // Only add matched dispositions
                adminNodes.push({
                    id: `${entry.id}-${disp}`, 
                    dept: deptShort,
                    disp: disp,
                    radius: 10,
                    userName: entry.userName,
                    course: entry.course
                });
            });
        }
    });

    calculateAdminFoci();

    const dispositionShapes = {
        "Empathy": "circle",
        "Reflection": "square",
        "Curiosity": "triangle",
        "Perseverance": "rounded_triangle",
        "Self-Direction": "pentagon"
    };

    function getAdminShapePath(disp, radius) {
        const shape = dispositionShapes[disp] || "circle";
        if (shape === "circle") {
            return `M 0,${-radius} A ${radius},${radius} 0 1,1 0,${radius} A ${radius},${radius} 0 1,1 0,${-radius}`;
        }
        if (shape === "square") {
            const r = radius * 0.85; 
            return `M ${-r},${-r} L ${r},${-r} L ${r},${r} L ${-r},${r} Z`;
        }
        if (shape === "triangle") {
            const r = radius * 1.15; 
            return `M 0,${-r} L ${r*0.866},${r*0.5} L ${-r*0.866},${r*0.5} Z`;
        }
        if (shape === "rounded_triangle") {
            const r = radius * 1.05;
            const s = r * 1.732; 
            return `M 0,${-r} A ${s},${s} 0 0,1 ${r*0.866},${r*0.5} A ${s},${s} 0 0,1 ${-r*0.866},${r*0.5} A ${s},${s} 0 0,1 0,${-r}`;
        }
        if (shape === "pentagon") {
            const r = radius * 1.0;
            const c1 = Math.cos(Math.PI * 2 / 5), s1 = Math.sin(Math.PI * 2 / 5);
            const c2 = Math.cos(Math.PI * 4 / 5), s2 = Math.sin(Math.PI * 4 / 5);
            return `M 0,${-r} L ${r*s1},${-r*c1} L ${r*s2},${-r*c2} L ${-r*s2},${-r*c2} L ${-r*s1},${-r*c1} Z`;
        }
        return "";
    }

    const circles = adminNodeGroup.selectAll(".node").data(adminNodes, d => d.id);
    circles.exit().remove();
    
    const circlesEnter = circles.enter()
        .append("path")
        .attr("class", "node")
        .style("stroke", "white")
        .style("stroke-width", 1)
        .on("mouseover", function(event, d) {
            d3.select(this).style("stroke", "#333").style("stroke-width", 2);
            adminTooltip.transition().duration(200).style("opacity", .9);
            adminTooltip.html(`<strong>${d.userName}</strong><br/>${d.course}<br/>Dept: ${d.dept}<br/>Disp: ${d.disp}`)
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 28) + "px");
        })
        .on("mouseout", function() {
            d3.select(this).style("stroke", "white").style("stroke-width", 1);
            adminTooltip.transition().duration(500).style("opacity", 0);
        });

    const allCircles = circlesEnter.merge(circles);
    allCircles
        .attr("d", d => getAdminShapePath(d.disp, d.radius))
        .style("fill", d => adminColorScale(d.dept));

    adminSimulation.nodes(adminNodes);
    adminSimulation.alpha(1).restart();
}

function splitTextIntoLines(text) {
    if (text.length <= 16) return [text];
    const words = text.split(" ");
    const lines = [];
    let currentLine = words[0];
    for (let i = 1; i < words.length; i++) {
        if (currentLine.length + words[i].length + 1 > 16) {
            lines.push(currentLine);
            currentLine = words[i];
        } else {
            currentLine += " " + words[i];
        }
    }
    lines.push(currentLine);
    return lines;
}

function calculateAdminFoci() {
    adminFoci = {};
    let categories = [];
    if (currentAdminVizMode === "disposition") {
        categories = allDispositions;
    } else {
        categories = [...new Set(adminNodes.map(n => n.dept))].sort();
    }
    const numCategories = categories.length;
    if (numCategories === 0) return; 

    // Horizontal oval parameters
    const xRadius = numCategories > 5 ? 380 : 250;
    const yRadius = numCategories > 5 ? 170 : 120;
    
    categories.forEach((cat, i) => {
        const angle = (i / numCategories) * 2 * Math.PI - (Math.PI / 2);
        adminFoci[cat] = {
            x: adminWidth / 2 + Math.cos(angle) * xRadius,
            y: adminHeight / 2 + Math.sin(angle) * yRadius
        };
    });

    const labels = adminLabelGroup.selectAll(".cluster-label").data(categories, d => d);
    labels.exit().remove();
    
    const labelsEnter = labels.enter()
        .append("text")
        .attr("class", "cluster-label")
        .attr("text-anchor", "middle")
        .style("fill", "var(--nido-dark)")
        .style("stroke", "white")
        .style("stroke-width", "5px")
        .style("paint-order", "stroke fill")
        .style("font-weight", "900")
        .style("opacity", 1)
        .style("font-size", "14px")
        .style("font-family", "sans-serif")
        .style("pointer-events", "none");
        
    const allLabels = labelsEnter.merge(labels);
    
    // Wrap text into tspans and vertically center
    allLabels.text(null);
    allLabels.each(function(d) {
        const el = d3.select(this);
        const lines = splitTextIntoLines(d);
        const lineHeight = 1.1; // em
        const yOffset = -(lines.length - 1) * lineHeight / 2 + 0.35;
        
        lines.forEach((line, i) => {
            el.append("tspan")
              .text(line)
              .attr("x", adminFoci[d].x)
              .attr("y", adminFoci[d].y)
              .attr("dy", `${yOffset + i * lineHeight}em`);
        });
    });
}

function adminTicked() {
    adminNodeGroup.selectAll(".node")
        .attr("transform", d => {
            // Keep nodes within SVG bounds (accounting for radius)
            d.x = Math.max(d.radius, Math.min(adminWidth - d.radius, d.x));
            d.y = Math.max(d.radius, Math.min(adminHeight - d.radius, d.y));
            return `translate(${d.x},${d.y})`;
        });
        
    // Calculate centroids so labels stick to the actual center of the clumps
    const sums = {};
    const counts = {};
    adminNodes.forEach(d => {
        const key = currentAdminVizMode === "disposition" ? d.disp : d.dept;
        if (!sums[key]) { sums[key] = {x:0, y:0}; counts[key] = 0; }
        sums[key].x += d.x;
        sums[key].y += d.y;
        counts[key]++;
    });
    
    adminLabelGroup.selectAll(".cluster-label").each(function(d) {
        let targetX = adminFoci[d].x;
        let targetY = adminFoci[d].y;
        if (counts[d]) {
            targetX = sums[d].x / counts[d];
            targetY = sums[d].y / counts[d];
        }
        // Update tspans x and y
        d3.select(this).selectAll("tspan")
            .attr("x", targetX)
            .attr("y", targetY);
    });
}

// CSV Export Logic
exportCsvBtn.addEventListener('click', () => {
    if (!currentFilteredData || currentFilteredData.length === 0) {
        alert("No data to export.");
        return;
    }
    
    // Build CSV Headers
    const headers = ["Status", "Teacher Name", "Teacher Email", "Department", "Course", "Syllabus Link", "Dispositions", "Evidence"];
    const rows = [headers.join(",")];
    
    currentFilteredData.forEach(entry => {
        const status = entry.isMissing ? "Missing" : "Entered";
        const tName = `"${(entry.userName || '').replace(/"/g, '""')}"`;
        const tEmail = `"${(entry.userEmail || '').replace(/"/g, '""')}"`;
        const dept = `"${(entry.department || '').replace(/"/g, '""')}"`;
        const course = `"${(entry.course || '').replace(/"/g, '""')}"`;
        const syllabus = `"${(entry.syllabusUrl || '').replace(/"/g, '""')}"`;
        const disp = `"${(entry.dispositions || []).join(', ')}"`;
        
        let evidenceStr = "";
        if (entry.evidenceMap) {
            const evArr = Object.entries(entry.evidenceMap)
                .filter(([_, val]) => val.trim() !== '')
                .map(([k, v]) => `${k}: ${v}`);
            evidenceStr = `"${evArr.join(" | ").replace(/"/g, '""')}"`;
        } else {
            evidenceStr = '""';
        }

        rows.push([status, tName, tEmail, dept, course, syllabus, disp, evidenceStr].join(","));
    });
    
    const csvContent = rows.join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `dispositions_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
