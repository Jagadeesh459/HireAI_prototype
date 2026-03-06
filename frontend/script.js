const API_BASE = "http://127.0.0.1:8000";

const ui = {
    gateway: document.getElementById("gateway"),
    recruiterApp: document.getElementById("recruiter-app"),
    studentApp: document.getElementById("student-app"),
    roleButtons: document.querySelectorAll(".role-btn"),
    backFromRecruiter: document.getElementById("back-from-recruiter"),
    backFromStudent: document.getElementById("back-from-student"),
    dropZone: document.getElementById("drop-zone"),
    recruiterFileInput: document.getElementById("recruiter-files"),
    recruiterFileList: document.getElementById("recruiter-file-list"),
    recruiterSubmit: document.getElementById("recruiter-submit"),
    recruiterLoader: document.getElementById("recruiter-loader"),
    recruiterError: document.getElementById("recruiter-error"),
    jobDesc: document.getElementById("job-desc"),
    metricTotal: document.getElementById("metric-total"),
    metricShortlisted: document.getElementById("metric-shortlisted"),
    metricAverage: document.getElementById("metric-average"),
    metricHighest: document.getElementById("metric-highest"),
    candidateResults: document.getElementById("candidate-results"),
    exportCsv: document.getElementById("export-csv"),
    exportJson: document.getElementById("export-json"),
    exportReport: document.getElementById("export-report"),
    statusChart: document.getElementById("status-chart"),
    scoreChart: document.getElementById("score-chart"),
    tabButtons: document.querySelectorAll(".tab-btn"),
    tabSections: document.querySelectorAll(".tab-content"),
    studentResumeFile: document.getElementById("student-resume-file"),
    desiredRole: document.getElementById("desired-role"),
    studentResumeSubmit: document.getElementById("student-resume-submit"),
    studentResumeError: document.getElementById("student-resume-error"),
    studentResumeLoader: document.getElementById("student-resume-loader"),
    resumeReviewOutput: document.getElementById("resume-review-output"),
    knownSkills: document.getElementById("known-skills"),
    interests: document.getElementById("interests"),
    preferredDomains: document.getElementById("preferred-domains"),
    studentSkillsSubmit: document.getElementById("student-skills-submit"),
    studentSkillsError: document.getElementById("student-skills-error"),
    studentSkillsLoader: document.getElementById("student-skills-loader"),
    skillsOutput: document.getElementById("skills-output"),
    studentRecoFile: document.getElementById("student-reco-file"),
    studentRecoSubmit: document.getElementById("student-reco-submit"),
    studentRecoError: document.getElementById("student-reco-error"),
    studentRecoLoader: document.getElementById("student-reco-loader"),
    rolesOutput: document.getElementById("roles-output"),
    studentScore: document.getElementById("student-score"),
    studentReadiness: document.getElementById("student-readiness"),
    studentRoleCount: document.getElementById("student-role-count"),
    studentActionProgress: document.getElementById("student-action-progress"),
    studentMissingOverview: document.getElementById("student-missing-overview"),
    studentRoadmapOverview: document.getElementById("student-roadmap-overview"),
    savedRolesBoard: document.getElementById("saved-roles-board"),
    generateActionTracker: document.getElementById("generate-action-tracker"),
    studentActionsLoader: document.getElementById("student-actions-loader"),
    studentActionsError: document.getElementById("student-actions-error"),
    studentActionItems: document.getElementById("student-action-items"),
    globalLoader: document.getElementById("global-loader"),
    globalLoaderTitle: document.getElementById("global-loader-title"),
    globalLoaderMessage: document.getElementById("global-loader-message"),
};

let recruiterFiles = [];
let latestRecruiterData = null;
let latestStudentReview = null;
let latestStudentSkillEval = null;
let latestStudentRecommendations = [];
let latestActionItems = [];
let statusChartInstance = null;
let scoreChartInstance = null;
const STUDENT_ACTIONS_KEY = "hireai_student_actions_v2";

