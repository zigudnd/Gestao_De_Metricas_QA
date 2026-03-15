
// ==========================================
// MODEL (state.js)
// ==========================================

window.DEFAULT_STATE = {
    config: { sprintDays: 20, title: "QA Dashboard - Acompanhamento da Sprint", startDate: "", endDate: "", targetVersion: "", squad: "", qaName: "", hsCritical: 15, hsHigh: 10, hsMedium: 5, hsLow: 2, hsRetest: 2, hsBlocked: 10, hsDelayed: 2 },
    currentDate: new Date().toISOString().split('T')[0],
    reports: {},
    notes: { premises: "", actionPlan: "", operationalPremises: "" },
    alignments: [], 
    features: [
        { id: 1, name: 'Apresentação', tests: 1, manualTests: 0, exec: 1, execution: {}, manualExecData: {'D1': 1}, mockupImage: '', status: 'Ativa', blockReason: '', activeFilter: 'Todos', cases: [{id: 101, name: 'Validar UI Inicial', complexity: 'Baixa', status: 'Pendente', executionDay: '', gherkin: ''}] }
    ],
    blockers: [],
    bugs: []
};

window.state = {};
window.pendingTestCaseStatus = {};
window.runtimeConfig = window.__QA_DASHBOARD_CONFIG__ || {};

window.currentSprintId = '';

window.API_CONFIG = {
    projectKey: window.runtimeConfig.projectKey || new URLSearchParams(window.location.search).get('project') || 'android',
    apiBasePath: window.runtimeConfig.apiBasePath || '/api/dashboard',
    localBackupKey: window.runtimeConfig.localBackupKey || 'qaDashboardData'
};

window.getStorageKey = function() {
    return window.currentSprintId ? (window.API_CONFIG.localBackupKey + '_' + window.currentSprintId) : window.API_CONFIG.localBackupKey;
}

window.saveToastTimeout = null;
window.remotePersistTimeout = null;
window.remotePersistInFlight = false;
window.remotePersistQueued = false;

window.cloneDefaultState = function() {
        return JSON.parse(JSON.stringify(DEFAULT_STATE));
    }

    
window.normalizeState = function(rawState) {
        const normalizedState = rawState ? rawState : cloneDefaultState();

        if(!normalizedState.config) normalizedState.config = cloneDefaultState().config;
        if(normalizedState.config.squad === undefined) normalizedState.config.squad = "";
        if(normalizedState.config.qaName === undefined) normalizedState.config.qaName = "";
        if(normalizedState.config.hsCritical === undefined) normalizedState.config.hsCritical = 15;
        if(normalizedState.config.hsHigh === undefined) normalizedState.config.hsHigh = 10;
        if(normalizedState.config.hsMedium === undefined) normalizedState.config.hsMedium = 5;
        if(normalizedState.config.hsLow === undefined) normalizedState.config.hsLow = 2;
        if(normalizedState.config.hsRetest === undefined) normalizedState.config.hsRetest = 2;
        if(normalizedState.config.hsBlocked === undefined) normalizedState.config.hsBlocked = 10;
        if(normalizedState.config.hsDelayed === undefined) normalizedState.config.hsDelayed = 2;
        if(!normalizedState.notes) normalizedState.notes = { premises: "", actionPlan: "", operationalPremises: "" };
        if(normalizedState.notes.operationalPremises === undefined) normalizedState.notes.operationalPremises = "";
        if(!normalizedState.reports || typeof normalizedState.reports !== 'object') normalizedState.reports = {};
        if(!Array.isArray(normalizedState.alignments)) normalizedState.alignments = [];
        if(!Array.isArray(normalizedState.features)) normalizedState.features = cloneDefaultState().features;
        if(!Array.isArray(normalizedState.blockers)) normalizedState.blockers = [];
        if(!Array.isArray(normalizedState.bugs)) normalizedState.bugs = [];
        if(!normalizedState.currentDate) normalizedState.currentDate = new Date().toISOString().split('T')[0];
        if (normalizedState.reports[normalizedState.currentDate] === undefined) normalizedState.reports[normalizedState.currentDate] = "";

        normalizedState.bugs.forEach(b => {
            if (b.feature === undefined) b.feature = '';
            if (b.assignee === undefined) b.assignee = '';
        });

        normalizedState.features.forEach(f => {
            if (f.exec === undefined) f.exec = 0;
            if (f.manualTests === undefined) f.manualTests = 0;
            if (f.status === undefined || f.status === 'Concluída') f.status = 'Ativa';
            if (f.blockReason === undefined) f.blockReason = '';
            if (f.activeFilter === undefined) f.activeFilter = 'Todos';
            if (f.mockupImage === undefined) f.mockupImage = '';

            if (f.cases === undefined) f.cases = [];
            f.cases.forEach(c => {
                if(c.complexity === undefined) c.complexity = 'Baixa';
                if(c.status === undefined) c.status = 'Pendente';
                if(c.executionDay === undefined) c.executionDay = '';
            });

            if (!f.manualExecData) {
                f.manualExecData = {};
                if (f.execution) {
                    Object.keys(f.execution).forEach(k => {
                        f.manualExecData[k] = f.execution[k];
                    });
                } else if (f.exec > 0) {
                    f.manualExecData['D1'] = f.exec;
                }
            }
        });

        return normalizedState;
    }

