// ===== SKILLVANCE CERTIFICATE DATABASE =====
// Add certificates here when students complete programs

const certificatesDB = [
    // SAMPLE CERTIFICATES - DELETE AND ADD REAL ONES
    {
        id: "SKV2025ML00001",
        name: "Sample Student",
        domain: "Machine Learning Engineer",
        completionDate: "2025-03-29",
        mentorName: "Mentor Name",
        verified: true
    },
    {
        id: "SKV2025DS00001",
        name: "Another Student",
        domain: "Data Scientist",
        completionDate: "2025-03-28",
        mentorName: "Mentor Name",
        verified: true
    },
    {
        id: "SKV2025WEB00001",
        name: "Web Developer Student",
        domain: "Web Developer",
        completionDate: "2025-03-27",
        mentorName: "Mentor Name",
        verified: true
    }
    // ===== ADD MORE CERTIFICATES LIKE THIS =====
    // {
    //     id: "SKV2025DA00001",
    //     name: "Student Name",
    //     domain: "Data Analyst",
    //     completionDate: "2025-03-29",
    //     mentorName: "Mentor Name",
    //     verified: true
    // }
];

// ===== VERIFY CERTIFICATE FUNCTION =====
function verifyCertificate() {
    const id = document.getElementById('certId').value.trim().toUpperCase();
    const result = document.getElementById('verifyResult');

    if (!id) {
        result.className = 'verify-result error';
        result.style.display = 'block';
        result.innerHTML = '<p style="color:#ef4444">Please enter a Certificate ID.</p>';
        return;
    }

    result.className = 'verify-result';
    result.style.display = 'block';
    result.innerHTML = '<p style="text-align:center;color:var(--text-muted)">Verifying...</p>';

    setTimeout(() => {
        const certificate = certificatesDB.find(cert => cert.id === id);

        if (certificate && certificate.verified) {
            result.className = 'verify-result success';
            result.innerHTML = `
                <div style="text-align:center">
                    <div style="color:#22c55e;font-size:1.2rem;margin-bottom:12px">✓ Certificate Verified</div>
                    <div style="background:rgba(34,197,94,0.1);border:1px solid rgba(34,197,94,0.3);border-radius:8px;padding:16px;margin:12px 0">
                        <p style="color:var(--text-secondary);margin:8px 0"><strong>Name:</strong> ${certificate.name}</p>
                        <p style="color:var(--text-secondary);margin:8px 0"><strong>Domain:</strong> ${certificate.domain}</p>
                        <p style="color:var(--text-secondary);margin:8px 0"><strong>Completed:</strong> ${certificate.completionDate}</p>
                        <p style="color:var(--text-secondary);margin:8px 0"><strong>Mentor:</strong> ${certificate.mentorName}</p>
                    </div>
                    <p style="color:var(--text-muted);font-size:0.85rem;margin-top:12px">This certificate is authentic and verified by Skillvance Technologies.</p>
                </div>
            `;
        } else {
            result.className = 'verify-result error';
            result.innerHTML = '<p style="color:#ef4444">Certificate not found. Please check your ID or contact <a href="mailto:support@skillvancetechnologies.com" style="color:#ef4444;text-decoration:underline">support@skillvancetechnologies.com</a>.</p>';
        }
    }, 1500);
}