function toList(value) {
    return value
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean);
}

function showRole(role) {
    ui.gateway.classList.add("hidden");
    ui.recruiterApp.classList.toggle("hidden", role !== "recruiter");
    ui.studentApp.classList.toggle("hidden", role !== "student");
}

function getReadiness(score) {
    if (score >= 80) return "Interview-ready";
    if (score >= 65) return "Improving";
    return "Foundation Building";
}

function showGlobalLoader(title, message) {
    ui.globalLoaderTitle.textContent = title || "Please wait";
    ui.globalLoaderMessage.textContent = message || "AI is analyzing your request...";
    ui.globalLoader.classList.remove("hidden");
}

function hideGlobalLoader() {
    ui.globalLoader.classList.add("hidden");
}

function loadActionTracker() {
    const raw = localStorage.getItem(STUDENT_ACTIONS_KEY);
    let state = {};
    try {
        state = raw ? JSON.parse(raw) : {};
    } catch (err) {
        state = {};
    }
    return state;
}

function saveActionTracker(state) {
    localStorage.setItem(STUDENT_ACTIONS_KEY, JSON.stringify(state));
}

function refreshActionProgress() {
    const checks = [...document.querySelectorAll("input[data-action-task]")];
    const done = checks.filter((c) => c.checked).length;
    const percent = checks.length ? Math.round((done / checks.length) * 100) : 0;
    ui.studentActionProgress.textContent = `${percent}%`;
}

function renderActionItems(items) {
    latestActionItems = items || [];
    if (!latestActionItems.length) {
        ui.studentActionItems.innerHTML = `<p class="muted-text">No action items generated yet.</p>`;
        refreshActionProgress();
        return;
    }

    const stored = loadActionTracker();
    ui.studentActionItems.innerHTML = latestActionItems
        .map((item) => {
            const key = `${item.category}|${item.task}`.toLowerCase();
            const checked = stored[key] ? "checked" : "";
            return `
                <label class="check-item action-item">
                    <input type="checkbox" data-action-task="${key}" ${checked} />
                    <span>
                        <strong>[${item.priority}] ${item.category}</strong>: ${item.task}
                    </span>
                </label>
            `;
        })
        .join("");

    document.querySelectorAll("input[data-action-task]").forEach((input) => {
        input.addEventListener("change", () => {
            const next = loadActionTracker();
            next[input.dataset.actionTask] = input.checked;
            saveActionTracker(next);
            refreshActionProgress();
        });
    });

    refreshActionProgress();
}

function refreshStudentDashboard() {
    if (latestStudentReview) {
        const score = Number(latestStudentReview.overall_score || 0);
        ui.studentScore.textContent = `${score}%`;
        ui.studentReadiness.textContent = getReadiness(score);
        const gaps = [
            ...(latestStudentReview.missing_technical_skills || []),
            ...(latestStudentReview.missing_soft_skills || []),
        ].slice(0, 8);
        ui.studentMissingOverview.innerHTML = listChips(gaps, "missing");
    }

    if (latestStudentSkillEval?.roadmap) {
        ui.studentRoadmapOverview.textContent = latestStudentSkillEval.roadmap;
    }

    ui.studentRoleCount.textContent = latestStudentRecommendations.length;
    if (!latestStudentRecommendations.length) {
        ui.savedRolesBoard.textContent = "No saved roles yet.";
        return;
    }

    ui.savedRolesBoard.innerHTML = latestStudentRecommendations
        .slice(0, 6)
        .map(
            (role) => `
            <div class="saved-role-item">
                <strong>${role.title || "Role"}</strong>
                <div class="muted-text">${role.type || ""} - ${role.match_reason || ""}</div>
            </div>
        `
        )
        .join("");
}

function resetToGateway() {
    ui.recruiterApp.classList.add("hidden");
    ui.studentApp.classList.add("hidden");
    ui.gateway.classList.remove("hidden");
}

