// ==========================================
// CONTROLLER (controller.js)
// ==========================================

// Estado interno do modal de resolução de bug (MTTR)
let _resolveModalBugIndex = null;
let _resolveModalSelectElement = null;
let _resolveModalPrevStatus = null;

// Função Auxiliar para o Modal Global de Confirmação
let _confirmCallback = null;

window.showConfirmModal = function(title, message, callback) {
    document.getElementById('confirm-modal-title').innerText = title;
    document.getElementById('confirm-modal-message').innerHTML = message;
    _confirmCallback = callback;
    document.getElementById('modal-confirm-action').classList.add('active');
}

window.closeConfirmModal = function() {
    document.getElementById('modal-confirm-action').classList.remove('active');
    _confirmCallback = null;
}

// Handler do botão "Sim, Confirmar"
document.addEventListener('DOMContentLoaded', () => {
    const btnConfirm = document.getElementById('confirm-modal-btn');
    if(btnConfirm) {
        btnConfirm.addEventListener('click', () => {
            if (typeof _confirmCallback === 'function') {
                _confirmCallback();
            }
            window.closeConfirmModal();
        });
    }
});

window.setupEventListeners = function() {
        const currentDateSelector = document.getElementById('currentDateSelector');
        if (currentDateSelector && !currentDateSelector.dataset.bound) {
            currentDateSelector.addEventListener('change', function(event) {
                const selectedDate = event.target.value || new Date().toISOString().split('T')[0];
                state.currentDate = selectedDate;
                if (!state.reports) state.reports = {};
                if (state.reports[state.currentDate] === undefined) state.reports[state.currentDate] = '';
                saveState();
            });
            currentDateSelector.dataset.bound = 'true';
        }

        if (!window.__qaDashboardResizeBound) {
            let resizeTimeout;
            window.addEventListener('resize', function() {
                clearTimeout(resizeTimeout);
                resizeTimeout = setTimeout(function() {
                    if (document.getElementById('tab-1')?.classList.contains('active')) {
                        renderCharts();
                    }
                }, 150);
            });
            window.__qaDashboardResizeBound = true;
        }
    }

    
window.initSprint = async function() {
        let rawState = null;

        // Tenta buscar do servidor local Node.js primeiro
        if (window.loadStateFromServer) {
            rawState = await window.loadStateFromServer();
        }

        // Se o servidor estiver fora ou retornar vazio, cai de volta pro LocalStorage
        if (!rawState) {
            const saved = localStorage.getItem(getStorageKey());
            if (saved) {
                try {
                    rawState = JSON.parse(saved);
                } catch (error) {
                    console.error('Falha ao carregar backup local. Restaurando estado padrão:', error);
                }
            }
        }

        state = normalizeState(rawState);
        document.getElementById('currentDateSelector').value = state.currentDate;

        setupEventListeners();
        renderAll();
    }

    
window.initRouting = function() {
        window.injectHomeAndModalViews();
        
        function handleHashChange() {
            const hash = window.location.hash;
            const captureWrapper = document.getElementById('capture-wrapper');
            const homeWrapper = document.getElementById('home-wrapper');
            const exportWrapper = document.getElementById('export-wrapper');

            if (hash.startsWith('#sprint=')) {
                const sprintId = hash.split('=')[1];
                window.currentSprintId = sprintId;
                homeWrapper.style.display = 'none';
                exportWrapper.style.display = 'block';
                window.initSprint();
            } else {
                window.currentSprintId = '';
                exportWrapper.style.display = 'none';
                homeWrapper.style.display = 'block';
                window.renderHomeScreen();
            }
        }

        window.addEventListener('hashchange', handleHashChange);
        
        if (!window.location.hash || window.location.hash === '#home') {
             window.location.hash = '#home';
             handleHashChange();
        } else {
             handleHashChange();
        }
    }

window.updateConfig = function(field, value) {
        state.config[field] = value;
        // Auto-calcular sprintDays quando startDate ou endDate mudar
        if (field === 'startDate' || field === 'endDate') {
            const s = state.config.startDate;
            const e = state.config.endDate;
            if (s && e) {
                const diff = Math.round((new Date(e + 'T00:00:00') - new Date(s + 'T00:00:00')) / (1000 * 60 * 60 * 24)) + 1;
                if (diff > 0) {
                    state.config.sprintDays = diff;
                    const cfgDaysEl = document.getElementById('cfg-days');
                    if (cfgDaysEl) cfgDaysEl.value = diff;
                }
            }
        }
        saveState();
    }

    
window.updateReportText = function(val) {
        if (!state.reports) state.reports = {};
        state.reports[state.currentDate] = val;
        renderDailyReport(); 
        clearTimeout(window.saveTimeout);
        window.saveTimeout = setTimeout(saveState, 800);
    }

    
window.updateNotes = function(field, value) {
        if(!state.notes) state.notes = {};
        state.notes[field] = value;
        renderNotes(); 
        clearTimeout(window.saveTimeout);
        window.saveTimeout = setTimeout(saveState, 800);
    }

    
window.updateFeatureExecution = function(featureIndex, dayKey, value) {
        let f = state.features[featureIndex];
        if(!f.manualExecData) f.manualExecData = {};
        
        let totalVal = parseInt(value);
        if(isNaN(totalVal) || totalVal < 0) totalVal = 0;

        let gherkinCount = f.gherkinExecs ? (f.gherkinExecs[dayKey] || 0) : 0;
        
        let manualVal = totalVal - gherkinCount;
        if (manualVal < 0) {
            manualVal = 0;
            alert(`Você não pode informar um valor menor que a quantidade de testes Gherkin concluídos (${gherkinCount}) neste dia.`);
        }

        let sumOther = 0;
        const sprintDays = parseInt(state.config.sprintDays) || 20;
        for(let i=1; i<=sprintDays; i++) {
            let dKey = `D${i}`;
            if(dKey !== dayKey) {
                // Usa manualExecData + gherkinExecs (fontes de verdade, não o stale f.execution)
                const mOther = parseInt(f.manualExecData ? (f.manualExecData[dKey] || 0) : 0);
                const gOther = f.gherkinExecs ? (f.gherkinExecs[dKey] || 0) : 0;
                sumOther += mOther + gOther;
            }
        }

        if((manualVal + gherkinCount) + sumOther > f.tests) {
            manualVal = f.tests - sumOther - gherkinCount;
            if (manualVal < 0) manualVal = 0;
            alert(`Atenção: A funcionalidade "${escapeHTML(f.name)}" possui limite de ${f.tests} testes no momento. O valor foi ajustado.`);
        }

        f.manualExecData[dayKey] = manualVal;
        saveState();
    }

    
window.updateFeatureFilter = function(featureIndex, value) {
        state.features[featureIndex].activeFilter = value;
        renderTestCasesAccordion();
    }

    
window.addAlignment = function() {
        if(!state.alignments) state.alignments = [];
        state.alignments.push({ id: Date.now(), text: '' });
        saveState();
    }
    
    
window.updateAlignment = function(index, value) {
        state.alignments[index].text = value;
        saveState();
    }
    
    
window.removeAlignment = function(index) {
        window.showConfirmModal("Excluir Alinhamento", "Tem certeza que deseja remover este alinhamento?", () => {
            state.alignments.splice(index, 1);
            saveState();
        });
    }

    
// ─── Suite de Testes — CRUD ────────────────────────────────────────────────────

