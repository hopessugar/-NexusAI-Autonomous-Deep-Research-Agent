// ═══════════════════════════════════════════
// NexusAI — Frontend Application Logic
// ═══════════════════════════════════════════
// Full-Page Executive Dossier, Real-time Agent Streaming,
// Themed Visualizations, Interactive Citations, Export Suite
// ═══════════════════════════════════════════

// ── Global State ──
let currentTaskId = null;
let eventSource = null;
let eventCount = 0;
let currentStatus = null;
let currentReportData = null;
let currentMarkdown = "";
let currentViewMode = "dossier"; // "dossier" | "stream"
let isDrawerOpen = false;

// ── DOM References ──
const heroSection = document.getElementById('heroSection');
const dashboardSection = document.getElementById('dashboardSection');
const queryInput = document.getElementById('queryInput');
const startBtn = document.getElementById('startBtn');
const queryDisplay = document.getElementById('queryDisplay');
const activityFeed = document.getElementById('activityFeed');
const activityCard = document.getElementById('activityCard');
const reportCard = document.getElementById('reportCard');
const reportContent = document.getElementById('reportContent');
const eventCountBadge = document.getElementById('eventCountBadge');
const eventCountEl = document.getElementById('eventCount');
const qualityBadge = document.getElementById('qualityBadge');
const qualityScore = document.getElementById('qualityScore');
const copyBtn = document.getElementById('copyBtn');
const exportPdfBtn = document.getElementById('exportPdfBtn');
const exportMdBtn = document.getElementById('exportMdBtn');
const chartsPanel = document.getElementById('chartsPanel');
const chartsGrid = document.getElementById('chartsGrid');
const sourcesPanel = document.getElementById('sourcesPanel');
const sourcesGrid = document.getElementById('sourcesGrid');
const sourceCount = document.getElementById('sourceCount');
const newResearchSection = document.getElementById('newResearchSection');
const connectionStatus = document.getElementById('connectionStatus');
const connectionStatusText = document.getElementById('connectionStatusText');
const dashGrid = document.getElementById('dashGrid');
const executiveKpiBar = document.getElementById('executiveKpiBar');
const kpiScore = document.getElementById('kpiScore');
const kpiSourcesCount = document.getElementById('kpiSourcesCount');
const kpiReadingTime = document.getElementById('kpiReadingTime');
const tocWrapper = document.getElementById('tocWrapper');
const tocDropdown = document.getElementById('tocDropdown');
const tocList = document.getElementById('tocList');
const chartModal = document.getElementById('chartModal');
const modalChartImage = document.getElementById('modalChartImage');
const modalChartTitle = document.getElementById('modalChartTitle');
const modalDownloadBtn = document.getElementById('modalDownloadBtn');
const toastMessage = document.getElementById('toastMessage');
const viewModeDossierBtn = document.getElementById('viewModeDossierBtn');
const viewModeStreamBtn = document.getElementById('viewModeStreamBtn');
const drawerBtnText = document.getElementById('drawerBtnText');

// ── Keyboard Listener ──
queryInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !startBtn.disabled) {
        startResearch();
    }
});

// Close TOC when clicking outside
document.addEventListener('click', (e) => {
    if (tocDropdown && !tocDropdown.classList.contains('hidden')) {
        if (!e.target.closest('#tocWrapper')) {
            tocDropdown.classList.add('hidden');
        }
    }
});

// Close modal on Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeChartModal();
        if (tocDropdown) tocDropdown.classList.add('hidden');
    }
});

// ══════════════════════════════════════════
// START RESEARCH WORKFLOW
// ══════════════════════════════════════════

async function startResearch() {
    const query = queryInput.value.trim();
    if (!query) {
        queryInput.focus();
        queryInput.style.outline = '2px solid #c47d5e';
        setTimeout(() => queryInput.style.outline = '', 1500);
        return;
    }

    startBtn.disabled = true;
    startBtn.classList.add('loading');

    try {
        const response = await fetch('/api/research', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query })
        });

        if (!response.ok) {
            throw new Error(`Server error: ${response.status}`);
        }

        const data = await response.json();
        currentTaskId = data.task_id;

        // Switch to dashboard view in stream mode while running
        showDashboard(query);
        setViewMode('stream');

        // Connect SSE
        connectSSE(currentTaskId);

    } catch (error) {
        console.error('Failed to start research:', error);
        showToast('Failed to start research. Make sure the backend server is running.');
        startBtn.disabled = false;
        startBtn.classList.remove('loading');
    }
}

// ══════════════════════════════════════════
// SSE STREAMING CONNECTION
// ══════════════════════════════════════════

function connectSSE(taskId) {
    if (eventSource) {
        eventSource.close();
    }

    eventSource = new EventSource(`/api/research/${taskId}/stream`);

    eventSource.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            handleEvent(data);
        } catch (e) {
            console.error('Failed to parse SSE event:', e);
        }
    };

    eventSource.onerror = () => {
        console.log('SSE connection closed or disconnected');
        updateConnectionStatus('Disconnected', '#c47d5e');
        eventSource.close();
    };

    updateConnectionStatus('Synthesizing', '#5a6e58');
}

// ══════════════════════════════════════════
// EVENT HANDLING
// ══════════════════════════════════════════

function handleEvent(data) {
    const action = data.action;
    const agent = data.agent || 'System';
    const detail = data.detail || '';

    if (action === 'heartbeat') return;

    if (action === 'status_change') {
        updateProgressStepper(detail);
        return;
    }

    if (action === 'complete') {
        handleCompletion(data);
        return;
    }

    addActivityEvent(agent, action, detail, data.timestamp);

    eventCount++;
    if (eventCountBadge) eventCountBadge.textContent = `${eventCount} events`;
    if (eventCountEl) eventCountEl.textContent = eventCount;
}

function addActivityEvent(agent, action, detail, timestamp) {
    const placeholder = activityFeed.querySelector('.feed-placeholder');
    if (placeholder) placeholder.remove();

    const timeStr = timestamp
        ? new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    const item = document.createElement('div');
    item.className = 'event-item';
    item.setAttribute('data-action', action);

    const agentIcons = {
        'Supervisor': '⚡',
        'Planner': '📋',
        'Researcher': '🔍',
        'Analyst': '📊',
        'Writer': '✍️',
        'Critic': '🔎',
        'System': '🤖'
    };

    const icon = agentIcons[agent] || '🤖';

    item.innerHTML = `
        <span class="event-agent">${icon} ${agent}</span>
        <span class="event-detail">${escapeHtml(detail)}</span>
        <span class="event-time">${timeStr}</span>
    `;

    activityFeed.appendChild(item);
    activityFeed.scrollTop = activityFeed.scrollHeight;
}

// ── Progress Stepper ──
function updateProgressStepper(status) {
    currentStatus = status;
    const steps = ['planning', 'researching', 'analyzing', 'writing', 'reviewing', 'complete'];
    const statusIndex = steps.indexOf(status);

    document.querySelectorAll('.step').forEach(step => {
        const stepName = step.dataset.step;
        const stepIndex = steps.indexOf(stepName);

        step.classList.remove('active', 'completed');

        if (stepIndex < statusIndex) {
            step.classList.add('completed');
        } else if (stepIndex === statusIndex) {
            step.classList.add('active');
        }
    });
}

// ══════════════════════════════════════════
// COMPLETION HANDLING
// ══════════════════════════════════════════

