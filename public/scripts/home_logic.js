// ─── Home Logic ───────────────────────────────────────────────────────────────

const MASTER_INDEX_KEY = 'qaDashboardMasterIndex';

// Filtros de sessão (reiniciados ao recarregar a página)
let _homeFilters = { squad: 'all', status: 'all', year: 'all' };

// ─── SVG Icons ────────────────────────────────────────────────────────────────
const _SVG_USERS     = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`;
const _SVG_CALENDAR  = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`;
const _SVG_TRASH     = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>`;
const _SVG_GRIP      = `<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><circle cx="9" cy="5" r="1.5"/><circle cx="15" cy="5" r="1.5"/><circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/><circle cx="9" cy="19" r="1.5"/><circle cx="15" cy="19" r="1.5"/></svg>`;
const _SVG_PLUS      = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`;
const _SVG_PLUS_LG   = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`;
const _SVG_EXPORT    = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`;
const _SVG_ARROW_L   = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>`;
const _SVG_CLOSE_SM  = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;

// ─── Storage Helpers ──────────────────────────────────────────────────────────

function getMasterIndex() {
    try {
        const stored = localStorage.getItem(MASTER_INDEX_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch (e) { return []; }
}

function saveMasterIndex(indexArr) {
    try {
        localStorage.setItem(MASTER_INDEX_KEY, JSON.stringify(indexArr));
    } catch (e) { console.error('Erro ao salvar Master Index', e); }
}

// ─── Sprint Helpers ───────────────────────────────────────────────────────────

function _sprintStatus(sprint) {
    return (sprint.totalTests > 0 && sprint.totalExec >= sprint.totalTests) ? 'completed' : 'active';
}

function _sprintYear(sprint) {
    if (sprint.startDate) return sprint.startDate.split('-')[0];
    if (sprint.endDate)   return sprint.endDate.split('-')[0];
    return null;
}

function _esc(str) {
    return str ? String(str).replace(/'/g, "\\'") : '';
}

// ─── Master Index CRUD ────────────────────────────────────────────────────────

function upsertSprintInMasterIndex(sprintId, sprintState) {
    let index = getMasterIndex();
    const existingIdx = index.findIndex(s => s.id === sprintId);

    const totalTests = (sprintState.features || []).reduce((a, f) => a + (parseInt(f.tests) || 0), 0);
    const totalExec  = (sprintState.features || []).reduce((a, f) => a + (parseInt(f.exec)  || 0), 0);

    const data = {
        id: sprintId,
        title:     sprintState.config?.title     || 'S/ Título',
        squad:     sprintState.config?.squad     || '',
        startDate: sprintState.config?.startDate || '',
        endDate:   sprintState.config?.endDate   || '',
        totalTests, totalExec,
        updatedAt: new Date().toISOString()
    };

    if (existingIdx >= 0) {
        index[existingIdx] = Object.assign({}, index[existingIdx], data);
    } else {
        index.unshift(data);
    }
    saveMasterIndex(index);
}

// ─── Sprint Actions ───────────────────────────────────────────────────────────

window.sprintToDelete = null;

window.deleteSprint = function(sprintId, title) {
    window.sprintToDelete = sprintId;
    document.getElementById('delete-sprint-text').innerHTML =
        `Tem certeza que deseja apagar o dashboard <strong>"${window.escapeHTML ? window.escapeHTML(title) : title}"</strong>?<br><br>Todos os dados dessa Sprint serão perdidos permanentemente.`;
    document.getElementById('modal-delete-sprint').classList.add('active');
};

window.closeDeleteModal = function() {
    window.sprintToDelete = null;
    document.getElementById('modal-delete-sprint').classList.remove('active');
};

window.confirmDeleteSprint = function() {
    if (!window.sprintToDelete) return;
    let index = getMasterIndex();
    index = index.filter(s => s.id !== window.sprintToDelete);
    saveMasterIndex(index);
    localStorage.removeItem('qaDashboardData_' + window.sprintToDelete);
    window.closeDeleteModal();
    renderHomeScreen();
};

window.openCreateModal = function() {
    document.getElementById('modal-new-sprint').classList.add('active');
    document.getElementById('new-sprint-title').value = '';
    document.getElementById('new-sprint-squad').value = '';
    setTimeout(() => document.getElementById('new-sprint-title').focus(), 60);
};

window.closeCreateModal = function() {
    document.getElementById('modal-new-sprint').classList.remove('active');
};

window.createNewSprint = function(event) {
    event.preventDefault();
    const title = document.getElementById('new-sprint-title').value.trim();
    const squad = document.getElementById('new-sprint-squad').value.trim();
    if (!title) { alert('O Título da Sprint é obrigatório.'); return; }

    const newSprintId = 'sprint_' + Date.now();
    const newState = JSON.parse(JSON.stringify(window.DEFAULT_STATE));
    newState.config.title = title;
    newState.config.squad = squad;

    localStorage.setItem('qaDashboardData_' + newSprintId, JSON.stringify(newState));
    upsertSprintInMasterIndex(newSprintId, newState);
    closeCreateModal();
    window.location.hash = '#sprint=' + newSprintId;
};

// ─── Filter Handlers ──────────────────────────────────────────────────────────

window.setHomeFilter = function(field, value) {
    _homeFilters[field] = value;
    _renderFilteredCards();
};

window.clearHomeFilters = function() {
    _homeFilters = { squad: 'all', status: 'all', year: 'all' };
    // Resetar selects sem re-renderizar o filter bar inteiro
    ['home-filter-squad', 'home-filter-status', 'home-filter-year'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = 'all';
    });
    const clearBtn = document.getElementById('home-filter-clear');
    if (clearBtn) clearBtn.style.display = 'none';
    _renderFilteredCards();
};

// ─── Render ───────────────────────────────────────────────────────────────────

function renderHomeScreen() {
    const listContainer = document.getElementById('sprint-list');
    const filterBarEl   = document.getElementById('home-filter-bar');
    if (!listContainer) return;

    const allSprints = getMasterIndex();

    // Opções únicas para os filtros
    const squads = [...new Set(allSprints.map(s => s.squad || '').filter(Boolean))].sort();
    const years  = [...new Set(allSprints.map(s => _sprintYear(s)).filter(Boolean))].sort().reverse();

    // Renderiza a barra de filtros (só uma vez — ou quando mudam as opções)
    if (filterBarEl) {
        filterBarEl.innerHTML = `
            <div class="filter-controls">
                <div class="filter-group">
                    <label class="filter-label">Squad</label>
                    <select id="home-filter-squad" class="filter-select" onchange="setHomeFilter('squad', this.value)">
                        <option value="all">Todos</option>
                        ${squads.map(s => `<option value="${_esc(s)}" ${_homeFilters.squad === s ? 'selected' : ''}>${window.escapeHTML ? window.escapeHTML(s) : s}</option>`).join('')}
                    </select>
                </div>
                <div class="filter-divider"></div>
                <div class="filter-group">
                    <label class="filter-label">Status</label>
                    <select id="home-filter-status" class="filter-select" onchange="setHomeFilter('status', this.value)">
                        <option value="all">Todos</option>
                        <option value="active"     ${_homeFilters.status === 'active'     ? 'selected' : ''}>Em Andamento</option>
                        <option value="completed"  ${_homeFilters.status === 'completed'  ? 'selected' : ''}>Concluída</option>
                    </select>
                </div>
                ${years.length > 0 ? `
                <div class="filter-divider"></div>
                <div class="filter-group">
                    <label class="filter-label">Ano</label>
                    <select id="home-filter-year" class="filter-select" onchange="setHomeFilter('year', this.value)">
                        <option value="all">Todos</option>
                        ${years.map(y => `<option value="${y}" ${_homeFilters.year === y ? 'selected' : ''}>${y}</option>`).join('')}
                    </select>
                </div>
                ` : ''}
                <button id="home-filter-clear" class="btn-clear-filters"
                    style="display:${(_homeFilters.squad !== 'all' || _homeFilters.status !== 'all' || _homeFilters.year !== 'all') ? 'flex' : 'none'}"
                    onclick="clearHomeFilters()">
                    ${_SVG_CLOSE_SM} Limpar
                </button>
            </div>
            <span class="filter-count" id="home-filter-count"></span>
        `;
    }

    _renderFilteredCards();
}

// Renderiza somente os cards (chamado também pelos filtros)
function _renderFilteredCards() {
    const listContainer = document.getElementById('sprint-list');
    if (!listContainer) return;

    const allSprints = getMasterIndex();

    const filtered = allSprints.filter(sprint => {
        const st = _sprintStatus(sprint);
        if (_homeFilters.squad !== 'all' && (sprint.squad || '') !== _homeFilters.squad) return false;
        if (_homeFilters.status !== 'all' && st !== _homeFilters.status) return false;
        if (_homeFilters.year !== 'all' && _sprintYear(sprint) !== _homeFilters.year) return false;
        return true;
    });

    // Atualiza contador
    const countEl = document.getElementById('home-filter-count');
    if (countEl) {
        const hasFilters = _homeFilters.squad !== 'all' || _homeFilters.status !== 'all' || _homeFilters.year !== 'all';
        countEl.textContent = hasFilters
            ? `${filtered.length} de ${allSprints.length} sprints`
            : `${allSprints.length} sprint${allSprints.length !== 1 ? 's' : ''}`;
    }

    // Atualiza visibilidade do botão limpar
    const clearBtn = document.getElementById('home-filter-clear');
    if (clearBtn) {
        const hasActive = _homeFilters.squad !== 'all' || _homeFilters.status !== 'all' || _homeFilters.year !== 'all';
        clearBtn.style.display = hasActive ? 'flex' : 'none';
    }

    // Monta HTML dos cards
    let html = `
        <div class="sprint-card sprint-card-new" onclick="openCreateModal()" title="Criar nova sprint">
            <div class="sprint-card-new-icon">${_SVG_PLUS_LG}</div>
            <span class="sprint-card-new-label">Nova Sprint</span>
        </div>
    `;

    if (allSprints.length === 0) {
        html += `<div class="home-empty-state"><strong>Nenhuma sprint criada ainda</strong><p>Clique em "Nova Sprint" para criar seu primeiro dashboard.</p></div>`;
    } else if (filtered.length === 0) {
        html += `<div class="home-empty-state"><strong>Nenhuma sprint encontrada</strong><p>Nenhuma sprint corresponde aos filtros selecionados.</p></div>`;
    }

    filtered.forEach(sprint => {
        const status      = _sprintStatus(sprint);
        const statusLabel = status === 'completed' ? 'Concluída' : 'Em Andamento';
        const pct         = sprint.totalTests > 0 ? Math.round((sprint.totalExec / sprint.totalTests) * 100) : 0;
        const fillColor   = status === 'completed' ? '#10b981' : '#3b82f6';
        const period      = (sprint.startDate && sprint.endDate)
            ? `${formatDateBR(sprint.startDate)} — ${formatDateBR(sprint.endDate)}`
            : 'Período não definido';
        const title = window.escapeHTML ? window.escapeHTML(sprint.title) : sprint.title;
        const squad = window.escapeHTML ? window.escapeHTML(sprint.squad || 'Sem squad') : (sprint.squad || 'Sem squad');

        html += `
            <div class="sprint-card" data-sprint-id="${sprint.id}" onclick="window.location.hash='#sprint=${sprint.id}'">
                <div class="sprint-card-stripe ${status}"></div>
                <button class="btn-delete-sprint"
                    onclick="event.stopPropagation(); deleteSprint('${sprint.id}', '${_esc(sprint.title)}')"
                    title="Excluir sprint">
                    ${_SVG_TRASH}
                </button>
                <span class="dnd-handle dnd-handle-sprint" draggable="true"
                    onclick="event.preventDefault(); event.stopPropagation();"
                    title="Arrastar para reordenar">
                    ${_SVG_GRIP}
                </span>
                <div class="sprint-card-body">
                    <div class="sprint-card-title">${title}</div>
                    <div class="sprint-card-meta">
                        <span class="sprint-meta-item">${_SVG_USERS}${squad}</span>
                        <span class="sprint-meta-item">${_SVG_CALENDAR}${period}</span>
                    </div>
                    <div class="sprint-card-progress">
                        <div class="sprint-progress-track">
                            <div class="sprint-progress-fill" style="width:${pct}%;background:${fillColor};"></div>
                        </div>
                        <div class="sprint-progress-meta">
                            <span>${pct}% concluído</span>
                            <span>${sprint.totalExec} / ${sprint.totalTests} testes</span>
                        </div>
                    </div>
                    <div class="sprint-card-footer">
                        <span class="sprint-status ${status}">
                            <span class="sprint-status-dot"></span>
                            ${statusLabel}
                        </span>
                    </div>
                </div>
            </div>
        `;
    });

    listContainer.innerHTML = html;
    initSprintDragDrop();
}

// ─── Drag & Drop ──────────────────────────────────────────────────────────────

function initSprintDragDrop() {
    const container = document.getElementById('sprint-list');
    if (!container || container._dndBound) return;
    container._dndBound = true;

    let _dragSrcId = null;

    container.addEventListener('dragstart', (e) => {
        const handle = e.target.closest('.dnd-handle');
        if (!handle) { e.preventDefault(); return; }
        const card = handle.closest('.sprint-card[data-sprint-id]');
        if (!card) { e.preventDefault(); return; }
        _dragSrcId = card.dataset.sprintId;
        card.classList.add('dnd-dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', _dragSrcId);
    });

    container.addEventListener('dragover', (e) => {
        e.preventDefault();
        const card = e.target.closest('.sprint-card[data-sprint-id]');
        if (!card) return;
        e.dataTransfer.dropEffect = 'move';
        container.querySelectorAll('.sprint-card[data-sprint-id]').forEach(c => c.classList.remove('dnd-over'));
        card.classList.add('dnd-over');
    });

    container.addEventListener('dragleave', (e) => {
        if (!container.contains(e.relatedTarget))
            container.querySelectorAll('.sprint-card[data-sprint-id]').forEach(c => c.classList.remove('dnd-over'));
    });

    container.addEventListener('dragend', () => {
        container.querySelectorAll('.sprint-card').forEach(c => c.classList.remove('dnd-dragging', 'dnd-over'));
        _dragSrcId = null;
    });

    container.addEventListener('drop', (e) => {
        e.preventDefault();
        const card = e.target.closest('.sprint-card[data-sprint-id]');
        if (!card || !_dragSrcId) return;
        const dropId = card.dataset.sprintId;
        if (!dropId || _dragSrcId === dropId) { _dragSrcId = null; return; }

        const index = getMasterIndex();
        const srcIdx = index.findIndex(s => s.id === _dragSrcId);
        const dstIdx = index.findIndex(s => s.id === dropId);
        if (srcIdx === -1 || dstIdx === -1) return;

        const [moved] = index.splice(srcIdx, 1);
        index.splice(dstIdx, 0, moved);
        saveMasterIndex(index);
        _dragSrcId = null;
        _renderFilteredCards();
    });
}

// ─── Utilities ────────────────────────────────────────────────────────────────

window.formatDateBR = function(dateString) {
    if (!dateString) return '';
    const parts = dateString.split('-');
    if (parts.length !== 3) return dateString;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
};

window.exportAllData = async function() {
    const sprints = getMasterIndex();
    const exportBundle = {
        metadata: { exportDate: new Date().toISOString(), version: '2.0', sprintCount: sprints.length },
        sprints: []
    };
    for (const s of sprints) {
        const dataStr = localStorage.getItem('qaDashboardData_' + s.id);
        if (dataStr) {
            try { exportBundle.sprints.push({ id: s.id, data: JSON.parse(dataStr) }); } catch (e) {}
        }
    }
    const jsonStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(exportBundle, null, 2));
    const a = document.createElement('a');
    a.setAttribute('href', jsonStr);
    a.setAttribute('download', 'qa_dashboard_backup_' + new Date().toISOString().split('T')[0] + '.json');
    document.body.appendChild(a);
    a.click();
    a.remove();
};

// ─── Inject Home Shell ────────────────────────────────────────────────────────

function injectHomeAndModalViews() {
    const wrapper = document.createElement('div');
    wrapper.id = 'home-wrapper';
    wrapper.style.display = 'none';
    wrapper.innerHTML = `
        <!-- Header -->
        <div class="home-header">
            <div class="home-title">
                <h1>ToStatos</h1>
                <p>Gerencie e acompanhe a qualidade de múltiplas Sprints e projetos.</p>
            </div>
            <div class="home-actions">
                <button class="btn-outline" style="display:flex;align-items:center;gap:7px;background:#fff;" onclick="exportAllData()">
                    ${_SVG_EXPORT} Backup Geral
                </button>
                <button class="btn-primary" style="display:flex;align-items:center;gap:7px;" onclick="openCreateModal()">
                    ${_SVG_PLUS} Nova Sprint
                </button>
            </div>
        </div>

        <!-- Filter Bar -->
        <div class="home-filter-bar" id="home-filter-bar">
            <!-- gerado por renderHomeScreen() -->
        </div>

        <!-- Cards -->
        <div class="sprint-grid" id="sprint-list"></div>

        <!-- Modal: Nova Sprint -->
        <div class="modal-overlay" id="modal-new-sprint" onclick="if(event.target===this)closeCreateModal()">
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Nova Sprint</h2>
                    <button class="btn-close-modal" onclick="closeCreateModal()">×</button>
                </div>
                <form id="form-new-sprint" onsubmit="createNewSprint(event)">
                    <div class="form-group">
                        <label class="input-label">Título do Dashboard / Sprint *</label>
                        <input type="text" id="new-sprint-title" placeholder="Ex: QA Dashboard — Sprint 12" required>
                    </div>
                    <div class="form-group" style="margin-bottom:0;">
                        <label class="input-label">Squad / Time (opcional)</label>
                        <input type="text" id="new-sprint-squad" placeholder="Ex: Checkout, Pagamentos…">
                    </div>
                    <div class="modal-actions">
                        <button type="button" class="btn-outline" onclick="closeCreateModal()">Cancelar</button>
                        <button type="submit" class="btn-primary">Criar</button>
                    </div>
                </form>
            </div>
        </div>

        <!-- Modal: Excluir Sprint -->
        <div class="modal-overlay" id="modal-delete-sprint" onclick="if(event.target===this)closeDeleteModal()">
            <div class="modal-content" style="max-width:440px;">
                <div class="modal-header">
                    <h2 style="color:var(--danger);">Excluir Sprint</h2>
                    <button class="btn-close-modal" onclick="closeDeleteModal()">×</button>
                </div>
                <div id="delete-sprint-text" style="padding:4px 0 16px;font-size:14px;color:var(--text-main);line-height:1.6;"></div>
                <div class="modal-actions">
                    <button type="button" class="btn-outline" onclick="closeDeleteModal()">Cancelar</button>
                    <button type="button" class="btn-primary" style="background:var(--danger);border-color:var(--danger);" onclick="confirmDeleteSprint()">Excluir</button>
                </div>
            </div>
        </div>
    `;

    const exportWrapper = document.getElementById('export-wrapper');
    exportWrapper.parentNode.insertBefore(wrapper, exportWrapper);

    // Botão de voltar na header do dashboard de sprint
    const headerTitleDiv = document.querySelector('header > div');
    const backBtn = document.createElement('button');
    backBtn.id = 'btn-back-home';
    backBtn.className = 'btn-outline';
    backBtn.style.cssText = 'margin-bottom:14px;background:transparent;border:none;box-shadow:none;padding:0;color:var(--text-muted);font-size:13px;font-weight:600;display:flex;align-items:center;gap:6px;cursor:pointer;';
    backBtn.innerHTML = `${_SVG_ARROW_L} Sprints`;
    backBtn.onclick = () => { window.location.hash = '#home'; };
    headerTitleDiv.insertBefore(backBtn, headerTitleDiv.firstChild);
}

window.injectHomeAndModalViews    = injectHomeAndModalViews;
window.renderHomeScreen           = renderHomeScreen;
window.upsertSprintInMasterIndex  = upsertSprintInMasterIndex;