window.addSuite = function() {
    if (!state.suites) state.suites = [];
    const newId = Date.now();
    state.suites.push({ id: newId, name: '' });
    saveState();
    setTimeout(() => {
        const inputEl = document.querySelector(`[data-suite-name-id="${newId}"]`);
        if (inputEl) {
            inputEl.focus();
            inputEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, 150);
};

window.updateSuite = function(index, field, value) {
    if (!state.suites || !state.suites[index]) return;
    state.suites[index][field] = value;
    saveState();
};

window.removeSuite = function(index) {
    if (!state.suites || !state.suites[index]) return;
    const suite = state.suites[index];
    const featureCount = state.features.filter(f => String(f.suiteId) === String(suite.id)).length;
    window.showConfirmModal(
        'Excluir Suite de Testes',
        `Tem certeza? Isso excluirá a suite <strong>"${escapeHTML(suite.name || 'sem nome')}"</strong> e suas <strong>${featureCount} funcionalidade(s)</strong> com todos os casos de teste.`,
        () => {
            state.features = state.features.filter(f => String(f.suiteId) !== String(suite.id));
            state.suites.splice(index, 1);
            saveState();
        }
    );
};

// ─── Funcionalidade — CRUD ────────────────────────────────────────────────────

window.addFeature = function(suiteId) {
        if (!suiteId) suiteId = state.suites && state.suites[0] ? state.suites[0].id : 1;
        const newId = Date.now();
        state.features.unshift({
            id: newId,
            suiteId: suiteId,
            name: '',
            tests: 0,
            manualTests: 0,
            exec: 0,
            execution: {},
            manualExecData: {},
            mockupImage: '',
            status: 'Ativa',
            blockReason: '',
            activeFilter: 'Todos',
            cases: []
        });
        saveState();

        setTimeout(() => {
            const detailsElement = document.querySelector(`details[data-feature-id="${newId}"]`);
            if (detailsElement) {
                detailsElement.setAttribute('open', 'true');
                const inputElement = detailsElement.querySelector('input[type="text"]');
                if (inputElement) {
                    inputElement.focus();
                    inputElement.scrollIntoView({ behavior: "smooth", block: "center" });
                }
            }
        }, 100);
    }
    
    
window.updateFeature = function(index, field, value) { 
        const oldName = state.features[index].name;
        state.features[index][field] = value; 
        
        if (field === 'status' && value !== 'Bloqueada' && value !== 'Cancelada') {
            state.features[index].blockReason = '';
        }

        if (field === 'name') { state.bugs.forEach(b => { if (b.feature === oldName) b.feature = value; }); }
        saveState(); 
    }
    
    
window.removeFeature = function(index) { 
        window.showConfirmModal(
            "Excluir Funcionalidade", 
            "Tem certeza que deseja excluir esta funcionalidade e <strong>TODOS</strong> os seus casos de teste associados?", 
            () => {
                state.features.splice(index, 1); 
                saveState(); 
            }
        );
    }

    
window.addBlocker = function() { state.blockers.push({ id: Date.now(), date: state.currentDate, reason: '', hours: 0 }); saveState(); }
    
window.updateBlocker = function(index, field, value) { state.blockers[index][field] = value; saveState(); }
    
window.removeBlocker = function(index) { 
        window.showConfirmModal("Remover Bloqueio", "Tem certeza que deseja remover este bloqueio?", () => {
            state.blockers.splice(index, 1); 
            saveState(); 
        });
    }

    
window.addBug = function() {
    const today = new Date().toISOString().split('T')[0];
    state.bugs.unshift({ id: 'BUG-XXX', feature: '', desc: 'Novo Bug', stack: 'Front', severity: 'Média', categoria: 'Layout', assignee: '', status: 'Aberto', retests: 0, openedAt: state.currentDate || today, resolvedAt: '' });
    saveState();
}

window.updateBug = function(index, field, value) { state.bugs[index][field] = value; saveState(); }

// ─── Bug History Filters ────────────────────────────────────────────────────
window._bugFilters = { status: 'Todos', assignee: 'Todos', stack: 'Todos' };

window.setBugFilter = function(field, value) {
    window._bugFilters[field] = value;
    renderBugFilters();
    renderTables();
};

window.resetBugFilters = function() {
    window._bugFilters = { status: 'Todos', assignee: 'Todos', stack: 'Todos' };
    renderBugFilters();
    renderTables();
};
    
window.removeBug = function(index) {
        window.showConfirmModal("Remover Bug", "Tem certeza que deseja remover este bug permanentemente?", () => {
            state.bugs.splice(index, 1);
            saveState();
        });
    }

// =====================================================
// Utilitários de conversão: DayKey ↔ Data Real
// =====================================================

// "D3" → "2025-01-03"  (usa state.config.startDate)
window.dayKeyToDate = function(dayKey) {
        if (!dayKey || !state.config.startDate) return '';
        const dayNum = parseInt(dayKey.replace('D', ''));
        if (isNaN(dayNum) || dayNum < 1) return '';
        const d = new Date(state.config.startDate + 'T00:00:00');
        d.setDate(d.getDate() + dayNum - 1);
        return d.toISOString().split('T')[0];
    }

// "2025-01-03" → "D3"  (null se fora do range da sprint)
window.dateToDayKey = function(dateStr) {
        if (!dateStr || !state.config.startDate) return null;
        const start = new Date(state.config.startDate + 'T00:00:00');
        const sel   = new Date(dateStr + 'T00:00:00');
        const diff  = Math.round((sel - start) / (1000 * 60 * 60 * 24));
        const dayNum = diff + 1;
        const sprintDays = parseInt(state.config.sprintDays) || 20;
        if (dayNum < 1 || dayNum > sprintDays) return null;
        return 'D' + dayNum;
    }

// Handler do novo Date Picker de execução (converte data → dayKey e repassa)
window.handleExecutionDateChange = function(featureIndex, caseIndex, dateValue, inputElement) {
        const card = inputElement ? inputElement.closest('.test-case-card') : null;

        if (!dateValue) {
            handleExecutionDayChange(featureIndex, caseIndex, '', inputElement);
            return;
        }

        if (!state.config.startDate) {
            showExecutionDayHint(card, '⚠️ Configure a "Data de Início" na aba Configurações para calcular o dia da sprint.');
            return;
        }

        const dayKey = dateToDayKey(dateValue);
        if (!dayKey) {
            const sprintDays = parseInt(state.config.sprintDays) || 20;
            showExecutionDayHint(card, `⚠️ Data fora do período da sprint (D1 a D${sprintDays}). Escolha uma data dentro do intervalo configurado.`);
            return;
        }

        hideExecutionDayHint(card);
        handleExecutionDayChange(featureIndex, caseIndex, dayKey, inputElement);
    }

// Calcula MTTR em dias para um bug (retorna null se datas inválidas)
window.calcMTTR = function(bug) {
        if (!bug.openedAt || !bug.resolvedAt) return null;
        const open = new Date(bug.openedAt + 'T00:00:00');
        const resolved = new Date(bug.resolvedAt + 'T00:00:00');
        const diffMs = resolved - open;
        if (isNaN(diffMs)) return null;
        return diffMs < 0 ? 0 : Math.round(diffMs / (1000 * 60 * 60 * 24));
    }

window.handleBugStatusChange = function(index, newStatus, selectElement) {
        if (newStatus === 'Resolvido') {
            _resolveModalPrevStatus = state.bugs[index].status;
            _resolveModalBugIndex = index;
            _resolveModalSelectElement = selectElement;
            document.getElementById('resolve-modal-date').value = new Date().toISOString().split('T')[0];
            document.getElementById('modal-resolve-bug').classList.add('active');
        } else {
            if (state.bugs[index].resolvedAt) {
                state.bugs[index].resolvedAt = '';
            }
            state.bugs[index].status = newStatus;
            saveState();
        }
    }

window.closeResolveModal = function() {
        if (_resolveModalSelectElement && _resolveModalPrevStatus !== null) {
            _resolveModalSelectElement.value = _resolveModalPrevStatus;
        }
        document.getElementById('modal-resolve-bug').classList.remove('active');
        _resolveModalBugIndex = null;
        _resolveModalSelectElement = null;
        _resolveModalPrevStatus = null;
    }

window.saveBugResolution = function() {
        if (_resolveModalBugIndex === null) return;
        const date = document.getElementById('resolve-modal-date').value;
        if (!date) {
            alert('Por favor, informe a data de resolução.');
            return;
        }
        state.bugs[_resolveModalBugIndex].status = 'Resolvido';
        state.bugs[_resolveModalBugIndex].resolvedAt = date;
        document.getElementById('modal-resolve-bug').classList.remove('active');
        _resolveModalBugIndex = null;
        _resolveModalSelectElement = null;
        _resolveModalPrevStatus = null;
        saveState();
    }

// Índice do bug sendo editado (null = criação de novo bug)
let _editingBugIndex = null;

window.openBugModal = function(prefilled) {
        const p = prefilled || {};
        const today = new Date().toISOString().split('T')[0];
        const featureSelect = document.getElementById('bug-modal-feature');
        featureSelect.innerHTML = '<option value="">Não informada</option>' +
            (state.features || []).map(f =>
                `<option value="${escapeHTML(f.name)}"${p.feature === f.name ? ' selected' : ''}>${escapeHTML(f.name)}</option>`
            ).join('');
        document.getElementById('bug-modal-id').value = p.id || 'BUG-XXX';
        document.getElementById('bug-modal-stack').value = p.stack || 'Front';
        document.getElementById('bug-modal-severity').value = p.severity || 'Média';
        document.getElementById('bug-modal-categoria').value = p.categoria || 'Layout';
        document.getElementById('bug-modal-assignee').value = p.assignee || '';
        document.getElementById('bug-modal-desc').value = p.desc || '';
        document.getElementById('bug-modal-openedAt').value = p.openedAt || today;
        document.getElementById('modal-bug-form').classList.add('active');
    }

window.openBugEditModal = function(index) {
        const b = state.bugs[index];
        if (!b) return;
        _editingBugIndex = index;
        window.openBugModal(b);
        const titleEl = document.querySelector('#modal-bug-form .modal-header h2');
        if (titleEl) titleEl.innerHTML = '✏️ Editar Bug';
    }

window.closeBugModal = function() {
        _editingBugIndex = null;
        const titleEl = document.querySelector('#modal-bug-form .modal-header h2');
        if (titleEl) titleEl.innerHTML = '🐞 Registrar Bug';
        document.getElementById('modal-bug-form').classList.remove('active');
    }

window.saveBugFromModal = function() {
        const today = new Date().toISOString().split('T')[0];
        const openedAt = document.getElementById('bug-modal-openedAt').value || today;
        const fields = {
            id:       document.getElementById('bug-modal-id').value.trim() || 'BUG-XXX',
            feature:  document.getElementById('bug-modal-feature').value,
            desc:     document.getElementById('bug-modal-desc').value.trim() || 'Sem descrição',
            stack:    document.getElementById('bug-modal-stack').value,
            severity: document.getElementById('bug-modal-severity').value,
            categoria:document.getElementById('bug-modal-categoria').value,
            assignee: document.getElementById('bug-modal-assignee').value.trim(),
        };

        if (_editingBugIndex !== null) {
            // Edição: preserva status, retests, resolvedAt mas atualiza openedAt se alterado
            Object.assign(state.bugs[_editingBugIndex], fields, { openedAt });
        } else {
            // Criação
            state.bugs.unshift(Object.assign(fields, {
                status: 'Aberto',
                retests: 0,
                openedAt,
                resolvedAt: ''
            }));
        }
        saveState();
        window.closeBugModal();
    }

window.duplicateBug = function(index) {
        const original = state.bugs[index];
        if (!original) return;
        const today = new Date().toISOString().split('T')[0];
        const clone = JSON.parse(JSON.stringify(original));
        clone.id = clone.id ? clone.id + ' (Cópia)' : 'BUG-XXX (Cópia)';
        clone.status = 'Aberto';
        clone.retests = 0;
        clone.openedAt = state.currentDate || today;
        clone.resolvedAt = '';
        state.bugs.unshift(clone);
        saveState();
    }


window.addTestCase = function(featureIndex) {
        if (!state.features[featureIndex].cases) state.features[featureIndex].cases = [];
        const newId = Date.now();
        state.features[featureIndex].cases.push({ id: newId, name: '', complexity: 'Baixa', status: 'Pendente', executionDay: '', gherkin: '' });
        saveState();
        setTimeout(() => {
            const input = document.getElementById('tc-name-' + newId);
            if(input) { input.focus(); input.scrollIntoView({ behavior: "smooth", block: "center" }); }
        }, 50);
    }

    
window.duplicateTestCase = function(featureIndex, caseIndex) {
        if (!state.features[featureIndex].cases) return;
        
        const originalCase = state.features[featureIndex].cases[caseIndex];
        const newId = Date.now();
        
        const newCase = JSON.parse(JSON.stringify(originalCase));
        newCase.id = newId;
        newCase.name = newCase.name ? newCase.name + ' (Cópia)' : 'Cópia';
        newCase.status = 'Pendente'; 
        newCase.executionDay = '';   
        
        state.features[featureIndex].cases.splice(caseIndex + 1, 0, newCase);
        saveState();
        
        setTimeout(() => {
            const input = document.getElementById('tc-name-' + newId);
            if(input) { input.focus(); input.scrollIntoView({ behavior: "smooth", block: "center" }); }
        }, 50);
    }

    
window.updateTestCase = function(featureIndex, caseIndex, field, value) {
        state.features[featureIndex].cases[caseIndex][field] = value;
        saveState();
    }

    
window.handleTestCaseStatusChange = function(featureIndex, caseIndex, newStatus, selectElement) {
        const testCase = state.features?.[featureIndex]?.cases?.[caseIndex];
        if (!testCase) return;

        const previousStatus = testCase.status || 'Pendente';
        const requiresExecutionDay = newStatus && newStatus !== 'Pendente';
        const pendingKey = String(testCase.id || `${featureIndex}-${caseIndex}`);
        const card = selectElement ? selectElement.closest('.test-case-card') : null;
        const executionDaySelect = card ? card.querySelector('[data-role="execution-day"]') : null;

        if (requiresExecutionDay && !testCase.executionDay) {
            pendingTestCaseStatus[pendingKey] = newStatus;

            if (selectElement) {
                selectElement.dataset.pendingStatus = newStatus;
                selectElement.dataset.previousStatus = previousStatus;
                selectElement.style.color = newStatus === 'Concluído' ? 'var(--success)' : newStatus === 'Falhou' ? 'var(--danger)' : 'var(--warning)';
            }

            if (executionDaySelect) {
                executionDaySelect.style.border = '2px solid var(--danger)';
                executionDaySelect.style.boxShadow = '0 0 0 3px rgba(239, 68, 68, 0.12)';
                executionDaySelect.title = 'Selecione o Dia Exec. para confirmar o novo status.';
                executionDaySelect.focus();
            }

            showExecutionDayHint(card, 'Selecione o Dia Exec. para confirmar o novo status.');
            return;
        }

        delete pendingTestCaseStatus[pendingKey];
        hideExecutionDayHint(card);

        if (selectElement) {
            delete selectElement.dataset.pendingStatus;
            delete selectElement.dataset.previousStatus;
            selectElement.style.color = newStatus === 'Concluído' ? 'var(--success)' : newStatus === 'Falhou' ? 'var(--danger)' : newStatus === 'Bloqueado' ? 'var(--warning)' : 'var(--text-muted)';
        }

        testCase.status = newStatus;
        saveState();

        if (newStatus === 'Falhou') {
            const feature = state.features[featureIndex];
            window.openBugModal({
                feature: feature ? feature.name : '',
                desc: testCase.name || ''
            });
        }
    }


window.handleExecutionDayChange = function(featureIndex, caseIndex, value, executionDayElement) {
        const testCase = state.features?.[featureIndex]?.cases?.[caseIndex];
        if (!testCase) return;

        const pendingKey = String(testCase.id || `${featureIndex}-${caseIndex}`);
        const card = executionDayElement ? executionDayElement.closest('.test-case-card') : null;
        const statusSelect = card ? card.querySelector('[data-role="status-select"]') : null;
        const pendingStatus = pendingTestCaseStatus[pendingKey] || (statusSelect ? statusSelect.dataset.pendingStatus : '');

        testCase.executionDay = value;

        if (pendingStatus) {
            if (!value) {
                if (executionDayElement) {
                    executionDayElement.style.border = '2px solid var(--danger)';
                    executionDayElement.style.boxShadow = '0 0 0 3px rgba(239, 68, 68, 0.12)';
                    executionDayElement.title = 'Selecione o Dia Exec. para confirmar o novo status.';
                }
                showExecutionDayHint(card, 'Selecione o Dia Exec. para confirmar o novo status.');
                return;
            }

            testCase.status = pendingStatus;
            delete pendingTestCaseStatus[pendingKey];

            if (statusSelect) {
                delete statusSelect.dataset.pendingStatus;
                delete statusSelect.dataset.previousStatus;
            }
        }

        if (executionDayElement) {
            executionDayElement.style.border = '';
            executionDayElement.style.boxShadow = '';
            executionDayElement.title = 'Informe o dia da execução do cenário';
        }

        hideExecutionDayHint(card);
        saveState();

        if (pendingStatus === 'Falhou') {
            const feature = state.features[featureIndex];
            window.openBugModal({
                feature: feature ? feature.name : '',
                desc: testCase.name || ''
            });
        }
    }


window.removeTestCase = function(featureIndex, caseIndex) {
        window.showConfirmModal("Excluir Cenário", "Deseja remover este cenário de teste permanentemente?", () => {
            state.features[featureIndex].cases.splice(caseIndex, 1);
            saveState();
        });
    }

// ─── Ações em Massa (Bulk Update) ──────────────────────────────────────────
window._selectedCases = {}; // chave: "fIndex:tcIndex" → true

window.toggleCaseSelection = function(fIndex, tcIndex, checked) {
    const key = `${fIndex}:${tcIndex}`;
    if (checked) {
        window._selectedCases[key] = true;
    } else {
        delete window._selectedCases[key];
    }
    window._renderBulkBar(fIndex);
};

window.selectAllCasesInFeature = function(fIndex, checked) {
    const f = state.features[fIndex];
    if (!f || !f.cases) return;
    f.cases.forEach((tc, i) => {
        const key = `${fIndex}:${i}`;
        if (checked) { window._selectedCases[key] = true; }
        else { delete window._selectedCases[key]; }
    });
    // Atualizar checkboxes individuais sem re-render
    document.querySelectorAll(`[data-bulk-findex="${fIndex}"]`).forEach(cb => {
        cb.checked = checked;
    });
    window._renderBulkBar(fIndex);
};

window.bulkApplyStatus = function(fIndex) {
    const f = state.features[fIndex];
    if (!f || !f.cases) return;

    const statusEl = document.getElementById(`bulk-status-${fIndex}`);
    const dateEl   = document.getElementById(`bulk-date-${fIndex}`);
    if (!statusEl) return;

    const newStatus = statusEl.value;
    const bulkDate  = dateEl ? dateEl.value : '';
    const bulkDayKey = bulkDate ? dateToDayKey(bulkDate) : null;
    const today = new Date().toISOString().split('T')[0];
    const todayKey  = dateToDayKey(state.currentDate || today) || dateToDayKey(today);

    let anyFailed = false;

    f.cases.forEach((tc, tcIndex) => {
        if (!window._selectedCases[`${fIndex}:${tcIndex}`]) return;
        tc.status = newStatus;
        if (newStatus !== 'Pendente') {
            if (bulkDayKey) {
                tc.executionDay = bulkDayKey;
            } else if (!tc.executionDay && todayKey) {
                tc.executionDay = todayKey;
            }
        }
        if (newStatus === 'Falhou') anyFailed = true;
    });

    // Limpar seleção
    f.cases.forEach((tc, tcIndex) => { delete window._selectedCases[`${fIndex}:${tcIndex}`]; });

    saveState();

    if (anyFailed) {
        window.openBugModal({ feature: f.name || '' });
    }
};

window.clearBulkSelection = function(fIndex) {
    const f = state.features[fIndex];
    if (!f || !f.cases) return;
    f.cases.forEach((tc, tcIndex) => { delete window._selectedCases[`${fIndex}:${tcIndex}`]; });
    document.querySelectorAll(`[data-bulk-findex="${fIndex}"]`).forEach(cb => { cb.checked = false; });
    window._renderBulkBar(fIndex);
};

window._renderBulkBar = function(fIndex) {
    const bar = document.getElementById(`bulk-bar-${fIndex}`);
    if (!bar) return;
    const f = state.features[fIndex];
    if (!f || !f.cases) return;

    const total = f.cases.length;
    const selCount = f.cases.filter((tc, i) => window._selectedCases[`${fIndex}:${i}`]).length;

    const selectAllCb = document.getElementById(`bulk-select-all-${fIndex}`);
    if (selectAllCb) {
        selectAllCb.checked = selCount === total && total > 0;
        selectAllCb.indeterminate = selCount > 0 && selCount < total;
    }

    const countEl = bar.querySelector('.bulk-count');
    if (countEl) countEl.textContent = selCount > 0 ? `${selCount} selecionado(s)` : '';

    const actionsEl = bar.querySelector('.bulk-actions');
    if (actionsEl) actionsEl.style.display = selCount > 0 ? 'flex' : 'none';

    // Destacar/desmarcar cards individuais
    f.cases.forEach((tc, tcIndex) => {
        const card = document.getElementById(`tc-card-${fIndex}-${tcIndex}`);
        if (!card) return;
        if (window._selectedCases[`${fIndex}:${tcIndex}`]) {
            card.style.outline = '2px solid var(--primary-blue)';
            card.style.boxShadow = '0 0 0 4px rgba(37,99,235,0.1)';
        } else {
            card.style.outline = '';
            card.style.boxShadow = '';
        }
    });
};


// ─── Mockup Image (Evidência Visual por Funcionalidade) ──────────────────────

window.uploadMockupImage = function(fIndex, inputEl) {
    const file = inputEl.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
        alert('Por favor, selecione um arquivo de imagem (PNG, JPG, GIF, WebP).');
        inputEl.value = '';
        return;
    }
    if (file.size > 5 * 1024 * 1024) {
        alert('Imagem muito grande. Tamanho máximo permitido: 5MB.');
        inputEl.value = '';
        return;
    }
    const reader = new FileReader();
    reader.onload = function(e) {
        state.features[fIndex].mockupImage = e.target.result;
        inputEl.value = '';
        saveState();
    };
    reader.readAsDataURL(file);
};

window.removeMockupImage = function(fIndex) {
    window.showConfirmModal('Remover Imagem', 'Deseja remover a imagem de referência desta funcionalidade?', () => {
        state.features[fIndex].mockupImage = '';
        saveState();
    });
};

window.previewMockup = function(fIndex) {
    const img = state.features[fIndex] && state.features[fIndex].mockupImage;
    if (!img) return;
    const w = window.open('', '_blank');
    w.document.write('<html><head><title>Mockup</title></head><body style="margin:0;background:#111;display:flex;justify-content:center;align-items:center;min-height:100vh;"><img src="' + img + '" style="max-width:100%;max-height:100vh;object-fit:contain;border-radius:4px;"></body></html>');
    w.document.close();
};

// ─── Templates de Download ────────────────────────────────────────────────────

window.downloadFeatureTemplate = function() {
    const templateContent = `Funcionalidade: Tela de Login do Sistema

Cenario: Login com sucesso informando credenciais validas
Dado que o usuario esta na pagina de login
Quando ele preenche o campo email com "teste@exemplo.com"
E ele preenche o campo senha com "123456"
E clica no botao "Entrar"
Entao o sistema deve redirecionar o usuario para a Home Page
E a mensagem "Bem-vindo" deve ser exibida

Cenario: Tentativa de login com senha incorreta
Dado que o usuario esta na pagina de login
Quando ele preenche o campo email com "teste@exemplo.com"
E ele preenche o campo senha com "senha_errada"
E clica no botao "Entrar"
Entao o sistema deve permanecer na pagina de login
E a mensagem de erro "Credenciais invalidas" deve ser exibida na tela

Funcionalidade: Recuperação de Senha

Cenario: Solicitar redefinição de senha via e-mail
Dado que o usuario esta na pagina de login
Quando ele clica em "Esqueci minha senha"
E ele preenche o campo e-mail com "usuario@teste.com"
E clica em "Enviar"
Entao o sistema deve exibir a mensagem "E-mail enviado com sucesso"

Cenario: Redefinir senha com token valido
Dado que o usuario acessou o link de redefinição de senha
Quando ele informa uma nova senha valida
E confirma a nova senha
E clica em "Salvar"
Entao o sistema deve redirecionar para a tela de login
E exibir a mensagem "Senha alterada com sucesso"
`;
    _downloadFile(templateContent, 'template_casos_de_teste.feature', 'text/plain;charset=utf-8');
};

window.downloadCSVTemplate = function() {
    const csvContent = `Funcionalidade,Cenário,Gherkin,Complexidade
Tela de Login,Login com sucesso,"Dado que o usuario esta na pagina de login\nQuando ele preenche credenciais validas\nEntao o sistema redireciona para a Home",Baixa
Tela de Login,Login com senha incorreta,"Dado que o usuario esta na pagina de login\nQuando ele preenche a senha errada\nEntao exibe mensagem de erro",Baixa
Recuperação de Senha,Solicitar redefinição,"Dado que o usuario clica em Esqueci minha senha\nQuando ele informa o e-mail\nEntao recebe o link de redefinição",Moderada
`;
    // Padrão obrigatório: coluna 1 = Funcionalidade, coluna 2 = Cenário
    // Colunas 3 (Gherkin) e 4 (Complexidade) são opcionais
    _downloadFile(csvContent, 'template_importacao.csv', 'text/csv;charset=utf-8');
};

window.exportSprintCoverage = function(suiteId) {
    const sprintTitle = (state.config && state.config.title) || 'Sprint';
    const sprintStart = (state.config && state.config.startDate) ? ` | Início: ${state.config.startDate}` : '';
    const sprintEnd   = (state.config && state.config.endDate)   ? ` | Fim: ${state.config.endDate}` : '';
    const squad       = (state.config && state.config.squad)     ? ` | Squad: ${state.config.squad}` : '';

    const suite = suiteId ? (state.suites || []).find(s => String(s.id) === String(suiteId)) : null;
    const suiteLabel = suite ? ` | Suite: ${suite.name || 'Sem nome'}` : '';

    let lines = [];
    lines.push(`# ${sprintTitle}${squad}${sprintStart}${sprintEnd}${suiteLabel}`);
    lines.push(`# Exportado em: ${new Date().toLocaleDateString('pt-BR')}`);
    lines.push('');

    let features = (state.features || []).filter(f => f.status !== 'Cancelada');
    if (suiteId) features = features.filter(f => String(f.suiteId) === String(suiteId));

    if (features.length === 0) {
        showToast('Nenhuma funcionalidade ativa para exportar nesta suite.', true);
        return;
    }

    features.forEach(f => {
        lines.push(`Funcionalidade: ${f.name || 'Sem nome'}`);

        const cases = (f.cases || []);
        if (cases.length === 0) {
            lines.push('  # Nenhum cenário cadastrado');
        } else {
            cases.forEach(tc => {
                lines.push('');
                lines.push(`  Cenário: ${tc.name || 'Sem nome'}`);
                if (tc.gherkin && tc.gherkin.trim()) {
                    tc.gherkin.split('\n').forEach(gl => {
                        lines.push(`    ${gl.trim()}`);
                    });
                } else {
                    lines.push('    # (sem steps Gherkin cadastrados)');
                }
            });
        }
        lines.push('');
    });

    const safeTitle = (suite ? (suite.name || 'suite') : sprintTitle).replace(/[^a-zA-Z0-9_\-]/g, '_').replace(/_+/g, '_');
    _downloadFile(lines.join('\n'), `cobertura_${safeTitle}.feature`, 'text/plain;charset=utf-8');
    showToast('Cobertura exportada com sucesso!');
};

function _downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

// ─── Importação Unificada (.feature / .csv / .xlsx) ──────────────────────────

window.importFeature = function(event, suiteId) {
    const file = event.target.files[0];
    if (!file) return;
    const fileName = file.name.toLowerCase();
    const targetSuiteId = suiteId || (state.suites && state.suites[0] ? state.suites[0].id : 1);

    if (fileName.endsWith('.feature')) {
        const reader = new FileReader();
        reader.onload = function(e) { _importFromFeatureText(e.target.result, targetSuiteId); };
        reader.readAsText(file);
    } else if (fileName.endsWith('.csv')) {
        const reader = new FileReader();
        reader.onload = function(e) { _importFromCSV(e.target.result, targetSuiteId); };
        reader.readAsText(file, 'UTF-8');
    } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
        const reader = new FileReader();
        reader.onload = function(e) { _importFromXLSX(e.target.result, targetSuiteId); };
        reader.readAsArrayBuffer(file);
    } else {
        alert('Formato não suportado. Use: .feature, .csv, .xlsx ou .xls');
    }
    event.target.value = '';
};

