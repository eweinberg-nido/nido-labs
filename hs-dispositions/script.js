import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { getFirestore, collection, addDoc, onSnapshot, doc, updateDoc, deleteDoc, query, where, setDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

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
let currentEditingDocId = null;

// Helper to reset the form
function resetForm() {
    currentEditingDocId = null;
    document.getElementById('form-title').innerText = "New Course Set-up";
    document.getElementById('department-select').value = "";
    const courseSelect = document.getElementById('course-select');
    courseSelect.innerHTML = '<option value="">-- Select a Course --</option>';
    courseSelect.disabled = true;
    
    document.querySelectorAll('.disp-checkbox').forEach(cb => {
        cb.checked = false;
        // trigger change event to hide containers
        cb.dispatchEvent(new Event('change'));
    });
    
    document.querySelectorAll('.evidence-input').forEach(input => {
        input.value = "";
    });
    
    document.getElementById('selection-form').style.display = 'block';
    window.scrollTo({ top: document.getElementById('selection-form').offsetTop, behavior: 'smooth' });
}

document.addEventListener('DOMContentLoaded', () => {
    const authSection = document.getElementById('auth-section');
    const myCoursesSection = document.getElementById('my-courses-section');
    const myCoursesList = document.getElementById('my-courses-list');
    const selectionForm = document.getElementById('selection-form');
    const newCourseBtn = document.getElementById('new-course-btn');
    const cancelBtn = document.getElementById('cancel-btn');
    
    const deptSelect = document.getElementById('department-select');
    const courseSelect = document.getElementById('course-select');
    const dispositionsContainer = document.getElementById('dispositions-container');
    const saveBtn = document.getElementById('save-btn');

    newCourseBtn.addEventListener('click', resetForm);
    
    cancelBtn.addEventListener('click', () => {
        selectionForm.style.display = 'none';
        currentEditingDocId = null;
    });

    onAuthStateChanged(auth, (user) => {
        if (user) {
            // User is signed in
            currentUser = user;
            authSection.innerHTML = `
                <p class="text-nido-dark font-medium">Signed in as <strong>${user.displayName}</strong> (${user.email}) 
                <button id="sign-out-btn" class="btn-nido-blue" style="margin-left: 1rem; background-color: #6c757d;">Sign Out</button></p>
                <hr style="border: 0; border-top: 1px solid #eee; margin: 1rem 0;">
            `;
            
            myCoursesSection.style.display = 'block';
            selectionForm.style.display = 'none'; // hidden until they click Add or Edit

            // Save user to 'users' collection
            setDoc(doc(db, "users", user.uid), {
                uid: user.uid,
                email: user.email,
                displayName: user.displayName,
                lastLogin: new Date().toISOString()
            }, { merge: true }).catch(err => console.error("Error saving user profile:", err));

            document.getElementById('sign-out-btn').addEventListener('click', () => {
                signOut(auth).then(() => {
                    currentUser = null;
                    resetForm();
                });
            });
            
            // Fetch user's hs-dispositions
            const q = query(collection(db, "hs-dispositions"), where("userEmail", "==", user.email));
            onSnapshot(q, (snapshot) => {
                myCoursesList.innerHTML = '';
                if (snapshot.empty) {
                    myCoursesList.innerHTML = '<p class="text-nido-dark" style="font-size: 0.9rem;">You have not added any of your courses yet.</p>';
                    return;
                }
                
                snapshot.forEach((docSnap) => {
                    const data = docSnap.data();
                    const li = document.createElement('div');
                    li.style.padding = '0.75rem';
                    li.style.background = '#fff';
                    li.style.borderRadius = '4px';
                    li.style.border = '1px solid #eaeaea';
                    li.style.display = 'flex';
                    li.style.justifyContent = 'space-between';
                    li.style.alignItems = 'center';
                    
                    const titleText = data.course ? `${data.course} (${data.department})` : `${data.department} (General)`;
                    
                    li.innerHTML = `
                        <span class="font-medium text-nido-blue">${titleText}</span>
                        <div>
                            <button class="edit-btn btn-nido-blue" style="padding: 0.25rem 0.75rem; font-size: 0.85rem; margin-right: 0.5rem; background-color: #6c757d;">Edit</button>
                            <button class="delete-btn btn-nido-red" style="padding: 0.25rem 0.75rem; font-size: 0.85rem;">Delete</button>
                        </div>
                    `;
                    
                    li.querySelector('.edit-btn').addEventListener('click', () => editEntry(docSnap.id, data));
                    li.querySelector('.delete-btn').addEventListener('click', async () => {
                        if (confirm(`Are you sure you want to delete your configuration for ${titleText}?`)) {
                            await deleteDoc(doc(db, "hs-dispositions", docSnap.id));
                            if (currentEditingDocId === docSnap.id) {
                                resetForm();
                            }
                        }
                    });
                    
                    myCoursesList.appendChild(li);
                });
            });
        } else {
            // User is signed out
            currentUser = null;
            authSection.innerHTML = `
                <p class="text-nido-dark font-medium">Sign in to get started!<button id="sign-in-btn" class="btn-nido-blue" style="margin-left: 1rem;">Sign in with Google</button></p>
                <hr style="border: 0; border-top: 1px solid #eee; margin: 1rem 0;">
            `;
            
            myCoursesSection.style.display = 'none';
            selectionForm.style.display = 'none';

            document.getElementById('sign-in-btn').addEventListener('click', () => {
                signInWithPopup(auth, provider).catch(error => {
                    console.error("Error signing in: ", error);
                    alert("Error signing in. Did you use your school email?");
                });
            });
        }
    });

    function editEntry(id, data) {
        resetForm(); // clear first
        currentEditingDocId = id;
        document.getElementById('form-title').innerText = "1. Select Context (Editing)";
        
        deptSelect.value = data.department;
        deptSelect.dispatchEvent(new Event('change'));
        
        // Wait for course dropdown to populate
        setTimeout(() => {
            if (data.course) {
                courseSelect.value = data.course;
            }
            
            if (data.dispositions && Array.isArray(data.dispositions)) {
                data.dispositions.forEach(dispName => {
                    const cb = document.getElementById(`disp-${dispName.toLowerCase()}`);
                    if (cb) {
                        cb.checked = true;
                        cb.dispatchEvent(new Event('change'));
                        
                        // Populate evidence if exists
                        const evInput = document.getElementById(`evidence-${dispName.toLowerCase()}`);
                        if (evInput && data.evidenceMap && data.evidenceMap[dispName]) {
                            evInput.value = data.evidenceMap[dispName];
                        }
                    }
                });
            }
            
            window.scrollTo({ top: selectionForm.offsetTop, behavior: 'smooth' });
        }, 50);
    }

    let coursesData = [];
    
    // Core Dispositions based on nido_skills_dispositions.txt
    const dispositions = [
        { 
            name: "Empathy",
            label: "Empathy / Empatía",
            descriptor: { 
                en: "Shows kindness and uses respectful language and active listening to consider all perspectives in the learning community.", 
                es: "Muestra amabilidad y utiliza un lenguaje respetuoso y escucha activa para considerar todas las perspectivas en la comunidad de aprendizaje." 
            },
            lookFors: [
                { area: { en: "Emotional Awareness", es: "Conciencia Emocional" }, text: { en: "Applies emotional awareness to help solve a problem or understand an issue", es: "Aplica la conciencia emocional para ayudar a resolver un problema o comprender un asunto" } },
                { area: { en: "Deep Listening", es: "Escucha Activa" }, text: { en: "Validates the message and the emotions/perspectives behind them to make the communicator feel valued", es: "Valida el mensaje y las emociones/perspectivas detrás de él para que el comunicador se sienta valorado" } },
                { area: { en: "Perspective-Taking", es: "Toma de Perspectiva" }, text: { en: "Evaluates and applies different perspectives to reach common ground in complex situations related to inequities or justice", es: "Evalúa y aplica diferentes perspectivas para llegar a un terreno común en situaciones complejas relacionadas con desigualdades o justicia" } }
            ]
        },
        { 
            name: "Reflection",
            label: "Reflection / Reflexión",
            descriptor: { 
                en: "Uses self-assessment and feedback to celebrate successes and set goals. Understands how they learn best and chooses the right strategies to help them succeed.", 
                es: "Utiliza la autoevaluación y la retroalimentación para celebrar los éxitos y establecer metas. Entiende cómo aprende mejor y elige las estrategias adecuadas para tener éxito." 
            },
            lookFors: [
                { area: { en: "Learning from Experience", es: "Aprender de la Experiencia" }, text: { en: "Chooses a path to success and goal attainment based on self-awareness and reflections of past learning", es: "Elige un camino hacia el éxito y el logro de metas basado en la autoconciencia y reflexiones de aprendizajes pasados" } },
                { area: { en: "Metacognition", es: "Metacognición" }, text: { en: "Applies a range of learning tools and processes independently and purposefully based on awareness of self as a learner", es: "Aplica una variedad de herramientas y procesos de aprendizaje de manera independiente y con un propósito, basado en la conciencia de sí mismo como estudiante" } },
                { area: { en: "Using Feedback", es: "Uso de Retroalimentación" }, text: { en: "Synthesizes feedback from multiple sources and proactively applies strategies to address areas of strength and need as a learner", es: "Sintetiza la retroalimentación de múltiples fuentes y aplica proactivamente estrategias para abordar áreas de fortaleza y necesidad como aprendiz" } }
            ]
        },
        { 
            name: "Curiosity",
            label: "Curiosity / Curiosidad",
            descriptor: { 
                en: "Asks questions, explores new ideas, and is invested in finding answers to increase personal understanding.", 
                es: "Hace preguntas, explora nuevas ideas y se invierte en encontrar respuestas para aumentar su comprensión personal." 
            },
            lookFors: [
                { area: { en: "Inquisitive", es: "Inquisitivo" }, text: { en: "Formulates rich, thought-provoking questions that are clearly grounded in the area of focus, that guide investigation, and reveals critical thinking skills and prior knowledge", es: "Formula preguntas ricas y estimulantes que están claramente fundamentadas en el área de enfoque, que guían la investigación y revelan habilidades de pensamiento crítico y conocimientos previos" } },
                { area: { en: "Navigating Ambiguity", es: "Navegando la Ambigüedad" }, text: { en: "Knows when to “unlearn” past thinking as a way to address new challenges flexibly", es: "Sabe cuándo “desaprender” pensamientos pasados como una forma de abordar nuevos desafíos con flexibilidad" } },
                { area: { en: "Engaged", es: "Comprometido" }, text: { en: "Tackles challenging dilemmas that don’t have obvious solutions, despite the potential for failure", es: "Aborda dilemas desafiantes que no tienen soluciones obvias, a pesar del riesgo potencial de fracaso" } }
            ]
        },
        { 
            name: "Perseverance",
            label: "Perseverance / Perseverancia",
            descriptor: { 
                en: "Demonstrates a continued effort, and a positive attitude towards challenges.", 
                es: "Demuestra un esfuerzo continuo y una actitud positiva frente a los desafíos." 
            },
            lookFors: [
                { area: { en: "Optimism", es: "Optimismo" }, text: { en: "Maintains an open mind and remains positive in the face of challenges", es: "Mantiene una mente abierta y se mantiene positivo ante los desafíos" } },
                { area: { en: "Self-Efficacy", es: "Autoeficacia" }, text: { en: "Independently manages the emotional and organizational elements of complex learning challenges and embodies a belief that he/she can accomplish a task", es: "Maneja de forma independiente los elementos emocionales y organizativos de desafíos de aprendizaje complejos y encarna la creencia de que puede lograr una tarea" } },
                { area: { en: "Tenacity", es: "Tenacidad" }, text: { en: "Perseveres through longer projects and experiences, taking manageable risks as part of the learning process", es: "Persevera a través de proyectos y experiencias más largas, asumiendo riesgos manejables como parte del proceso de aprendizaje" } }
            ]
        },
        { 
            name: "Self-Direction",
            label: "Self-Direction / Autodirección",
            descriptor: { 
                en: "Takes initiative to lead their own learning by being organised, monitoring progress and managing time and materials independently.", 
                es: "Toma la iniciativa de dirigir su propio aprendizaje organizándose, monitoreando su progreso y administrando el tiempo y los materiales de manera independiente." 
            },
            lookFors: [
                { area: { en: "Initiative", es: "Iniciativa" }, text: { en: "Applies awareness of own strengths and weaknesses to proactively contribute to personal and larger causes", es: "Aplica el conocimiento de sus propias fortalezas y debilidades para contribuir de forma proactiva a causas personales y mayores" } },
                { area: { en: "Conscious Planning", es: "Planificación Consciente" }, text: { en: "Monitors progress towards goals using a variety of evidence and adjusts planning as needed", es: "Monitorea el progreso hacia las metas utilizando una variedad de evidencia y ajusta la planificación según sea necesario" } },
                { area: { en: "Task and Resource Management", es: "Gestión de Recursos" }, text: { en: "Flexibly selects, adapts or develops a range of resources and appropriate strategies to improve learning", es: "Selecciona, adapta o desarrolla de manera flexible una variedad de recursos y estrategias apropiadas para mejorar el aprendizaje" } }
            ]
        }
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
    dispositionsContainer.innerHTML = '';
    
    dispositions.forEach(disp => {
        const card = document.createElement('div');
        card.className = 'disp-card';
        card.style.flexDirection = 'column';
        card.style.alignItems = 'flex-start';
        
        const headerDiv = document.createElement('label');
        headerDiv.style.display = 'flex';
        headerDiv.style.alignItems = 'flex-start'; 
        headerDiv.style.gap = '1rem';
        headerDiv.style.cursor = 'pointer';
        headerDiv.style.width = '100%';
        headerDiv.htmlFor = `disp-${disp.name.toLowerCase()}`;
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = `disp-${disp.name.toLowerCase()}`;
        checkbox.value = disp.name; // Keep English key for DB and D3
        checkbox.className = 'disp-checkbox';
        checkbox.style.marginTop = '0.4rem'; 

        const textContainer = document.createElement('div');
        const title = document.createElement('div');
        title.className = 'font-bold text-nido-blue';
        title.style.fontSize = '1.2rem';
        title.innerText = disp.label;
        
        const descriptor = document.createElement('div');
        descriptor.className = 'text-nido-dark';
        descriptor.style.fontSize = '0.9rem';
        descriptor.style.marginTop = '0.25rem';
        descriptor.innerHTML = `
            <span class="lang-en">${disp.descriptor.en}</span>
            <span class="lang-es">${disp.descriptor.es}</span>
        `;

        textContainer.appendChild(title);
        textContainer.appendChild(descriptor);

        headerDiv.appendChild(checkbox);
        headerDiv.appendChild(textContainer);
        
        const expandedContainer = document.createElement('div');
        expandedContainer.style.display = 'none';
        expandedContainer.style.width = '100%';
        expandedContainer.style.marginTop = '1rem';
        expandedContainer.style.paddingTop = '1rem';
        expandedContainer.style.borderTop = '1px solid #eaeaea';

        const lookForsTitle = document.createElement('div');
        lookForsTitle.className = 'font-bold text-nido-blue';
        lookForsTitle.style.marginBottom = '0.5rem';
        lookForsTitle.innerHTML = `<span class="lang-en">Signals:</span><span class="lang-es">Señales:</span>`;
        expandedContainer.appendChild(lookForsTitle);

        const lookForsList = document.createElement('ul');
        lookForsList.style.paddingLeft = '1.5rem';
        lookForsList.style.marginTop = '0';
        lookForsList.style.fontSize = '0.85rem';
        lookForsList.style.listStyleType = 'disc';
        lookForsList.style.listStylePosition = 'outside';
        lookForsList.style.marginLeft = '1rem';
        
        disp.lookFors.forEach(lf => {
            const li = document.createElement('li');
            li.style.marginBottom = '0.5rem';
            li.innerHTML = `
                <span class="lang-en"><strong>${lf.area.en}:</strong> ${lf.text.en}</span>
                <span class="lang-es"><strong>${lf.area.es}:</strong> ${lf.text.es}</span>
            `;
            lookForsList.appendChild(li);
        });
        expandedContainer.appendChild(lookForsList);
        
        const evidenceLabel = document.createElement('label');
        evidenceLabel.className = 'form-label text-nido-blue';
        evidenceLabel.innerHTML = `
            <span class="lang-en">Evidence for ${disp.label}:</span>
            <span class="lang-es">Evidencia para ${disp.label}:</span>
        `;
        evidenceLabel.style.fontSize = '0.9rem';
        evidenceLabel.style.marginTop = '1rem';
        
        const evidenceInput = document.createElement('textarea');
        evidenceInput.className = 'form-control evidence-input';
        evidenceInput.id = `evidence-${disp.name.toLowerCase()}`;
        evidenceInput.rows = 3;
        evidenceInput.placeholder = `How might you collect evidence of this within the course? / ¿Cómo podrías recopilar evidencia?`;
        
        expandedContainer.appendChild(evidenceLabel);
        expandedContainer.appendChild(evidenceInput);

        checkbox.addEventListener('change', (e) => {
            expandedContainer.style.display = e.target.checked ? 'block' : 'none';
        });

        card.appendChild(headerDiv);
        card.appendChild(expandedContainer);
        dispositionsContainer.appendChild(card);
    });

    // Language Toggle Listeners
    document.querySelectorAll('.lang-select').forEach(select => {
        select.addEventListener('change', (e) => {
            const lang = e.target.value;
            // Sync all language dropdowns
            document.querySelectorAll('.lang-select').forEach(s => s.value = lang);
            // Toggle body class
            if (lang === 'es') {
                document.body.classList.add('show-es');
            } else {
                document.body.classList.remove('show-es');
            }
        });
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
            alert("Please sign in with Google before saving your hs-dispositions.");
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
            if (currentEditingDocId) {
                // Update existing document
                await updateDoc(doc(db, "hs-dispositions", currentEditingDocId), selectionData);
                console.log("Document updated with ID: ", currentEditingDocId);
                alert("Course configuration updated successfully!");
                resetForm();
                selectionForm.style.display = 'none';
            } else {
                // Add new document
                const docRef = await addDoc(collection(db, "hs-dispositions"), selectionData);
                console.log("Document written with ID: ", docRef.id);
                alert("New course configuration saved successfully!");
                resetForm();
                selectionForm.style.display = 'none';
            }
        } catch (error) {
            console.error("Error saving document: ", error);
            alert("Error saving data. Make sure Firebase is properly configured and Firestore rules allow writes.");
        }
    });

    const generateTestDataBtn = document.getElementById('generate-test-data-btn');
    if (generateTestDataBtn) {
        generateTestDataBtn.addEventListener('click', async () => {
            if (!currentUser) return alert("Please sign in first.");
            if (!coursesData || coursesData.length === 0) return alert("Course catalog not loaded yet.");
            
            const numToGenerate = 25;
            const allDispositions = ["Empathy", "Reflection", "Curiosity", "Perseverance", "Self-Direction"];
            
            generateTestDataBtn.innerText = "Generating...";
            generateTestDataBtn.disabled = true;

            try {
                for (let i = 0; i < numToGenerate; i++) {
                    const randCourse = coursesData[Math.floor(Math.random() * coursesData.length)];
                    const numDisp = Math.floor(Math.random() * 3) + 1;
                    const shuffled = allDispositions.sort(() => 0.5 - Math.random());
                    const selectedDisp = shuffled.slice(0, numDisp);
                    
                    const testData = {
                        department: randCourse.department,
                        course: randCourse.course_name,
                        dispositions: selectedDisp,
                        evidenceMap: {}, 
                        timestamp: new Date().toISOString(),
                        userEmail: currentUser.email,
                        userName: currentUser.displayName
                    };
                    
                    await addDoc(collection(db, "hs-dispositions"), testData);
                }
                alert("Successfully added 25 dummy courses!");
            } catch (e) {
                console.error("Error generating test data:", e);
                alert("Error adding dummy data.");
            }
            
            generateTestDataBtn.innerText = "Generate Test Data";
            generateTestDataBtn.disabled = false;
        });
    }

    // --- D3 VISUALIZATION (LIVE FIREBASE DATA) ---
    
    const width = document.getElementById('d3-container').clientWidth || 800;
    const height = 500;
    const tooltip = d3.select("#d3-tooltip");
    const groupBySelect = document.getElementById('group-by-select');
    const chartTypeSelect = document.getElementById('chart-type-select');
    
    document.getElementById('d3-container').innerHTML = '';
    
    const svg = d3.select("#d3-container")
        .append("svg")
        .attr("width", "100%")
        .attr("height", height)
        .attr("viewBox", `0 0 ${width} ${height}`);

    const nodeGroup = svg.append("g").attr("class", "nodes");
    const labelGroup = svg.append("g").attr("class", "labels");
    const barGroup = svg.append("g").attr("class", "bars").style("display", "none");

    const colorScale = d3.scaleOrdinal([
        "#1f77b4", "#aec7e8", "#ff7f0e", "#ffbb78", "#2ca02c",
        "#98df8a", "#d62728", "#ff9896", "#9467bd", "#c5b0d5",
        "#8c564b", "#c49c94", "#e377c2", "#f7b6d2", "#7f7f7f",
        "#c7c7c7", "#bcbd22", "#dbdb8d", "#17becf", "#9edae5"
    ]);

    let nodes = [];
    let currentMode = "disposition"; // "disposition" or "department"
    let currentChart = "bubble"; // "bubble" or "bar"
    let foci = {};

    const simulation = d3.forceSimulation()
        .force("charge", d3.forceManyBody().strength(-20))
        .force("collide", d3.forceCollide().radius(d => d.radius + 2).iterations(2))
        .force("x", d3.forceX(d => getFocalPoint(d).x).strength(0.12))
        .force("y", d3.forceY(d => getFocalPoint(d).y).strength(0.12))
        .on("tick", ticked);

    function getUmbrellaDept(dept) {
        if (!dept) return "Unknown";
        const arts = ["Visual Arts", "Visual Art", "Theater", "Music", "Digital Film and production", "Digital Design & Film"];
        if (arts.some(a => dept.toLowerCase().includes(a.toLowerCase()))) return "Arts";
        
        let cleaned = dept.replace(" (International)", "").replace(" National Plan", "");
        return cleaned;
    }

    onSnapshot(collection(db, "hs-dispositions"), (snapshot) => {
        nodes = []; 
        snapshot.forEach((doc) => {
            const data = doc.data();
            let deptShort = getUmbrellaDept(data.department);
            
            if (data.dispositions && Array.isArray(data.dispositions)) {
                data.dispositions.forEach(disp => {
                    nodes.push({
                        id: `${doc.id}-${disp}`, 
                        dept: deptShort,
                        disp: disp,
                        radius: 10,
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
            categories = [...new Set(nodes.map(n => n.dept))].sort();
        }

        const numCategories = categories.length;
        if (numCategories === 0) return; 

        const centerRadius = numCategories > 5 ? 180 : 150;
        
        categories.forEach((cat, i) => {
            const angle = (i / numCategories) * 2 * Math.PI - (Math.PI / 2);
            foci[cat] = {
                x: width / 2 + Math.cos(angle) * centerRadius,
                y: height / 2 + Math.sin(angle) * centerRadius
            };
        });

        const labels = labelGroup.selectAll(".cluster-label").data(categories, d => d);
        labels.exit().remove();
        labels.enter()
            .append("text")
            .attr("class", "cluster-label")
            .merge(labels)
            .text(d => d)
            .transition().duration(1000)
            .attr("x", d => foci[d].x)
            .attr("y", d => foci[d].y)
            .attr("dy", "0.35em")
            .attr("text-anchor", "middle")
            .style("fill", "var(--nido-dark)")
            .style("stroke", "white")
            .style("stroke-width", "5px")
            .style("paint-order", "stroke fill")
            .style("font-weight", "900")
            .style("opacity", 1)
            .style("font-size", "16px")
            .style("font-family", "var(--font-gotham), sans-serif");
    }

    const dispositionShapes = {
        "Empathy": "circle",
        "Reflection": "square",
        "Curiosity": "triangle",
        "Perseverance": "rounded_triangle",
        "Self-Direction": "pentagon"
    };

    function getShapePath(disp, radius) {
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

    function renderBarChart() {
        barGroup.selectAll("*").remove();

        if (nodes.length === 0) return;

        const mainGroup = currentMode === "disposition" ? d => d.disp : d => d.dept;
        const subGroup = currentMode === "disposition" ? d => d.dept : d => d.disp;

        const mainKeys = [...new Set(nodes.map(mainGroup))].sort();
        const subKeys = [...new Set(nodes.map(subGroup))].sort();

        const rollups = d3.rollup(nodes, v => v.length, mainGroup, subGroup);
        
        const data = mainKeys.map(mk => {
            const row = { category: mk };
            subKeys.forEach(sk => {
                row[sk] = rollups.get(mk)?.get(sk) || 0;
            });
            row.total = d3.sum(subKeys, sk => row[sk]);
            return row;
        });

        const margin = { top: 40, right: 120, bottom: 100, left: 60 };
        const innerWidth = width - margin.left - margin.right;
        const innerHeight = height - margin.top - margin.bottom;

        const x = d3.scaleBand()
            .domain(mainKeys)
            .range([0, innerWidth])
            .padding(0.2);

        const y = d3.scaleLinear()
            .domain([0, d3.max(data, d => d.total)]).nice()
            .range([innerHeight, 0]);

        const stackedData = d3.stack().keys(subKeys)(data);

        const g = barGroup.append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        g.append("g")
            .attr("transform", `translate(0,${innerHeight})`)
            .call(d3.axisBottom(x))
            .selectAll("text")
            .attr("transform", "rotate(-45)")
            .style("text-anchor", "end")
            .style("fill", "var(--nido-dark)")
            .style("font-family", "var(--font-gotham)");

        // X-Axis Label
        const xAxisLabelText = currentMode === "disposition" ? "Dispositions" : "Departments";
        g.append("text")
            .attr("x", innerWidth / 2)
            .attr("y", innerHeight + margin.bottom - 10)
            .attr("text-anchor", "middle")
            .style("font-family", "var(--font-gotham)")
            .style("font-size", "14px")
            .style("font-weight", "bold")
            .style("fill", "var(--nido-blue)")
            .text(xAxisLabelText);

        g.append("g")
            .call(d3.axisLeft(y).ticks(5))
            .selectAll("text")
            .style("fill", "var(--nido-dark)")
            .style("font-family", "var(--font-gotham)");

        // Y-Axis Label
        g.append("text")
            .attr("transform", "rotate(-90)")
            .attr("y", -margin.left + 20)
            .attr("x", -(innerHeight / 2))
            .attr("text-anchor", "middle")
            .style("font-family", "var(--font-gotham)")
            .style("font-size", "14px")
            .style("font-weight", "bold")
            .style("fill", "var(--nido-blue)")
            .text("Number of Courses");

        const layer = g.selectAll(".layer")
            .data(stackedData)
            .enter().append("g")
            .attr("class", "layer")
            .attr("fill", d => colorScale(d.key));

        layer.selectAll("rect")
            .data(d => d)
            .enter().append("rect")
            .attr("x", d => x(d.data.category))
            .attr("y", d => y(d[1]))
            .attr("height", d => y(d[0]) - y(d[1]))
            .attr("width", x.bandwidth())
            .on("mouseover", function(event, d) {
                const subKey = d3.select(this.parentNode).datum().key;
                const count = d[1] - d[0];
                tooltip.style("opacity", 1)
                       .html(`
                            <strong>${d.data.category}</strong><br/>
                            ${subKey}: ${count}
                        `);
                d3.select(this).style("opacity", 0.7);
            })
            .on("mousemove", event => {
                tooltip.style("left", (event.pageX + 10) + "px")
                       .style("top", (event.pageY - 28) + "px");
            })
            .on("mouseout", function() {
                tooltip.style("opacity", 0);
                d3.select(this).style("opacity", 1);
            });

        // Legend
        const legend = g.append("g")
            .attr("font-family", "var(--font-gotham)")
            .attr("font-size", 10)
            .attr("text-anchor", "start")
            .selectAll("g")
            .data(subKeys.slice().reverse())
            .enter().append("g")
            .attr("transform", (d, i) => `translate(${innerWidth + 10},${i * 20})`);

        legend.append("rect")
            .attr("x", 0)
            .attr("width", 15)
            .attr("height", 15)
            .attr("fill", colorScale);

        legend.append("text")
            .attr("x", 24)
            .attr("y", 7.5)
            .attr("dy", "0.32em")
            .text(d => d);
    }

    function updateVisualization() {
        if (currentChart === "bubble") {
            barGroup.style("display", "none");
            labelGroup.style("display", null);
            nodeGroup.style("display", null);
            
            calculateFoci();

            let nodeElements = nodeGroup.selectAll("path").data(nodes, d => d.id);
            nodeElements.exit().remove();
            
            const newNodes = nodeElements.enter()
                .append("path")
                .attr("d", d => getShapePath(d.disp, d.radius))
                .style("fill", d => colorScale(d.dept))
                .style("stroke", "#fff")
                .style("stroke-width", 2)
                .style("stroke-linejoin", "round")
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

            simulation.nodes(nodes);
            simulation.force("x").initialize(nodes);
            simulation.force("y").initialize(nodes);
            simulation.alpha(1).restart();
        } else {
            simulation.stop();
            labelGroup.style("display", "none");
            nodeGroup.style("display", "none");
            barGroup.style("display", null);
            renderBarChart();
        }
    }

    function ticked() {
        if (currentChart !== "bubble") return;
        nodeGroup.selectAll("path")
            .attr("transform", d => {
                d.x = Math.max(d.radius, Math.min(width - d.radius, d.x));
                d.y = Math.max(d.radius, Math.min(height - d.radius, d.y));
                return `translate(${d.x}, ${d.y})`;
            });
    }

    function dragstarted(event, d) {
        if (currentChart !== "bubble") return;
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
    }
    
    function dragged(event, d) {
        if (currentChart !== "bubble") return;
        d.fx = event.x;
        d.fy = event.y;
    }
    
    function dragended(event, d) {
        if (currentChart !== "bubble") return;
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
    }

    groupBySelect.addEventListener('change', (e) => {
        currentMode = e.target.value;
        updateVisualization();
    });
    
    if (chartTypeSelect) {
        chartTypeSelect.addEventListener('change', (e) => {
            currentChart = e.target.value;
            updateVisualization();
        });
    }
});
