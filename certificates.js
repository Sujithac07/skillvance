function resolveApiBaseUrl() {
 const host = window.location.hostname;
 const isLocalHost = host === 'localhost' || host === '127.0.0.1';
 const isFileProtocol = window.location.protocol === 'file:';

 if (isFileProtocol || (isLocalHost && window.location.port !== '5000')) {
 return 'http://localhost:5000/api';
 }

 return '/api';
}

const API_BASE_URL = resolveApiBaseUrl();

async function safeJson(response) {
 const contentType = response.headers.get('content-type') || '';
 if (!contentType.includes('application/json')) {
 return null;
 }

 try {
 return await response.json();
 } catch (_error) {
 return null;
 }
}

async function verifyCertificate() {
 const idInput = document.getElementById('certId');
 const result = document.getElementById('verifyResult');
 const id = String(idInput?.value || '').trim().toUpperCase();

 if (!id) {
 result.className = 'verify-result error';
 result.style.display = 'block';
 result.innerHTML = '<p style="color:#ef4444">Please enter a Certificate ID.</p>';
 return;
 }

 result.className = 'verify-result';
 result.style.display = 'block';
 result.innerHTML = '<p style="text-align:center;color:var(--text-muted)">Verifying...</p>';

 const verifyUrl = new URL(window.location.href);
 verifyUrl.searchParams.set('certId', id);
 window.history.replaceState(null, '', verifyUrl.toString());

 try {
 const response = await fetch(`${API_BASE_URL}/certificates/verify/${encodeURIComponent(id)}`);
 const data = await safeJson(response);

 if (!response.ok || !data?.verified) {
 const message = data?.message || 'Certificate not found. Please check your ID.';
 result.className = 'verify-result error';
 result.innerHTML = `<p style="color:#ef4444">${message}</p>`;
 return;
 }

 const certificate = data.certificate;
 const issueDate = certificate.issueDate || certificate.completionDate;
 const score = Number.isFinite(Number(certificate.score)) ? Number(certificate.score) : null;
 result.className = 'verify-result success';
 
 const marksPercentage = score !== null ? Math.min(Math.max(score, 0), 100) : 0;
 const circleColor = marksPercentage >= 75 ? '#22c55e' : marksPercentage >= 50 ? '#fbbf24' : '#ef4444';
 
 result.innerHTML = `
 <div style="text-align:center;animation:slideInScale 0.6s ease-out">
 <div style="position:relative;width:140px;height:140px;margin:0 auto 24px;animation:float 3s ease-in-out infinite">
 <svg viewBox="0 0 140 140" style="filter:drop-shadow(0 0 20px rgba(34,197,94,0.3))">
 <circle cx="70" cy="70" r="65" fill="none" stroke="${circleColor}" stroke-width="2" opacity="0.2"/>
 <circle cx="70" cy="70" r="65" fill="none" stroke="${circleColor}" stroke-width="3" stroke-dasharray="409" stroke-dashoffset="${409 - (409 * marksPercentage / 100)}" stroke-linecap="round" style="transition:stroke-dashoffset 1.5s ease-out;transform-origin:center"/>
 <text x="70" y="75" text-anchor="middle" font-size="36" font-weight="bold" fill="${circleColor}" style="animation:countUp 1.5s ease-out">${score !== null ? Math.round(marksPercentage) : '--'}</text>
 <text x="70" y="95" text-anchor="middle" font-size="12" fill="var(--text-secondary)">out of 100</text>
 </svg>
 </div>
 <div style="color:#22c55e;font-size:1.3rem;margin-bottom:16px;font-weight:600;animation:slideInDown 0.6s ease-out 0.2s both">✓ Certificate Verified</div>
 <div style="background:rgba(34,197,94,0.08);border:2px solid rgba(34,197,94,0.3);border-radius:12px;padding:20px;margin:12px 0;backdrop-filter:blur(10px);animation:slideInUp 0.6s ease-out 0.3s both">
 <p style="color:var(--text-secondary);margin:12px 0;font-size:1.1rem"><strong style="color:var(--text-primary)">Name:</strong> ${certificate.name}</p>
 <p style="color:var(--text-secondary);margin:12px 0;font-size:1rem"><strong style="color:var(--text-primary)">Domain:</strong> ${certificate.domain}</p>
 <p style="color:var(--text-secondary);margin:12px 0"><strong style="color:var(--text-primary)">Issue Date:</strong> ${new Date(issueDate).toISOString().slice(0, 10)}</p>
 ${certificate.email ? `<p style="color:var(--text-secondary);margin:12px 0"><strong style="color:var(--text-primary)">Email:</strong> ${certificate.email}</p>` : ''}
 <p style="color:var(--text-secondary);margin:12px 0"><strong style="color:var(--text-primary)">Mentor:</strong> ${certificate.mentorName}</p>
 </div>
 <p style="color:var(--text-muted);font-size:0.9rem;margin-top:16px;animation:fadeIn 0.8s ease-out 0.5s both">This certificate is authentic and verified by Skillvance Technologies.</p>
 </div>
 `;
 } catch (_error) {
 result.className = 'verify-result error';
 result.innerHTML = '<p style="color:#ef4444">Unable to verify right now. Please try again in a moment.</p>';
 }
}

function initializeVerificationFromQuery() {
 const params = new URLSearchParams(window.location.search || '');
 const certId = String(params.get('certId') || '').trim().toUpperCase();
 if (!certId) {
  return;
 }

 const idInput = document.getElementById('certId');
 if (idInput) {
  idInput.value = certId;
 }

 verifyCertificate();
}

document.addEventListener('DOMContentLoaded', initializeVerificationFromQuery);