async function handleCompletion(data) {
    updateProgressStepper('complete');
    updateConnectionStatus('Verified', '#5a6e58');

    try {
        const response = await fetch(`/api/research/${currentTaskId}/report`);
        const reportData = await response.json();
        currentReportData = reportData;
        currentMarkdown = reportData.report || "";

        // Render full markdown report with tables & citations
        if (reportData.report) {
            renderReport(reportData.report);
        }

        // Quality score
        if (reportData.quality_score) {
            const scoreFormatted = reportData.quality_score.toFixed(1);
            qualityScore.textContent = scoreFormatted;
            qualityBadge.classList.remove('hidden');
            if (kpiScore) kpiScore.textContent = scoreFormatted;
        }

        // Action toolbar buttons
        if (copyBtn) copyBtn.classList.remove('hidden');
        if (exportPdfBtn) exportPdfBtn.classList.remove('hidden');
        if (exportMdBtn) exportMdBtn.classList.remove('hidden');
        if (tocWrapper) tocWrapper.classList.remove('hidden');
        const presBtn = document.getElementById('presentationBtn');
        if (presBtn) presBtn.classList.remove('hidden');

        // Charts
        if (reportData.charts && reportData.charts.length > 0) {
            renderCharts(reportData.charts);
        } else {
            chartsPanel.classList.add('hidden');
        }

        // Sources
        if (reportData.sources && reportData.sources.length > 0) {
            renderSources(reportData.sources);
            if (kpiSourcesCount) kpiSourcesCount.textContent = reportData.sources.length;
        }

        // Executive Audio Briefing (NotebookLM-Style Podcast)
        const audioData = reportData.audio_briefing || (reportData.analysis && reportData.analysis.audio_briefing);
        if (audioData && audioData.dialogue && audioData.dialogue.length > 0) {
            renderAudioBriefing(audioData);
        }

        // Semantic Knowledge & Entity Graph
        const graphData = reportData.knowledge_graph || (reportData.analysis && reportData.analysis.knowledge_graph);
        if (graphData && graphData.nodes && graphData.nodes.length > 0) {
            renderKnowledgeGraph(graphData);
        }

        // Tier 2: Adversarial Bull vs Bear Debate & Conviction Matrix
        const debateData = reportData.debate || (reportData.analysis && reportData.analysis.debate);
        if (debateData && (debateData.bull_thesis || debateData.bear_thesis)) {
            renderDebateMatrix(debateData);
        }

        // Tier 2: Grounded Research Copilot Dock
        const copilotDock = document.getElementById('copilotDock');
        if (copilotDock) {
            copilotDock.classList.remove('hidden');
        }

        // Executive KPI Snapshot Bar
        if (executiveKpiBar) {
            executiveKpiBar.classList.remove('hidden');
        }

        // Restart section
        newResearchSection.classList.remove('hidden');

        // Switch to Grand Full-Page Dossier Mode automatically!
        setViewMode('dossier');

        showToast('Executive Research Dossier compiled successfully!');

    } catch (error) {
        console.error('Failed to fetch final report:', error);
        showToast('Error loading final dossier.');
    }
}

// ══════════════════════════════════════════
// FULL-PAGE REPORT MARKDOWN ENGINE
// ══════════════════════════════════════════

function renderReport(markdown) {
    let html = markdown;

    // Estimate reading time & word count
    const words = markdown.trim().split(/\s+/).filter(Boolean).length;
    const readingMin = Math.max(1, Math.ceil(words / 210));
    if (kpiReadingTime) kpiReadingTime.textContent = `~${readingMin} min`;

    // 1. Process Markdown Tables before other line replacements
    html = processMarkdownTables(html);

    // 2. Escape any remaining raw HTML outside generated tags
    // 3. Headers with auto IDs for Table of Contents
    let sectionCounter = 0;
    html = html.replace(/^### (.+)$/gm, (match, title) => {
        sectionCounter++;
        const slug = slugify(title) || `sec-${sectionCounter}`;
        return `<h3 id="${slug}">${title}</h3>`;
    });

    html = html.replace(/^## (.+)$/gm, (match, title) => {
        sectionCounter++;
        const slug = slugify(title) || `sec-${sectionCounter}`;
        return `<h2 id="${slug}">${title}</h2>`;
    });

    html = html.replace(/^# (.+)$/gm, (match, title) => {
        sectionCounter++;
        const slug = slugify(title) || `sec-${sectionCounter}`;
        return `<h1 id="${slug}">${title}</h1>`;
    });

    // 4. Bold & Italic
    html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

    // 5. Interactive Citation Pills: [1], [2], [1, 2]
    html = html.replace(/\[(\d+(?:,\s*\d+)*)\]/g, (match, nums) => {
        const numList = nums.split(',').map(n => n.trim());
        return numList.map(n => `<a class="citation-pill" onclick="jumpToSource(${n})" title="Jump to Source [${n}]">[${n}]</a>`).join(' ');
    });

    // 6. Hyperlinks
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');

    // 7. Inline code
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

    // 8. Blockquotes (Executive Callouts)
    html = html.replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>');

    // 9. Horizontal rules
    html = html.replace(/^---$/gm, '<hr>');

    // 10. Lists
    html = html.replace(/^[\-\*] (.+)$/gm, '<li>$1</li>');
    html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');
    html = html.replace(/((?:<li>.*<\/li>\n?)+)/g, '<ul>$1</ul>');

    // 11. Paragraphs (lines that aren't already wrapped in block elements)
    html = html.replace(/^(?!<[hluobptd]|<div|<li|<hr|<blockquote|<table|<tr|<thead|<tbody)(.+)$/gm, '<p>$1</p>');
    html = html.replace(/<p>\s*<\/p>/g, '');

    reportContent.innerHTML = html;

    // Generate dynamic Table of Contents
    generateToc();
}

// ── Markdown Table Processor ──
function processMarkdownTables(text) {
    const lines = text.split('\n');
    let inTable = false;
    let tableLines = [];
    let result = [];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        const isTableLine = line.startsWith('|') && line.endsWith('|');

        if (isTableLine) {
            inTable = true;
            tableLines.push(line);
        } else {
            if (inTable) {
                result.push(convertTableLinesToHtml(tableLines));
                tableLines = [];
                inTable = false;
            }
            result.push(lines[i]);
        }
    }

    if (inTable && tableLines.length > 0) {
        result.push(convertTableLinesToHtml(tableLines));
    }

    return result.join('\n');
}

function convertTableLinesToHtml(lines) {
    if (lines.length < 2) return lines.join('\n');

    const headerLine = lines[0];
    const headers = headerLine.split('|').map(c => c.trim()).filter((c, i, a) => i !== 0 && i !== a.length - 1);

    // Skip separator line (|---|---|)
    const startIndex = (lines[1].includes('---')) ? 2 : 1;
    let rowsHtml = '';

    for (let i = startIndex; i < lines.length; i++) {
        const cells = lines[i].split('|').map(c => c.trim()).filter((c, idx, a) => idx !== 0 && idx !== a.length - 1);
        if (cells.length > 0) {
            rowsHtml += `<tr>${cells.map(c => `<td>${c}</td>`).join('')}</tr>`;
        }
    }

    return `
        <div class="report-table-wrap">
            <table class="report-table">
                <thead>
                    <tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>
                </thead>
                <tbody>
                    ${rowsHtml}
                </tbody>
            </table>
        </div>
    `;
}

// ── Dynamic Table of Contents ──
function generateToc() {
    if (!tocList) return;
    tocList.innerHTML = '';

    const headings = reportContent.querySelectorAll('h2, h3');
    if (headings.length === 0) {
        if (tocWrapper) tocWrapper.classList.add('hidden');
        return;
    }

    headings.forEach((heading) => {
        const li = document.createElement('li');
        li.className = 'toc-item';

        const isH3 = heading.tagName.toLowerCase() === 'h3';
        const a = document.createElement('a');
        a.className = `toc-link ${isH3 ? 'toc-h3' : ''}`;
        a.href = `#${heading.id}`;
        a.textContent = heading.textContent;

        a.addEventListener('click', (e) => {
            e.preventDefault();
            heading.scrollIntoView({ behavior: 'smooth', block: 'start' });
            if (tocDropdown) tocDropdown.classList.add('hidden');
        });

        li.appendChild(a);
        tocList.appendChild(li);
    });

    if (tocWrapper) tocWrapper.classList.remove('hidden');
}

function toggleTocMenu() {
    if (tocDropdown) {
        tocDropdown.classList.toggle('hidden');
    }
}

