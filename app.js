/* ==========================================================================
   MEDCARE PRO CONTROL INTERFACE ARCHITECTURE
   ========================================================================== */

// --- 💾 VOLATILE IN-MEMORY DATA STORE STRUCTURES ---
let state = {
    userSession: null,
    doctors: [
        { id: 1, name: "Dr. Arvind Mehra", specialty: "Cardiologist", onDuty: true },
        { id: 2, name: "Dr. Sarah Khan", specialty: "Neurologist", onDuty: true },
        { id: 3, name: "Dr. Amit Patel", specialty: "Pediatrician", onDuty: false }
    ],
    patients: [
        { id: 1001, name: "Rahul Sharma", age: 45, gender: "Male", blood: "O+", phone: "9876543210", emergency: "9123456789", ailment: "Malaria", status: "Under Treatment", doctorId: 1, date: "2026-07-01", address: "Bhopal, MP" },
        { id: 1002, name: "Ananya Patel", age: 29, gender: "Female", blood: "B+", phone: "8765432109", emergency: "9812345670", ailment: "Fracture", status: "Admitted", doctorId: 2, date: "2026-07-05", address: "Indore, MP" },
        { id: 1003, name: "Vikram Malhotra", age: 62, gender: "Male", blood: "AB+", phone: "7654321098", emergency: "8877665544", ailment: "Malaria", status: "Recovered", doctorId: 1, date: "2026-07-10", address: "Ashta, MP" }
    ],
    appointments: [
        { patientId: 1001, doctorId: 1, date: "2026-07-11", time: "10:30" },
        { patientId: 1002, doctorId: 2, date: "2026-07-11", time: "14:15" }
    ]
};

let chartInstances = {};

// --- ⚙️ INTERFACE REGISTRATION SYSTEM INITIALIZATION ---
document.addEventListener("DOMContentLoaded", () => {
    bindInterfaceHooks();
});

function bindInterfaceHooks() {
    // Intercept login submissions
    const loginForm = document.getElementById("login-form");
    if (loginForm) {
        loginForm.addEventListener("submit", executeAuthenticationGate);
    }
    
    // Sidebar Workspace Tabs Router System Loop
    document.querySelectorAll(".sidebar-menu li").forEach(tabItem => {
        tabItem.addEventListener("click", () => {
            document.querySelectorAll(".sidebar-menu li").forEach(li => li.classList.remove("active"));
            tabItem.classList.add("active");
            
            const targetedViewId = tabItem.getAttribute("data-target");
            document.querySelectorAll(".content-view").forEach(view => view.classList.remove("active-view"));
            document.getElementById(targetedViewId).classList.add("active-view");
        });
    });

    // Logout
    const logoutBtn = document.getElementById("logout-btn");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", () => {
            state.userSession = null;
            document.getElementById("app-dashboard").classList.add("layout-hidden");
            document.getElementById("auth-gate").classList.remove("layout-hidden");
        });
    }

    // Modal Operations Action Controls
    document.getElementById("open-patient-modal-btn").addEventListener("click", () => triggerPatientModal());
    document.getElementById("close-modal-x").addEventListener("click", dismissPatientModal);
    document.getElementById("close-modal-cancel").addEventListener("click", dismissPatientModal);
    document.getElementById("comprehensive-patient-form").addEventListener("submit", processPatientFormSubmission);

    // Filter Listeners
    document.getElementById("search-input").addEventListener("input", refreshPatientsDisplayBoard);
    document.getElementById("filter-disease").addEventListener("change", refreshPatientsDisplayBoard);
    document.getElementById("filter-status").addEventListener("change", refreshPatientsDisplayBoard);

    document.getElementById("appointment-booking-form").addEventListener("submit", processAppointmentBooking);
}

