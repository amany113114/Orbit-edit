/* ==========================================================================
   ORBIT CV / RESUME MAKER CONTROLLER
   ========================================================================== */

const OrbitCVMaker = {
    experiences: [
        {
            title: "Senior Fullstack Engineer",
            company: "TechCorp Solutions",
            dates: "2023 - Present",
            location: "Gurugram, India",
            description: "Led architecture and development of scalable web platforms, FastAPI microservices, and dynamic user dashboards."
        },
        {
            title: "Software Developer",
            company: "Apex Digital Labs",
            dates: "2021 - 2023",
            location: "Bengaluru, India",
            description: "Engineered responsive frontend interfaces using React, Tailwind CSS, and REST API integrations."
        }
    ],

    education: [
        {
            degree: "B.Tech in Computer Science & Engineering",
            school: "Indian Institute of Technology (IIT)",
            dates: "2017 - 2021",
            location: "New Delhi, India"
        }
    ],

    skills: ["Python", "FastAPI", "React.js", "Node.js", "Docker", "PostgreSQL", "Git", "REST APIs"],

    init() {
        this.renderExperience();
        this.renderEducation();
        this.renderSkills();
        this.bindEvents();
    },

    bindEvents() {
        const addExpBtn = document.getElementById('cv-add-exp');
        if (addExpBtn) {
            addExpBtn.addEventListener('click', () => {
                this.experiences.push({
                    title: "Job Title",
                    company: "Company Name",
                    dates: "2022 - 2024",
                    location: "Location",
                    description: "Key responsibilities and achievements in this role."
                });
                this.renderExperience();
            });
        }

        const addEduBtn = document.getElementById('cv-add-edu');
        if (addEduBtn) {
            addEduBtn.addEventListener('click', () => {
                this.education.push({
                    degree: "Degree / Course Name",
                    school: "University / Institute Name",
                    dates: "2018 - 2022",
                    location: "Location"
                });
                this.renderEducation();
            });
        }

        const skillInput = document.getElementById('cv-skill-input');
        if (skillInput) {
            skillInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ',') {
                    e.preventDefault();
                    const val = skillInput.value.trim().replace(',', '');
                    if (val && !this.skills.includes(val)) {
                        this.skills.push(val);
                        skillInput.value = '';
                        this.renderSkills();
                    }
                }
            });
        }

        const form = document.getElementById('cv-maker-form');
        if (form) {
            form.addEventListener('submit', (e) => this.handleSubmit(e));
        }
    },

    renderExperience() {
        const container = document.getElementById('cv-exp-container');
        if (!container) return;

        container.innerHTML = '';
        this.experiences.forEach((exp, index) => {
            const card = document.createElement('div');
            card.style.cssText = "background: rgba(10,12,24,0.6); padding: 1.25rem; border-radius: var(--radius-md); border: 1px solid var(--border-color); margin-bottom: 1rem;";
            card.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 0.75rem;">
                    <h4 style="color:var(--primary-cyan);">Experience #${index + 1}</h4>
                    <button type="button" class="btn-icon" style="width:28px;height:28px;" onclick="OrbitCVMaker.removeExperience(${index})">
                        <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                </div>
                <div class="grid-2col">
                    <div class="form-group">
                        <label>Job Title</label>
                        <input type="text" class="input-glow" value="${exp.title}" onchange="OrbitCVMaker.experiences[${index}].title=this.value">
                    </div>
                    <div class="form-group">
                        <label>Company Name</label>
                        <input type="text" class="input-glow" value="${exp.company}" onchange="OrbitCVMaker.experiences[${index}].company=this.value">
                    </div>
                </div>
                <div class="grid-2col">
                    <div class="form-group">
                        <label>Dates (e.g. 2022 - Present)</label>
                        <input type="text" class="input-glow" value="${exp.dates}" onchange="OrbitCVMaker.experiences[${index}].dates=this.value">
                    </div>
                    <div class="form-group">
                        <label>Location</label>
                        <input type="text" class="input-glow" value="${exp.location}" onchange="OrbitCVMaker.experiences[${index}].location=this.value">
                    </div>
                </div>
                <div class="form-group">
                    <label>Description & Key Achievements</label>
                    <textarea class="input-glow" rows="2" onchange="OrbitCVMaker.experiences[${index}].description=this.value">${exp.description}</textarea>
                </div>
            `;
            container.appendChild(card);
        });
    },

    removeExperience(index) {
        this.experiences.splice(index, 1);
        this.renderExperience();
    },

    renderEducation() {
        const container = document.getElementById('cv-edu-container');
        if (!container) return;

        container.innerHTML = '';
        this.education.forEach((edu, index) => {
            const card = document.createElement('div');
            card.style.cssText = "background: rgba(10,12,24,0.6); padding: 1.25rem; border-radius: var(--radius-md); border: 1px solid var(--border-color); margin-bottom: 1rem;";
            card.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 0.75rem;">
                    <h4 style="color:var(--primary-cyan);">Education #${index + 1}</h4>
                    <button type="button" class="btn-icon" style="width:28px;height:28px;" onclick="OrbitCVMaker.removeEducation(${index})">
                        <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                </div>
                <div class="grid-2col">
                    <div class="form-group">
                        <label>Degree / Qualification</label>
                        <input type="text" class="input-glow" value="${edu.degree}" onchange="OrbitCVMaker.education[${index}].degree=this.value">
                    </div>
                    <div class="form-group">
                        <label>School / University Name</label>
                        <input type="text" class="input-glow" value="${edu.school}" onchange="OrbitCVMaker.education[${index}].school=this.value">
                    </div>
                </div>
                <div class="grid-2col">
                    <div class="form-group">
                        <label>Dates</label>
                        <input type="text" class="input-glow" value="${edu.dates}" onchange="OrbitCVMaker.education[${index}].dates=this.value">
                    </div>
                    <div class="form-group">
                        <label>Location</label>
                        <input type="text" class="input-glow" value="${edu.location}" onchange="OrbitCVMaker.education[${index}].location=this.value">
                    </div>
                </div>
            `;
            container.appendChild(card);
        });
    },

    removeEducation(index) {
        this.education.splice(index, 1);
        this.renderEducation();
    },

    renderSkills() {
        const tagsContainer = document.getElementById('cv-skills-tags');
        if (!tagsContainer) return;

        tagsContainer.innerHTML = '';
        this.skills.forEach((skill, index) => {
            const tag = document.createElement('span');
            tag.className = 'option-btn selected';
            tag.style.cssText = "display:inline-flex; align-items:center; gap:0.4rem; padding:0.3rem 0.8rem; margin:0.25rem;";
            tag.innerHTML = `
                <span>${skill}</span>
                <span style="cursor:pointer; font-weight:bold;" onclick="OrbitCVMaker.removeSkill(${index})">×</span>
            `;
            tagsContainer.appendChild(tag);
        });
    },

    removeSkill(index) {
        this.skills.splice(index, 1);
        this.renderSkills();
    },

    async handleSubmit(e) {
        e.preventDefault();
        const submitBtn = document.getElementById('cv-submit-btn');
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span>Compiling Professional CV PDF...</span>';

        const payload = {
            full_name: document.getElementById('cv-name').value || "Professional Name",
            job_title: document.getElementById('cv-title').value || "Software Engineer",
            email: document.getElementById('cv-email').value || "email@example.com",
            phone: document.getElementById('cv-phone').value || "+91 98765 43210",
            location: document.getElementById('cv-location').value || "India",
            website: document.getElementById('cv-website').value || "",
            summary: document.getElementById('cv-summary').value || "",
            skills: this.skills,
            template: document.getElementById('cv-template-select').value || "modern",
            experience: this.experiences,
            education: this.education
        };

        try {
            const response = await fetch('/api/generate-cv', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (response.ok && !response.headers.get('content-type')?.includes('text/html')) {
                const blob = await response.blob();
                const downloadUrl = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = downloadUrl;
                a.download = `CV_${payload.full_name.replace(/\s+/g, '_')}.pdf`;
                document.body.appendChild(a);
                a.click();
                a.remove();
                showToast("Professional CV PDF generated and downloaded!", "success");
            } else {
                this.generateClientCVWindow(payload);
            }
        } catch (err) {
            this.generateClientCVWindow(payload);
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = `
                <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                <span>Generate & Download CV (PDF)</span>
            `;
        }
    },

    generateClientCVWindow(payload) {
        const win = window.open('', '', 'width=850,height=950');
        if (!win) {
            showToast("Please allow popups to download client CV.", "error");
            return;
        }

        let expHTML = '';
        payload.experience.forEach(exp => {
            expHTML += `
                <div style="margin-bottom: 15px;">
                    <div style="display:flex; justify-content:space-between; font-weight:bold; font-size:15px;">
                        <span>${exp.title} — ${exp.company}</span>
                        <span>${exp.dates}</span>
                    </div>
                    <div style="font-size:13px; color:#555; margin-bottom:4px;">${exp.location}</div>
                    <div style="font-size:13px; color:#333;">${exp.description}</div>
                </div>
            `;
        });

        let eduHTML = '';
        payload.education.forEach(edu => {
            eduHTML += `
                <div style="margin-bottom: 10px;">
                    <div style="display:flex; justify-content:space-between; font-weight:bold; font-size:14px;">
                        <span>${edu.degree} — ${edu.school}</span>
                        <span>${edu.dates}</span>
                    </div>
                    <div style="font-size:12px; color:#555;">${edu.location}</div>
                </div>
            `;
        });

        let skillsHTML = payload.skills.map(s => `<span style="background:#eef2f7; padding:4px 10px; border-radius:12px; font-size:12px; font-weight:bold; margin:3px; display:inline-block;">${s}</span>`).join(' ');

        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>CV RESUME - ${payload.full_name}</title>
                <style>
                    body { font-family: 'Segoe UI', Arial, sans-serif; padding: 40px; color: #222; line-height: 1.5; }
                    .header { border-bottom: 3px solid #00F0FF; padding-bottom: 15px; margin-bottom: 25px; }
                    .name { font-size: 28px; font-weight: 800; color: #111; letter-spacing: -0.02em; }
                    .job-title { font-size: 16px; font-weight: 600; color: #0077cc; margin-top: 2px; }
                    .contact { font-size: 13px; color: #555; margin-top: 8px; }
                    .section-title { font-size: 16px; font-weight: 800; border-bottom: 1.5px solid #ccc; padding-bottom: 4px; margin: 20px 0 12px 0; text-transform: uppercase; color: #111; }
                    .btn-print { padding: 12px 24px; background: linear-gradient(135deg, #00FF9D, #00F0FF); color: #070913; border: none; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 15px; }
                    @media print { .no-print { display: none; } }
                </style>
            </head>
            <body>
                <div class="no-print" style="text-align:right; margin-bottom:20px;">
                    <button class="btn-print" onclick="window.print()">🖨️ PRINT / SAVE AS PDF RESUME</button>
                </div>
                <div class="header">
                    <div class="name">${payload.full_name}</div>
                    <div class="job-title">${payload.job_title}</div>
                    <div class="contact">${payload.email} | ${payload.phone} | ${payload.location} ${payload.website ? '| ' + payload.website : ''}</div>
                </div>

                ${payload.summary ? `<div class="section-title">Professional Summary</div><div>${payload.summary}</div>` : ''}

                <div class="section-title">Work Experience</div>
                ${expHTML || '<div>No experience entries provided.</div>'}

                <div class="section-title">Education & Qualifications</div>
                ${eduHTML || '<div>No education entries provided.</div>'}

                ${payload.skills.length > 0 ? `<div class="section-title">Technical & Core Skills</div><div>${skillsHTML}</div>` : ''}
            </body>
            </html>
        `;
        win.document.write(html);
        win.document.close();
        showToast("Netlify Engine: Professional CV Resume opened in PDF Print View!", "success");
    }
};

document.addEventListener('DOMContentLoaded', () => OrbitCVMaker.init());