// Parser .feature: suporta múltiplas funcionalidades num único arquivo
function _importFromFeatureText(text, suiteId) {
    const featureRegex = /^(funcionalidade|feature)\s*:/i;
    const scenarioRegex = /^(cenario|cenário|scenario|esquema do cenario|esquema do cenário|scenario outline)\s*:/i;

    // Mapa preservando ordem de aparição
    const featuresMap = {};
    const featuresOrder = [];
    let currentFeatureName = null;
    let currentScenario = null;

    for (const line of text.split('\n')) {
        const trimmed = line.trim();
        if (featureRegex.test(trimmed)) {
            if (currentScenario && currentFeatureName) {
                featuresMap[currentFeatureName].push(currentScenario);
                currentScenario = null;
            }
            currentFeatureName = trimmed.replace(featureRegex, '').trim() || 'Nova Funcionalidade Importada';
            if (!featuresMap[currentFeatureName]) {
                featuresMap[currentFeatureName] = [];
                featuresOrder.push(currentFeatureName);
            }
        } else if (scenarioRegex.test(trimmed)) {
            if (currentScenario && currentFeatureName) featuresMap[currentFeatureName].push(currentScenario);
            if (!currentFeatureName) {
                currentFeatureName = 'Nova Funcionalidade Importada';
                if (!featuresMap[currentFeatureName]) {
                    featuresMap[currentFeatureName] = [];
                    featuresOrder.push(currentFeatureName);
                }
            }
            currentScenario = { name: trimmed.replace(scenarioRegex, '').trim(), gherkin: trimmed + '\n' };
        } else if (currentScenario) {
            currentScenario.gherkin += line + '\n';
        }
    }
    if (currentScenario && currentFeatureName) featuresMap[currentFeatureName].push(currentScenario);

    const featuresWithScenarios = featuresOrder.filter(name => featuresMap[name].length > 0);
    if (featuresWithScenarios.length === 0) {
        alert('Nenhum cenário (Cenario / Scenario) encontrado no arquivo selecionado.');
        return;
    }

    let totalScenarios = 0;
    const summary = [];
    const _importSuiteId = suiteId || (state.suites && state.suites[0] ? state.suites[0].id : 1);
    featuresWithScenarios.forEach((featureName, fi) => {
        const scenarios = featuresMap[featureName];
        let targetFeature = state.features.find(f => f.name.toLowerCase() === featureName.toLowerCase() && String(f.suiteId) === String(_importSuiteId));
        if (!targetFeature) {
            targetFeature = {
                id: Date.now() + fi,
                suiteId: _importSuiteId,
                name: featureName,
                tests: 0, manualTests: 0, exec: 0,
                execution: {}, manualExecData: {}, mockupImage: '',
                status: 'Ativa', blockReason: '', activeFilter: 'Todos', cases: []
            };
            state.features.unshift(targetFeature);
        }
        scenarios.forEach((sc, i) => {
            targetFeature.cases.push({
                id: Date.now() + totalScenarios + i + Math.floor(Math.random() * 10000),
                name: sc.name || 'Cenário Sem Nome',
                complexity: 'Baixa', status: 'Pendente', executionDay: '',
                gherkin: sc.gherkin.trim()
            });
        });
        totalScenarios += scenarios.length;
        summary.push(`• "${featureName}" — ${scenarios.length} cenário(s)`);
    });

    saveState();
    alert(`✅ Importação concluída!\n\n${totalScenarios} cenário(s) em ${featuresWithScenarios.length} funcionalidade(s):\n\n${summary.join('\n')}`);
}