ui.roleButtons.forEach((btn) => {
    btn.addEventListener("click", () => showRole(btn.dataset.role));
});

ui.backFromRecruiter.addEventListener("click", (e) => {
    e.preventDefault();
    resetToGateway();
});
ui.backFromStudent.addEventListener("click", (e) => {
    e.preventDefault();
    resetToGateway();
});

function renderRecruiterFiles() {
    ui.recruiterFileList.innerHTML = "";
    recruiterFiles.forEach((file) => {
        const chip = document.createElement("span");
        chip.className = "chip";
        chip.textContent = file.name;
        ui.recruiterFileList.appendChild(chip);
    });
}

ui.dropZone.addEventListener("click", () => ui.recruiterFileInput.click());

ui.recruiterFileInput.addEventListener("change", (e) => {
    recruiterFiles = Array.from(e.target.files || []);
    renderRecruiterFiles();
});

ui.dropZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    ui.dropZone.classList.add("dragging");
});

ui.dropZone.addEventListener("dragleave", () => {
    ui.dropZone.classList.remove("dragging");
});

ui.dropZone.addEventListener("drop", (e) => {
    e.preventDefault();
    ui.dropZone.classList.remove("dragging");
    recruiterFiles = Array.from(e.dataTransfer.files || []).filter((f) => f.name.toLowerCase().endsWith(".pdf"));
    renderRecruiterFiles();
});

function statusClass(status) {
    if (status === "SHORTLISTED") return "status-shortlisted";
    if (status === "HOLD") return "status-hold";
    return "status-rejected";
}

function chips(skills, type) {
    if (!skills?.length) return "<span class='skill'>None</span>";
    return skills.slice(0, 8).map((s) => `<span class="skill ${type}">${s}</span>`).join("");
}

function shortText(value, maxWords = 20) {
    const text = String(value || "").trim();
    const words = text.split(/\s+/);
    if (words.length <= maxWords) return text || "-";
    return `${words.slice(0, maxWords).join(" ")}...`;
}

function listChips(items = [], cls = "matched") {
    if (!items.length) return "<span class='skill'>None</span>";
    return items.map((item) => `<span class="skill ${cls}">${item}</span>`).join("");
}

function renderCandidates(candidates) {
    ui.candidateResults.innerHTML = "";
    candidates.forEach((c) => {
        const card = document.createElement("article");
        card.className = "candidate-card tilt-card";
        card.innerHTML = `
            <div class="candidate-head">
                <div>
                    <h4>#${c.rank} ${c.name}</h4>
                    <span class="status-pill ${statusClass(c.status)}">${c.status}</span>
                </div>
                <span class="score-pill">${c.match_percentage}%</span>
            </div>
            <p class="summary-text"><strong>Strengths:</strong> ${shortText(c.strengths, 20)}</p>
            <p class="summary-text"><strong>Weaknesses:</strong> ${shortText(c.weaknesses, 20)}</p>
            <div><strong>Matched Skills</strong><div class="skill-list">${chips(c.matched_skills, "matched")}</div></div>
            <div><strong>Missing Skills</strong><div class="skill-list">${chips(c.missing_skills, "missing")}</div></div>
        `;
        ui.candidateResults.appendChild(card);
    });
}