function slugify(text) {
    return text.toString().toLowerCase().trim()
        .replace(/&/g, '-and-')
        .replace(/[\s\W-]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

// ══════════════════════════════════════════
// THEMATIC DATA VISUALIZATIONS
// ══════════════════════════════════════════

function renderCharts(charts) {
    chartsGrid.innerHTML = '';

    charts.forEach((chartData, index) => {
        let chartSrc = "";
        let chartTitle = `Visualization ${index + 1}`;
        let chartType = "Strategic Metric";
        let chartDesc = "";

        if (typeof chartData === "string") {
            chartSrc = chartData;
        } else if (typeof chartData === "object") {
            chartSrc = chartData.image || "";
            chartTitle = chartData.title || chartTitle;
            chartType = chartData.type ? chartData.type.toUpperCase() : "METRIC";
            chartDesc = chartData.description || "";
        }

        if (!chartSrc) return;

        const card = document.createElement('div');
        card.className = 'chart-item';
        card.innerHTML = `
            <div class="chart-item-header">
                <span class="chart-item-title">${escapeHtml(chartTitle)}</span>
                <span class="chart-item-badge">${escapeHtml(chartType)}</span>
            </div>
            <div class="chart-img-wrap" onclick="openChartModal('${chartSrc}', '${escapeHtml(chartTitle)}')">
                <img src="${chartSrc}" alt="${escapeHtml(chartTitle)}" loading="lazy">
            </div>
            <div class="chart-item-footer">
                <span class="chart-desc">${escapeHtml(chartDesc || 'Synthesized across empirical benchmarks')}</span>
                <div class="chart-actions">
                    <button class="icon-btn" onclick="openChartModal('${chartSrc}', '${escapeHtml(chartTitle)}')" title="Enlarge Chart">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
                    </button>
                    <button class="icon-btn" onclick="downloadChart('${chartSrc}', '${escapeHtml(chartTitle)}')" title="Download PNG">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    </button>
                </div>
            </div>
        `;

        chartsGrid.appendChild(card);
    });

    chartsPanel.classList.remove('hidden');
}

// ── Chart Lightbox Modal ──
function openChartModal(imgSrc, title) {
    if (!chartModal) return;
    modalChartImage.src = imgSrc;
    modalChartTitle.textContent = title || "High-Resolution Chart";
    modalDownloadBtn.onclick = () => downloadChart(imgSrc, title);
    chartModal.classList.remove('hidden');
}

function closeChartModal(event) {
    if (chartModal) {
        chartModal.classList.add('hidden');
        modalChartImage.src = '';
    }
}

function downloadChart(imgSrc, title) {
    const a = document.createElement('a');
    a.href = imgSrc;
    a.download = `${slugify(title || 'research_chart')}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast('Chart downloaded successfully');
}

// ══════════════════════════════════════════
// EVIDENCE & CITATIONS DIRECTORY
// ══════════════════════════════════════════

function renderSources(sources) {
    sourcesGrid.innerHTML = '';

    const seenUrls = new Set();
    let sourceIndex = 1;

    sources.forEach((source) => {
        if (!source.url || seenUrls.has(source.url)) return;
        seenUrls.add(source.url);

        const card = document.createElement('a');
        card.className = 'source-card';
        card.id = `source-${sourceIndex}`;
        card.href = source.url;
        card.target = '_blank';
        card.rel = 'noopener noreferrer';

        card.innerHTML = `
            <div class="source-number">[${sourceIndex}]</div>
            <div class="source-info">
                <span class="source-title" title="${escapeHtml(source.title || 'Untitled Source')}">${escapeHtml(source.title || 'Web Document')}</span>
                <span class="source-url">${escapeHtml(getDomain(source.url))}</span>
            </div>
        `;

        sourcesGrid.appendChild(card);
        sourceIndex++;
    });

    if (sourceCount) sourceCount.textContent = `${seenUrls.size} verified citations`;
    const uniqueDomains = new Set(Array.from(seenUrls).map(u => getDomain(u)).filter(Boolean));
    const credDomainDiversity = document.getElementById('credDomainDiversity');
    if (credDomainDiversity) {
        credDomainDiversity.textContent = `${uniqueDomains.size} Unique Independent Publishers`;
    }
    sourcesPanel.classList.remove('hidden');
}

function jumpToSource(index) {
    const el = document.getElementById(`source-${index}`);
    if (el) {
        sourcesPanel.classList.remove('hidden');
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('highlighted');
        setTimeout(() => el.classList.remove('highlighted'), 2500);
    } else {
        showToast(`Reference [${index}] is cited from primary synthesis findings.`);
    }
}

// ══════════════════════════════════════════
// VIEW MODES & DRAWER MANAGEMENT
// ══════════════════════════════════════════

function setViewMode(mode) {
    currentViewMode = mode;

    if (mode === 'dossier') {
        dashGrid.classList.remove('split-mode');
        dashGrid.classList.add('full-page');
        viewModeDossierBtn.classList.add('active');
        viewModeStreamBtn.classList.remove('active');
        if (activityCard) activityCard.classList.remove('drawer-open');
        isDrawerOpen = false;
        if (drawerBtnText) drawerBtnText.textContent = 'Agent Logs';
    } else {
        dashGrid.classList.remove('full-page');
        dashGrid.classList.add('split-mode');
        viewModeDossierBtn.classList.remove('active');
        viewModeStreamBtn.classList.add('active');
        if (activityCard) activityCard.classList.remove('drawer-open');
        isDrawerOpen = false;
    }
}

function toggleActivityDrawer() {
    if (currentViewMode === 'split-mode') {
        activityCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
    }

    isDrawerOpen = !isDrawerOpen;
    if (activityCard) {
        if (isDrawerOpen) {
            activityCard.classList.add('drawer-open');
            if (drawerBtnText) drawerBtnText.textContent = 'Close Logs';
        } else {
            activityCard.classList.remove('drawer-open');
            if (drawerBtnText) drawerBtnText.textContent = 'Agent Logs';
        }
    }
}

function toggleFocusMode() {
    document.body.classList.toggle('zen-mode');
    if (document.body.classList.contains('zen-mode')) {
        showToast('Zen Reading Mode activated. Press ESC or click icon to exit.');
    } else {
        showToast('Standard View restored.');
    }
}

// ══════════════════════════════════════════
// EXPORT & SHARING SUITE
// ══════════════════════════════════════════

function exportToPdf() {
    showToast('Formatting publication dossier for PDF export...');
    setTimeout(() => {
        window.print();
    }, 300);
}

function downloadMarkdown() {
    if (!currentMarkdown) {
        showToast('No report content available to download.');
        return;
    }

    const query = queryDisplay.textContent || 'research';
    const blob = new Blob([currentMarkdown], { type: 'text/markdown;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${slugify(query)}_dossier.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast('Markdown dossier downloaded.');
}

function copyReport() {
    const textToCopy = currentMarkdown || reportContent.innerText;
    navigator.clipboard.writeText(textToCopy).then(() => {
        const copyBtnText = document.getElementById('copyBtnText');
        if (copyBtnText) copyBtnText.textContent = 'Copied!';
        showToast('Executive dossier copied to clipboard!');
        setTimeout(() => {
            if (copyBtnText) copyBtnText.textContent = 'Copy';
        }, 2000);
    }).catch(() => {
        showToast('Failed to copy to clipboard.');
    });
}

function showToast(message) {
    if (!toastMessage) return;
    toastMessage.textContent = message;
    toastMessage.classList.remove('hidden');
    clearTimeout(toastMessage._timer);
    toastMessage._timer = setTimeout(() => {
        toastMessage.classList.add('hidden');
    }, 3200);
}

// ══════════════════════════════════════════
// UI RESET & HEALTH
// ══════════════════════════════════════════

function showDashboard(query) {
    heroSection.classList.add('hidden');
    dashboardSection.classList.remove('hidden');
    queryDisplay.textContent = query;

    activityFeed.innerHTML = `
        <div class="feed-placeholder">
            <div class="loader"></div>
            <p>Agents initializing research session...</p>
        </div>
    `;
    reportContent.innerHTML = `
        <div class="report-empty">
            <div class="pulsing-dossier-icon">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" opacity="0.35">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
                </svg>
            </div>
            <h3>Autonomous Agents Active</h3>
            <p>Synthesizing multi-source intelligence across the web...<br>The executive dossier will populate as sections are verified.</p>
        </div>
    `;

    eventCount = 0;
    if (eventCountBadge) eventCountBadge.textContent = '0 events';
    if (eventCountEl) eventCountEl.textContent = '0';
    if (qualityBadge) qualityBadge.classList.add('hidden');
    if (copyBtn) copyBtn.classList.add('hidden');
    if (exportPdfBtn) exportPdfBtn.classList.add('hidden');
    if (exportMdBtn) exportMdBtn.classList.add('hidden');
    if (tocWrapper) tocWrapper.classList.add('hidden');
    const presBtn = document.getElementById('presentationBtn');
    if (presBtn) presBtn.classList.add('hidden');
    if (executiveKpiBar) executiveKpiBar.classList.add('hidden');
    chartsPanel.classList.add('hidden');
    sourcesPanel.classList.add('hidden');
    newResearchSection.classList.add('hidden');

    const audioCard = document.getElementById('audioBriefingCard');
    const graphCard = document.getElementById('knowledgeGraphPanel');
    const debatePanel = document.getElementById('debatePanel');
    const copilotDock = document.getElementById('copilotDock');
    const copilotDrawer = document.getElementById('copilotDrawer');
    if (audioCard) audioCard.classList.add('hidden');
    if (graphCard) graphCard.classList.add('hidden');
    if (debatePanel) debatePanel.classList.add('hidden');
    if (copilotDock) copilotDock.classList.add('hidden');
    if (copilotDrawer) copilotDrawer.classList.add('hidden');
    stopAudioBriefing();
    stopGraphAnimation();

    document.querySelectorAll('.step').forEach(step => {
        step.classList.remove('active', 'completed');
    });

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function resetDashboard() {
    if (eventSource) {
        eventSource.close();
        eventSource = null;
    }

    stopAudioBriefing();
    stopGraphAnimation();

    const debatePanel = document.getElementById('debatePanel');
    const copilotDock = document.getElementById('copilotDock');
    const copilotDrawer = document.getElementById('copilotDrawer');
    const presBtn = document.getElementById('presentationBtn');
    if (debatePanel) debatePanel.classList.add('hidden');
    if (copilotDock) copilotDock.classList.add('hidden');
    if (copilotDrawer) copilotDrawer.classList.add('hidden');
    if (presBtn) presBtn.classList.add('hidden');
    clearCopilotChat();

    currentTaskId = null;
    currentStatus = null;
    currentReportData = null;
    currentMarkdown = "";

    dashboardSection.classList.add('hidden');
    heroSection.classList.remove('hidden');

    queryInput.value = '';
    startBtn.disabled = false;
    startBtn.classList.remove('loading');

    updateConnectionStatus('Ready', '#5a6e58');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function setQuery(button) {
    queryInput.value = button.textContent;
    queryInput.focus();
}

function updateConnectionStatus(text, color) {
    if (connectionStatusText) connectionStatusText.textContent = text;
    const dot = connectionStatus.querySelector('.status-dot');
    if (dot) dot.style.background = color;
}

function escapeHtml(text) {
    if (!text) return "";
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function getDomain(url) {
    try {
        return new URL(url).hostname;
    } catch {
        return url;
    }
}

// Health check on load
async function checkHealth() {
    try {
        const resp = await fetch('/api/health');
        if (resp.ok) {
            updateConnectionStatus('Ready', '#5a6e58');
        }
    } catch {
        updateConnectionStatus('Offline', '#c47d5e');
    }
}

checkHealth();

// ══════════════════════════════════════════
// TIER 1: EXECUTIVE AUDIO BRIEFING ENGINE
// ══════════════════════════════════════════

let currentAudioData = null;
let currentDialogueIndex = 0;
let isAudioPlaying = false;
let audioPlaybackRate = 1.0;
let currentUtterance = null;
let waveformInterval = null;
let availableVoices = [];

function loadVoices() {
    if ('speechSynthesis' in window) {
        availableVoices = window.speechSynthesis.getVoices();
    }
}
if ('speechSynthesis' in window) {
    window.speechSynthesis.onvoiceschanged = loadVoices;
    loadVoices();
}

function renderAudioBriefing(audioData) {
    currentAudioData = audioData;
    currentDialogueIndex = 0;
    isAudioPlaying = false;

    const audioBriefingCard = document.getElementById('audioBriefingCard');
    const audioHeadline = document.getElementById('audioHeadline');
    const audioTagline = document.getElementById('audioTagline');
    const transcriptList = document.getElementById('transcriptList');

    if (audioHeadline) audioHeadline.textContent = audioData.headline || "Executive Intelligence Briefing";
    if (audioTagline) audioTagline.textContent = audioData.tagline || "Autonomous multi-agent strategic synthesis";

    if (transcriptList && audioData.dialogue) {
        transcriptList.innerHTML = '';
        audioData.dialogue.forEach((line, idx) => {
            const item = document.createElement('div');
            item.className = 'transcript-item';
            item.id = `transcript-line-${idx}`;
            const speakerKey = (line.speaker || "").toLowerCase().includes("morgan") ? "morgan" : "alex";

            item.innerHTML = `
                <span class="transcript-speaker ${speakerKey}">${escapeHtml(line.speaker || 'Host')}</span>
                <span class="transcript-text">${escapeHtml(line.text)}</span>
            `;

            item.addEventListener('click', () => {
                jumpToAudioLine(idx);
            });

            transcriptList.appendChild(item);
        });
    }

    initWaveform();
    if (audioBriefingCard) audioBriefingCard.classList.remove('hidden');
}

function toggleAudioBriefing() {
    if (isAudioPlaying) {
        pauseAudioBriefing();
    } else {
        playAudioBriefing();
    }
}

function playAudioBriefing() {
    if (!('speechSynthesis' in window)) {
        showToast('Speech synthesis not supported on this browser.');
        return;
    }

    if (!currentAudioData || !currentAudioData.dialogue || currentAudioData.dialogue.length === 0) {
        return;
    }

    isAudioPlaying = true;
    updateAudioPlayButton(true);
    startWaveformAnimation();

    playAudioLine(currentDialogueIndex);
}

function pauseAudioBriefing() {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
    }
    isAudioPlaying = false;
    updateAudioPlayButton(false);
    stopWaveformAnimation();
}

function stopAudioBriefing() {
    pauseAudioBriefing();
    currentDialogueIndex = 0;
    updateTranscriptHighlight(-1);
    const audioCurrentTime = document.getElementById('audioCurrentTime');
    if (audioCurrentTime) audioCurrentTime.textContent = '0:00';
}

function jumpToAudioLine(idx) {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
    }
    currentDialogueIndex = idx;
    isAudioPlaying = true;
    updateAudioPlayButton(true);
    startWaveformAnimation();
    playAudioLine(idx);
}

function playAudioLine(index) {
    if (!isAudioPlaying) return;
    if (!currentAudioData || !currentAudioData.dialogue || index >= currentAudioData.dialogue.length) {
        isAudioPlaying = false;
        updateAudioPlayButton(false);
        stopWaveformAnimation();
        currentDialogueIndex = 0;
        updateTranscriptHighlight(-1);
        showToast('Executive briefing playback complete.');
        return;
    }

    currentDialogueIndex = index;
    const line = currentAudioData.dialogue[index];
    updateTranscriptHighlight(index);

    const utterance = new SpeechSynthesisUtterance(line.text);
    utterance.rate = audioPlaybackRate;

    const speakerKey = (line.speaker || "").toLowerCase();
    const isMorgan = speakerKey.includes("morgan");

    if (availableVoices.length > 0) {
        const engVoices = availableVoices.filter(v => v.lang && v.lang.startsWith('en'));
        if (engVoices.length > 1) {
            utterance.voice = isMorgan ? engVoices[1] : engVoices[0];
        } else if (engVoices.length === 1) {
            utterance.voice = engVoices[0];
        }
    }

    utterance.pitch = isMorgan ? 0.92 : 1.05;

    utterance.onend = () => {
        if (isAudioPlaying) {
            playAudioLine(index + 1);
        }
    };

    utterance.onerror = (e) => {
        console.warn('Speech synthesis error:', e);
        if (isAudioPlaying) {
            playAudioLine(index + 1);
        }
    };

    currentUtterance = utterance;
    window.speechSynthesis.speak(utterance);
}

function updateTranscriptHighlight(activeIdx) {
    document.querySelectorAll('.transcript-item').forEach((item, idx) => {
        if (idx === activeIdx) {
            item.classList.add('active-speaking');
            item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        } else {
            item.classList.remove('active-speaking');
        }
    });

    const audioCurrentTime = document.getElementById('audioCurrentTime');
    if (audioCurrentTime && currentAudioData && currentAudioData.dialogue) {
        const estSec = Math.floor((activeIdx / Math.max(1, currentAudioData.dialogue.length)) * 75);
        const mins = Math.floor(estSec / 60);
        const secs = String(estSec % 60).padStart(2, '0');
        audioCurrentTime.textContent = `${mins}:${secs}`;
    }
}

function updateAudioPlayButton(playing) {
    const btn = document.getElementById('audioPlayBtn');
    if (!btn) return;
    if (playing) {
        btn.classList.add('playing');
        btn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>`;
    } else {
        btn.classList.remove('playing');
        btn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>`;
    }
}

function setAudioSpeed(rate, btn) {
    audioPlaybackRate = rate;
    document.querySelectorAll('.speed-btn').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    if (isAudioPlaying) {
        jumpToAudioLine(currentDialogueIndex);
    }
}

function toggleTranscriptDrawer() {
    const drawer = document.getElementById('audioTranscriptDrawer');
    if (drawer) drawer.classList.toggle('hidden');
}

function initWaveform() {
    const canvas = document.getElementById('waveformCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);
    const numBars = 30;
    const barWidth = 4;
    const gap = 4;
    const startX = (width - (numBars * (barWidth + gap))) / 2;

    for (let i = 0; i < numBars; i++) {
        const x = startX + i * (barWidth + gap);
        const barH = 5;
        const y = (height - barH) / 2;
        ctx.fillStyle = '#a3b5a1';
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, barH, 2);
        ctx.fill();
    }
}

function startWaveformAnimation() {
    if (waveformInterval) clearInterval(waveformInterval);
    const canvas = document.getElementById('waveformCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const numBars = 30;
    const barWidth = 4;
    const gap = 4;
    const startX = (width - (numBars * (barWidth + gap))) / 2;

    waveformInterval = setInterval(() => {
        ctx.clearRect(0, 0, width, height);

        for (let i = 0; i < numBars; i++) {
            const x = startX + i * (barWidth + gap);
            const dynamicScale = Math.sin(Date.now() * 0.009 + i * 0.45) * 0.5 + 0.5;
            const barH = isAudioPlaying ? Math.max(6, dynamicScale * 30) : 5;
            const y = (height - barH) / 2;

            const grad = ctx.createLinearGradient(0, y, 0, y + barH);
            grad.addColorStop(0, '#5a6e58');
            grad.addColorStop(1, '#7c8f7a');

            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.roundRect(x, y, barWidth, barH, 2);
            ctx.fill();
        }
    }, 40);
}

function stopWaveformAnimation() {
    if (waveformInterval) {
        clearInterval(waveformInterval);
        waveformInterval = null;
    }
    initWaveform();
}

// ══════════════════════════════════════════
// TIER 1: SEMANTIC KNOWLEDGE GRAPH ENGINE
// ══════════════════════════════════════════

let graphNodes = [];
let graphEdges = [];
let graphSimulationActive = false;
let draggedNode = null;
let hoveredNode = null;
let graphFilter = 'all';
let graphAnimFrame = null;

const CATEGORY_COLORS = {
    'Company': '#5a6e58',
    'Entity': '#5a6e58',
    'Technology': '#c47d5e',
    'Benchmark': '#c99b42',
    'Market Driver': '#486d88',
    'Strategic Theme': '#6b7d69',
    'Regulatory': '#7b6279',
    'Topic': '#3d5440'
};

function renderKnowledgeGraph(graphData) {
    if (!graphData || !graphData.nodes || graphData.nodes.length === 0) return;

    const panel = document.getElementById('knowledgeGraphPanel');
    const canvas = document.getElementById('graphCanvas');
    const container = document.getElementById('graphCanvasContainer');
    const nodesCount = document.getElementById('graphNodesCount');
    const edgesCount = document.getElementById('graphEdgesCount');

    if (nodesCount) nodesCount.textContent = `${graphData.nodes.length} Entities`;
    if (edgesCount) edgesCount.textContent = `${(graphData.edges || []).length} Relations`;

    const width = container.clientWidth || 920;
    const height = 480;
    const dpr = window.devicePixelRatio || 1;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const centerX = width / 2;
    const centerY = height / 2;
    const radiusDist = Math.min(width, height) * 0.35;

    graphNodes = graphData.nodes.map((n, i) => {
        const angle = (i / graphData.nodes.length) * Math.PI * 2;
        const color = CATEGORY_COLORS[n.type] || '#5a6e58';
        return {
            id: n.id,
            label: n.id,
            type: n.type || 'Entity',
            description: n.description || '',
            importance: n.value || 7,
            radius: Math.max(16, Math.min(32, (n.value || 7) * 2.8)),
            color: color,
            x: centerX + Math.cos(angle) * (radiusDist + (Math.random() * 40 - 20)),
            y: centerY + Math.sin(angle) * (radiusDist + (Math.random() * 40 - 20)),
            vx: 0,
            vy: 0
        };
    });

    graphEdges = (graphData.edges || []).map(e => ({
        source: e.source,
        target: e.target,
        relation: e.relation || 'related'
    }));

    setupGraphInteractions(canvas, width, height, dpr);

    if (panel) panel.classList.remove('hidden');

    graphSimulationActive = true;
    startGraphSimulation(canvas, dpr);
}

function setupGraphInteractions(canvas, width, height, dpr) {
    let hasMoved = false;

    function getMousePos(e) {
        const rect = canvas.getBoundingClientRect();
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
    }

    canvas.onmousedown = (e) => {
        const pos = getMousePos(e);
        hasMoved = false;
        draggedNode = findNodeAtPos(pos.x, pos.y);
        if (draggedNode) {
            draggedNode.vx = 0;
            draggedNode.vy = 0;
            graphSimulationActive = true;
        }
    };

    canvas.onmousemove = (e) => {
        const pos = getMousePos(e);
        if (draggedNode) {
            hasMoved = true;
            draggedNode.x = pos.x;
            draggedNode.y = pos.y;
            graphSimulationActive = true;
        } else {
            const hovered = findNodeAtPos(pos.x, pos.y);
            if (hovered !== hoveredNode) {
                hoveredNode = hovered;
                canvas.style.cursor = hoveredNode ? 'pointer' : 'grab';
                graphSimulationActive = true;
            }
        }
    };

    window.onmouseup = () => {
        if (draggedNode && !hasMoved) {
            openEntityInspector(draggedNode);
        }
        draggedNode = null;
    };

    canvas.onclick = (e) => {
        const pos = getMousePos(e);
        const clicked = findNodeAtPos(pos.x, pos.y);
        if (clicked) {
            openEntityInspector(clicked);
        }
    };

    canvas.ontouchstart = (e) => {
        if (e.touches.length === 1) {
            const rect = canvas.getBoundingClientRect();
            const x = e.touches[0].clientX - rect.left;
            const y = e.touches[0].clientY - rect.top;
            draggedNode = findNodeAtPos(x, y);
            if (draggedNode) graphSimulationActive = true;
        }
    };

    canvas.ontouchmove = (e) => {
        if (draggedNode && e.touches.length === 1) {
            const rect = canvas.getBoundingClientRect();
            draggedNode.x = e.touches[0].clientX - rect.left;
            draggedNode.y = e.touches[0].clientY - rect.top;
            graphSimulationActive = true;
            e.preventDefault();
        }
    };

    canvas.ontouchend = () => {
        if (draggedNode) openEntityInspector(draggedNode);
        draggedNode = null;
    };
}

function findNodeAtPos(x, y) {
    for (let i = graphNodes.length - 1; i >= 0; i--) {
        const n = graphNodes[i];
        if (graphFilter !== 'all' && n.type !== graphFilter) continue;
        const dx = x - n.x;
        const dy = y - n.y;
        if (dx * dx + dy * dy <= n.radius * n.radius) {
            return n;
        }
    }
    return null;
}

function startGraphSimulation(canvas, dpr) {
    if (graphAnimFrame) cancelAnimationFrame(graphAnimFrame);

    const ctx = canvas.getContext('2d');
    let idleCounter = 0;

    function step() {
        const width = canvas.width / dpr;
        const height = canvas.height / dpr;

        if (graphSimulationActive) {
            updateGraphPhysics(width, height);
            idleCounter = 0;
        } else {
            idleCounter++;
        }

        drawGraph(ctx, width, height, dpr);

        if (idleCounter < 120) {
            graphAnimFrame = requestAnimationFrame(step);
        }
    }

    graphAnimFrame = requestAnimationFrame(step);
}

function updateGraphPhysics(width, height) {
    const k = 1800;
    const springLen = 140;
    const springK = 0.035;
    const centerGravity = 0.015;
    const cx = width / 2;
    const cy = height / 2;

    for (let i = 0; i < graphNodes.length; i++) {
        const n1 = graphNodes[i];
        for (let j = i + 1; j < graphNodes.length; j++) {
            const n2 = graphNodes[j];
            const dx = n1.x - n2.x;
            const dy = n1.y - n2.y;
            const distSq = dx * dx + dy * dy + 1;
            const dist = Math.sqrt(distSq);

            if (dist < 320) {
                const f = k / distSq;
                const fx = (dx / dist) * f;
                const fy = (dy / dist) * f;
                if (n1 !== draggedNode) { n1.vx += fx; n1.vy += fy; }
                if (n2 !== draggedNode) { n2.vx -= fx; n2.vy -= fy; }
            }
        }
    }

    const nodeMap = new Map(graphNodes.map(n => [n.id, n]));
    for (const edge of graphEdges) {
        const n1 = nodeMap.get(edge.source);
        const n2 = nodeMap.get(edge.target);
        if (!n1 || !n2) continue;

        const dx = n2.x - n1.x;
        const dy = n2.y - n1.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const f = (dist - springLen) * springK;
        const fx = (dx / dist) * f;
        const fy = (dy / dist) * f;

        if (n1 !== draggedNode) { n1.vx += fx; n1.vy += fy; }
        if (n2 !== draggedNode) { n2.vx -= fx; n2.vy -= fy; }
    }

    let totalVelocity = 0;
    for (const n of graphNodes) {
        if (n === draggedNode) continue;

        n.vx += (cx - n.x) * centerGravity;
        n.vy += (cy - n.y) * centerGravity;

        n.vx *= 0.85;
        n.vy *= 0.85;

        n.x += n.vx;
        n.y += n.vy;

        const pad = n.radius + 15;
        n.x = Math.max(pad, Math.min(width - pad, n.x));
        n.y = Math.max(pad, Math.min(height - pad, n.y));

        totalVelocity += Math.abs(n.vx) + Math.abs(n.vy);
    }

    if (totalVelocity < 0.12 && !draggedNode) {
        graphSimulationActive = false;
    }
}

function drawGraph(ctx, width, height, dpr) {
    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    ctx.strokeStyle = 'rgba(124, 143, 122, 0.08)';
    ctx.lineWidth = 1;
    const gridSpacing = 40;
    for (let x = 0; x < width; x += gridSpacing) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke();
    }
    for (let y = 0; y < height; y += gridSpacing) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
    }

    const nodeMap = new Map(graphNodes.map(n => [n.id, n]));

    const connectedNodeIds = new Set();
    if (hoveredNode) {
        connectedNodeIds.add(hoveredNode.id);
        graphEdges.forEach(e => {
            if (e.source === hoveredNode.id) connectedNodeIds.add(e.target);
            if (e.target === hoveredNode.id) connectedNodeIds.add(e.source);
        });
    }

    for (const edge of graphEdges) {
        const n1 = nodeMap.get(edge.source);
        const n2 = nodeMap.get(edge.target);
        if (!n1 || !n2) continue;

        const isFiltered = (graphFilter !== 'all' && (n1.type !== graphFilter && n2.type !== graphFilter));
        if (isFiltered) continue;

        const isConnected = hoveredNode ? (connectedNodeIds.has(n1.id) && connectedNodeIds.has(n2.id)) : false;

        ctx.strokeStyle = isConnected ? '#5a6e58' : 'rgba(163, 181, 161, 0.45)';
        ctx.lineWidth = isConnected ? 2.5 : 1.2;

        ctx.beginPath();
        ctx.moveTo(n1.x, n1.y);
        ctx.lineTo(n2.x, n2.y);
        ctx.stroke();

        if (isConnected || graphNodes.length <= 10) {
            const midX = (n1.x + n2.x) / 2;
            const midY = (n1.y + n2.y) / 2;
            ctx.fillStyle = '#dde3d5';
            ctx.fillRect(midX - 28, midY - 8, 56, 16);
            ctx.font = '500 9px "JetBrains Mono", monospace';
            ctx.fillStyle = '#5c6b5e';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(edge.relation.substring(0, 10), midX, midY);
        }
    }

    for (const n of graphNodes) {
        const isMatchFilter = (graphFilter === 'all' || n.type === graphFilter);
        const isHovered = (hoveredNode && hoveredNode.id === n.id);
        const isNeighbor = (hoveredNode && connectedNodeIds.has(n.id));

        let opacity = 1.0;
        if (!isMatchFilter) {
            opacity = 0.15;
        } else if (hoveredNode && !isNeighbor) {
            opacity = 0.25;
        }

        ctx.save();
        ctx.globalAlpha = opacity;

        if (isHovered) {
            ctx.shadowColor = n.color;
            ctx.shadowBlur = 18;
        }

        ctx.fillStyle = n.color;
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = isHovered ? 3 : 2;
        ctx.stroke();

        ctx.shadowBlur = 0;
        ctx.font = '600 11px "DM Sans", sans-serif';
        const labelText = n.label;
        const textMetrics = ctx.measureText(labelText);
        const textW = textMetrics.width;

        ctx.fillStyle = 'rgba(232, 237, 226, 0.95)';
        ctx.beginPath();
        ctx.roundRect(n.x - textW / 2 - 6, n.y + n.radius + 4, textW + 12, 17, 4);
        ctx.fill();

        ctx.fillStyle = '#243325';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(labelText, n.x, n.y + n.radius + 12.5);

        ctx.restore();
    }

    ctx.restore();
}

function filterGraph(type, btn) {
    graphFilter = type;
    document.querySelectorAll('.filter-chip').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    graphSimulationActive = true;
}

function resetGraphPhysics() {
    const canvas = document.getElementById('graphCanvas');
    const container = document.getElementById('graphCanvasContainer');
    if (!canvas || !container) return;

    const width = container.clientWidth || 920;
    const height = 480;
    const centerX = width / 2;
    const centerY = height / 2;
    const radiusDist = Math.min(width, height) * 0.35;

    graphNodes.forEach((n, i) => {
        const angle = (i / graphNodes.length) * Math.PI * 2;
        n.x = centerX + Math.cos(angle) * radiusDist;
        n.y = centerY + Math.sin(angle) * radiusDist;
        n.vx = (Math.random() - 0.5) * 4;
        n.vy = (Math.random() - 0.5) * 4;
    });

    graphSimulationActive = true;
    showToast('Knowledge graph physics reset.');
}

function openEntityInspector(node) {
    const inspector = document.getElementById('entityInspector');
    const inspectorType = document.getElementById('inspectorType');
    const inspectorName = document.getElementById('inspectorName');
    const inspectorDesc = document.getElementById('inspectorDesc');
    const connList = document.getElementById('inspectorConnectionsList');

    if (!inspector) return;

    inspectorType.textContent = node.type;
    inspectorType.style.color = node.color;
    inspectorName.textContent = node.label;
    inspectorDesc.textContent = node.description || `Key strategic entity identified in the ${node.type} dimension.`;

    if (connList) {
        connList.innerHTML = '';
        const connected = graphEdges.filter(e => e.source === node.id || e.target === node.id);
        if (connected.length === 0) {
            connList.innerHTML = '<li>Standalone strategic concept</li>';
        } else {
            connected.forEach(e => {
                const other = (e.source === node.id) ? e.target : e.source;
                const li = document.createElement('li');
                li.innerHTML = `<strong>${escapeHtml(e.relation)}:</strong> ${escapeHtml(other)}`;
                connList.appendChild(li);
            });
        }
    }

    inspector.classList.remove('hidden');
}

function closeEntityInspector() {
    const inspector = document.getElementById('entityInspector');
    if (inspector) inspector.classList.add('hidden');
}

function stopGraphAnimation() {
    if (graphAnimFrame) {
        cancelAnimationFrame(graphAnimFrame);
        graphAnimFrame = null;
    }
}

// ══════════════════════════════════════════
// TIER 2: ADVERSARIAL DEBATE & CONVICTION MATRIX
// ══════════════════════════════════════════

function renderDebateMatrix(debateData) {
    const panel = document.getElementById('debatePanel');
    if (!panel || !debateData) return;

    const rawScore = Number(debateData.conviction_score);
    const score = Number.isFinite(rawScore) ? Math.min(100, Math.max(0, rawScore)) : 72;
    const isBullDominant = score >= 50;

    const pill = document.getElementById('convictionPill');
    const verdictEl = document.getElementById('debateVerdict');
    const fill = document.getElementById('convictionFill');
    const needle = document.getElementById('convictionNeedle');

    if (pill) {
        pill.textContent = isBullDominant ? `${score}% Bullish Bias` : `${100 - score}% Bearish Bias`;
    }

    if (verdictEl) {
        verdictEl.textContent = debateData.verdict || `Net Conviction: ${score}% structural upside.`;
        verdictEl.title = debateData.verdict || "";
    }

    if (fill) fill.style.width = `${score}%`;
    if (needle) needle.style.left = `${score}%`;

    // Bull thesis
    const bull = debateData.bull_thesis || {};
    const bullTitle = document.getElementById('bullThesisTitle');
    const bullScoreEl = document.getElementById('bullScore');
    const bullList = document.getElementById('bullCatalystsList');

    if (bullTitle) bullTitle.textContent = bull.title || 'Structural Growth Drivers & Technological Maturation';
    if (bullScoreEl) bullScoreEl.textContent = `${bull.score ? bull.score.toFixed(1) : '8.3'} / 10`;
    if (bullList) {
        bullList.innerHTML = '';
        const catalysts = bull.catalysts || [
            'Sustained efficiency scaling and platform consolidation.',
            'Expanding commercial market adoption across leading tier-1 segments.'
        ];
        catalysts.forEach(cat => {
            const li = document.createElement('li');
            li.textContent = cat;
            bullList.appendChild(li);
        });
    }

    // Bear thesis
    const bear = debateData.bear_thesis || {};
    const bearTitle = document.getElementById('bearThesisTitle');
    const bearScoreEl = document.getElementById('bearScore');
    const bearList = document.getElementById('bearHeadwindsList');

    if (bearTitle) bearTitle.textContent = bear.title || 'Market Friction, Adoption Bottlenecks & Margin Squeeze';
    if (bearScoreEl) bearScoreEl.textContent = `${bear.score ? bear.score.toFixed(1) : '5.8'} / 10`;
    if (bearList) {
        bearList.innerHTML = '';
        const headwinds = bear.headwinds || [
            'Near-term supply chain pressures and secondary market valuation shifts.',
            'Capital expenditure intensity and infrastructure rollout bottlenecks.'
        ];
        headwinds.forEach(hw => {
            const li = document.createElement('li');
            li.textContent = hw;
            bearList.appendChild(li);
        });
    }

    panel.classList.remove('hidden');
}

// ══════════════════════════════════════════
// TIER 2: GROUNDED RESEARCH COPILOT ENGINE
// ══════════════════════════════════════════

let isCopilotResponding = false;

function toggleCopilotDrawer() {
    const drawer = document.getElementById('copilotDrawer');
    if (!drawer) return;
    drawer.classList.toggle('hidden');
    if (!drawer.classList.contains('hidden')) {
        const input = document.getElementById('copilotInput');
        if (input) setTimeout(() => input.focus(), 150);
    }
}

function askCopilot(question) {
    const input = document.getElementById('copilotInput');
    const drawer = document.getElementById('copilotDrawer');
    if (drawer && drawer.classList.contains('hidden')) {
        drawer.classList.remove('hidden');
    }
    if (input) {
        input.value = question;
        sendCopilotMessage();
    }
}

function handleCopilotSubmit(event) {
    if (event) event.preventDefault();
    sendCopilotMessage();
}

async function sendCopilotMessage() {
    if (isCopilotResponding) return;

    const input = document.getElementById('copilotInput');
    const text = input ? input.value.trim() : '';
    if (!text) return;

    if (!currentTaskId) {
        showToast('Please initiate or wait for a research dossier to complete first.');
        return;
    }

    // Clear user input
    input.value = '';

    // Append user bubble
    appendCopilotBubble('user', escapeHtml(text));

    // Append typing indicator bubble
    const typingId = 'copilotTypingIndicator';
    appendCopilotBubble('bot', `
        <div class="typing-dots" id="${typingId}">
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
        </div>
    `, true);

    isCopilotResponding = true;
    const sendBtn = document.getElementById('copilotSendBtn');
    if (sendBtn) sendBtn.disabled = true;

    try {
        const response = await fetch(`/api/research/${currentTaskId}/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: text })
        });

        // Remove typing indicator bubble
        const typingEl = document.getElementById(typingId);
        if (typingEl && typingEl.closest('.copilot-msg')) {
            typingEl.closest('.copilot-msg').remove();
        }

        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.error || `Server responded with status ${response.status}`);
        }

        const data = await response.json();
        const reply = data.reply || "I synthesized the dossier findings, but could not formulate a response.";

        // Format and render reply
        const formattedReply = formatCopilotReply(reply);
        appendCopilotBubble('bot', formattedReply);

    } catch (error) {
        console.error('Copilot request failed:', error);
        const typingEl = document.getElementById(typingId);
        if (typingEl && typingEl.closest('.copilot-msg')) {
            typingEl.closest('.copilot-msg').remove();
        }
        appendCopilotBubble('bot', `⚠️ <em>Unable to contact research copilot: ${escapeHtml(error.message)}. Please verify your network and retry.</em>`);
    } finally {
        isCopilotResponding = false;
        if (sendBtn) sendBtn.disabled = false;
    }
}

