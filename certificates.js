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
 result.innerHTML = `
 <div style="text-align:center">
 <div style="color:#22c55e;font-size:1.2rem;margin-bottom:12px">- Certificate Verified</div>
 <div style="background:rgba(34,197,94,0.1);border:1px solid rgba(34,197,94,0.3);border-radius:8px;padding:16px;margin:12px 0">
 <p style="color:var(--text-secondary);margin:8px 0"><strong>Name:</strong> ${certificate.name}</p>
 <p style="color:var(--text-secondary);margin:8px 0"><strong>Domain:</strong> ${certificate.domain}</p>
 <p style="color:var(--text-secondary);margin:8px 0"><strong>Issue Date:</strong> ${new Date(issueDate).toISOString().slice(0, 10)}</p>
 ${score === null ? '' : `<p style="color:var(--text-secondary);margin:8px 0"><strong>Marks Scored:</strong> ${score}</p>`}
 ${certificate.email ? `<p style="color:var(--text-secondary);margin:8px 0"><strong>Email:</strong> ${certificate.email}</p>` : ''}
 <p style="color:var(--text-secondary);margin:8px 0"><strong>Mentor:</strong> ${certificate.mentorName}</p>
 ${certificate.verificationCount === undefined ? '' : `<p style="color:var(--text-secondary);margin:8px 0"><strong>Verification Count:</strong> ${certificate.verificationCount}</p>`}
 </div>
 <p style="color:var(--text-muted);font-size:0.85rem;margin-top:12px">This certificate is authentic and verified by Skillvance Technologies.</p>
 </div>
 `;
 } catch (_error) {
 result.className = 'verify-result error';
 result.innerHTML = '<p style="color:#ef4444">Unable to verify right now. Please try again in a moment.</p>';
 }
}