// --- 🔒 ACCESS LAYER AUTH GATEWAY ROUTING ---
function executeAuthenticationGate(e) {
    e.preventDefault();
    const userField = document.getElementById("login-user").value.trim();
    const passField = document.getElementById("login-pass").value.trim();
    const errorTarget = document.getElementById("auth-error");

    if (userField === "admin" && passField === "admin123") {
        state.userSession = { user: "admin", role: "Admin" };
    } else if (userField === "reception" && passField === "rec123") {
        state.userSession = { user: "reception", role: "Receptionist" };
    } else {
        errorTarget.innerText = "Security violation: Invalid credentials mapping parameters.";
        return;
    }

    errorTarget.innerText = "";
    document.getElementById("login-form").reset();
    document.getElementById("auth-gate").classList.add("layout-hidden");
    document.getElementById("app-dashboard").classList.remove("layout-hidden");
    
    document.getElementById("session-role").innerText = `Role: ${state.userSession.role}`;
    
    // Refresh and sync the dashboard layout
    triggerGlobalDashboardRefresh();
    dispatchToastNotification("Access granted. Session initialized.");
}

function triggerGlobalDashboardRefresh() {
    calculateSummaryKPIs();
    refreshPatientsDisplayBoard();
    refreshAppointmentsDisplayBoard();
    populateDropdownMenus();
    constructAnalyticsCharts();
}

function calculateSummaryKPIs() {
    document.getElementById("stat-total-patients").innerText = state.patients.length;
    document.getElementById("stat-today-appointments").innerText = state.appointments.length;
    
    const activeOnDutyDocs = state.doctors.filter(d => d.onDuty).length;
    document.getElementById("stat-active-docs").innerText = `${activeOnDutyDocs} / ${state.doctors.length}`;
    
    const occupiedBeds = state.patients.filter(p => p.status !== "Discharged").length;
    document.getElementById("stat-avail-beds").innerText = `${Math.max(0, 30 - occupiedBeds)} / 30`;
}