window.loadStateFromServer = async function() {
        if(!currentSprintId) return null;
        try {
            const url = `${window.API_CONFIG.apiBasePath}/${currentSprintId}`;
            const res = await fetch(url);
            if (!res.ok) {
                console.warn("Nenhum backup encontrado no servidor para esta sprint. Usando local.");
                return null;
            }
            const data = await res.json();
            return data.payload;
        } catch (error) {
            console.error('Erro ao ler do servidor local Node.js:', error);
            return null;
        }
    }

    
window.queueRemotePersist = function(delay = 700) {
        clearTimeout(remotePersistTimeout);
        remotePersistTimeout = setTimeout(() => {
            persistStateToServer();
        }, delay);
    }

window.persistStateToServer = async function() {
        if (!currentSprintId) return;
        if(remotePersistInFlight) {
            remotePersistQueued = true;
            return;
        }
        
        remotePersistInFlight = true;
        remotePersistQueued = false;

        try {
            const url = `${window.API_CONFIG.apiBasePath}/${currentSprintId}`;
            await fetch(url, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ payload: state })
            });
            console.log("✅ Backup salvo no servidor local com sucesso!");
        } catch (error) {
            console.error('Erro ao salvar no servidor local Node.js:', error);
        } finally {
            remotePersistInFlight = false;
            if(remotePersistQueued) {
                queueRemotePersist(2000);
            }
        }
    }

window.saveState = function() {
        state.features.forEach(f => {
            let manual = parseInt(f.manualTests);
            if (isNaN(manual) || manual < 0) manual = 0;
            f.manualTests = manual;

            f.tests = (f.cases ? f.cases.length : 0) + manual;

            f.gherkinExecs = {};
            if (f.cases) {
                f.cases.forEach(c => {
                    // 'Falhou' também conta: o teste foi executado (apenas não passou)
                    if ((c.status === 'Concluído' || c.status === 'Falhou') && c.executionDay) {
                        f.gherkinExecs[c.executionDay] = (f.gherkinExecs[c.executionDay] || 0) + 1;
                    }
                });
            }

            if (!f.manualExecData) f.manualExecData = {};

            f.execution = {};
            let sumExec = 0;
            // Se startDate e endDate configurados, sprintDays é derivado das datas
            let sprintDays;
            if (state.config.startDate && state.config.endDate) {
                const s = new Date(state.config.startDate + 'T00:00:00');
                const e = new Date(state.config.endDate + 'T00:00:00');
                const diff = Math.round((e - s) / (1000 * 60 * 60 * 24)) + 1;
                sprintDays = diff > 0 ? diff : (parseInt(state.config.sprintDays) || 20);
            } else {
                sprintDays = parseInt(state.config.sprintDays) || 20;
            }
            for(let i=1; i<=sprintDays; i++) {
                let dKey = `D${i}`;
                let m = parseInt(f.manualExecData[dKey]) || 0;
                let g = f.gherkinExecs[dKey] || 0;
                let totalD = m + g;
                if (totalD > 0) f.execution[dKey] = totalD;
                sumExec += totalD;
            }

            if(sumExec > f.tests) sumExec = f.tests;
            f.exec = sumExec;
        });

        try {
            localStorage.setItem(getStorageKey(), JSON.stringify(state));
            
            // Atualizar no Master Index para refletir dados na Home
            if(currentSprintId && window.upsertSprintInMasterIndex) {
               window.upsertSprintInMasterIndex(currentSprintId, state);
            }
        } catch (e) {
            console.error("Erro ao salvar backup local:", e);
        }

        queueRemotePersist();

        try {
            renderAll();
        } catch(e) {
            console.error("Erro interno ao renderizar: ", e);
        }
    }

    
window.getStorageKey = function() {
        return currentSprintId ? (API_CONFIG.localBackupKey + '_' + currentSprintId) : API_CONFIG.localBackupKey;
    }

    let saveToastTimeout;
    let remotePersistTimeout;
    let remotePersistInFlight = false;
    let remotePersistQueued = false;

    
