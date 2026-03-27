
async function handle_registration(e) {
  e.preventDefault();
  console.log("registration began")

  let form = e.target;
  let data = new FormData(form);
  let formData = Object.fromEntries(data.entries());
  if (formData?.user_type == "doctor") {
    const response = await fetch("https://health-monitoring-system-backend-one.vercel.app/auth/register-doctor",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(formData)
      }
    );

    if (response.status == 200) {
      alert("✅registration success")
      window.location.href = "/"
    }
  }
  if (formData?.user_type == "caretaker") {
    const response = await fetch("https://health-monitoring-system-backend-one.vercel.app/auth/register-caretaker",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(formData)
      }
    );
    const data = await response.json();
    if (response.status == 200) {
      alert("✅registration success")
      window.location.href = "/"
    }

  }

}

async function handle_login(e) {
  e.preventDefault()
  console.log('login began')
  let form = e.target;
  let data = new FormData(form);
  let formData = Object.fromEntries(data.entries());

  const response = await fetch("https://health-monitoring-system-backend-one.vercel.app/auth/login",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(formData)
    }
  );
  if (response.status == 200) {

    const data = await response.json();
    if (data.user_type == "caretaker") {
      localStorage.setItem("caretaker_id", data?.caretaker_id);
      localStorage.setItem("currentUser", JSON.stringify({ fullName: data.fullName, username:data.username, email:data.email }))
      window.location.href = "/patient-dashboard.html"
    }

    if (data.user_type == "doctor") {
      console.log("doctor-data", data)
      localStorage.setItem("currentUser", JSON.stringify({ fullName: data.fullName, username:data.username, email:data.email, doctor_id: data.doctor_id }))
      localStorage.setItem("doctor_id", data?.doctor_id)
      window.location.href = "/doctor-dashboard.html"
    }
  }

  else {
    alert("Incorrect credentials")
  }

}

async function handle_add_patient(e) {
  e.preventDefault()
  let form = e.target;
  let data = new FormData(form);
  let formData = Object.fromEntries(data.entries());

  const response = await fetch("https://health-monitoring-system-backend-one.vercel.app/caretaker/add-patient",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        caretaker_id: localStorage.getItem("caretaker_id"),
        patient_name: formData.patientFullName,
        patient_age: formData.patientAge,
        patient_gender: formData.patientGender
      })
    }
  );
  if (response.status == 200) {
    alert("patient add success")
  }
  else {
    const data = await response.json()
    console.log(data)
    const error_message = data.error_message || "error adding patient"
    alert(error_message)
  }
  console.log(formData);
}