// Parser CSV robusto: suporta campos com quebra de linha entre aspas
function _parseCSV(text) {
    const rows = [];
    let row = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        const next = text[i + 1];
        if (ch === '"') {
            if (inQuotes && next === '"') { current += '"'; i++; }
            else { inQuotes = !inQuotes; }
        } else if (ch === ',' && !inQuotes) {
            row.push(current); current = '';
        } else if (ch === '\r' && next === '\n' && !inQuotes) {
            i++; row.push(current); rows.push(row); row = []; current = '';
        } else if ((ch === '\n' || ch === '\r') && !inQuotes) {
            row.push(current); rows.push(row); row = []; current = '';
        } else {
            current += ch;
        }
    }
    if (current || row.length > 0) { row.push(current); rows.push(row); }
    return rows;
}

function _importFromCSV(text, suiteId) {
    const rows = _parseCSV(text).filter(r => r.some(c => c.trim()));
    if (rows.length < 2) { alert('Arquivo CSV vazio ou inválido.'); return; }

    // Padrão posicional: coluna 1 = Funcionalidade, coluna 2 = Cenário (obrigatórias)
    // Colunas 3 (Gherkin) e 4 (Complexidade) são opcionais — detectadas por palavra-chave
    const colFeature  = 0;
    const colScenario = 1;
    const header = rows[0].map(h => h.toLowerCase().trim());
    const colGherkin = header.findIndex(h => /gherkin|passos|steps|descri/.test(h));
    const colComplex = header.findIndex(h => /complexidade|complexity/.test(h));

    if (rows[0].length < 2) {
        alert('O arquivo CSV precisa ter pelo menos 2 colunas:\nColuna 1 → Funcionalidade\nColuna 2 → Cenário');
        return;
    }

    let importedCount = 0;
    let newFeatureCount = 0;
    const validComplexities = ['Baixa', 'Moderada', 'Alta'];
    const _csvSuiteId = suiteId || (state.suites && state.suites[0] ? state.suites[0].id : 1);

    for (let i = 1; i < rows.length; i++) {
        const cols = rows[i];
        const featureName  = (cols[colFeature]  || '').trim() || 'Importado de CSV';
        const scenarioName = (cols[colScenario] || '').trim();
        if (!scenarioName) continue;

        const gherkin    = colGherkin >= 0 ? (cols[colGherkin] || '').trim() : '';
        const rawComplex = colComplex >= 0 ? (cols[colComplex] || '').trim() : '';
        const complexity = validComplexities.find(c => c.toLowerCase() === rawComplex.toLowerCase()) || 'Baixa';

        let target = state.features.find(f => f.name.toLowerCase() === featureName.toLowerCase() && String(f.suiteId) === String(_csvSuiteId));
        if (!target) {
            target = {
                id: Date.now() + i, suiteId: _csvSuiteId, name: featureName,
                tests: 0, manualTests: 0, exec: 0,
                execution: {}, manualExecData: {}, mockupImage: '',
                status: 'Ativa', blockReason: '', activeFilter: 'Todos', cases: []
            };
            state.features.unshift(target);
            newFeatureCount++;
        }
        target.cases.push({
            id: Date.now() + importedCount + Math.floor(Math.random() * 10000),
            name: scenarioName, complexity, status: 'Pendente', executionDay: '', gherkin
        });
        importedCount++;
    }

    if (importedCount === 0) { alert('Nenhum cenário encontrado no arquivo CSV.'); return; }
    saveState();
    alert(`✅ Importação CSV concluída!\n\n${importedCount} cenário(s) importado(s)${newFeatureCount > 0 ? ` em ${newFeatureCount} nova(s) funcionalidade(s) criada(s)` : ''}.`);
}