function drawStatusChart(candidates) {
    if (!window.Chart) return;
    const stats = {
        shortlisted: candidates.filter((c) => c.status === "SHORTLISTED").length,
        hold: candidates.filter((c) => c.status === "HOLD").length,
        rejected: candidates.filter((c) => c.status === "REJECTED").length,
    };

    if (!statusChartInstance) {
        statusChartInstance = new Chart(ui.statusChart, {
            type: "doughnut",
            data: {
                labels: ["Shortlisted", "Hold", "Rejected"],
                datasets: [
                    {
                        data: [0, 0, 0],
                        backgroundColor: ["#44f7b0", "#ffc358", "#ff7c87"],
                        borderWidth: 0,
                        hoverOffset: 6,
                    },
                ],
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                aspectRatio: 1.9,
                resizeDelay: 120,
                cutout: "62%",
                plugins: {
                    legend: {
                        position: "right",
                        labels: {
                            color: "#d7e5fb",
                            boxWidth: 12,
                            boxHeight: 12,
                            padding: 18,
                            font: { family: "Space Grotesk", size: 12, weight: 600 },
                        },
                    },
                    tooltip: {
                        backgroundColor: "#0f2236",
                        titleColor: "#f2f7ff",
                        bodyColor: "#d7e5fb",
                    },
                },
                animation: { duration: 450, easing: "easeOutQuart" },
            },
            plugins: [
                {
                    id: "centerText",
                    afterDraw(chart) {
                        const { ctx } = chart;
                        const meta = chart.getDatasetMeta(0);
                        if (!meta?.data?.length) return;
                        const x = meta.data[0].x;
                        const y = meta.data[0].y;
                        const total = chart.data.datasets[0].data.reduce((acc, v) => acc + Number(v || 0), 0);
                        ctx.save();
                        ctx.fillStyle = "#e9f1ff";
                        ctx.font = "700 16px Sora";
                        ctx.textAlign = "center";
                        ctx.fillText(`${total} Total`, x, y + 5);
                        ctx.restore();
                    },
                },
            ],
        });
    }

    statusChartInstance.data.datasets[0].data = [stats.shortlisted, stats.hold, stats.rejected];
    statusChartInstance.update();
}

function drawScoreChart(candidates) {
    if (!window.Chart) return;
    const top = [...candidates].sort((a, b) => b.match_percentage - a.match_percentage).slice(0, 6);
    if (!top.length) return;

    const labels = top.map((candidate) => `#${candidate.rank}`);
    const values = top.map((candidate) => candidate.match_percentage);

    if (!scoreChartInstance) {
        scoreChartInstance = new Chart(ui.scoreChart, {
            type: "bar",
            data: {
                labels: [],
                datasets: [
                    {
                        label: "Match %",
                        data: [],
                        borderRadius: 8,
                        borderSkipped: false,
                        backgroundColor: (context) => {
                            const chart = context.chart;
                            const { ctx, chartArea } = chart;
                            if (!chartArea) return "#19c6ff";
                            const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
                            gradient.addColorStop(0, "#2fd8ff");
                            gradient.addColorStop(1, "#0b5d89");
                            return gradient;
                        },
                    },
                ],
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                aspectRatio: 1.9,
                resizeDelay: 120,
                scales: {
                    y: {
                        min: 0,
                        max: 100,
                        ticks: {
                            color: "#9db2ce",
                            callback: (value) => `${value}%`,
                            font: { family: "Space Grotesk", size: 11 },
                        },
                        grid: { color: "rgba(162, 184, 209, 0.15)" },
                    },
                    x: {
                        ticks: { color: "#cde0fb", font: { family: "Space Grotesk", size: 11, weight: 700 } },
                        grid: { display: false },
                    },
                },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: "#0f2236",
                        titleColor: "#f2f7ff",
                        bodyColor: "#d7e5fb",
                        callbacks: {
                            label: (ctx) => `Match: ${ctx.raw}%`,
                        },
                    },
                },
                animation: { duration: 450, easing: "easeOutQuart" },
            },
        });
    }

    scoreChartInstance.data.labels = labels;
    scoreChartInstance.data.datasets[0].data = values;
    scoreChartInstance.update();
}

function downloadFile(content, fileName, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
}

function exportCandidatesCsv() {
    if (!latestRecruiterData?.candidates?.length) return;
    const headers = [
        "rank",
        "name",
        "match_percentage",
        "status",
        "matched_skills",
        "missing_skills",
        "strengths",
        "weaknesses",
    ];
    const rows = latestRecruiterData.candidates.map((c) =>
        [
            c.rank,
            c.name,
            c.match_percentage,
            c.status,
            (c.matched_skills || []).join("|"),
            (c.missing_skills || []).join("|"),
            (c.strengths || "").replaceAll(",", ";"),
            (c.weaknesses || "").replaceAll(",", ";"),
        ].join(",")
    );
    downloadFile([headers.join(","), ...rows].join("\n"), "hireai_candidates.csv", "text/csv");
}