// ===== DOCTOR DASHBOARD =====
if (window.location.pathname.includes('doctor-dashboard.html')) {

  const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
  const docName = currentUser.fullName || localStorage.getItem('userName') || 'Doctor';
  document.getElementById('docName').textContent = docName;

  let devicesDB = [];
  let patientsDB = [];
  let selectedDeviceId = null;
  let selectedPatientId = null;
  let docEcgChart = null;
  let docEcgAnimationId = null;

  function loadDevices() {
    const stored = localStorage.getItem('devicesDB');
    devicesDB = stored ? JSON.parse(stored) : [];
  }

  async function get_non_assigned_caretakers() {
    console.log("getting non assinged caretakers");

    const response = await fetch("https://health-monitoring-system-backend-one.vercel.app/doctor/get-non-assigned-caretakers",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ "doctor_id": localStorage.getItem("doctor_id") })
      }
    );
    if (response.status == 200) {
      const data = await response.json();

      const select = document.createElement("select");

      data.forEach(item => {
        const option = document.createElement("option");
        option.textContent = item.fullName;
        option.value = item.caretaker_id;
        select.appendChild(option);
        select.style.width = "100%"
        select.id = "caretaker_id"
      });
      document.querySelector("#caretaker_name").innerHTML = ''
      document.querySelector("#caretaker_name").appendChild(select)

      devicesDB = data;
    }
    else {
      const data = await response.json()
      const error_message = data.error_message || "error loading patient"

    }
  }

  async function load_assigned_caretakers() {
    console.log("patient loading");

    const response = await fetch("https://health-monitoring-system-backend-one.vercel.app/doctor/get-assigned-caretakers",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ "doctor_id": localStorage.getItem('doctor_id') })
      }
    );
    if (response.status == 200) {
      const data = await response.json();
      console.log("assigned caretakers", data)
      devicesDB = data;
      const tbody = document.getElementById('devicesTableBody');
      if (!tbody) return;

      tbody.innerHTML = '';
      console.log("deviceDB is", devicesDB)
      devicesDB.forEach(device => {
        const row = document.createElement('tr');
        row.innerHTML = `
        <td>${device.device_name}</td>
        <td><strong>${device.device_id}</strong></td>
        <td>${device.fullName}</td>
        <td><span class="status-badge active">Active</span></td>
        <td>
          <button class="btn-secondary" onclick="selectDeviceForMonitoring('${device.id}')">
            <i class="fa-solid fa-eye"></i> View Patients
          </button>
        </td>
      `;
        tbody.appendChild(row);
      });
    }
    else {
      const data = await response.json()
      console.log("assigned caretakers when error", data)

    }
  }
  
  function load_caretakers() {
    load_assigned_caretakers();
    get_non_assigned_caretakers();
  }
  document.querySelector("#registered-devices-list").addEventListener("click",(e)=>{
    load_caretakers();
  })

  document.querySelector("#deviceForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    let form = e.target;
    let data = new FormData(form);
    let formData = Object.fromEntries(data.entries());
    formData.caretaker_id = document.getElementById("caretaker_id").value
    console.log(formData)
    const response = await fetch("https://health-monitoring-system-backend-one.vercel.app/doctor/assign-device",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ device_id: formData.deviceId, device_name: formData.deviceName, caretaker_id: formData.caretaker_id })
      }
    );
    if (response.status == 200) {
      const data = await response.json();
      console.log("success result =", data)
      devicesDB = data;
    }
    else {
      const data = await response.json();
      console.log("the fuck is", data)
      const error_message = data.error_message || "error loading patient"

    }

  })

  function saveDevices() {
    localStorage.setItem('devicesDB', JSON.stringify(devicesDB));
  }

  function savePatients() {
    localStorage.setItem('patientsDB', JSON.stringify(patientsDB));
  }

  // Get patients for a specific device
  function getPatientsForDevice(deviceId) {
    return patientsDB.filter(p => p.deviceId === deviceId);
  }

  // Render Dashboard Summary
  function renderDoctorDashboard() {
    loadDevices();

    const alertCount = getAlertCount();
    const summary = document.getElementById('dashboardSummary');
    if (summary) {
      summary.innerHTML = `
        <div class="card">
          <h3 style="color: var(--primary); margin-bottom: 0.5rem;">Total Devices</h3>
          <div style="font-size: 2.5rem; font-weight: 700; color: var(--primary);">${devicesDB.length}</div>
        </div>
        <div class="card">
          <h3 style="color: var(--primary); margin-bottom: 0.5rem;">Total Patients</h3>
          <div style="font-size: 2.5rem; font-weight: 700; color: var(--primary);">${patientsDB.length}</div>
        </div>
        <div class="card">
          <h3 style="color: var(--primary); margin-bottom: 0.5rem;">Active Alerts</h3>
          <div style="font-size: 2.5rem; font-weight: 700; color: ${alertCount > 0 ? 'var(--danger)' : 'var(--success)'};">${alertCount}</div>
        </div>
      `;
    }

    renderRecentAlerts();
  }

  function renderRecentAlerts() {
    const container = document.getElementById('recentAlerts');
    if (!container) return;

    const alerts = getAllAlerts();
    if (alerts.length === 0) {
      container.innerHTML = '<p style="color: var(--success); padding: 1rem;"><i class="fa-solid fa-check-circle"></i> No active alerts</p>';
      return;
    }

    container.innerHTML = alerts.slice(0, 5).map(alert => `
      <div class="alert-card" style="margin-bottom: 0.5rem;">
        <i class="fa-solid fa-exclamation-triangle"></i> ${alert.message}
      </div>
    `).join('');
  }

  function getAlertCount() {
    return getAllAlerts().length;
  }

  function getAllAlerts() {
    const alerts = [];
    patientsDB.forEach(patient => {
      if (patient.temperature > 38) {
        alerts.push({ patient: patient.name, message: `🌡️ ${patient.name}: High Temperature (${patient.temperature}°C)` });
      }
      if (patient.spo2 < 90) {
        alerts.push({ patient: patient.name, message: `🫁 ${patient.name}: Low SpO₂ (${patient.spo2}%)` });
      }
      if (patient.heartRate > 120) {
        alerts.push({ patient: patient.name, message: `❤️ ${patient.name}: High Heart Rate (${patient.heartRate} BPM)` });
      }
    });
    return alerts;
  }

  // Render Devices List
  function renderDevicesList() {
    loadDevices();
    const tbody = document.getElementById('devicesTableBody');
    if (!tbody) return;

    tbody.innerHTML = '';
    console.log("deviceDB is", devicesDB)
    devicesDB.forEach(device => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${device.name}</td>
        <td><strong>${device.id}</strong></td>
        <td>${device.patient}</td>
        <td><span class="status-badge active">Active</span></td>
        <td>
          <button class="btn-secondary" onclick="selectDeviceForMonitoring('${device.id}')">
            <i class="fa-solid fa-eye"></i> View Patients
          </button>
        </td>
      `;
      tbody.appendChild(row);
    });
  }

  // Populate Device Selector
  function populateDeviceSelector() {
    loadDevices();
    const selector = document.getElementById('deviceSelector');
    if (!selector) return;

    selector.innerHTML = '<option value="">-- Select a Device --</option>';
    devicesDB.forEach(device => {
      const option = document.createElement('option');

      option.value = device.id;
      option.textContent = `${device.name} (${device.id}) - ${device.patient}`;
      selector.appendChild(option);
    });
  }

  // Render Patients for Selected Device
  function renderPatientsForDevice(deviceId) {
    loadPatients();
    const container = document.getElementById('devicePatientsContainer');
    if (!container) return;

    const devicePatients = getPatientsForDevice(deviceId);

    if (devicePatients.length === 0) {
      container.innerHTML = '<div class="card"><p style="text-align: center; color: var(--text-light); padding: 2rem;">No patients registered for this device</p></div>';
      return;
    }

    let html = '<div class="card table-card"><h3 class="card-title"><i class="fa-solid fa-users"></i> Patients for this Device</h3><div class="table-wrapper"><table class="data-table"><thead><tr><th>Patient ID</th><th>Name</th><th>Age</th><th>Gender</th><th>Temperature</th><th>Heart Rate</th><th>SpO₂</th><th>Action</th></tr></thead><tbody>';

    devicePatients.forEach(patient => {
      const isAlert = patient.temperature > 38 || patient.spo2 < 90 || patient.heartRate > 120;
      html += `
        <tr>
          <td><strong>${patient.id}</strong></td>
          <td>${patient.name}</td>
          <td>${patient.age}</td>
          <td>${patient.gender}</td>
          <td>${patient.temperature.toFixed(1)}°C</td>
          <td>${patient.heartRate} BPM</td>
          <td>${patient.spo2}%</td>
          <td>
            <button class="btn-secondary" onclick="selectPatientFromDevice('${deviceId}', '${patient.id}')">
              <i class="fa-solid fa-eye"></i> View Data
            </button>
          </td>
        </tr>
      `;
    });

    html += '</tbody></table></div></div>';
    container.innerHTML = html;
  }

  // Render Patient Records
  function renderPatientRecords() {
    loadPatients();
    const tbody = document.getElementById('patientRecordsTableBody');
    if (!tbody) return;

    tbody.innerHTML = '';
    patientsDB.forEach(patient => {
      const isAlert = patient.temperature > 38 || patient.spo2 < 90 || patient.heartRate > 120;
      const row = document.createElement('tr');
      row.innerHTML = `
        <td><strong>${patient.patient_id}</strong></td>
        <td>${patient.patient_name}</td>
        <td>${patient.age}</td>
        <td>${patient.gender}</td>
        <td>${patient.deviceId}</td>
        <td><span class="status-badge ${isAlert ? 'inactive' : 'active'}">${isAlert ? 'Alert' : 'Active'}</span></td>
      `;
      tbody.appendChild(row);
    });
  }

  // Render Alerts Section
  function renderAlertsSection() {
    const container = document.getElementById('alertsContainer');
    if (!container) return;

    const alerts = getAllAlerts();
    if (alerts.length === 0) {
      container.innerHTML = '<div class="card"><p style="color: var(--success); text-align: center; padding: 2rem;"><i class="fa-solid fa-check-circle" style="font-size: 2rem; display: block; margin-bottom: 1rem;"></i><strong>All patients are healthy. No active alerts!</strong></p></div>';
      return;
    }

    let html = '<div class="alerts-container">';
    alerts.forEach(alert => {
      html += `
        <div class="card alert-card" style="border-left: 4px solid var(--danger); background: #fff5f5; margin-bottom: 1rem;">
          <div style="display: flex; align-items: center; gap: 1rem;">
            <i class="fa-solid fa-exclamation-circle" style="font-size: 1.5rem; color: var(--danger);"></i>
            <div>
              <strong>${alert.message}</strong>
              <p style="color: var(--text-light); margin-top: 0.3rem; font-size: 0.9rem;">⏰ Just now</p>
            </div>
          </div>
        </div>
      `;
    });
    html += '</div>';
    container.innerHTML = html;
  }

  // Select Device and Show Patients
  window.selectDeviceForMonitoring = function (deviceId) {
    loadDevices();
    loadPatients();
    selectedDeviceId = deviceId;
    const device = devicesDB.find(d => d.id === deviceId);
    if (!device) {
      alert('Device not found');
      return;
    }

    showDocSection('health-data');
    document.getElementById('deviceSelector').value = deviceId;
    renderPatientsForDevice(deviceId);

    // Hide monitoring cards and table initially
    const container = document.getElementById('monitoringCardsContainer');
    if (container) container.style.display = 'none';
    const ecgContainer = document.getElementById('ecgContainer');
    if (ecgContainer) ecgContainer.style.display = 'none';
    const tableContainer = document.getElementById('healthDataTableContainer');
    if (tableContainer) tableContainer.style.display = 'none';

    setTimeout(() => {
      const section = document.getElementById('health-data');
      if (section) section.scrollIntoView({ behavior: 'smooth' });
    }, 300);
  };

  // Select Patient from Device
  window.selectPatientFromDevice = function (deviceId, patientId) {
    loadPatients();
    selectedDeviceId = deviceId;
    selectedPatientId = patientId;

    const patient = patientsDB.find(p => p.id === patientId);
    if (!patient) {
      alert('Patient not found');
      return;
    }

    renderPatientMonitoringCards(patient);
    renderPatientHealthDataTable(patient);
    setTimeout(() => renderDocECGChart(), 100);
  };

  // Render Patient Monitoring Cards
  function renderPatientMonitoringCards(patient) {
    const container = document.getElementById('monitoringCardsContainer');
    if (!container) return;

    const tempAlert = patient.temperature > 38;
    const hrAlert = patient.heartRate > 120;
    const spo2Alert = patient.spo2 < 90;

    container.innerHTML = `
      <div style="grid-column: 1 / -1; margin-bottom: 1rem;">
        <h3 style="color: var(--primary); font-weight: 700;">Selected Patient: ${patient.name} (${patient.id})</h3>
      </div>
      <div class="monitor-card ${tempAlert ? 'alert' : ''}">
        <div class="monitor-icon-wrapper"><i class="fa-solid fa-temperature-high"></i></div>
        <div class="monitor-value">${patient.temperature.toFixed(1)}</div>
        <div class="monitor-unit">°C</div>
        <div class="monitor-label">Temperature</div>
        <div class="monitor-status">${tempAlert ? '🔴 High' : '🟢 Normal'}</div>
      </div>
      <div class="monitor-card ${hrAlert ? 'alert' : ''}">
        <div class="monitor-icon-wrapper"><i class="fa-solid fa-heart"></i></div>
        <div class="monitor-value">${patient.heartRate}</div>
        <div class="monitor-unit">BPM</div>
        <div class="monitor-label">Heart Rate</div>
        <div class="monitor-status">${hrAlert ? '🔴 High' : '🟢 Normal'}</div>
      </div>
      <div class="monitor-card ${spo2Alert ? 'alert' : ''}">
        <div class="monitor-icon-wrapper"><i class="fa-solid fa-lungs"></i></div>
        <div class="monitor-value">${patient.spo2}</div>
        <div class="monitor-unit">%</div>
        <div class="monitor-label">Oxygen Level</div>
        <div class="monitor-status">${spo2Alert ? '🔴 Critical' : '🟢 Normal'}</div>
      </div>
    `;
    container.style.display = 'grid';
    const tableContainer = document.getElementById('healthDataTableContainer');
    if (tableContainer) tableContainer.style.display = 'block';
  }

  // Render Patient Health Data Table
  function renderPatientHealthDataTable(patient) {
    const tbody = document.getElementById('healthDataTableBody');
    if (!tbody) return;

    tbody.innerHTML = '';
    if (!patient.healthHistory || patient.healthHistory.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 2rem;">No health history available</td></tr>';
      return;
    }

    patient.healthHistory.forEach(record => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${record.date}</td>
        <td>${record.temp}</td>
        <td>${record.hr}</td>
        <td>${record.spo2}</td>
        <td>${record.bp}</td>
        <td><span class="status-ok">✓ ${record.status}</span></td>
      `;
      tbody.appendChild(row);
    });
  }

  // Device Selector Change
  const deviceSelector = document.getElementById('deviceSelector');
  if (deviceSelector) {
    deviceSelector.addEventListener('change', function () {
      if (this.value) {
        window.selectDeviceForMonitoring(this.value);
      }
    });
  }

  // Render ECG Chart
  function renderDocECGChart() {
    const canvasElement = document.getElementById('docEcgChart');
    if (!canvasElement) return;

    const ctx = canvasElement.getContext('2d');
    let ecgData = [];
    for (let i = 0; i < 60; i++) {
      const wave = Math.sin((i / 10) * Math.PI);
      const noise = (Math.random() - 0.5) * 0.3;
      ecgData.push(wave * 1.5 + noise);
    }

    if (docEcgChart) {
      docEcgChart.destroy();
      if (docEcgAnimationId) clearInterval(docEcgAnimationId);
    }

    docEcgChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: Array(60).fill(''),
        datasets: [{
          label: 'ECG Signal (mV)',
          data: ecgData,
          borderColor: '#1481ba',
          borderWidth: 2.5,
          backgroundColor: 'rgba(20, 129, 186, 0.06)',
          pointRadius: 0,
          fill: true,
          tension: 0.4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        animation: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { display: false },
          y: { min: -2.5, max: 2.5, grid: { color: 'rgba(200, 230, 255, 0.3)' } }
        }
      }
    });

    docEcgAnimationId = setInterval(() => {
      if (!docEcgChart || !docEcgChart.data) return;
      const dataArray = docEcgChart.data.datasets[0].data;
      const t = Date.now() / 200;
      const newVal = Math.sin((t % 60) / 10) * 1.5 + (Math.random() - 0.5) * 0.3;
      dataArray.push(newVal);
      if (dataArray.length > 60) dataArray.shift();
      docEcgChart.update('none');
    }, 700);
  }

  // Settings Form
  const settingsForm = document.getElementById('settingsForm');
  if (settingsForm) {
    document.getElementById('settingsEmail').value = currentUser.email || '';
    document.getElementById('settingsUsername').value = currentUser.username || '';
    document.getElementById('settingsFullName').value = currentUser.fullName || '';
    document.getElementById('settingsUserType').textContent = currentUser.userType || 'Doctor';
    document.getElementById('settingsJoined').textContent = new Date().toLocaleDateString();
    document.getElementById('settingsLastLogin').textContent = new Date().toLocaleString();

    settingsForm.addEventListener('submit', function (e) {
      e.preventDefault();

      const updatedUser = {
        ...currentUser,
        email: document.getElementById('settingsEmail').value.trim(),
        username: document.getElementById('settingsUsername').value.trim(),
        fullName: document.getElementById('settingsFullName').value.trim()
      };

      localStorage.setItem('currentUser', JSON.stringify(updatedUser));

      let registeredUsers = JSON.parse(localStorage.getItem('registeredUsers') || '{}');
      const userKey = updatedUser.username || updatedUser.email;
      registeredUsers[userKey] = updatedUser;
      localStorage.setItem('registeredUsers', JSON.stringify(registeredUsers));

      document.getElementById('docName').textContent = updatedUser.fullName;
      alert('✅ Settings updated successfully!');
    });
  }

  // Show Doctor Section
  function showDocSection(sectionId) {
    document.querySelectorAll('.dashboard-section').forEach(section => {
      section.style.display = 'none';
      section.classList.remove('active');
    });
    const section = document.getElementById(sectionId);
    if (section) {
      section.style.display = 'block';
      section.classList.add('active');

      if (sectionId === 'dashboard') renderDoctorDashboard();
      else if (sectionId === 'patient-records') renderPatientRecords();
      else if (sectionId === 'alerts') renderAlertsSection();
      else if (sectionId === 'health-data') populateDeviceSelector();
    }
  }

  // Menu Item Click Handlers
  document.querySelectorAll('.menu-item').forEach(item => {
    item.addEventListener('click', function () {
      document.querySelectorAll('.menu-item').forEach(i => i.classList.remove('active'));
      this.classList.add('active');
      const sectionId = this.dataset.section;
      showDocSection(sectionId);
    });
  });

  // Logout
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', function () {
      localStorage.removeItem('currentUser');
      localStorage.removeItem('userType');
      localStorage.removeItem('userEmail');
      localStorage.removeItem('userName');
      window.location.href = 'index.html';
    });
  }

  // Initialize
  loadDevices();
  renderDevicesList();
  populateDeviceSelector();
  renderDoctorDashboard();
  showDocSection('dashboard');
}