function _importFromXLSX(arrayBuffer, suiteId) {
    if (typeof XLSX === 'undefined') {
        alert('Biblioteca XLSX não carregada. Verifique a conexão e recarregue a página.');
        return;
    }
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    const sheetName = workbook.SheetNames[0];

    // Lê como array de arrays para usar detecção posicional (col 0 = Feature, col 1 = Cenário)
    const rawRows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1, defval: '' });
    if (rawRows.length < 2) { alert('Planilha vazia ou sem dados.'); return; }

    const headerRow = rawRows[0].map(h => String(h).toLowerCase().trim());

    if (headerRow.length < 2) {
        alert('A planilha precisa ter pelo menos 2 colunas:\nColuna 1 → Funcionalidade\nColuna 2 → Cenário');
        return;
    }

    // Padrão posicional: coluna 1 = Funcionalidade, coluna 2 = Cenário (obrigatórias)
    // Colunas Gherkin e Complexidade são opcionais — detectadas por palavra-chave no cabeçalho
    const colFeature  = 0;
    const colScenario = 1;
    function findCol(candidates) {
        const idx = headerRow.findIndex(h => candidates.some(c => h.includes(c)));
        return idx >= 0 ? idx : -1;
    }
    const colGherkin = findCol(['gherkin', 'passos', 'steps', 'descri']);
    const colComplex = findCol(['complexidade', 'complexity']);

    const rows = rawRows.slice(1); // remove cabeçalho

    let importedCount = 0;
    let newFeatureCount = 0;
    const validComplexities = ['Baixa', 'Moderada', 'Alta'];
    const _xlsxSuiteId = suiteId || (state.suites && state.suites[0] ? state.suites[0].id : 1);

    rows.forEach((row, idx) => {
        const featureName  = String(row[colFeature]  || '').trim() || 'Importado de Planilha';
        const scenarioName = String(row[colScenario] || '').trim();
        if (!scenarioName) return;

        const gherkin    = colGherkin >= 0 ? String(row[colGherkin] || '').trim() : '';
        const rawComplex = colComplex >= 0 ? String(row[colComplex] || '').trim() : '';
        const complexity = validComplexities.find(c => c.toLowerCase() === rawComplex.toLowerCase()) || 'Baixa';

        let target = state.features.find(f => f.name.toLowerCase() === featureName.toLowerCase() && String(f.suiteId) === String(_xlsxSuiteId));
        if (!target) {
            target = {
                id: Date.now() + idx, suiteId: _xlsxSuiteId, name: featureName,
                tests: 0, manualTests: 0, exec: 0,
                execution: {}, manualExecData: {}, mockupImage: '',
                status: 'Ativa', blockReason: '', activeFilter: 'Todos', cases: []
            };
            state.features.unshift(target);
            newFeatureCount++;
        }
        target.cases.push({
            id: Date.now() + importedCount + Math.floor(Math.random() * 10000),
            name: scenarioName, complexity, status: 'Pendente', executionDay: '', gherkin
        });
        importedCount++;
    });

    if (importedCount === 0) { alert('Nenhum cenário encontrado na planilha.'); return; }
    saveState();
    alert(`✅ Importação de planilha concluída!\n\n${importedCount} cenário(s) importado(s)${newFeatureCount > 0 ? ` em ${newFeatureCount} nova(s) funcionalidade(s) criada(s)` : ''}.`);
}
window.exportJSON = function() {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state, null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", "qa_dashboard_backup_" + state.currentDate + ".json");
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    }

    
window.importJSON = function(event) {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const importedState = JSON.parse(e.target.result);
                if(importedState && importedState.features) { 
                    state = importedState;
                    saveState();
                    alert('Dados importados com sucesso!');
                } else { alert('Arquivo JSON inválido para este dashboard.'); }
            } catch(err) { alert('Erro ao ler o arquivo JSON.'); }
        };
        reader.readAsText(file);
        event.target.value = ''; 
    }