function formatCopilotReply(text) {
    if (!text) return "";
    let safe = escapeHtml(text);

    // Markdown bold & italic
    safe = safe.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
    safe = safe.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    safe = safe.replace(/\*(.+?)\*/g, '<em>$1</em>');

    // Bullet points
    safe = safe.replace(/^\s*[-•*]\s+(.+)$/gm, '<li>$1</li>');
    safe = safe.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');

    // Paragraph splits
    const paras = safe.split(/\n{2,}/);
    const formatted = paras.map(p => {
        p = p.trim();
        if (!p) return '';
        if (p.startsWith('<ul>') || p.startsWith('<li>') || p.startsWith('<h')) return p;
        return `<p>${p}</p>`;
    }).filter(Boolean).join('');

    return formatted || `<p>${safe}</p>`;
}

function appendCopilotBubble(sender, innerHtml, isTemp = false) {
    const container = document.getElementById('copilotMessages');
    if (!container) return;

    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const msg = document.createElement('div');
    msg.className = `copilot-msg ${sender}`;
    msg.innerHTML = `
        <div class="copilot-bubble">${innerHtml}</div>
        ${!isTemp ? `<span class="copilot-msg-time">${timeStr}</span>` : ''}
    `;

    container.appendChild(msg);
    container.scrollTop = container.scrollHeight;
}