// --- 👥 PATIENTS SYSTEM DIRECTORY INTERACTION REGISTRIES ---
function refreshPatientsDisplayBoard() {
    const tbody = document.getElementById("global-patient-tbody");
    tbody.innerHTML = "";

    const searchQuery = document.getElementById("search-input").value.toLowerCase();
    const diseaseFilter = document.getElementById("filter-disease").value;
    const statusFilter = document.getElementById("filter-status").value;

    const filteredSet = state.patients.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(searchQuery) || p.id.toString().includes(searchQuery);
        const matchesDisease = diseaseFilter === "" || p.ailment === diseaseFilter;
        const matchesStatus = statusFilter === "" || p.status === statusFilter;
        return matchesSearch && matchesDisease && matchesStatus;
    });

    filteredSet.forEach(p => {
        const docObj = state.doctors.find(d => d.id === p.doctorId);
        const docName = docObj ? docObj.name : "Unassigned Staff";
        
        let badgeClass = "badge-admitted";
        if (p.status === "Under Treatment") badgeClass = "badge-treatment";
        if (p.status === "Recovered") badgeClass = "badge-recovered";
        if (p.status === "Discharged") badgeClass = "badge-discharged";

        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td><strong>#${p.id}</strong></td>
            <td>
                <div style="font-weight:600; color:var(--text-primary);">${p.name}</div>
                <div style="font-size:0.8rem; color:var(--text-secondary);">${p.gender}, ${p.age} Yrs</div>
            </td>
            <td>
                <div style="font-size:0.85rem;"><i class="fa-solid fa-phone"></i> ${p.phone}</div>
                <div style="font-size:0.75rem; color:var(--text-secondary);"><i class="fa-solid fa-droplet"></i> Type: ${p.blood}</div>
            </td>
            <td><i class="fa-solid fa-user-md" style="color:var(--text-secondary); margin-right:4px;"></i> ${docName}</td>
            <td><span class="badge ${badgeClass}">${p.status}</span></td>
            <td>
                <div class="action-cell-tray">
                    <button onclick="triggerPatientModal(${p.id})" class="btn btn-secondary"><i class="fa-solid fa-pen-to-square"></i></button>
                    <button onclick="deletePatientRecord(${p.id})" class="btn btn-danger"><i class="fa-solid fa-trash-can"></i></button>
                    <button onclick="dischargePatientDirect(${p.id})" class="btn btn-warn" ${p.status === 'Discharged' ? 'disabled' : ''}><i class="fa-solid fa-door-open"></i></button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function triggerPatientModal(id = null) {
    const modal = document.getElementById("patient-modal-wrapper");
    const form = document.getElementById("comprehensive-patient-form");
    const headline = document.getElementById("modal-headline-title");
    
    form.reset();
    document.getElementById("edit-patient-idx-hash").value = id || "";

    if (id) {
        headline.innerText = `Modify Case File: #${id}`;
        const patientData = state.patients.find(p => p.id === id);
        if (patientData) {
            document.getElementById("p-name").value = patientData.name;
            document.getElementById("p-age").value = patientData.age;
            document.getElementById("p-gender").value = patientData.gender;
            document.getElementById("p-blood").value = patientData.blood;
            document.getElementById("p-phone").value = patientData.phone;
            document.getElementById("p-emergency").value = patientData.emergency;
            document.getElementById("p-ailment").value = patientData.ailment;
            document.getElementById("p-status").value = patientData.status;
            document.getElementById("p-doctor").value = patientData.doctorId;
            document.getElementById("p-date").value = patientData.date;
            document.getElementById("p-address").value = patientData.address;
        }
    } else {
        headline.innerText = "Register Comprehensive Admission Record";
        document.getElementById("p-date").value = new Date().toISOString().split('T')[0];
    }
    
    modal.classList.remove("hidden-modal");
}

function dismissPatientModal() {
    document.getElementById("patient-modal-wrapper").classList.add("hidden-modal");
}

function processPatientFormSubmission(e) {
    e.preventDefault();
    
    const phoneVal = document.getElementById("p-phone").value.trim();
    const ageVal = parseInt(document.getElementById("p-age").value);
    
    if (ageVal < 0) {
        dispatchToastNotification("Validation error: Invalid negative age parameters.");
        return;
    }
    if (phoneVal.length < 10) {
        dispatchToastNotification("Validation error: Contact entries must span 10 digits.");
        return;
    }

    const editIdStr = document.getElementById("edit-patient-idx-hash").value;

    if (editIdStr) {
        const targetId = parseInt(editIdStr);
        let p = state.patients.find(item => item.id === targetId);
        if (p) {
            p.name = document.getElementById("p-name").value.trim();
            p.age = ageVal;
            p.gender = document.getElementById("p-gender").value;
            p.blood = document.getElementById("p-blood").value;
            p.phone = phoneVal;
            p.emergency = document.getElementById("p-emergency").value.trim();
            p.ailment = document.getElementById("p-ailment").value.trim();
            p.status = document.getElementById("p-status").value;
            p.doctorId = parseInt(document.getElementById("p-doctor").value);
            p.date = document.getElementById("p-date").value;
            p.address = document.getElementById("p-address").value.trim();
        }
        dispatchToastNotification("Case record properties updated.");
    } else {
        const newRecord = {
            id: state.patients.length > 0 ? Math.max(...state.patients.map(p => p.id)) + 1 : 1001,
            name: document.getElementById("p-name").value.trim(),
            age: ageVal,
            gender: document.getElementById("p-gender").value,
            blood: document.getElementById("p-blood").value,
            phone: phoneVal,
            emergency: document.getElementById("p-emergency").value.trim(),
            ailment: document.getElementById("p-ailment").value.trim(),
            status: document.getElementById("p-status").value,
            doctorId: parseInt(document.getElementById("p-doctor").value),
            date: document.getElementById("p-date").value,
            address: document.getElementById("p-address").value.trim()
        };
        state.patients.push(newRecord);
        dispatchToastNotification("Patient admitted into record registry.");
    }

    dismissPatientModal();
    triggerGlobalDashboardRefresh();
}

function deletePatientRecord(id) {
    if (confirm("Permanently erase this patient directory case?")) {
        state.patients = state.patients.filter(p => p.id !== id);
        state.appointments = state.appointments.filter(a => a.patientId !== id);
        dispatchToastNotification("Record matrix discarded cleanly.");
        triggerGlobalDashboardRefresh();
    }
}

function dischargePatientDirect(id) {
    let p = state.patients.find(item => item.id === id);
    if (p) {
        p.status = "Discharged";
        dispatchToastNotification(`Discharge parameters finalized: Record #${id}`);
        triggerGlobalDashboardRefresh();
    }
}

// --- 📅 APPOINTMENTS ALLOCATION MANAGERS ---
function refreshAppointmentsDisplayBoard() {
    const tbody = document.getElementById("global-appointments-tbody");
    tbody.innerHTML = "";

    state.appointments.forEach(a => {
        const pObj = state.patients.find(p => p.id === a.patientId);
        const dObj = state.doctors.find(d => d.id === a.doctorId);
        
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td><strong>${pObj ? pObj.name : "Unknown Case"}</strong></td>
            <td>${dObj ? dObj.name : "Staff Pool"}</td>
            <td><span style="color:var(--primary-glow); font-weight:500;">${a.date}</span> @ ${a.time}</td>
        `;
        tbody.appendChild(tr);
    });
}

function processAppointmentBooking(e) {
    e.preventDefault();
    const newAppt = {
        patientId: parseInt(document.getElementById("appt-patient-select").value),
        doctorId: parseInt(document.getElementById("appt-doctor-select").value),
        date: document.getElementById("appt-date").value,
        time: document.getElementById("appt-time").value
    };

    state.appointments.push(newAppt);
    dispatchToastNotification("Timeline session reservation verified.");
    document.getElementById("appointment-booking-form").reset();
    triggerGlobalDashboardRefresh();
}

// --- 💵 ACCOUNTING / INVOICING BALANCES ---
function renderInvoiceSheet(patientId) {
    const target = document.getElementById("invoice-render-target");
    if (!patientId) {
        target.innerHTML = `<p class="neutral-hint-message">Select an admitted case profile above to construct a financial ledger breakdown.</p>`;
        return;
    }

    const p = state.patients.find(item => item.id === parseInt(patientId));
    if (!p) return;

    const baseReg = 500;
    const medicineFee = p.status === "Under Treatment" ? 1200 : p.status === "Recovered" ? 2400 : 450;
    const roomFee = p.status === "Discharged" ? 0 : 1500;
    const doctorConsult = 800;
    const grossTotal = baseReg + medicineFee + roomFee + doctorConsult;

    target.innerHTML = `
        <div class="invoice-title">
            <span>MedCare Operational Bill</span>
            <span>Ref: #INV-${p.id}</span>
        </div>
        <div class="invoice-line"><span>Patient Case Account Name:</span><strong>${p.name}</strong></div>
        <div class="invoice-line"><span>Diagnostic Ingress Profile:</span><span>${p.ailment}</span></div>
        <hr style="border-color:var(--border-color); margin:10px 0;">
        <div class="invoice-line"><span>Admission Processing Matrix Baseline:</span><span>₹${baseReg}.00</span></div>
        <div class="invoice-line"><span>Pharmaceutical Aggregates Formulary:</span><span>₹${medicineFee}.00</span></div>
        <div class="invoice-line"><span>Bed Space Inpatient Allocation Metrics:</span><span>₹${roomFee}.00</span></div>
        <div class="invoice-line"><span>Specialist Advisory Operations Group:</span><span>₹${doctorConsult}.00</span></div>
        <div class="invoice-total"><span>Aggregate Outstanding Settlement:</span><span>₹${grossTotal}.00</span></div>
    `;
}

// --- 📋 DROPDOWN SETUP POPULATORS ---
function populateDropdownMenus() {
    const pModalSelect = document.getElementById("p-doctor");
    const apptPatient = document.getElementById("appt-patient-select");
    const apptDoc = document.getElementById("appt-doctor-select");
    const billPatient = document.getElementById("billing-patient-select");

    const prevBillVal = billPatient.value;

    pModalSelect.innerHTML = state.doctors.map(d => `<option value="${d.id}">${d.name} (${d.specialty})</option>`).join("");
    apptDoc.innerHTML = state.doctors.filter(d => d.onDuty).map(d => `<option value="${d.id}">${d.name}</option>`).join("");
    
    apptPatient.innerHTML = state.patients.map(p => `<option value="${p.id}">${p.name} (#${p.id})</option>`).join("");
    billPatient.innerHTML = `<option value="">-- Choose Target Record File --</option>` + 
        state.patients.map(p => `<option value="${p.id}">${p.name} (#${p.id})</option>`).join("");

    if (prevBillVal) billPatient.value = prevBillVal;
}

// --- 📊 GRAPH ENGINE CONTROL (WITH LOADING SAFETY GATEWAYS) ---
function constructAnalyticsCharts() {
    const canvasAdmissions = document.getElementById("chartAdmissions");
    const canvasDiseases = document.getElementById("chartDiseases");

    // Safety Gate: If Chart.js framework CDN is delayed, log warning without halting runtime
    if (!canvasAdmissions || !canvasDiseases || typeof Chart === 'undefined') {
        console.warn("Analytics Engine Notice: Chart.js module loading delayed or canvas node missing.");
        return; 
    }

    const ctxAdmissions = canvasAdmissions.getContext("2d");
    const ctxDiseases = canvasDiseases.getContext("2d");

    if (chartInstances.admissions) chartInstances.admissions.destroy();
    if (chartInstances.diseases) chartInstances.diseases.destroy();

    const dateCounts = {};
    state.patients.forEach(p => { dateCounts[p.date] = (dateCounts[p.date] || 0) + 1; });
    const sortedDates = Object.keys(dateCounts).sort();

    chartInstances.admissions = new Chart(ctxAdmissions, {
        type: "line",
        data: {
            labels: sortedDates,
            datasets: [{
                label: "Inpatient Volume",
                data: sortedDates.map(d => dateCounts[d]),
                borderColor: "#38bdf8",
                backgroundColor: "rgba(56,189,248,0.1)",
                tension: 0.3,
                fill: true
            }]
        },
        options: { responsive: true, plugins: { legend: { display: false } } }
    });

    const diseaseCounts = {};
    state.patients.forEach(p => { diseaseCounts[p.ailment] = (diseaseCounts[p.ailment] || 0) + 1; });

    chartInstances.diseases = new Chart(ctxDiseases, {
        type: "doughnut",
        data: {
            labels: Object.keys(diseaseCounts),
            datasets: [{
                data: Object.values(diseaseCounts),
                backgroundColor: ["#38bdf8", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"]
            }]
        },
        options: { responsive: true }
    });
}

// --- 📥 FILE EXTRACTION PACKAGES ---
function exportCSVData() {
    let csvContent = "data:text/csv;charset=utf-8,ID,Name,Age,Gender,Phone,Ailment,Status,Date\n";
    state.patients.forEach(p => {
        csvContent += `${p.id},"${p.name}",${p.age},"${p.gender}","${p.phone}","${p.ailment}","${p.status}",${p.date}\n`;
    });
    const encodedUri = encodeURI(csvContent);
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", encodedUri);
    downloadAnchor.setAttribute("download", `MedCare_Patients_Dataset_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    document.body.removeChild(downloadAnchor);
}

function dispatchToastNotification(msg) {
    const node = document.getElementById("toast-notification-node");
    node.innerText = msg;
    node.classList.remove("toast-hidden");
    setTimeout(() => node.classList.add("toast-hidden"), 3500);
}