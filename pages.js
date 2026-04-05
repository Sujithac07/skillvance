// ===== SKILLVANCE - PAGE-SPECIFIC LOGIC =====

// ===== DOMAIN DATA =====
const domainData = {
 ml: {
 name: 'Machine Learning Engineer', icon: 'ml', duration: '8-12 weeks', difficulty: 'Intermediate',
 tech: ['Python', 'TensorFlow', 'PyTorch', 'Scikit-learn', 'Pandas', 'Jupyter', 'Git'],
 topics: ['Neural Networks', 'Deep Learning', 'Model Deployment', 'Supervised Learning', 'Unsupervised Learning', 'Reinforcement Learning'],
 careers: ['ML Engineer', 'AI Researcher', 'Data Scientist', 'ML Ops Engineer', 'Computer Vision Specialist', 'NLP Engineer'],
 desc: 'Build predictive models, deep learning, NLP, computer vision, and MLOps systems'
 },
 ds: {
 name: 'Data Scientist', icon: 'ds', duration: '8-12 weeks', difficulty: 'Intermediate',
 tech: ['Python', 'R', 'Pandas', 'NumPy', 'Matplotlib', 'SQL', 'Tableau'],
 topics: ['Statistical Analysis', 'Data Visualization', 'Hypothesis Testing', 'Predictive Modeling', 'A/B Testing', 'Business Analytics'],
 careers: ['Data Scientist', 'ML Engineer', 'BI Analyst', 'Research Analyst', 'Product Analyst', 'Quantitative Analyst'],
 desc: 'Turn raw data into decisions that matter - build models, uncover insights'
 },
 da: {
 name: 'Data Analyst', icon: 'da', duration: '8-10 weeks', difficulty: 'Beginner-Intermediate',
 tech: ['Excel', 'SQL', 'Python', 'Tableau', 'Power BI', 'Pandas', 'Google Sheets'],
 topics: ['Data Cleaning', 'Dashboard Design', 'KPI Tracking', 'Exploratory Analysis', 'Reporting', 'Business Intelligence'],
 careers: ['Data Analyst', 'BI Analyst', 'Reporting Analyst', 'Operations Analyst', 'Market Research Analyst', 'Insights Analyst'],
 desc: 'Numbers tell stories - find them, measure them, tell them'
 },
 web: {
 name: 'Web Developer', icon: 'web', duration: '10-12 weeks', difficulty: 'Beginner-Intermediate',
 tech: ['HTML/CSS', 'JavaScript', 'React', 'Node.js', 'MongoDB', 'Git', 'Figma'],
 topics: ['Responsive Design', 'REST APIs', 'State Management', 'Authentication', 'Deployment', 'UI/UX Principles'],
 careers: ['Frontend Developer', 'Backend Developer', 'Full-Stack Developer', 'UI Developer', 'Web Designer', 'DevOps Engineer'],
 desc: 'Build the internet. Full-stack skills, modern frameworks, real projects'
 },
 cyber: {
 name: 'Cybersecurity Engineer', icon: 'cyber', duration: '10-12 weeks', difficulty: 'Intermediate-Advanced',
 tech: ['Kali Linux', 'Wireshark', 'Nmap', 'Burp Suite', 'Python', 'Metasploit', 'OWASP'],
 topics: ['Network Security', 'Penetration Testing', 'Vulnerability Assessment', 'Incident Response', 'Cryptography', 'Threat Modeling'],
 careers: ['Security Analyst', 'Pen Tester', 'SOC Analyst', 'Security Engineer', 'Forensics Analyst', 'CISO'],
 desc: 'Protect what matters. Hunt vulnerabilities, defend networks'
 },
 ai: {
 name: 'Gen AI Engineer', icon: 'ai', duration: '8-10 weeks', difficulty: 'Intermediate',
 tech: ['Python', 'LLMs', 'Langchain', 'OpenAI API', 'Prompt Engineering', 'Vector DB', 'RAG'],
 topics: ['Large Language Models', 'Prompt Engineering', 'Fine-tuning', 'RAG Systems', 'AI Agent Design', 'Ethical AI'],
 careers: ['AI Engineer', 'Prompt Engineer', 'ML Engineer', 'AI Architect', 'LLM Specialist', 'AI Solutions Engineer'],
 desc: 'Build intelligent applications powered by generative AI - LLMs, agents, and production systems'
 }
};

// ===== COMPARISON TOOL =====
function updateComparison() {
 const s1 = document.getElementById('compare1');
 const s2 = document.getElementById('compare2');
 if (!s1 || !s2) return;
 const d1 = domainData[s1.value], d2 = domainData[s2.value];
 document.getElementById('comp-h1').textContent = d1.name;
 document.getElementById('comp-h2').textContent = d2.name;
 const rows = [
 ['Duration', d1.duration, d2.duration],
 ['Difficulty', d1.difficulty, d2.difficulty],
 ['Tech Stack', d1.tech.map(t => `<span class="tech-tag">${t}</span>`).join(''), d2.tech.map(t => `<span class="tech-tag">${t}</span>`).join('')],
 ['Key Topics', d1.topics.map(t => `<span class="tech-tag">${t}</span>`).join(''), d2.topics.map(t => `<span class="tech-tag">${t}</span>`).join('')],
 ['Career Paths', d1.careers.map(t => `<span class="tech-tag">${t}</span>`).join(''), d2.careers.map(t => `<span class="tech-tag">${t}</span>`).join('')],
 ['Description', d1.desc, d2.desc],
 ['Certificate', '<span class="tech-tag">Verifiable Credential</span>', '<span class="tech-tag">Verifiable Credential</span>']
 ];
 document.getElementById('comparisonBody').innerHTML = rows.map(r =>
 `<tr><td class="aspect-label">${r[0]}</td><td>${r[1]}</td><td>${r[2]}</td></tr>`
 ).join('');
}