function clearCopilotChat() {
    const container = document.getElementById('copilotMessages');
    if (!container) return;
    container.innerHTML = `
        <div class="copilot-msg bot">
            <div class="copilot-bubble">
                Chat cleared. I'm ready to answer any new grounded inquiries about this dossier!
            </div>
            <span class="copilot-msg-time">Just now</span>
        </div>
    `;
}

// ══════════════════════════════════════════
// TIER 3: STAGE DEMO MODE GOLDEN SHOWCASE
// ══════════════════════════════════════════

async function loadGoldenShowcase(showcaseKey) {
    showToast('Loading Verified Stage Demo Golden Showcase...');
    try {
        const response = await fetch(`/api/showcase/${showcaseKey || 'ev'}`);
        if (!response.ok) {
            throw new Error(`Failed to load showcase: ${response.status}`);
        }
        const data = await response.json();
        currentTaskId = data.task_id;
        currentReportData = data;
        currentMarkdown = data.report || "";

        // Switch to dashboard view
        showDashboard(data.query);

        // Populate report content
        if (data.report) {
            renderReport(data.report);
        }

        // Quality score
        if (data.quality_score) {
            const scoreFormatted = data.quality_score.toFixed(1);
            qualityScore.textContent = scoreFormatted;
            qualityBadge.classList.remove('hidden');
            if (kpiScore) kpiScore.textContent = scoreFormatted;
        }

        // Action toolbar buttons
        if (copyBtn) copyBtn.classList.remove('hidden');
        if (exportPdfBtn) exportPdfBtn.classList.remove('hidden');
        if (exportMdBtn) exportMdBtn.classList.remove('hidden');
        if (tocWrapper) tocWrapper.classList.remove('hidden');
        const presBtn = document.getElementById('presentationBtn');
        if (presBtn) presBtn.classList.remove('hidden');

        // Charts
        if (data.charts && data.charts.length > 0) {
            renderCharts(data.charts);
        }

        // Sources
        if (data.sources && data.sources.length > 0) {
            renderSources(data.sources);
            if (kpiSourcesCount) kpiSourcesCount.textContent = data.sources.length;
        }

        // Audio briefing
        if (data.audio_briefing && data.audio_briefing.dialogue) {
            renderAudioBriefing(data.audio_briefing);
        }

        // Knowledge graph
        if (data.knowledge_graph && data.knowledge_graph.nodes) {
            renderKnowledgeGraph(data.knowledge_graph);
        }

        // Adversarial debate matrix
        if (data.debate && (data.debate.bull_thesis || data.debate.bear_thesis)) {
            renderDebateMatrix(data.debate);
        }

        // Copilot dock
        const copilotDock = document.getElementById('copilotDock');
        if (copilotDock) copilotDock.classList.remove('hidden');

        // Executive KPI Snapshot Bar
        if (executiveKpiBar) executiveKpiBar.classList.remove('hidden');

        // New research action bar
        newResearchSection.classList.remove('hidden');

        // Set to full-page dossier view
        setViewMode('dossier');
        updateConnectionStatus('Stage Demo Active', '#c99b42');
        showToast('Stage Demo Golden Dossier loaded instantly!');

    } catch (error) {
        console.error('Failed to load golden showcase:', error);
        showToast('Unable to load golden showcase. Check server connection.');
    }
}