// ===== PATIENT DASHBOARD =====
// =====================================
// MONITORING SYSTEM - Core Module
// =====================================
window.monitoringSystem = {
  // Current monitoring session
  activeSession: null,
  sensorDataInterval: null,

  /**
   * Initialize monitoring system
   * Loads session from localStorage if exists
   */
  init: function () {
    console.log('Initializing Monitoring System...');
    this.loadSession();
    this.updateUI();
  },

  /**
   * Load active session from localStorage
   */
  loadSession: function () {
    const stored = localStorage.getItem('activeMonitoringSession');
    if (stored) {
      this.activeSession = JSON.parse(stored);
      console.log('Active session loaded:', this.activeSession);
    }
  },

  /**
   * Save session to localStorage
   */
  saveSession: function () {
    if (this.activeSession) {
      localStorage.setItem('activeMonitoringSession', JSON.stringify(this.activeSession));
      console.log('Session saved:', this.activeSession);
    }
  },

  /**
   * Start monitoring for selected patient
   * - Validates patient selection
   * - Creates session object
   * - Starts sensor data simulation
   */
  startMonitoring: async function () {
    const patientId = window.currentPatientId;
    const deviceId = window.currentDeviceId;
    await fetch("https://health-monitoring-system-backend-one.vercel.app/caretaker/start-monitoring",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ device_id: "DEV-9001", patient_id: localStorage.getItem('selected_patient_id'), patient_name: localStorage.getItem("selected_patient_name") })
      }
    );
    alert("⌛ you have 1 minute to connect with device");
    // Validation
    if (!patientId || !deviceId) {
      alert('❌ Please select both Device and Patient first');
      return;
    }

    // Create session object
    this.activeSession = {
      device_id: deviceId,
      patient_id: patientId,
      status: 'active',
      startedAt: new Date().toISOString(),
      sessionId: 'SESSION-' + Date.now() // Unique session ID
    };

    // Save to localStorage
    this.saveSession();

    console.log('✅ Monitoring Started:', this.activeSession);

    // Start sensor data simulation
    this.startSensorSimulation();

    // Update UI
    this.updateUI();
    alert(`✅ Monitoring started for Patient ${patientId} on Device ${deviceId}`);

  },

  /**
   * Stop monitoring session
   * - Updates status to idle
   * - Stops sensor simulation
   * - Clears session
   */
  stopMonitoring: function () {
    if (!this.activeSession) {
      alert('❌ No active session to stop');
      return;
    }

    console.log('🛑 Monitoring Stopped');

    // Stop sensor simulation
    if (this.sensorDataInterval) {
      clearInterval(this.sensorDataInterval);
      this.sensorDataInterval = null;
    }

    // Clear session
    this.activeSession = null;
    localStorage.removeItem('activeMonitoringSession');

    // Update UI
    this.updateUI();
    alert('✅ Monitoring stopped successfully');
  },

  /**
   * Start sensor data simulation
   * - Generates random sensor values every 2 seconds
   * - Updates patient data in patientsDB
   * - READY FOR: Real sensor API integration
   */
  startSensorSimulation: function () {
    // Clear previous interval if exists
    if (this.sensorDataInterval) {
      clearInterval(this.sensorDataInterval);
    }

    // Simulate sensor data every 2 seconds
    this.sensorDataInterval = setInterval(() => {
      if (!this.activeSession) {
        clearInterval(this.sensorDataInterval);
        return;
      }

      // Generate simulated sensor values
      const sensorData = {
        temperature: (Math.random() * 2 + 36).toFixed(1), // 36-38°C
        heartRate: Math.floor(Math.random() * 40 + 60), // 60-100 BPM
        spo2: Math.floor(Math.random() * 10 + 90), // 90-100%
        timestamp: new Date().toISOString()
      };

      // Update patient data in patientsDB
      this.updatePatientData(sensorData);

      console.log('📊 Sensor Data:', sensorData);
    }, 2000); // Update every 2 seconds
  },

  /**
   * Update patient data from simulated sensors
   * @param {Object} sensorData - Temperature, heartRate, spo2
   */
  updatePatientData: function (sensorData) {
    if (!this.activeSession) return;

    const patientId = this.activeSession.patient_id;

    // Load patients from localStorage
    const stored = localStorage.getItem('patientsDB');
    const patientsDB = stored ? JSON.parse(stored) : [];

    // Find and update patient
    const patient = patientsDB.find(p => p.id === patientId);
    if (patient) {
      patient.temperature = parseFloat(sensorData.temperature);
      patient.heartRate = sensorData.heartRate;
      patient.spo2 = sensorData.spo2;
      patient.lastUpdate = sensorData.timestamp;

      // Save updated patients
      localStorage.setItem('patientsDB', JSON.stringify(patientsDB));

      // Update UI in real-time if monitoring panel is open
      this.updateMonitoringUI();
    }
  },

  /**
   * Update monitoring UI with current data
   */
  updateMonitoringUI: function () {
    if (!this.activeSession) return;

    const patientId = this.activeSession.patient_id;
    const stored = localStorage.getItem('patientsDB');
    const patientsDB = stored ? JSON.parse(stored) : [];
    const patient = patientsDB.find(p => p.id === patientId);

    if (patient) {
      // Update vital signs display
      const patTempEl = document.getElementById('patTemp');
      const patHrEl = document.getElementById('patHr');
      const patSpo2El = document.getElementById('patSpo2');

      if (patTempEl) patTempEl.textContent = patient.temperature.toFixed(1);
      if (patHrEl) patHrEl.textContent = patient.heartRate;
      if (patSpo2El) patSpo2El.textContent = patient.spo2;

      // Update status
      const tempAlert = patient.temperature > 38;
      const hrAlert = patient.heartRate > 120;
      const spo2Alert = patient.spo2 < 90;

      const patTempStatusEl = document.getElementById('patTempStatus');
      const patHrStatusEl = document.getElementById('patHrStatus');
      const patSpo2StatusEl = document.getElementById('patSpo2Status');

      if (patTempStatusEl) patTempStatusEl.textContent = tempAlert ? '🔴 High' : '🟢 Normal';
      if (patHrStatusEl) patHrStatusEl.textContent = hrAlert ? '🔴 High' : '🟢 Normal';
      if (patSpo2StatusEl) patSpo2StatusEl.textContent = spo2Alert ? '🔴 Critical' : '🟢 Normal';

      // Update alert cards if visible
      if (document.getElementById('monitoringCardsContainer').style.display !== 'none') {
        window.renderPatientMonitoringCards(patient);
      }

      // Update health history if monitoring
      if (patient.healthHistory) {
        const now = new Date();
        const lastRecord = patient.healthHistory[0];
        const timeSinceLastRecord = lastRecord ?
          (now - new Date(lastRecord.date)) / 1000 : Infinity;

        // Log to health history every 10 seconds (5 updates)
        if (timeSinceLastRecord > 10) {
          patient.healthHistory.unshift({
            date: now.toISOString().slice(0, 10) + ' ' + now.toTimeString().slice(0, 5),
            temp: patient.temperature,
            hr: patient.heartRate,
            spo2: patient.spo2,
            bp: '-',
            status: (patient.temperature > 38 || patient.spo2 < 90 || patient.heartRate > 120)
              ? 'Alert'
              : 'Normal'
          });
          localStorage.setItem('patientsDB', JSON.stringify(patientsDB));
        }
      }
    }
  },

  /**
   * Update control panel UI
   */
  updateUI: function () {
    const monitoringControlCard = document.getElementById('monitoringControlCard');
    const startBtn = document.getElementById('startMonitoringBtn');
    const stopBtn = document.getElementById('stopMonitoringBtn');
    const statusBadge = document.getElementById('monitoringStatusBadge');
    const deviceDisplay = document.getElementById('currentDeviceDisplay');
    const patientDisplay = document.getElementById('currentPatientDisplay');

    if (!monitoringControlCard) return;

    if (this.activeSession) {
      // Monitoring is ACTIVE
      deviceDisplay.textContent = this.activeSession.device_id;
      patientDisplay.textContent = this.activeSession.patient_id;

      statusBadge.style.background = '#c8e6c9';
      statusBadge.style.color = '#2e7d32';
      statusBadge.innerHTML = '<i class="fa-solid fa-circle" style="margin-right: 0.5rem; font-size: 0.6rem;"></i> Active';

      startBtn.style.display = 'none';
      stopBtn.style.display = 'block';

      console.log('UI Updated: Monitoring ACTIVE');
    } else {
      // Monitoring is IDLE
      deviceDisplay.textContent = window.currentDeviceId || '-';
      patientDisplay.textContent = window.currentPatientId || '-';

      statusBadge.style.background = '#ffebee';
      statusBadge.style.color = '#c62828';
      statusBadge.innerHTML = '<i class="fa-solid fa-circle" style="margin-right: 0.5rem; font-size: 0.6rem;"></i> Idle';

      startBtn.style.display = 'block';
      stopBtn.style.display = 'none';

      console.log('UI Updated: Monitoring IDLE');
    }
  }
};