window.confirmResetData = function() {
        window.showConfirmModal(
            "Resetar Dashboard", 
            "⚠️ <strong>ATENÇÃO:</strong> Isso apagará TODOS os dados salvos localmente e restaurará o dashboard para o padrão.<br><br>Gostaria de exportar um backup (JSON) com os dados atuais antes de apagar?", 
            () => {
                // If they click Export and Reset
                exportJSON();
                setTimeout(() => { executeReset(); }, 1000);
            }
        );
        
        // Changing the button temporarily for this specific dual-action modal
        const btnConfirm = document.getElementById('confirm-modal-btn');
        const defaultText = btnConfirm.innerText;
        btnConfirm.innerText = "Exportar e Resetar";
        
        // Adicionar botão secundário de "Resetar sem Exportar" dinamicamente
        const actionsDiv = document.querySelector('.modal-actions');
        let btnDanger = document.getElementById('temp-reset-danger-btn');
        if(!btnDanger) {
            btnDanger = document.createElement('button');
            btnDanger.id = 'temp-reset-danger-btn';
            btnDanger.type = 'button';
            btnDanger.className = 'btn-outline';
            btnDanger.style.color = 'var(--danger)';
            btnDanger.style.borderColor = 'var(--danger)';
            btnDanger.innerText = 'Apagar sem Backup';
            btnDanger.onclick = () => {
                executeReset();
                window.closeConfirmModal();
            };
            actionsDiv.insertBefore(btnDanger, btnConfirm);
        }

        const originalClose = window.closeConfirmModal;
        window.closeConfirmModal = function() {
            btnConfirm.innerText = defaultText;
            if(btnDanger) btnDanger.remove();
            window.closeConfirmModal = originalClose; // restore original
            originalClose();
        };
    }

    
window.executeReset = function() {
        if(currentSprintId) {
            localStorage.removeItem(getStorageKey());
            state = normalizeState(cloneDefaultState());
            state.currentDate = new Date().toISOString().split('T')[0];
            saveState();
            alert("Base de dados da Sprint resetada.");
        }
    }

    
window.exportToImage = function() {
        const currentActiveTab = document.querySelector('.tab-content.active').id;
        
        if (currentActiveTab !== 'tab-1') {
            document.querySelectorAll('.tab-content').forEach(tc => tc.classList.remove('active'));
            document.getElementById('tab-1').classList.add('active');
        }
        
        // Espera renderizar os gráficos de forma segura com animações desligadas
        setTimeout(() => {
            Chart.defaults.animation = false;
            renderCharts();

            const style = document.createElement('style');
            style.innerHTML = `
                * { transition: none !important; animation: none !important; }
                .tab-content { display: block !important; visibility: visible !important; opacity: 1 !important;}
                #tab-2, #tab-3, #tab-4, #tab-5, #tab-6, #tab-7 { display: none !important; }
            `;
            document.head.appendChild(style);

            const actions = document.getElementById('action-buttons');
            const tabsNav = document.getElementById('tabs-navigation');
            
            const originalActionsDisplay = actions.style.display;
            const originalTabsDisplay = tabsNav.style.display;
            
            actions.style.display = 'none';
            tabsNav.style.display = 'none';

            window.scrollTo(0,0);

            const container = document.getElementById('export-wrapper');

            setTimeout(() => {
                html2canvas(container, {
                    scale: 1.5,
                    backgroundColor: '#ffffff',
                    useCORS: true,
                    logging: false
                }).then(canvas => {
                    const link = document.createElement('a');
                    link.download = `QADashboard_${state.currentDate}.jpg`;
                    link.href = canvas.toDataURL('image/jpeg', 0.85);
                    link.click();
                }).catch(err => {
                    alert("Erro ao exportar a imagem. Tente usar o Google Chrome. Erro: " + err.message);
                }).finally(() => {
                    actions.style.display = originalActionsDisplay;
                    tabsNav.style.display = originalTabsDisplay;
                    
                    document.head.removeChild(style);
                    Chart.defaults.animation = true;
                    
                    if (currentActiveTab !== 'tab-1') {
                        document.querySelectorAll('.tab-content').forEach(tc => tc.classList.remove('active'));
                        document.getElementById(currentActiveTab).classList.add('active');
                    }
                    
                    if (currentActiveTab === 'tab-1') renderCharts();
                });
            }, 800); // Tira a foto após o desenho seguro do canvas
        }, 100); 
    }

    

// ─── Exportação PDF — Documento de Conclusão de Sprint ───────────────────────