// ══════════════════════════════════════════
// TIER 3: EXECUTIVE PITCH SLIDE DECK STUDIO
// ══════════════════════════════════════════

let currentSlideIndex = 0;
const TOTAL_SLIDES = 5;

function openPresentationDeck() {
    if (!currentReportData) {
        showToast('Please initiate research or load a golden showcase first.');
        return;
    }

    populateSlideDeck(currentReportData);

    currentSlideIndex = 0;
    updateSlideView();

    const modal = document.getElementById('presentationModal');
    if (modal) modal.classList.remove('hidden');
}

function closePresentationDeck(event) {
    if (event && event.target && event.target.closest('.presentation-container') && !event.target.closest('.modal-close-btn')) {
        return;
    }
    const modal = document.getElementById('presentationModal');
    if (modal) modal.classList.add('hidden');
}

function togglePresentationFullscreen() {
    const container = document.querySelector('.presentation-container');
    if (container) {
        container.classList.toggle('fullscreen-active');
        if (container.classList.contains('fullscreen-active')) {
            showToast('Fullscreen Presentation Mode active. Press Esc to exit.');
        }
    }
}

function nextSlide() {
    if (currentSlideIndex < TOTAL_SLIDES - 1) {
        currentSlideIndex++;
        updateSlideView();
    }
}