function exportCandidatesJson() {
    if (!latestRecruiterData) return;
    downloadFile(JSON.stringify(latestRecruiterData, null, 2), "hireai_candidates.json", "application/json");
}

function printRecruiterReport() {
    if (!latestRecruiterData?.candidates?.length) return;
    const report = window.open("", "_blank");
    const rows = latestRecruiterData.candidates
        .map(
            (c) => `<tr>
            <td>${c.rank}</td>
            <td>${c.name}</td>
            <td>${c.match_percentage}%</td>
            <td>${c.status}</td>
            <td>${(c.matched_skills || []).join(", ")}</td>
            <td>${(c.missing_skills || []).join(", ")}</td>
        </tr>`
        )
        .join("");
    report.document.write(`
        <html>
        <head><title>HireAI Recruiter Report</title></head>
        <body style="font-family: Arial, sans-serif; padding:20px;">
            <h2>HireAI Recruiter Report</h2>
            <p>Total: ${latestRecruiterData.total_candidates} | Shortlisted: ${latestRecruiterData.shortlisted_count} | Avg Match: ${latestRecruiterData.average_match}% | Highest: ${latestRecruiterData.highest_match}%</p>
            <table border="1" cellpadding="8" cellspacing="0" style="border-collapse:collapse; width:100%;">
                <thead><tr><th>Rank</th><th>Name</th><th>Match</th><th>Status</th><th>Matched Skills</th><th>Missing Skills</th></tr></thead>
                <tbody>${rows}</tbody>
            </table>
        </body>
        </html>
    `);
    report.document.close();
    report.focus();
    report.print();
}

ui.recruiterSubmit.addEventListener("click", async (e) => {
    e.preventDefault();
    ui.recruiterError.textContent = "";
    const jd = ui.jobDesc.value.trim();
    if (!jd || !recruiterFiles.length) {
        ui.recruiterError.textContent = "Provide job description and at least one PDF resume.";
        return;
    }

    const formData = new FormData();
    formData.append("job_description", jd);
    recruiterFiles.forEach((file) => formData.append("resumes", file));

    ui.recruiterLoader.classList.remove("hidden");
    ui.recruiterSubmit.disabled = true;
    showGlobalLoader("Please wait", "AI is analyzing candidate resumes...");

    try {
        const res = await fetch(`${API_BASE}/api/recruiter/screen`, {
            method: "POST",
            body: formData,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || "Recruiter screening failed.");

        ui.metricTotal.textContent = data.total_candidates ?? 0;
        ui.metricShortlisted.textContent = data.shortlisted_count ?? 0;
        ui.metricAverage.textContent = `${data.average_match ?? 0}%`;
        ui.metricHighest.textContent = `${data.highest_match ?? 0}%`;
        latestRecruiterData = data;
        renderCandidates(data.candidates || []);
        drawStatusChart(data.candidates || []);
        drawScoreChart(data.candidates || []);
    } catch (err) {
        ui.recruiterError.textContent = err.message;
    } finally {
        ui.recruiterLoader.classList.add("hidden");
        ui.recruiterSubmit.disabled = false;
        hideGlobalLoader();
    }
});

ui.exportCsv.addEventListener("click", exportCandidatesCsv);
ui.exportJson.addEventListener("click", exportCandidatesJson);
ui.exportReport.addEventListener("click", printRecruiterReport);

ui.tabButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
        ui.tabButtons.forEach((b) => b.classList.remove("active"));
        ui.tabSections.forEach((s) => s.classList.remove("active"));
        btn.classList.add("active");
        document.getElementById(btn.dataset.tab).classList.add("active");
    });
});