window.exportSprintPDF = async function() {
    if (typeof window.jspdf === 'undefined') {
        alert('Biblioteca jsPDF não carregada. Verifique sua conexão com a internet e recarregue a página.');
        return;
    }

    // Toast de progresso
    const toast = document.createElement('div');
    toast.style.cssText = 'position:fixed;top:20px;right:20px;z-index:99999;background:#1e293b;color:#fff;padding:14px 22px;border-radius:12px;font-size:13px;font-weight:600;box-shadow:0 8px 32px rgba(0,0,0,0.35);display:flex;align-items:center;gap:10px;';
    toast.innerHTML = '<span style="animation:spin 1s linear infinite;display:inline-block;">⏳</span> Gerando PDF da Sprint…';
    document.body.appendChild(toast);

    // Garante que os gráficos estejam renderizados (tab-1 pode estar inativa)
    const tab1 = document.getElementById('tab-1');
    const wasInactive = tab1 && !tab1.classList.contains('active');
    if (wasInactive) {
        tab1.style.cssText += ';display:block!important;visibility:hidden;position:absolute;pointer-events:none;';
    }
    if (typeof window.renderCharts === 'function') {
        try { window.renderCharts(); } catch(e) {}
    }
    await new Promise(r => setTimeout(r, 600));

    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        const pW = 210, pH = 297, mg = 14, cW = pW - 2 * mg;

        const cfg     = state.config  || {};
        const title   = cfg.title     || 'Sprint QA';
        const squad   = cfg.squad     || '';
        const qaName  = cfg.qaName    || '';
        const period  = (cfg.startDate && cfg.endDate)
            ? `${window.formatDateBR(cfg.startDate)} a ${window.formatDateBR(cfg.endDate)}`
            : '';
        const version = cfg.targetVersion || '';
        const now     = new Date();
        const footerTxt = `QA Dashboard v2.0  |  Gerado em ${now.toLocaleDateString('pt-BR')} as ${now.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}`;

        // ── helpers ───────────────────────────────────────────────────────────
        const kv  = id => document.getElementById(id)?.innerText?.trim() || '-';
        const img = (canvasId, x, y, w, h) => {
            const c = document.getElementById(canvasId);
            if (!c) return;
            try { doc.addImage(c.toDataURL('image/png'), 'PNG', x, y, w, h); } catch(e) {}
        };
        const sf = (sz, style = 'normal', rgb = [15,23,42]) => {
            doc.setFontSize(sz);
            doc.setFont('helvetica', style);
            doc.setTextColor(...rgb);
        };
        const footer = (pageNum) => {
            sf(7.5, 'normal', [148,163,184]);
            doc.text(footerTxt, pW / 2, pH - 6, { align: 'center' });
            doc.text(String(pageNum), pW - mg, pH - 6, { align: 'right' });
        };
        const sectionHeader = (label, rgb) => {
            doc.setFillColor(...rgb);
            doc.roundedRect(mg, 14, cW, 13, 2.5, 2.5, 'F');
            sf(11, 'bold', [255,255,255]);
            doc.text(label, mg + 5, 14 + 9);
        };
        const hLine = (y, rgb = [226,232,240]) => {
            doc.setDrawColor(...rgb);
            doc.setLineWidth(0.25);
            doc.line(mg, y, pW - mg, y);
        };

        // ═══════════════════════════════════════════════════════════════════
        // PÁGINA 1 — RETRATO FINAL DA SPRINT
        // ═══════════════════════════════════════════════════════════════════
        let y = mg;

        // Cabeçalho azul
        doc.setFillColor(37, 99, 235);
        doc.roundedRect(mg, y, cW, 26, 3, 3, 'F');
        sf(17, 'bold', [255,255,255]);
        doc.text(title, mg + 6, y + 11);
        sf(8.5, 'normal', [191,219,254]);
        const sub = [squad && `Squad: ${squad}`, qaName && `QA: ${qaName}`, period && `Periodo: ${period}`, version && `Versao: ${version}`].filter(Boolean).join('   |   ');
        doc.text(sub || ' ', mg + 6, y + 20);
        y += 31;

        // KPIs — 2 linhas de 4
        const kpis = [
            { id: 'kpi-total',         label: 'Total Testes',   rgb: [37,99,235]   },
            { id: 'kpi-exec',          label: 'Executados',     rgb: [16,185,129]  },
            { id: 'kpi-rest',          label: 'Restantes',      rgb: [245,158,11]  },
            { id: 'kpi-meta',          label: 'Meta/Dia',       rgb: [99,102,241]  },
            { id: 'kpi-health-score',  label: 'Health Score',   rgb: [139,92,246]  },
            { id: 'resumo-status',     label: 'Status Sprint',  rgb: [15,23,42]    },
            { id: 'kpi-bugs',          label: 'Bugs Abertos',   rgb: [239,68,68]   },
            { id: 'kpi-mttr',          label: 'MTTR Global',    rgb: [139,92,246]  },
        ];
        const kpiCols = 4, kpiW = (cW - (kpiCols - 1) * 3) / kpiCols, kpiH = 17;
        kpis.forEach((k, i) => {
            const col = i % kpiCols, row = Math.floor(i / kpiCols);
            const kx = mg + col * (kpiW + 3), ky = y + row * (kpiH + 3);
            doc.setFillColor(248,250,252);
            doc.setDrawColor(226,232,240);
            doc.setLineWidth(0.25);
            doc.roundedRect(kx, ky, kpiW, kpiH, 2, 2, 'FD');
            doc.setFillColor(...k.rgb);
            doc.rect(kx, ky + kpiH - 3, kpiW, 3, 'F');
            sf(13, 'bold', k.rgb);
            doc.text(kv(k.id), kx + kpiW / 2, ky + 9.5, { align: 'center' });
            sf(6.5, 'normal', [100,116,139]);
            doc.text(k.label, kx + kpiW / 2, ky + 14, { align: 'center', maxWidth: kpiW - 2 });
        });
        y += 2 * kpiH + 3 * 3 + 4;

        // Burndown
        sf(9, 'bold', [15,23,42]);
        doc.text('Burndown Chart', mg, y);
        y += 3;
        img('chart-burndown', mg, y, cW, 52);
        y += 55;

        // Bugs — Stack (pizza) + Status por Stack (barra)
        sf(9, 'bold', [15,23,42]);
        doc.text('Distribuição de Bugs', mg, y);
        y += 3;
        img('chart-bugs-stack', mg,               y, cW * 0.34, 38);
        img('chart-bugs-bar',   mg + cW * 0.36,   y, cW * 0.64, 38);
        y += 41;

        // Progresso por funcionalidade
        sf(9, 'bold', [15,23,42]);
        doc.text('Progresso por Funcionalidade', mg, y);
        y += 3;
        img('chart-feature-progress', mg, y, cW, 38);
        y += 41;

        // MTTR heatmap + KPI
        sf(9, 'bold', [15,23,42]);
        doc.text('MTTR - Tempo Medio de Resolucao (dias)', mg, y);
        y += 3;
        img('chart-mttr', mg, y, cW * 0.65, 32);
        doc.setFillColor(245,243,255);
        doc.roundedRect(mg + cW * 0.67, y, cW * 0.33, 32, 2, 2, 'F');
        sf(18, 'bold', [139,92,246]);
        doc.text(kv('kpi-mttr'), mg + cW * 0.67 + (cW * 0.33) / 2, y + 14, { align: 'center' });
        sf(7.5, 'normal', [100,116,139]);
        doc.text('MTTR Global', mg + cW * 0.67 + (cW * 0.33) / 2, y + 21, { align: 'center' });
        doc.text(doc.splitTextToSize(kv('kpi-mttr-sub'), cW * 0.30), mg + cW * 0.67 + (cW * 0.33) / 2, y + 27, { align: 'center' });

        footer(1);

        // ═══════════════════════════════════════════════════════════════════
        // PÁGINA 2 — ALINHAMENTOS TÉCNICOS E DE PRODUTO
        // ═══════════════════════════════════════════════════════════════════
        doc.addPage();
        sectionHeader('Alinhamentos Técnicos e de Produto', [37,99,235]);
        y = 34;

        const alignments = (state.alignments || []).filter(a => a && (a.text || '').trim());
        if (alignments.length === 0) {
            sf(10, 'italic', [148,163,184]);
            doc.text('Nenhum alinhamento registrado nesta sprint.', mg, y);
        } else {
            alignments.forEach((al, i) => {
                const text  = (al.text || '').trim();
                const date  = al.date  || '';
                const lines = doc.splitTextToSize(text, cW - 12);
                const cardH = lines.length * 4.8 + 12;
                if (y + cardH > pH - 18) { footer(doc.internal.getCurrentPageInfo().pageNumber); doc.addPage(); y = mg; }
                doc.setFillColor(248,250,252);
                doc.setDrawColor(226,232,240);
                doc.setLineWidth(0.25);
                doc.roundedRect(mg, y, cW, cardH, 2, 2, 'FD');
                doc.setFillColor(37,99,235);
                doc.rect(mg, y, 3, cardH, 'F');
                sf(8, 'bold', [37,99,235]);
                doc.text(`#${i + 1}`, mg + 6, y + 7);
                if (date) { sf(7.5, 'normal', [148,163,184]); doc.text(date, pW - mg, y + 7, { align: 'right' }); }
                sf(9, 'normal', [51,65,85]);
                doc.text(lines, mg + 6, y + 13);
                y += cardH + 4;
            });
        }
        footer(doc.internal.getCurrentPageInfo().pageNumber);

        // ═══════════════════════════════════════════════════════════════════
        // PÁGINA 3 — RASTREAMENTO DE BUGS (tabela completa)
        // ═══════════════════════════════════════════════════════════════════
        doc.addPage();
        sectionHeader('Rastreamento Completo de Bugs', [239,68,68]);
        y = 34;

        const bugs = (state.bugs || []).filter(b => b);
        const openBugs     = bugs.filter(b => b.status !== 'Resolvido').length;
        const resolvedBugs = bugs.filter(b => b.status === 'Resolvido').length;
        sf(8.5, 'normal', [100,116,139]);
        doc.text(`Total: ${bugs.length}  |  Em aberto: ${openBugs}  |  Resolvidos: ${resolvedBugs}`, mg, y);
        y += 7;

        if (bugs.length === 0) {
            sf(10, 'italic', [148,163,184]);
            doc.text('Nenhum bug registrado nesta sprint.', mg, y);
        } else {
            // Cabeçalho da tabela
            const tc = { desc: mg + 2, sev: mg + 82, stack: mg + 112, status: mg + 140, mttr: mg + 172 };
            doc.setFillColor(241,245,249);
            doc.rect(mg, y, cW, 7.5, 'F');
            sf(7.5, 'bold', [71,85,105]);
            doc.text('Descrição', tc.desc, y + 5); doc.text('Severity', tc.sev, y + 5);
            doc.text('Stack', tc.stack, y + 5);    doc.text('Status', tc.status, y + 5);
            doc.text('MTTR', tc.mttr, y + 5);
            y += 8;

            const sevRgb   = { 'Crítica':[153,27,27], 'Alta':[194,65,12], 'Média':[180,83,9], 'Blocker':[109,40,217], 'Baixa':[22,101,52] };
            const statRgb  = { 'Aberto':[239,68,68], 'Em Andamento':[245,158,11], 'Resolvido':[16,185,129], 'Aguardando Retest':[99,102,241] };

            bugs.forEach((b, i) => {
                if (y > pH - 18) { footer(doc.internal.getCurrentPageInfo().pageNumber); doc.addPage(); y = mg; }
                const rh = 8;
                doc.setFillColor(i % 2 === 0 ? 255 : 248, i % 2 === 0 ? 255 : 250, i % 2 === 0 ? 255 : 252);
                doc.rect(mg, y, cW, rh, 'F');
                sf(8, 'normal', [51,65,85]);
                doc.text(doc.splitTextToSize(b.desc || b.title || '-', 76)[0], tc.desc, y + 5.5);
                sf(7.5, 'bold', sevRgb[b.severity] || [100,116,139]);
                doc.text(b.severity || '-', tc.sev, y + 5.5);
                sf(8, 'normal', [51,65,85]);
                doc.text(b.stack || '-', tc.stack, y + 5.5);
                sf(7.5, 'bold', statRgb[b.status] || [100,116,139]);
                doc.text(b.status || '-', tc.status, y + 5.5);
                sf(8, 'normal', [51,65,85]);
                if (b.openedAt && b.resolvedAt) {
                    const d = Math.max(0, Math.round((new Date(b.resolvedAt + 'T00:00:00') - new Date(b.openedAt + 'T00:00:00')) / 86400000));
                    doc.text(`${d}d`, tc.mttr, y + 5.5);
                } else { doc.text('-', tc.mttr, y + 5.5); }
                y += rh;
            });
        }
        footer(doc.internal.getCurrentPageInfo().pageNumber);

        // ═══════════════════════════════════════════════════════════════════
        // PÁGINA 4 — EXECUÇÃO POR FUNCIONALIDADE
        // ═══════════════════════════════════════════════════════════════════
        doc.addPage();
        sectionHeader('Execução por Funcionalidade', [16,185,129]);
        y = 34;

        const feats = (state.features || []).filter(f => f);
        if (feats.length === 0) {
            sf(10, 'italic', [148,163,184]);
            doc.text('Nenhuma funcionalidade cadastrada.', mg, y);
        } else {
            doc.setFillColor(241,245,249);
            doc.rect(mg, y, cW, 7.5, 'F');
            sf(7.5, 'bold', [71,85,105]);
            doc.text('Funcionalidade', mg + 2, y + 5);
            doc.text('Status', mg + 100, y + 5);
            doc.text('Total', mg + 128, y + 5);
            doc.text('Exec.', mg + 148, y + 5);
            doc.text('Falhou', mg + 163, y + 5);
            doc.text('Progresso', mg + 178, y + 5);
            y += 8;

            feats.forEach((f, i) => {
                if (y > pH - 18) { footer(doc.internal.getCurrentPageInfo().pageNumber); doc.addPage(); y = mg; }
                const rh = 9;
                doc.setFillColor(i % 2 === 0 ? 255 : 248, i % 2 === 0 ? 255 : 250, i % 2 === 0 ? 255 : 252);
                doc.rect(mg, y, cW, rh, 'F');

                const pct    = f.tests > 0 ? Math.round((f.exec / f.tests) * 100) : 0;
                const failed = (f.cases || []).filter(c => c.status === 'Falhou').length;

                sf(8, 'normal', [51,65,85]);
                doc.text(doc.splitTextToSize(f.name || '-', 93)[0], mg + 2, y + 6);
                sf(7.5, 'bold', f.status === 'Bloqueada' ? [239,68,68] : [16,185,129]);
                doc.text(f.status || 'Ativa', mg + 100, y + 6);
                sf(8, 'normal', [51,65,85]);
                doc.text(String(f.tests || 0), mg + 131, y + 6, { align: 'center' });
                doc.text(String(f.exec  || 0), mg + 151, y + 6, { align: 'center' });
                sf(7.5, 'bold', failed > 0 ? [239,68,68] : [51,65,85]);
                doc.text(String(failed), mg + 168, y + 6, { align: 'center' });

                // Barra de progresso
                const bx = mg + 176, by = y + 3, bw = cW - 176 - 2, bh = 3.5;
                doc.setFillColor(226,232,240); doc.roundedRect(bx, by, bw, bh, 1, 1, 'F');
                if (pct > 0) {
                    doc.setFillColor(...(pct === 100 ? [16,185,129] : [37,99,235]));
                    doc.roundedRect(bx, by, bw * pct / 100, bh, 1, 1, 'F');
                }
                sf(6.5, 'normal', [100,116,139]);
                doc.text(`${pct}%`, bx + bw + 1, y + 6);
                y += rh;
            });

            // Cenários que falharam — detalhe
            const failedCases = [];
            feats.forEach(f => (f.cases || []).forEach(c => { if (c.status === 'Falhou') failedCases.push({ feat: f.name, case: c.name }); }));
            if (failedCases.length > 0) {
                y += 6;
                if (y + failedCases.length * 7 + 16 > pH - 18) { footer(doc.internal.getCurrentPageInfo().pageNumber); doc.addPage(); y = mg; }
                sf(9, 'bold', [239,68,68]);
                doc.text(`Cenarios com Falha (${failedCases.length})`, mg, y);
                y += 4; hLine(y, [254,202,202]); y += 4;
                failedCases.forEach(fc => {
                    if (y > pH - 18) { footer(doc.internal.getCurrentPageInfo().pageNumber); doc.addPage(); y = mg; }
                    doc.setFillColor(255,245,245);
                    doc.setDrawColor(254,202,202);
                    doc.setLineWidth(0.2);
                    doc.roundedRect(mg, y, cW, 7, 2, 2, 'FD');
                    doc.setFillColor(248,113,113); doc.rect(mg, y, 2.5, 7, 'F');
                    sf(8, 'normal', [153,27,27]);
                    doc.text(doc.splitTextToSize(`${fc.feat}: ${fc.case}`, cW - 8)[0], mg + 5, y + 4.8);
                    y += 8;
                });
            }
        }
        footer(doc.internal.getCurrentPageInfo().pageNumber);

        // ═══════════════════════════════════════════════════════════════════
        // PÁGINA 5 — PREMISSAS, PLANO DE AÇÃO E IMPEDIMENTOS
        // ═══════════════════════════════════════════════════════════════════
        doc.addPage();
        sectionHeader('Premissas, Plano de Ação e Impedimentos', [245,158,11]);
        y = 34;

        const sections5 = [
            { label: 'Premissas Operacionais', text: state.notes?.operationalPremises, rgb: [180,83,9] },
            { label: 'Premissas Gerais',        text: state.notes?.premises,            rgb: [180,83,9] },
            { label: 'Plano de Ação',           text: state.notes?.actionPlan,          rgb: [239,68,68] },
        ];
        sections5.forEach(sec => {
            if (y > pH - 30) { footer(doc.internal.getCurrentPageInfo().pageNumber); doc.addPage(); y = mg; }
            sf(9.5, 'bold', sec.rgb);
            doc.text(sec.label, mg, y); y += 3;
            hLine(y, [226,232,240]); y += 5;
            if (sec.text && sec.text.trim()) {
                const lines = doc.splitTextToSize(sec.text.trim(), cW);
                doc.setFillColor(255,251,235);
                doc.roundedRect(mg, y, cW, lines.length * 4.8 + 6, 2, 2, 'F');
                sf(9, 'normal', [51,65,85]);
                doc.text(lines, mg + 4, y + 5);
                y += lines.length * 4.8 + 10;
            } else {
                sf(9, 'italic', [148,163,184]);
                doc.text('Não registrado.', mg, y); y += 10;
            }
        });

        // Funcionalidades bloqueadas
        const blocked = feats.filter(f => f.status === 'Bloqueada');
        if (blocked.length > 0) {
            if (y > pH - 30) { footer(doc.internal.getCurrentPageInfo().pageNumber); doc.addPage(); y = mg; }
            sf(9.5, 'bold', [239,68,68]);
            doc.text(`Funcionalidades Bloqueadas (${blocked.length})`, mg, y); y += 3;
            hLine(y, [254,202,202]); y += 5;
            blocked.forEach(f => {
                if (y > pH - 18) { footer(doc.internal.getCurrentPageInfo().pageNumber); doc.addPage(); y = mg; }
                const reason = f.blockReason || 'Motivo não informado.';
                const lines  = doc.splitTextToSize(`${f.name}: ${reason}`, cW - 8);
                const cardH  = lines.length * 4.8 + 8;
                doc.setFillColor(255,245,245); doc.setDrawColor(254,202,202); doc.setLineWidth(0.2);
                doc.roundedRect(mg, y, cW, cardH, 2, 2, 'FD');
                doc.setFillColor(239,68,68); doc.rect(mg, y, 3, cardH, 'F');
                sf(8.5, 'normal', [153,27,27]);
                doc.text(lines, mg + 6, y + 6);
                y += cardH + 4;
            });
        }
        footer(doc.internal.getCurrentPageInfo().pageNumber);

        // ═══════════════════════════════════════════════════════════════════
        // PÁGINAS FINAIS — REPORTS DIÁRIOS
        // ═══════════════════════════════════════════════════════════════════
        const reports     = state.reports || {};
        const reportDates = Object.keys(reports).filter(d => (reports[d] || '').trim()).sort();

        if (reportDates.length > 0) {
            doc.addPage();
            sectionHeader('Reports Diários da Sprint', [99,102,241]);
            y = 34;
            sf(8.5, 'normal', [100,116,139]);
            doc.text(`${reportDates.length} dia(s) com registro`, mg, y); y += 8;

            reportDates.forEach(date => {
                const text = (reports[date] || '').trim();
                if (!text) return;
                const formatted = window.formatDateBR ? window.formatDateBR(date) : date;
                const lines     = doc.splitTextToSize(text, cW - 8);
                const cardH     = lines.length * 4.8 + 14;

                if (y + cardH > pH - 18) { footer(doc.internal.getCurrentPageInfo().pageNumber); doc.addPage(); y = mg; }

                doc.setFillColor(248,250,252); doc.setDrawColor(199,210,254); doc.setLineWidth(0.3);
                doc.roundedRect(mg, y, cW, cardH, 2, 2, 'FD');
                doc.setFillColor(99,102,241); doc.rect(mg, y, 3, cardH, 'F');
                sf(9, 'bold', [99,102,241]);
                doc.text(formatted, mg + 6, y + 8);
                sf(8.5, 'normal', [51,65,85]);
                doc.text(lines, mg + 6, y + 14);
                y += cardH + 5;
            });
            footer(doc.internal.getCurrentPageInfo().pageNumber);
        }

        // Salva
        const safeName = title.replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '_');
        doc.save(`Conclusao_Sprint_${safeName}_${now.toISOString().split('T')[0]}.pdf`);

    } finally {
        document.body.removeChild(toast);
        if (wasInactive && tab1) {
            tab1.style.display = '';
            tab1.style.visibility = '';
            tab1.style.position = '';
            tab1.style.pointerEvents = '';
        }
    }
};

window.addEventListener('load', () => {
    try {
        window.initRouting();
    } catch(error) {
        console.error('Erro fatal ao inicializar o gerenciador de rotas/dashboard:', error);
        window.showToast('Erro ao iniciar a aplicação', true);
    }
});