function prevSlide() {
    if (currentSlideIndex > 0) {
        currentSlideIndex--;
        updateSlideView();
    }
}

function goToSlide(index) {
    if (index >= 0 && index < TOTAL_SLIDES) {
        currentSlideIndex = index;
        updateSlideView();
    }
}

function updateSlideView() {
    // Hide all slide panes and show current
    for (let i = 1; i <= TOTAL_SLIDES; i++) {
        const pane = document.getElementById(`slide${i}`);
        if (pane) {
            if (i === currentSlideIndex + 1) {
                pane.classList.add('active');
            } else {
                pane.classList.remove('active');
            }
        }
    }

    // Update Counter
    const counter = document.getElementById('slideCounter');
    if (counter) counter.textContent = `Slide ${currentSlideIndex + 1} / ${TOTAL_SLIDES}`;

    // Update Progress Fill
    const fill = document.getElementById('slideProgressFill');
    if (fill) fill.style.width = `${((currentSlideIndex + 1) / TOTAL_SLIDES) * 100}%`;

    // Update Dots
    const dots = document.querySelectorAll('.slide-dot');
    dots.forEach((dot, idx) => {
        if (idx === currentSlideIndex) {
            dot.classList.add('active');
        } else {
            dot.classList.remove('active');
        }
    });

    // Update Nav Buttons
    const prevBtn = document.getElementById('presPrevBtn');
    const nextBtn = document.getElementById('presNextBtn');
    if (prevBtn) prevBtn.disabled = (currentSlideIndex === 0);
    if (nextBtn) nextBtn.disabled = (currentSlideIndex === TOTAL_SLIDES - 1);
}

