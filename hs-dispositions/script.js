import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { getFirestore, collection, addDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAFhiLa94zjP8IakzEd4nvtJOH-HRX10fI",
  authDomain: "nido-teaching-learning.firebaseapp.com",
  projectId: "nido-teaching-learning",
  storageBucket: "nido-teaching-learning.firebasestorage.app",
  messagingSenderId: "167104058821",
  appId: "1:167104058821:web:7ca1f5c91ddcb68df1a7ac"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

// Restrict Google Sign-In to the school's Google Workspace domain
provider.setCustomParameters({
    hd: 'nido.cl' // Change this if your domain is different!
});

let currentUser = null;

document.addEventListener('DOMContentLoaded', () => {
    const deptSelect = document.getElementById('department-select');
    const courseSelect = document.getElementById('course-select');
    const dispositionsContainer = document.getElementById('dispositions-container');
    const evidenceContainer = document.getElementById('evidence-container');
    const saveBtn = document.getElementById('save-btn');
    const authSection = document.getElementById('auth-section');
    
    // Auth State Observer
    onAuthStateChanged(auth, (user) => {
        if (user) {
            currentUser = user;
            authSection.innerHTML = `
                <p class="text-nido-dark font-medium">Signed in as: <strong>${user.displayName}</strong> (${user.email}) 
                <button id="sign-out-btn" class="btn-nido-red" style="margin-left: 1rem; padding: 0.25rem 0.75rem; font-size: 0.9rem;">Sign Out</button></p>
                <hr style="border: 0; border-top: 1px solid #eee; margin: 1rem 0;">
            `;
            document.getElementById('sign-out-btn').addEventListener('click', () => signOut(auth));
        } else {
            currentUser = null;
            authSection.innerHTML = `
                <p class="text-nido-dark font-medium">Not signed in 
                <button id="sign-in-btn" class="btn-nido-blue" style="margin-left: 1rem;">Sign in with Google</button></p>
                <hr style="border: 0; border-top: 1px solid #eee; margin: 1rem 0;">
            `;
            document.getElementById('sign-in-btn').addEventListener('click', () => {
                signInWithPopup(auth, provider).catch(error => {
                    console.error("Auth error:", error);
                    alert("Error signing in: " + error.message);
                });
            });
        }
    });

    let coursesData = [];
    
    // Core Dispositions based on nido_skills_dispositions.txt
    const dispositions = [
        { name: "Empathy", desc: "Emotional Awareness, Deep Listening, Perspective-Taking" },
        { name: "Reflection", desc: "Learning from Experience, Metacognition, Using Feedback" },
        { name: "Curiosity", desc: "Inquisitive, Navigating Ambiguity, Engaged" },
        { name: "Perseverance", desc: "Optimism, Self-Efficacy, Tenacity" },
        { name: "Self-Direction", desc: "Setting goals, staying organized, seeking help" }
    ];

    // Load course data from JSON
    fetch('course_catalog.json')
        .then(response => response.json())
        .then(data => {
            coursesData = data;
            populateDepartments(data);
        })
        .catch(err => console.error("Error loading course catalog:", err));

    // Render Dispositions UI
    dispositions.forEach(disp => {
        const card = document.createElement('div');
        card.className = 'disp-card';
        card.style.flexDirection = 'column';
        card.style.alignItems = 'flex-start';
        
        const headerDiv = document.createElement('label');
        headerDiv.style.display = 'flex';
        headerDiv.style.alignItems = 'center';
        headerDiv.style.gap = '1rem';
        headerDiv.style.cursor = 'pointer';
        headerDiv.style.width = '100%';
        headerDiv.htmlFor = `disp-${disp.name.toLowerCase()}`;
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = `disp-${disp.name.toLowerCase()}`;
        checkbox.value = disp.name;
        checkbox.className = 'disp-checkbox';

        const textContainer = document.createElement('div');
        const title = document.createElement('div');
        title.className = 'font-bold text-nido-blue';
        title.style.fontSize = '1.1rem';
        title.innerText = disp.name;
        
        const desc = document.createElement('div');
        desc.className = 'text-nido-dark';
        desc.style.fontSize = '0.85rem';
        desc.style.marginTop = '0.25rem';
        desc.innerText = disp.desc;

        textContainer.appendChild(title);
        textContainer.appendChild(desc);

        headerDiv.appendChild(checkbox);
        headerDiv.appendChild(textContainer);
        
        const evidenceContainer = document.createElement('div');
        evidenceContainer.style.display = 'none';
        evidenceContainer.style.width = '100%';
        evidenceContainer.style.marginTop = '1rem';
        
        const evidenceLabel = document.createElement('label');
        evidenceLabel.className = 'form-label text-nido-blue';
        evidenceLabel.innerText = `Evidence for ${disp.name}:`;
        evidenceLabel.style.fontSize = '0.9rem';
        
        const evidenceInput = document.createElement('textarea');
        evidenceInput.className = 'form-control evidence-input';
        evidenceInput.id = `evidence-${disp.name.toLowerCase()}`;
        evidenceInput.rows = 2;
        evidenceInput.placeholder = `How might you collect evidence for ${disp.name}?`;
        
        evidenceContainer.appendChild(evidenceLabel);
        evidenceContainer.appendChild(evidenceInput);

        checkbox.addEventListener('change', (e) => {
            evidenceContainer.style.display = e.target.checked ? 'block' : 'none';
        });

        card.appendChild(headerDiv);
        card.appendChild(evidenceContainer);
        dispositionsContainer.appendChild(card);
    });

    function populateDepartments(data) {
        // Extract unique departments
        const departments = [...new Set(data.map(item => item.department))].filter(Boolean).sort();
        departments.forEach(dept => {
            const option = document.createElement('option');
            option.value = dept;
            option.textContent = dept;
            deptSelect.appendChild(option);
        });
    }

    deptSelect.addEventListener('change', (e) => {
        const selectedDept = e.target.value;
        
        // Reset courses dropdown
        courseSelect.innerHTML = '<option value="">-- Select a Course --</option>'; 
        
        if (selectedDept) {
            courseSelect.disabled = false;
            // Filter courses by department
            const filteredCourses = coursesData.filter(item => item.department === selectedDept);
            
            // Sort courses alphabetically by name
            filteredCourses.sort((a, b) => a.course_name.localeCompare(b.course_name));
            
            filteredCourses.forEach(course => {
                const option = document.createElement('option');
                option.value = course.course_name; 
                option.textContent = course.course_name;
                courseSelect.appendChild(option);
            });
        } else {
            courseSelect.disabled = true;
        }
    });

    saveBtn.addEventListener('click', async () => {
        if (!currentUser) {
            alert("Please sign in with Google before saving your selections.");
            return;
        }

        const department = deptSelect.value;
        const course = courseSelect.value;
        
        const selectedDispositions = [];
        const evidenceMap = {};
        
        document.querySelectorAll('.disp-checkbox').forEach(cb => {
            if (cb.checked) {
                selectedDispositions.push(cb.value);
                const evInput = document.getElementById(`evidence-${cb.value.toLowerCase()}`);
                evidenceMap[cb.value] = evInput ? evInput.value : "";
            }
        });

        if (!department) {
            alert("Please select a department.");
            return;
        }
        if (selectedDispositions.length === 0) {
            alert("Please select at least one disposition.");
            return;
        }

        const selectionData = {
            department,
            course: course || null,
            dispositions: selectedDispositions,
            evidenceMap,
            timestamp: new Date().toISOString(),
            userEmail: currentUser.email,
            userName: currentUser.displayName
        };

        try {
            // Write data to Firestore
            const docRef = await addDoc(collection(db, "selections"), selectionData);
            console.log("Document written with ID: ", docRef.id);
            alert("Selection saved to Firebase successfully!");
            
            // Note: We don't need to manually add the node to D3 anymore,
            // because the onSnapshot listener below will automatically pick up the new document!
        } catch (error) {
            console.error("Error adding document: ", error);
            alert("Error saving data. Make sure Firebase is properly configured and Firestore rules allow writes.");
        }
    });

    // --- D3 VISUALIZATION (LIVE FIREBASE DATA) ---
    
    const width = document.getElementById('d3-container').clientWidth || 800;
    const height = 500;
    const tooltip = d3.select("#d3-tooltip");
    const groupBySelect = document.getElementById('group-by-select');
    
    // Clear the placeholder text
    document.getElementById('d3-container').innerHTML = '';
    
    const svg = d3.select("#d3-container")
        .append("svg")
        .attr("width", "100%")
        .attr("height", height)
        .attr("viewBox", `0 0 ${width} ${height}`);

    const labelGroup = svg.append("g").attr("class", "labels");
    const nodeGroup = svg.append("g").attr("class", "nodes");

    const colorScale = d3.scaleOrdinal(d3.schemeTableau10);

    let nodes = [];
    let currentMode = "disposition"; // "disposition" or "department"
    let foci = {};

    const simulation = d3.forceSimulation()
        .force("charge", d3.forceManyBody().strength(-20))
        .force("collide", d3.forceCollide().radius(d => d.radius + 2).iterations(2))
        .force("x", d3.forceX(d => getFocalPoint(d).x).strength(0.12))
        .force("y", d3.forceY(d => getFocalPoint(d).y).strength(0.12))
        .on("tick", ticked);

    // Listen to real-time updates from Firestore
    onSnapshot(collection(db, "selections"), (snapshot) => {
        nodes = []; // reset nodes array
        
        snapshot.forEach((doc) => {
            const data = doc.data();
            let deptShort = data.department ? data.department.replace(" (International)", "") : "Unknown";
            
            if (data.dispositions && Array.isArray(data.dispositions)) {
                data.dispositions.forEach(disp => {
                    nodes.push({
                        id: `${doc.id}-${disp}`, // Unique ID per disposition per document
                        dept: deptShort,
                        disp: disp,
                        radius: 18,
                        userName: data.userName,
                        course: data.course
                    });
                });
            }
        });
        
        updateVisualization();
    });

    function getFocalPoint(d) {
        const key = currentMode === "disposition" ? d.disp : d.dept;
        return foci[key] || { x: width / 2, y: height / 2 };
    }

    function calculateFoci() {
        foci = {};
        let categories = [];
        
        if (currentMode === "disposition") {
            categories = dispositions.map(d => d.name);
        } else {
            // Get unique departments from current nodes
            categories = [...new Set(nodes.map(n => n.dept))].sort();
        }

        const numCategories = categories.length;
        if (numCategories === 0) return; // wait until data loads

        const centerRadius = numCategories > 5 ? 180 : 150;
        
        categories.forEach((cat, i) => {
            const angle = (i / numCategories) * 2 * Math.PI - (Math.PI / 2);
            foci[cat] = {
                x: width / 2 + Math.cos(angle) * centerRadius,
                y: height / 2 + Math.sin(angle) * centerRadius
            };
        });

        // Update labels
        const labels = labelGroup.selectAll(".cluster-label").data(categories, d => d);
        
        labels.exit().remove();
        
        labels.enter()
            .append("text")
            .attr("class", "cluster-label")
            .merge(labels)
            .text(d => d)
            .transition().duration(1000)
            .attr("x", d => foci[d].x)
            .attr("y", d => foci[d].y - 50)
            .attr("text-anchor", "middle")
            .style("fill", "var(--nido-blue)")
            .style("font-weight", "bold")
            .style("opacity", 0.7)
            .style("font-size", "14px")
            .style("font-family", "var(--font-gotham), sans-serif");
    }

    function updateVisualization() {
        calculateFoci();

        let nodeElements = nodeGroup.selectAll("circle").data(nodes, d => d.id);
        
        nodeElements.exit().remove();
        
        const newNodes = nodeElements.enter()
            .append("circle")
            .attr("r", d => d.radius)
            .style("fill", d => colorScale(d.dept))
            .style("stroke", "#fff")
            .style("stroke-width", 2)
            .call(d3.drag()
                .on("start", dragstarted)
                .on("drag", dragged)
                .on("end", dragended))
            .on("mouseover", (event, d) => {
                tooltip.style("opacity", 1)
                       .html(`
                            <strong>${d.dept}</strong><br/>
                            ${d.course ? `<em>${d.course}</em><br/>` : ''}
                            Disposition: ${d.disp}<br/>
                            <span style="font-size: 0.85rem; color: #ccc;">By: ${d.userName || 'Anonymous'}</span>
                        `);
                d3.select(event.currentTarget).style("stroke", "var(--nido-dark-gray)").style("stroke-width", 3);
            })
            .on("mousemove", (event) => {
                tooltip.style("left", (event.pageX + 10) + "px")
                       .style("top", (event.pageY - 28) + "px");
            })
            .on("mouseout", (event) => {
                tooltip.style("opacity", 0);
                d3.select(event.currentTarget).style("stroke", "#fff").style("stroke-width", 2);
            });

        // Update forces
        simulation.nodes(nodes);
        simulation.force("x").initialize(nodes);
        simulation.force("y").initialize(nodes);
        simulation.alpha(1).restart();
    }

    function ticked() {
        nodeGroup.selectAll("circle")
            .attr("cx", d => d.x = Math.max(d.radius, Math.min(width - d.radius, d.x)))
            .attr("cy", d => d.y = Math.max(d.radius, Math.min(height - d.radius, d.y)));
    }

    function dragstarted(event, d) {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
    }
    
    function dragged(event, d) {
        d.fx = event.x;
        d.fy = event.y;
    }
    
    function dragended(event, d) {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
    }

    // Toggle Grouping
    groupBySelect.addEventListener('change', (e) => {
        currentMode = e.target.value;
        updateVisualization();
    });
});