// ===== CAREER QUIZ =====
const quizQuestions = [
 {
 q: 'What excites you the most in technology?', opts: [
 { text: 'Building intelligent systems that learn from data', scores: { ml: 3, ds: 2, da: 1 } },
 { text: 'Creating beautiful and responsive user interfaces', scores: { web: 3 } },
 { text: 'Analyzing patterns and extracting insights from data', scores: { ds: 2, da: 3, ml: 1 } },
 { text: 'Securing systems and preventing cyber threats', scores: { cyber: 3 } }
 ]
 },
 {
 q: 'How do you prefer to solve problems?', opts: [
 { text: 'Build mathematical models and algorithms', scores: { ml: 3, ds: 2 } },
 { text: 'Visualize data and create dashboards', scores: { da: 3, ds: 1 } },
 { text: 'Write code to build features and products', scores: { web: 3, bc: 1 } },
 { text: 'Break things to find vulnerabilities', scores: { cyber: 3 } }
 ]
 },
 {
 q: 'Which tools interest you the most?', opts: [
 { text: 'TensorFlow, PyTorch, Jupyter Notebooks', scores: { ml: 3, ds: 1 } },
 { text: 'React, Node.js, Figma', scores: { web: 3 } },
 { text: 'SQL, Tableau, Power BI', scores: { da: 3 } },
 { text: 'Solidity, Ethereum, Smart Contracts', scores: { bc: 3 } }
 ]
 },
 {
 q: 'Where do you see yourself in 5 years?', opts: [
 { text: 'Leading an AI/ML research team', scores: { ml: 3, ds: 2 } },
 { text: 'Building products used by millions', scores: { web: 3, bc: 1 } },
 { text: 'Driving business decisions with data', scores: { da: 3, ds: 2 } },
 { text: 'Protecting organizations from cyber attacks', scores: { cyber: 3 } }
 ]
 }
];

let quizStep = 0;
const quizScores = { ml: 0, ds: 0, da: 0, web: 0, cyber: 0, bc: 0 };

function initQuiz() {
 if (!document.getElementById('quizQuestions')) return;
 renderQuizQuestion();
}

function renderQuizQuestion() {
 const container = document.getElementById('quizQuestions');
 if (quizStep >= quizQuestions.length) { showQuizResult(); return; }
 const q = quizQuestions[quizStep];
 container.innerHTML = `<div class="quiz-question"><h3>${q.q}</h3><div class="quiz-options">
 ${q.opts.map((o, i) => `<button class="quiz-option" onclick="selectQuizOption(${i})">${o.text}</button>`).join('')}
 </div></div>`;
 document.getElementById('quizStep').textContent = quizStep + 1;
 document.getElementById('quizProgressFill').style.width = ((quizStep + 1) / quizQuestions.length * 100) + '%';
}

function selectQuizOption(idx) {
 const opt = quizQuestions[quizStep].opts[idx];
 for (const [k, v] of Object.entries(opt.scores || {})) quizScores[k] = (quizScores[k] || 0) + v;
 const btns = document.querySelectorAll('.quiz-option');
 btns[idx].classList.add('selected');
 btns.forEach(b => b.disabled = true);
 setTimeout(() => { quizStep++; renderQuizQuestion(); }, 450);
}

function showQuizResult() {
 document.getElementById('quizQuestions').style.display = 'none';
 document.querySelector('.quiz-progress').style.display = 'none';
 const best = Object.entries(quizScores).sort((a, b) => b[1] - a[1])[0][0];
 const d = domainData[best];
 const result = document.getElementById('quizResult');
 document.getElementById('resultTitle').textContent = `You'd be a great ${d.name}!`;
 document.getElementById('resultDesc').textContent = d.desc;
 result.classList.add('show');
}

// ===== CONTACT FORM =====
function handleContact(e) {
 e.preventDefault();
 const btn = e.target.querySelector('.form-submit');
 const orig = btn.innerHTML;
 btn.innerHTML = 'Sending...'; btn.disabled = true;
 setTimeout(() => {
 btn.innerHTML = 'Message received. We\'ll get back to you within 24 hours.';
 btn.style.background = 'linear-gradient(135deg, #22c55e, #06b6d4)';
 setTimeout(() => { btn.innerHTML = orig; btn.style.background = ''; btn.disabled = false; e.target.reset(); }, 3000);
 }, 1500);
}

// Init page-specific features
document.addEventListener('DOMContentLoaded', () => {
 if (document.getElementById('compare1')) updateComparison();
 initQuiz();
});