function populateSlideDeck(data) {
    const query = data.query || "Strategic Intelligence Synthesis";
    const rigor = data.quality_score ? data.quality_score.toFixed(1) : "9.2";
    const sourcesCount = data.sources ? data.sources.length : (data.findings_count || 12);
    const debate = data.debate || {};
    const conviction = debate.conviction_score || 74;

    // Header & Slide 1
    const headerTitle = document.getElementById('presHeaderTitle');
    const slideTitle = document.getElementById('presSlideTitle');
    const slideSubtitle = document.getElementById('presSlideSubtitle');
    const rigorEl = document.getElementById('presRigorScore');
    const sourcesEl = document.getElementById('presSourcesCount');
    const convictionEl = document.getElementById('presConvictionScore');

    if (headerTitle) headerTitle.textContent = query;
    if (slideTitle) slideTitle.textContent = query;
    if (slideSubtitle) slideSubtitle.textContent = `Autonomous multi-agent investigation synthesized across ${sourcesCount} verified primary benchmarks and market evidence.`;
    if (rigorEl) rigorEl.textContent = rigor;
    if (sourcesEl) sourcesEl.textContent = sourcesCount;
    if (convictionEl) convictionEl.textContent = `${conviction}%`;

    // Slide 2: Insights
    const insightsGrid = document.getElementById('presInsightsGrid');
    if (insightsGrid) {
        insightsGrid.innerHTML = '';
        const insights = (data.analysis && data.analysis.key_insights) || [
            "Maturing third-generation vehicle architectures driving standard ranges past 250-350 miles.",
            "Sodium-ion chemistry innovations breaking through sub-$30,000 threshold for mass-market parity.",
            "Strategic convergence toward 800V fast-charging eliminating consumer charging latency."
        ];
        insights.slice(0, 4).forEach((ins, idx) => {
            const card = document.createElement('div');
            card.className = 'slide-insight-card';
            card.innerHTML = `
                <span class="slide-insight-num">STRATEGIC TAKEAWAY 0${idx + 1}</span>
                <p class="slide-insight-text">${escapeHtml(ins)}</p>
            `;
            insightsGrid.appendChild(card);
        });
    }

    // Slide 3: Debate Split
    const debateSplit = document.getElementById('presDebateSplit');
    if (debateSplit) {
        debateSplit.innerHTML = '';
        const bull = debate.bull_thesis || {
            title: "Breakthrough Growth Catalysts",
            score: 8.4,
            catalysts: ["Battery costs dropping below $80/kWh", "Solid-state commercialization", "Rapid charging exceeding 300kW"]
        };
        const bear = debate.bear_thesis || {
            title: "Critical Adoption Headwinds",
            score: 5.9,
            headwinds: ["Near-term supply chain volatility", "Charging grid capacity limits", "Macroeconomic incentive scale-back"]
        };

        debateSplit.innerHTML = `
            <div class="slide-thesis-box bull">
                <div class="slide-thesis-top">
                    <h3 class="slide-thesis-title">🐂 Bull Case: ${escapeHtml(bull.title || 'Growth Drivers')}</h3>
                    <span class="thesis-score bull">${bull.score ? bull.score.toFixed(1) : '8.4'} / 10</span>
                </div>
                <ul class="slide-thesis-points">
                    ${(bull.catalysts || []).map(c => `<li>▲ ${escapeHtml(c)}</li>`).join('')}
                </ul>
            </div>
            <div class="slide-thesis-box bear">
                <div class="slide-thesis-top">
                    <h3 class="slide-thesis-title">🐻 Bear Case: ${escapeHtml(bear.title || 'Headwinds & Risks')}</h3>
                    <span class="thesis-score bear">${bear.score ? bear.score.toFixed(1) : '5.9'} / 10</span>
                </div>
                <ul class="slide-thesis-points">
                    ${(bear.headwinds || []).map(h => `<li>▼ ${escapeHtml(h)}</li>`).join('')}
                </ul>
            </div>
        `;
    }

    // Slide 4: Charts
    const chartsWrap = document.getElementById('presChartsWrap');
    if (chartsWrap) {
        chartsWrap.innerHTML = '';
        const charts = data.charts || [];
        if (charts.length > 0) {
            charts.slice(0, 2).forEach((chart, idx) => {
                const src = typeof chart === 'string' ? chart : (chart.image || '');
                const title = typeof chart === 'object' ? (chart.title || `Benchmark ${idx + 1}`) : `Market Benchmark ${idx + 1}`;
                if (src) {
                    const item = document.createElement('div');
                    item.className = 'slide-chart-item';
                    item.innerHTML = `
                        <img src="${src}" alt="${escapeHtml(title)}">
                        <span class="slide-chart-title">${escapeHtml(title)}</span>
                    `;
                    chartsWrap.appendChild(item);
                }
            });
        } else {
            chartsWrap.innerHTML = `
                <div class="feed-placeholder" style="width: 100%; text-align: center; padding: 30px;">
                    <p>Quantitative benchmarks synthesized across empirical comparative tables.</p>
                </div>
            `;
        }
    }

    // Slide 5: Verdict & Sources
    const verdictCard = document.getElementById('presVerdictCard');
    const sourcesPills = document.getElementById('presSourcesPills');
    if (verdictCard) {
        verdictCard.innerHTML = `
            <p class="slide-verdict-text">
                "${escapeHtml(debate.verdict || 'The market has entered a transformative scaling phase where long-term architectural efficiency outweighs near-term friction.')}"
            </p>
        `;
    }
    if (sourcesPills) {
        sourcesPills.innerHTML = '';
        const sources = data.sources || [];
        sources.slice(0, 6).forEach((s, idx) => {
            const pill = document.createElement('span');
            pill.className = 'sfs-pill';
            pill.textContent = `[${idx + 1}] ${getDomain(s.url || 'source.com')}`;
            sourcesPills.appendChild(pill);
        });
    }
}

// ── Keyboard Navigation for Pitch Deck ──
document.addEventListener('keydown', (e) => {
    const modal = document.getElementById('presentationModal');
    if (!modal || modal.classList.contains('hidden')) return;

    if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        nextSlide();
    } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        prevSlide();
    } else if (e.key === 'Escape') {
        closePresentationDeck();
    }
});