ui.studentResumeSubmit.addEventListener("click", async (e) => {
    e.preventDefault();
    ui.studentResumeError.textContent = "";
    ui.resumeReviewOutput.innerHTML = "";
    const file = ui.studentResumeFile.files?.[0];
    if (!file) {
        ui.studentResumeError.textContent = "Upload a resume PDF.";
        return;
    }

    const fd = new FormData();
    fd.append("resume", file);
    if (ui.desiredRole.value.trim()) fd.append("desired_role", ui.desiredRole.value.trim());

    ui.studentResumeLoader.classList.remove("hidden");
    ui.studentResumeSubmit.disabled = true;
    showGlobalLoader("Please wait", "AI is reviewing your resume...");
    try {
        const res = await fetch(`${API_BASE}/api/student/resume-review`, {
            method: "POST",
            body: fd,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || "Resume review failed.");
        latestStudentReview = data;
        const score = Number(data.overall_score || 0);
        ui.resumeReviewOutput.innerHTML = `
            <article class="student-card">
                <h4>Overall Resume Score</h4>
                <div class="score-card">
                    <div class="score-value">${score}%</div>
                </div>
                <div class="score-bar"><div class="score-fill" style="width:${Math.max(0, Math.min(100, score))}%"></div></div>
            </article>
            <article class="student-card">
                <h4>Strengths</h4>
                <p class="muted-text">${data.resume_strengths || "-"}</p>
            </article>
            <article class="student-card">
                <h4>Weaknesses</h4>
                <p class="muted-text">${data.resume_weaknesses || "-"}</p>
            </article>
            <article class="student-card">
                <h4>Improvement Suggestions</h4>
                <p class="muted-text">${data.improvement_suggestions || "-"}</p>
            </article>
            <article class="student-card">
                <h4>Missing Technical Skills</h4>
                <div class="skill-list">${listChips(data.missing_technical_skills || [], "missing")}</div>
            </article>
            <article class="student-card">
                <h4>Missing Soft Skills</h4>
                <div class="skill-list">${listChips(data.missing_soft_skills || [], "missing")}</div>
            </article>
        `;
        refreshStudentDashboard();
    } catch (err) {
        ui.studentResumeError.textContent = err.message;
    } finally {
        ui.studentResumeLoader.classList.add("hidden");
        ui.studentResumeSubmit.disabled = false;
        hideGlobalLoader();
    }
});

ui.studentSkillsSubmit.addEventListener("click", async (e) => {
    e.preventDefault();
    ui.studentSkillsError.textContent = "";
    ui.skillsOutput.innerHTML = "";

    const payload = {
        known_skills: toList(ui.knownSkills.value),
        interests: toList(ui.interests.value),
        preferred_domains: toList(ui.preferredDomains.value),
    };

    if (!payload.known_skills.length) {
        ui.studentSkillsError.textContent = "Enter at least one known skill.";
        return;
    }

    ui.studentSkillsLoader.classList.remove("hidden");
    ui.studentSkillsSubmit.disabled = true;
    showGlobalLoader("Please wait", "AI is creating your skill roadmap...");
    try {
        const res = await fetch(`${API_BASE}/api/student/skill-evaluation`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || "Skill evaluation failed.");
        latestStudentSkillEval = data;
        ui.skillsOutput.innerHTML = `
            <article class="student-card">
                <h4>Best Roles</h4>
                <div class="skill-list">${listChips(data.best_roles || [], "matched")}</div>
            </article>
            <article class="student-card">
                <h4>Internship Domains</h4>
                <div class="skill-list">${listChips(data.internship_domains || [], "matched")}</div>
            </article>
            <article class="student-card">
                <h4>Skills To Learn Next</h4>
                <div class="skill-list">${listChips(data.skills_to_learn || [], "missing")}</div>
            </article>
            <article class="student-card">
                <h4>Growth Roadmap (1-2 years)</h4>
                <p class="muted-text">${data.roadmap || "-"}</p>
            </article>
        `;
        refreshStudentDashboard();
    } catch (err) {
        ui.studentSkillsError.textContent = err.message;
    } finally {
        ui.studentSkillsLoader.classList.add("hidden");
        ui.studentSkillsSubmit.disabled = false;
        hideGlobalLoader();
    }
});

ui.studentRecoSubmit.addEventListener("click", async (e) => {
    e.preventDefault();
    ui.studentRecoError.textContent = "";
    ui.rolesOutput.innerHTML = "";
    const file = ui.studentRecoFile.files?.[0];
    if (!file) {
        ui.studentRecoError.textContent = "Upload a resume PDF.";
        return;
    }

    const fd = new FormData();
    fd.append("resume", file);

    ui.studentRecoLoader.classList.remove("hidden");
    ui.studentRecoSubmit.disabled = true;
    showGlobalLoader("Please wait", "AI is generating role recommendations...");
    try {
        const res = await fetch(`${API_BASE}/api/student/recommendations`, {
            method: "POST",
            body: fd,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || "Recommendation request failed.");

        const roles = data.recommended_roles || [];
        latestStudentRecommendations = roles;
        if (!roles.length) {
            ui.rolesOutput.innerHTML = "<p>No recommendations returned.</p>";
            refreshStudentDashboard();
            return;
        }
        roles.forEach((role) => {
            const card = document.createElement("article");
            card.className = "candidate-card tilt-card";
            card.innerHTML = `
                <div class="candidate-head">
                    <h4>${role.title || "Role"}</h4>
                    <span class="score-pill">${role.type || "Role"}</span>
                </div>
                <p class="muted-text">${role.match_reason || ""}</p>
            `;
            ui.rolesOutput.appendChild(card);
        });
        refreshStudentDashboard();
    } catch (err) {
        ui.studentRecoError.textContent = err.message;
    } finally {
        ui.studentRecoLoader.classList.add("hidden");
        ui.studentRecoSubmit.disabled = false;
        hideGlobalLoader();
    }
});

ui.generateActionTracker.addEventListener("click", async () => {
    ui.studentActionsError.textContent = "";
    if (!latestStudentReview) {
        ui.studentActionsError.textContent = "Run Resume Review first.";
        return;
    }

    const payload = {
        desired_role: ui.desiredRole.value.trim() || null,
        resume_strengths: latestStudentReview.resume_strengths || "",
        resume_weaknesses: latestStudentReview.resume_weaknesses || "",
        missing_technical_skills: latestStudentReview.missing_technical_skills || [],
        missing_soft_skills: latestStudentReview.missing_soft_skills || [],
        roadmap: latestStudentSkillEval?.roadmap || "",
    };

    ui.studentActionsLoader.classList.remove("hidden");
    ui.generateActionTracker.disabled = true;
    showGlobalLoader("Please wait", "AI is building your action plan...");
    try {
        const res = await fetch(`${API_BASE}/api/student/action-tracker`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || "Failed to generate action tracker.");
        renderActionItems(data.action_items || []);
    } catch (err) {
        ui.studentActionsError.textContent = err.message;
    } finally {
        ui.studentActionsLoader.classList.add("hidden");
        ui.generateActionTracker.disabled = false;
        hideGlobalLoader();
    }
});

renderActionItems([]);
refreshStudentDashboard();

document.addEventListener("mousemove", (event) => {
    const cards = document.querySelectorAll(".tilt-card");
    cards.forEach((card) => {
        const rect = card.getBoundingClientRect();
        if (
            event.clientX < rect.left ||
            event.clientX > rect.right ||
            event.clientY < rect.top ||
            event.clientY > rect.bottom
        ) {
            card.style.transform = "perspective(800px) rotateX(0deg) rotateY(0deg)";
            return;
        }
        const x = (event.clientX - rect.left) / rect.width;
        const y = (event.clientY - rect.top) / rect.height;
        const rotateY = (x - 0.5) * 8;
        const rotateX = (0.5 - y) * 8;
        card.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
    });
});