// =====================================
// PATIENT DASHBOARD - Main Module
// =====================================
if (window.location.pathname.includes('patient-dashboard.html')) {

  const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
  const patName = currentUser.fullName || localStorage.getItem('userName') || 'Patient';
  document.getElementById('patName').textContent = patName;

  let patientsDB = [];
  window.currentDeviceId = null;
  window.currentPatientId = null;
  let patEcgChart = null;
  let patEcgAnimationId = null;
  let nextPatientId = 101;

  async function loadPatients() {
    const res = await fetch("https://health-monitoring-system-backend-one.vercel.app/caretaker/get-patients", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ caretaker_id: localStorage.getItem("caretaker_id") })
    });

    patientsDB = await res.json();
  }

  function savePatients() {
    localStorage.setItem('patientsDB', JSON.stringify(patientsDB));
  }

  // Get unique devices from patients
  function getUniqueDevices() {
    const devices = new Set();
    patientsDB.forEach(p => devices.add(p.deviceId));
    return Array.from(devices);
  }

  // Get patients for a specific device
  function getPatientsForDevice(deviceId) {
    return patientsDB.filter(p => p.deviceId === deviceId);
  }

  // Render Dashboard Summary
  function renderDashboardSummary() {
    loadPatients();
    const container = document.getElementById('dashboardSummary');
    if (!container) return;

    const totalPatients = patientsDB.length;
    const devices = getUniqueDevices();
    const alertCount = patientsDB.filter(p =>
      p.temperature > 38 || p.spo2 < 90 || p.heartRate > 120
    ).length;

    container.innerHTML = `
      <div class="card">
        <h3 style="color: var(--primary); margin-bottom: 0.5rem;">Total Patients</h3>
        <div style="font-size: 2.5rem; font-weight: 700; color: var(--primary);">${totalPatients}</div>
      </div>
      <div class="card">
        <h3 style="color: var(--primary); margin-bottom: 0.5rem;">Connected Devices</h3>
        <div style="font-size: 2.5rem; font-weight: 700; color: var(--primary);">${devices.length}</div>
      </div>
      <div class="card">
        <h3 style="color: var(--primary); margin-bottom: 0.5rem;">Active Alerts</h3>
        <div style="font-size: 2.5rem; font-weight: 700; color: ${alertCount > 0 ? 'var(--danger)' : 'var(--success)'};">${alertCount}</div>
      </div>
    `;
  }

  function showPatientSection(sectionId) {
    document.querySelectorAll('.dashboard-section').forEach(section => {
      section.style.display = 'none';
      section.classList.remove('active');
    });
    const section = document.getElementById(sectionId);
    if (section) {
      section.style.display = 'block';
      section.classList.add('active');

      if (sectionId === 'pat-dashboard') {
        renderDashboardSummary();
      } else if (sectionId === 'live-monitoring') {
        renderDeviceSelector();
      } else if (sectionId === 'patient-list') {
        renderPatientsList();
      } else if (sectionId === 'health-history') {
        populateHistoryPatientSelector();
      }
    }
  }


  // Render Patients List
  function renderPatientsList() {
    loadPatients();
    const tbody = document.getElementById('patientListTableBody');
    if (!tbody) return;

    tbody.innerHTML = '';
    patientsDB.forEach(patient => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${patient.patient_id}</td>
        <td><strong>${patient.patient_name}</strong></td>
        <td>${patient.patient_age}</td>
        <td>${patient.patient_gender}</td>
        <td>${patient.device_id}</td>
        <td>
          <button class="btn-secondary" onclick="window.patientDashboard.openPatientPortal('${patient.patient_id}','${patient.patient_name}','${patient.patient_age}','${patient.patient_gender}')">
            <i class="fa-solid fa-door-open"></i> Open
          </button>
        </td>
      `;
      tbody.appendChild(row);
    });
  }

  // Render Device Selector
  function renderDeviceSelector() {
    loadPatients();
    const container = document.getElementById('deviceSelectorContainer');
    if (!container) return;

    const devices = getUniqueDevices();

    if (devices.length === 0) {
      container.innerHTML = '<div style="text-align: center; color: var(--text-light); padding: 2rem;">No devices or patients registered yet</div>';
      document.getElementById('patientSelectorContainer').innerHTML = '';
      document.getElementById('patientInfoCard').style.display = 'none';
      document.getElementById('monitoringCardsContainer').style.display = 'none';
      document.getElementById('ecgContainer').style.display = 'none';
      document.getElementById('bpFormContainer').style.display = 'none';
      document.getElementById('bpTableContainer').style.display = 'none';
      document.getElementById('monitoringControlCard').style.display = 'none';
      return;
    }

    let html = '<h3 class="card-title"><i class="fa-solid fa-microchip"></i> Step 1: Select Device</h3><div style="display: flex; flex-wrap: wrap; gap: 1rem;">';

    devices.forEach(deviceId => {
      html += `
        <button class="btn-primary" onclick="window.patientDashboard.selectDevice('${deviceId}')">
          <i class="fa-solid fa-microchip"></i> ${deviceId}
        </button>
      `;
    });

    html += '</div>';
    container.innerHTML = html;
  }

  // Render Patient Selector
  function renderPatientSelectorForDevice(deviceId) {
    loadPatients();
    const devicePatients = getPatientsForDevice(deviceId);
    const container = document.getElementById('patientSelectorContainer');

    if (!container) return;

    if (devicePatients.length === 0) {
      container.innerHTML = '<div style="text-align: center; color: var(--text-light); padding: 2rem;">No patients for this device</div>';
      document.getElementById('patientInfoCard').style.display = 'none';
      document.getElementById('monitoringCardsContainer').style.display = 'none';
      document.getElementById('ecgContainer').style.display = 'none';
      document.getElementById('bpFormContainer').style.display = 'none';
      document.getElementById('bpTableContainer').style.display = 'none';
      document.getElementById('monitoringControlCard').style.display = 'none';
      return;
    }

    let html = '<h3 class="card-title"><i class="fa-solid fa-users"></i> Step 2: Select Patient from Device ' + deviceId + '</h3><div class="table-wrapper"><table class="data-table"><thead><tr><th>Patient ID</th><th>Name</th><th>Age</th><th>Gender</th><th>Temperature</th><th>Heart Rate</th><th>SpO₂</th><th>Action</th></tr></thead><tbody>';

    devicePatients.forEach(patient => {
      html += `
        <tr>
          <td><strong>${patient.id}</strong></td>
          <td>${patient.name}</td>
          <td>${patient.age}</td>
          <td>${patient.gender}</td>
          <td>${patient.temperature.toFixed(1)}°C</td>
          <td>${patient.heartRate} BPM</td>
          <td>${patient.spo2}%</td>
          <td>
            <button class="btn-secondary" onclick="window.patientDashboard.selectPatient('${patient.id}', '${deviceId}')">
              <i class="fa-solid fa-eye"></i> Select
            </button>
          </td>
        </tr>
      `;
    });

    html += '</tbody></table></div>';
    container.innerHTML = html;
  }

  // Patient Dashboard namespace
  window.patientDashboard = {
    selectDevice: function (deviceId) {
      window.currentDeviceId = deviceId;
      renderPatientSelectorForDevice(deviceId);
    },

    selectPatient: function (patientId, deviceId) {
      window.currentDeviceId = deviceId;
      window.currentPatientId = patientId;

      loadPatients();
      const patient = patientsDB.find(p => p.id === patientId);
      if (!patient) {
        alert('❌ Patient not found');
        return;
      }

      // Show monitoring control
      document.getElementById('monitoringControlCard').style.display = 'block';

      // Update monitoring system UI
      window.monitoringSystem.updateUI();

      // Update patient info
      updatePatientPortal(patient);
    },

    openPatientPortal: async function (patientId, patientName, patientAge, patientGender) {

      const patient = patientsDB.find(p => p.id === patientId);

      localStorage.setItem("selected_patient_id", patientId)
      localStorage.setItem("selected_patient_name", patientName)

      window.currentPatientId = patientId;
      window.currentDeviceId = patientName || "fetch error";

      showPatientSection('live-monitoring');

      document.querySelectorAll('.menu-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.section === 'live-monitoring') {
          item.classList.add('active');
        }
      });

      const deviceSelectorContainer = document.getElementById('deviceSelectorContainer');
      const patientSelectorContainer = document.getElementById('patientSelectorContainer');
      if (deviceSelectorContainer) deviceSelectorContainer.style.display = 'none';
      if (patientSelectorContainer) patientSelectorContainer.style.display = 'none';

      // Show monitoring control
      document.getElementById('monitoringControlCard').style.display = 'block';
      window.monitoringSystem.updateUI();

      updatePatientPortal(patient);

      setTimeout(() => {
        const section = document.getElementById('live-monitoring');
        if (section) section.scrollIntoView({ behavior: 'smooth' });
      }, 200);
    },

    loadPatientHistory: function (patientId) {
      if (!patientId) {
        showHealthHistoryEmpty();
        return;
      }

      loadPatients();
      const patient = patientsDB.find(p => p.id === patientId);
      if (!patient) {
        alert('❌ Patient not found');
        showHealthHistoryEmpty();
        return;
      }

      window.currentPatientId = patientId;
      displayPatientHealthHistory(patient);
    }
  };

  // Update Patient Portal
  function updatePatientPortal(patient) {
    const infoCard = document.getElementById('patientInfoCard');
    if (infoCard) infoCard.style.display = 'block';

    const elements = {
      'portalPatientName': patient.name,
      'portalPatientAge': patient.age,
      'portalPatientId': patient.id,
      'portalPatientDevice': patient.deviceId
    };

    Object.entries(elements).forEach(([id, value]) => {
      const el = document.getElementById(id);
      if (el) el.textContent = value;
    });

    const patTempEl = document.getElementById('patTemp');
    const patHrEl = document.getElementById('patHr');
    const patSpo2El = document.getElementById('patSpo2');

    if (patTempEl) patTempEl.textContent = patient.temperature.toFixed(1);
    if (patHrEl) patHrEl.textContent = patient.heartRate;
    if (patSpo2El) patSpo2El.textContent = patient.spo2;

    const patTempStatusEl = document.getElementById('patTempStatus');
    const patHrStatusEl = document.getElementById('patHrStatus');
    const patSpo2StatusEl = document.getElementById('patSpo2Status');

    if (patTempStatusEl) patTempStatusEl.textContent = patient.temperature > 38 ? '🔴 High' : '🟢 Normal';
    if (patHrStatusEl) patHrStatusEl.textContent = patient.heartRate > 120 ? '🔴 High' : '🟢 Normal';
    if (patSpo2StatusEl) patSpo2StatusEl.textContent = patient.spo2 < 90 ? '🔴 Critical' : '🟢 Normal';

    updateMonitorCardAlerts(patient);

    const monitoringCards = document.getElementById('monitoringCardsContainer');
    const ecgContainer = document.getElementById('ecgContainer');
    const bpForm = document.getElementById('bpFormContainer');
    const bpTable = document.getElementById('bpTableContainer');
    const alertsContainer = document.getElementById('patientAlertsContainer');

    if (monitoringCards) monitoringCards.style.display = 'grid';
    if (ecgContainer) ecgContainer.style.display = 'block';
    if (bpForm) bpForm.style.display = 'block';
    if (bpTable) bpTable.style.display = 'block';
    if (alertsContainer) alertsContainer.style.display = 'block';

    window.renderPatientMonitoringCards(patient);
    renderBPHistory(patient);
    renderHealthHistory(patient);
    renderPatientAlerts(patient);

    setTimeout(() => renderPatientECGChart(), 100);
  }

  // Render Patient Monitoring Cards
  window.renderPatientMonitoringCards = function (patient) {
    const container = document.getElementById('monitoringCardsContainer');
    if (!container) return;

    const tempAlert = patient.temperature > 38;
    const hrAlert = patient.heartRate > 120;
    const spo2Alert = patient.spo2 < 90;

    container.innerHTML = `
      <div class="monitor-card ${tempAlert ? 'alert' : ''}">
        <div class="monitor-icon-wrapper"><i class="fa-solid fa-temperature-high"></i></div>
        <div class="monitor-value">${patient.temperature.toFixed(1)}</div>
        <div class="monitor-unit">°C</div>
        <div class="monitor-label">Temperature</div>
        <div class="monitor-status">${tempAlert ? '🔴 High' : '🟢 Normal'}</div>
      </div>
      <div class="monitor-card ${hrAlert ? 'alert' : ''}">
        <div class="monitor-icon-wrapper"><i class="fa-solid fa-heart"></i></div>
        <div class="monitor-value">${patient.heartRate}</div>
        <div class="monitor-unit">BPM</div>
        <div class="monitor-label">Heart Rate</div>
        <div class="monitor-status">${hrAlert ? '🔴 High' : '🟢 Normal'}</div>
      </div>
      <div class="monitor-card ${spo2Alert ? 'alert' : ''}">
        <div class="monitor-icon-wrapper"><i class="fa-solid fa-lungs"></i></div>
        <div class="monitor-value">${patient.spo2}</div>
        <div class="monitor-unit">%</div>
        <div class="monitor-label">Oxygen Level</div>
        <div class="monitor-status">${spo2Alert ? '🔴 Critical' : '🟢 Normal'}</div>
      </div>
    `;
  };

  // Update Monitor Card Alert States
  function updateMonitorCardAlerts(patient) {
    const tempCard = document.getElementById('patTempCard');
    const hrCard = document.getElementById('patHrCard');
    const spo2Card = document.getElementById('patSpo2Card');

    if (tempCard) tempCard.classList.toggle('alert', patient.temperature > 38);
    if (hrCard) hrCard.classList.toggle('alert', patient.heartRate > 120);
    if (spo2Card) spo2Card.classList.toggle('alert', patient.spo2 < 90);
  }

  // Blood Pressure Form
  const bpForm = document.getElementById('bpEntryForm');
  if (bpForm) {
    bpForm.addEventListener('submit', function (e) {
      e.preventDefault();

      if (!window.currentPatientId) {
        alert('❌ Please select a patient first');
        return;
      }

      const systolic = parseInt(document.getElementById('systolic').value);
      const diastolic = parseInt(document.getElementById('diastolic').value);

      loadPatients();
      const patient = patientsDB.find(p => p.id === window.currentPatientId);
      if (!patient) return;

      const now = new Date();
      const time = now.toISOString().slice(0, 10) + ' ' + now.toTimeString().slice(0, 5);

      patient.bpHistory.unshift({ time, sys: systolic, dia: diastolic });
      patient.healthHistory.unshift({
        date: time,
        temp: patient.temperature,
        hr: patient.heartRate,
        spo2: patient.spo2,
        bp: `${systolic}/${diastolic}`,
        status: (systolic > 140 || diastolic > 90) ? 'Abnormal' : 'Normal'
      });

      savePatients();
      renderBPHistory(patient);
      renderHealthHistory(patient);
      renderPatientAlerts(patient);
      this.reset();
      alert('✅ Blood Pressure recorded!');
    });
  }

  // Render BP History
  function renderBPHistory(patient) {
    const tbody = document.getElementById('bpHistoryTableBody');
    if (!tbody) return;

    tbody.innerHTML = '';
    if (!patient.bpHistory || patient.bpHistory.length === 0) {
      tbody.innerHTML = '<tr><td colspan="3" style="text-align: center; padding: 1rem;">No records yet</td></tr>';
      return;
    }

    patient.bpHistory.forEach(bp => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${bp.time}</td>
        <td><strong>${bp.sys}</strong></td>
        <td><strong>${bp.dia}</strong></td>
      `;
      tbody.appendChild(row);
    });
  }

  // Render Health History
  function renderHealthHistory(patient) {
    const tbody = document.getElementById('healthHistoryTableBody');
    if (!tbody) return;

    tbody.innerHTML = '';
    if (!patient.healthHistory || patient.healthHistory.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 1rem;">No records yet</td></tr>';
      return;
    }

    patient.healthHistory.forEach(record => {
      const statusClass = record.status === 'Normal' ? 'status-ok' : 'status-abnormal';
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${record.date}</td>
        <td>${record.temp}</td>
        <td>${record.hr}</td>
        <td>${record.spo2}</td>
        <td>${record.bp}</td>
        <td><span class="${statusClass}">${record.status}</span></td>
      `;
      tbody.appendChild(row);
    });
  }

  // Render Patient Alerts
  function renderPatientAlerts(patient) {
    const container = document.getElementById('patientAlertsContainer');
    if (!container) return;

    container.innerHTML = '';
    const alerts = [];

    if (patient.temperature > 38) alerts.push(`🌡️ High Temperature: ${patient.temperature}°C`);
    if (patient.spo2 < 90) alerts.push(`🫁 Critical SpO₂: ${patient.spo2}%`);
    if (patient.heartRate > 120) alerts.push(`❤️ High Heart Rate: ${patient.heartRate} BPM`);

    if (alerts.length === 0) {
      container.innerHTML = '<div style="text-align: center; color: var(--success); padding: 1.5rem; background: #f1f8f6; border-radius: 8px;"><i class="fa-solid fa-check-circle" style="font-size: 2rem; margin-bottom: 0.5rem; display: block;"></i><strong>All vital signs are normal!</strong></div>';
      return;
    }

    alerts.forEach(msg => {
      const alertDiv = document.createElement('div');
      alertDiv.className = 'alert-card';
      alertDiv.innerHTML = `<i class="fa-solid fa-exclamation-triangle"></i> ${msg}`;
      container.appendChild(alertDiv);
    });
  }

  // Render Patient ECG Chart
  function renderPatientECGChart() {
    const canvasElement = document.getElementById('patEcgChart');
    if (!canvasElement) return;

    const ctx = canvasElement.getContext('2d');
    let ecgData = [];
    for (let i = 0; i < 60; i++) {
      const wave = Math.sin((i / 10) * Math.PI);
      const noise = (Math.random() - 0.5) * 0.3;
      ecgData.push(wave * 1.5 + noise);
    }

    if (patEcgChart) {
      patEcgChart.destroy();
      if (patEcgAnimationId) clearInterval(patEcgAnimationId);
    }

    patEcgChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: Array(60).fill(''),
        datasets: [{
          label: 'ECG Signal (mV)',
          data: ecgData,
          borderColor: '#1481ba',
          borderWidth: 2.5,
          backgroundColor: 'rgba(20, 129, 186, 0.06)',
          pointRadius: 0,
          fill: true,
          tension: 0.4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        animation: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { display: false },
          y: { min: -2.5, max: 2.5, grid: { color: 'rgba(200, 230, 255, 0.3)' } }
        }
      }
    });

    patEcgAnimationId = setInterval(() => {
      if (!patEcgChart || !patEcgChart.data) return;
      const dataArray = patEcgChart.data.datasets[0].data;
      const t = Date.now() / 200;
      const newVal = Math.sin((t % 60) / 10) * 1.5 + (Math.random() - 0.5) * 0.3;
      dataArray.push(newVal);
      if (dataArray.length > 60) dataArray.shift();
      patEcgChart.update('none');
    }, 700);
  }

  // Populate History Patient Selector
  function populateHistoryPatientSelector() {
    loadPatients();
    const selector = document.getElementById('historyPatientSelect');
    if (!selector) return;

    selector.innerHTML = '<option value="">-- Select a Patient --</option>';

    if (patientsDB.length === 0) {
      selector.innerHTML = '<option value="">No patients registered</option>';
      document.getElementById('historyPatientInfoCard').style.display = 'none';
      showHealthHistoryEmpty();
      return;
    }

    patientsDB.forEach(patient => {
      const option = document.createElement('option');
      option.value = patient.id;
      option.textContent = `${patient.name} (${patient.id}) - ${patient.deviceId}`;
      selector.appendChild(option);
    });

    if (window.currentPatientId) {
      selector.value = window.currentPatientId;
    }
  }

  // Display Patient Health History
  function displayPatientHealthHistory(patient) {
    const infoCard = document.getElementById('historyPatientInfoCard');
    if (infoCard) {
      infoCard.style.display = 'block';
      document.getElementById('historyPatientName').textContent = patient.name;
      document.getElementById('historyPatientAge').textContent = patient.age;
      document.getElementById('historyPatientId').textContent = patient.id;
      document.getElementById('historyPatientDevice').textContent = patient.deviceId;
    }

    renderHealthHistory(patient);
  }

  // Show Empty Health History
  function showHealthHistoryEmpty() {
    const infoCard = document.getElementById('historyPatientInfoCard');
    if (infoCard) infoCard.style.display = 'none';

    const tbody = document.getElementById('healthHistoryTableBody');
    if (tbody) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 2rem; color: var(--text-light);"><i class="fa-solid fa-exclamation-circle"></i> Select a patient to view health history</td></tr>';
    }
  }

  // Menu Item Click Handlers
  document.querySelectorAll('.menu-item').forEach(item => {
    item.addEventListener('click', function () {
      document.querySelectorAll('.menu-item').forEach(i => i.classList.remove('active'));
      this.classList.add('active');
      const sectionId = this.dataset.section;
      showPatientSection(sectionId);
    });
  });

  // Patient Logout
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', function () {
      // Stop monitoring on logout
      if (window.monitoringSystem.activeSession) {
        window.monitoringSystem.stopMonitoring();
      }

      localStorage.removeItem('currentUser');
      localStorage.removeItem('userType');
      localStorage.removeItem('userEmail');
      localStorage.removeItem('userName');
      window.location.href = 'index.html';
    });
  }

  // =======================================
  // INITIALIZATION
  // =======================================
  // loadPatients();
  // renderPatientsList();
  renderDashboardSummary();

  // Initialize monitoring system
  window.monitoringSystem.init();

  showPatientSection('pat-dashboard');
}