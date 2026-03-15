// ==========================================
// VIEW (view.js)
// ==========================================

if (typeof ChartDataLabels !== 'undefined') {
    Chart.register(ChartDataLabels);
    Chart.defaults.set('plugins.datalabels', {
        color: '#ffffff',
        font: { weight: '600', size: 12, family: "'Inter', sans-serif" },
        formatter: function(value) { return value > 0 ? value : ''; }
    });
}
window.escapeHTML = function(str) {
        if (str === null || str === undefined) return '';
        return str.toString()
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    if (typeof ChartDataLabels !== 'undefined') {
        Chart.register(ChartDataLabels);
        Chart.defaults.set('plugins.datalabels', {
            color: '#ffffff',
            font: { weight: '600', size: 12, family: "'Inter', sans-serif" },
            formatter: function(value) { return value > 0 ? value : ''; }
        });
    }


window.openTab = function(tabId, btnElement) {
        const tabs = document.querySelectorAll('.tab-content');
        tabs.forEach(tab => tab.classList.remove('active'));
        
        const btns = document.querySelectorAll('.tab-btn');
        btns.forEach(btn => btn.classList.remove('active'));
        
        document.getElementById(tabId).classList.add('active');
        btnElement.classList.add('active');

        if(tabId === 'tab-1') {
            // Pequeno delay para garantir que o CSS aplicou o display block no elemento pai
            setTimeout(() => {
                renderCharts();
            }, 50);
        }
    }

    
window.isUserTypingIn = function(element) {
        const active = document.activeElement;
        if (!active || !element) return false;
        return element.contains(active) && ['INPUT', 'TEXTAREA'].includes(active.tagName);
    }

    
window.formatDateBR = function(dateString) {
        if(!dateString) return "";
        const parts = dateString.split('-');
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }

    
window.showToast = function(message = 'Dados salvos', isError = false) {
        const toast = document.getElementById("toast");
        if (!toast) return;

        toast.textContent = message;
        toast.style.backgroundColor = isError ? '#b91c1c' : '#1e293b';
        toast.className = "show";

        clearTimeout(saveToastTimeout);
        saveToastTimeout = setTimeout(() => {
            toast.className = toast.className.replace("show", "");
        }, 3000);
    }

    
window.renderBugFilters = function() {
    const bar = document.getElementById('bug-filters-bar');
    if (!bar) return;

    const filters = window._bugFilters || { status: 'Todos', assignee: 'Todos', stack: 'Todos' };

    // Dynamic assignee options from current bugs
    const assignees = ['Todos', 'Não Atribuído'];
    (state.bugs || []).forEach(b => {
        const name = (b.assignee || '').trim();
        if (name && !assignees.includes(name)) assignees.push(name);
    });

    // Count visible bugs for the badge
    const total = (state.bugs || []).length;
    const visible = (state.bugs || []).filter(b => {
        if (filters.status !== 'Todos' && b.status !== filters.status) return false;
        if (filters.stack !== 'Todos' && b.stack !== filters.stack) return false;
        if (filters.assignee === 'Não Atribuído') return !(b.assignee || '').trim();
        if (filters.assignee !== 'Todos' && b.assignee !== filters.assignee) return false;
        return true;
    }).length;

    const isFiltered = filters.status !== 'Todos' || filters.assignee !== 'Todos' || filters.stack !== 'Todos';

    const btnStyle = (active) => active
        ? 'background: var(--primary-blue); color: #fff; border-color: var(--primary-blue);'
        : 'background: #f8fafc; color: var(--text-muted); border-color: #e2e8f0;';

    const makeGroup = (label, field, options) => `
        <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
            <span style="font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; white-space: nowrap;">${label}</span>
            ${options.map(opt => `
                <button onclick="setBugFilter('${field}', '${opt.replace(/'/g, "\\'")}')"
                    style="font-size: 12px; font-weight: 600; padding: 4px 10px; border-radius: 20px; border: 1px solid; cursor: pointer; transition: all 0.15s; ${btnStyle(filters[field] === opt)}">
                    ${escapeHTML(opt)}
                </button>
            `).join('')}
        </div>`;

    bar.innerHTML = `
        <div style="display: flex; align-items: center; gap: 18px; flex-wrap: wrap; padding: 12px 14px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px;">
            ${makeGroup('Status', 'status', ['Todos', 'Aberto', 'Em Andamento', 'Resolvido'])}
            <div style="width: 1px; height: 28px; background: #e2e8f0; flex-shrink: 0;"></div>
            ${makeGroup('Stack', 'stack', ['Todos', 'Front', 'BFF', 'Back'])}
            <div style="width: 1px; height: 28px; background: #e2e8f0; flex-shrink: 0;"></div>
            ${makeGroup('Atribuição', 'assignee', assignees)}
            <div style="margin-left: auto; display: flex; align-items: center; gap: 8px;">
                <span style="font-size: 12px; color: var(--text-muted);">${visible} de ${total} bug${total !== 1 ? 's' : ''}</span>
                ${isFiltered ? `<button onclick="resetBugFilters()" style="font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 20px; border: 1px solid var(--danger); background: #fee2e2; color: var(--danger); cursor: pointer;">✕ Limpar</button>` : ''}
            </div>
        </div>`;
};

window.renderAll = function() {
        renderHeaderAndConfig();
        updateCalculations();
        renderDailyReport();
        renderAlertsList();
        renderFailedScenariosList();
        renderOpenBugsList();
        renderAlignments();
        renderBugFilters();
        renderTables();
        renderTestCasesAccordion();
        renderNotes();
        renderMTTRKPI();

        // CORREÇÃO CRÍTICA DO BUG: Só tenta desenhar os gráficos se a aba correta estiver 100% visível
        if (document.getElementById('tab-1').classList.contains('active')) {
            renderCharts();
        }
    }

    
window.renderHeaderAndConfig = function() {
        document.getElementById('header-title').innerText = state.config.title || "QA Dashboard";
        
        let subtitleParts = [];
        if(state.config.squad) { subtitleParts.push(`Squad: ${state.config.squad}`); }
        if(state.config.qaName) { subtitleParts.push(`QA: ${state.config.qaName}`); }
        if(state.config.startDate && state.config.endDate) { subtitleParts.push(`Período: ${formatDateBR(state.config.startDate)} a ${formatDateBR(state.config.endDate)}`); }
        if(state.config.targetVersion) { subtitleParts.push(`Versão Alvo: ${state.config.targetVersion}`); }
        document.getElementById('header-subtitle').innerText = subtitleParts.join(' | ');

        if(!isUserTypingIn(document.getElementById('cfg-title').parentElement.parentElement)) {
            document.getElementById('cfg-title').value = state.config.title || "";
            document.getElementById('cfg-squad').value = state.config.squad || "";
            document.getElementById('cfg-qa').value = state.config.qaName || "";
            document.getElementById('cfg-days').value = state.config.sprintDays || "";
            document.getElementById('cfg-version').value = state.config.targetVersion || "";
            document.getElementById('cfg-start').value = state.config.startDate || "";
            document.getElementById('cfg-end').value = state.config.endDate || "";
            
            // Health Score Custom Configs
            document.getElementById('cfg-hs-critical').value = state.config.hsCritical;
            document.getElementById('cfg-hs-high').value = state.config.hsHigh;
            document.getElementById('cfg-hs-medium').value = state.config.hsMedium;
            document.getElementById('cfg-hs-low').value = state.config.hsLow;
            document.getElementById('cfg-hs-retest').value = state.config.hsRetest;
            document.getElementById('cfg-hs-blocked').value = state.config.hsBlocked;
            document.getElementById('cfg-hs-delayed').value = state.config.hsDelayed;
        }

        document.getElementById('kpi-meta-sub').innerText = `Planejado / ${state.config.sprintDays} dias`;
        document.getElementById('title-burndown').innerText = `Burndown Chart (${state.config.sprintDays} Dias)`;
    }

    
window.renderNotes = function() {
        const premisesEl = document.getElementById('notes-premises');
        const actionPlanEl = document.getElementById('notes-action-plan');
        const opPremisesInput = document.getElementById('op-premises-input');
        const execPremises = document.getElementById('premises-list-exec');
        const execActionPlan = document.getElementById('action-plan-list-exec');

        if (premisesEl && !isUserTypingIn(premisesEl)) {
            premisesEl.value = state.notes.premises || '';
        }
        if (actionPlanEl && !isUserTypingIn(actionPlanEl)) {
            actionPlanEl.value = state.notes.actionPlan || '';
        }
        if (opPremisesInput && !isUserTypingIn(opPremisesInput)) {
            opPremisesInput.value = state.notes.operationalPremises || '';
        }

        if (execPremises) {
            if (!state.notes.operationalPremises) {
                execPremises.innerHTML = `<div style="display: flex; align-items: center; justify-content: center; height: 100%; min-height: 80px; color: var(--text-muted); font-weight: 500; padding: 20px; background: #f8fafc; border-radius: 8px; border: 1px dashed #cbd5e1;">Nenhuma premissa registrada no momento.</div>`;
            } else {
                execPremises.innerHTML = `<div style="padding: 15px; background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; color: #92400e; line-height: 1.6;">${escapeHTML(state.notes.operationalPremises)}</div>`;
            }
        }

        if (execActionPlan) {
            if (!state.notes.actionPlan) {
                execActionPlan.innerHTML = `<div style="display: flex; align-items: center; justify-content: center; height: 100%; min-height: 80px; color: var(--text-muted); font-weight: 500; padding: 20px; background: #f8fafc; border-radius: 8px; border: 1px dashed #cbd5e1;">Nenhum plano de ação registrado.</div>`;
            } else {
                execActionPlan.innerHTML = `<div style="padding: 15px; background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; color: #991b1b; line-height: 1.6;">${escapeHTML(state.notes.actionPlan)}</div>`;
            }
        }
    }

    
window.updateCalculations = function() {
        const sprintDays = parseInt(state.config.sprintDays) || 20;
        const totalTests = state.features.reduce((acc, f) => acc + (parseInt(f.tests) || 0), 0);
        document.getElementById('kpi-total').innerText = totalTests;
        
        let totalExec = state.features.reduce((acc, f) => acc + (parseInt(f.exec) || 0), 0);
        document.getElementById('kpi-exec').innerText = totalExec;

        const remaining = totalTests - totalExec;
        document.getElementById('kpi-rest').innerText = remaining < 0 ? 0 : remaining;

        const meta = totalTests > 0 ? Math.ceil(totalTests / sprintDays) : 0;
        document.getElementById('kpi-meta').innerText = meta;

        const totalHoras = state.blockers.reduce((acc, b) => acc + (parseInt(b.hours) || 0), 0);
        document.getElementById('kpi-horas').innerText = totalHoras + 'h';

        const openBugs = state.bugs.filter(b => b.status === 'Aberto' || b.status === 'Em Andamento').length;
        document.getElementById('kpi-bugs').innerText = openBugs;

        let maxDay = 1;
        state.features.forEach(f => {
            if(f.execution) {
                Object.keys(f.execution).forEach(k => {
                    let val = parseInt(f.execution[k]) || 0;
                    if(val > 0 || f.execution[k] !== undefined && f.execution[k] !== "") {
                        let dNum = parseInt(k.replace('D', ''));
                        if(dNum > maxDay) maxDay = dNum;
                    }
                });
            }
        });
        
        const exatMeta = totalTests > 0 ? totalTests / sprintDays : 0;
        const idealAteHoje = exatMeta * maxDay;
        let atrasoCasos = Math.round(idealAteHoje - totalExec);
        if(atrasoCasos < 0) atrasoCasos = 0; 
        
        document.getElementById('kpi-atraso-casos').innerText = atrasoCasos;
        
        const atrasoPerc = totalTests > 0 ? ((atrasoCasos / totalTests) * 100).toFixed(1) : 0;
        document.getElementById('kpi-atraso-perc').innerText = atrasoPerc + '%';

        let statusText = "No Ritmo";
        let statusColor = varColor('--success');
        if (atrasoCasos > 0 && atrasoCasos <= 5) { statusText = "Atenção"; statusColor = varColor('--warning'); }
        else if (atrasoCasos > 5) { statusText = "Em Atraso"; statusColor = varColor('--danger'); }
        
        const statusEl = document.getElementById('resumo-status');
        statusEl.innerText = statusText;
        statusEl.style.color = statusColor;

        let healthScore = 100;
        let totalRetests = 0;
        
        const wCritical = parseInt(state.config.hsCritical) || 0;
        const wHigh = parseInt(state.config.hsHigh) || 0;
        const wMedium = parseInt(state.config.hsMedium) || 0;
        const wLow = parseInt(state.config.hsLow) || 0;
        const wRetest = parseInt(state.config.hsRetest) || 0;
        const wBlocked = parseInt(state.config.hsBlocked) || 0;
        const wDelayed = parseInt(state.config.hsDelayed) || 0;

        state.bugs.forEach(b => {
            let rt = parseInt(b.retests) || 0;
            totalRetests += rt;
            healthScore -= (rt * wRetest); 

            if (b.status === 'Aberto' || b.status === 'Em Andamento') {
                if (b.severity === 'Crítica') healthScore -= wCritical;
                else if (b.severity === 'Alta') healthScore -= wHigh;
                else if (b.severity === 'Média') healthScore -= wMedium;
                else if (b.severity === 'Baixa') healthScore -= wLow;
            }
        });

        const blockedFeaturesCount = state.features.filter(f => f.status === 'Bloqueada').length;
        healthScore -= (blockedFeaturesCount * wBlocked); 

        if (atrasoCasos > 0) {
            healthScore -= (atrasoCasos * wDelayed); 
        }

        if (healthScore < 0) healthScore = 0;
        if (healthScore > 100) healthScore = 100;

        document.getElementById('kpi-retestes').innerText = totalRetests;

        const hsEl = document.getElementById('kpi-health-score');
        const hsCard = document.getElementById('card-health-score');
        hsEl.innerText = healthScore + '%';

        if (healthScore >= 90) { 
            hsEl.style.color = 'var(--success)'; 
            hsCard.style.borderBottom = '3px solid var(--success)';
        } else if (healthScore >= 70) { 
            hsEl.style.color = 'var(--warning)'; 
            hsCard.style.borderBottom = '3px solid var(--warning)';
        } else { 
            hsEl.style.color = 'var(--danger)'; 
            hsCard.style.borderBottom = '3px solid var(--danger)';
        }
    }

    
// ── Alertas de Impedimentos (funcionalidades bloqueadas) ─────────────────────
window.renderAlertsList = function() {
        const container = document.getElementById('alerts-list-exec');
        if (!container) return;

        const blockedFeatures = state.features.filter(f => f.status === 'Bloqueada');
        document.getElementById('kpi-telas-bloqueadas').innerText = blockedFeatures.length;

        if (blockedFeatures.length === 0) {
            container.innerHTML = `
                <div style="display: flex; align-items: center; justify-content: center; min-height: 72px; color: var(--success); font-weight: 600; padding: 16px 20px; background: #ecfdf5; border-radius: 8px; border: 1px dashed #a7f3d0;">
                    ✅ Nenhum impedimento no momento. Tudo desbloqueado!
                </div>
            `;
            return;
        }

        container.innerHTML = blockedFeatures.map(f => `
            <div style="padding: 14px 16px; background: #fff5f5; border: 1px solid #fecaca; border-left: 4px solid #ef4444; border-radius: 8px; margin-bottom: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
                    <strong style="color: #991b1b; font-size: 14px; display: flex; align-items: center; gap: 8px;">
                        <span style="display: flex; align-items: center; justify-content: center; background: #fee2e2; width: 28px; height: 28px; border-radius: 6px; font-size: 14px;">🖥️</span>
                        ${escapeHTML(f.name || 'Sem nome')}
                    </strong>
                    <span style="font-size: 10px; background: #ef4444; color: white; padding: 4px 8px; border-radius: 12px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; white-space: nowrap; flex-shrink: 0;">Tela Bloqueada</span>
                </div>
                <p style="font-size: 13px; color: #7f1d1d; background: #fee2e2; padding: 10px 12px; border-radius: 6px; display: flex; align-items: flex-start; gap: 8px; line-height: 1.4; border: 1px dashed #fca5a5; margin: 0;">
                    <span style="font-size: 14px; margin-top: 1px; flex-shrink: 0;">📌</span>
                    <span><strong style="color: #991b1b;">Motivo:</strong><br>${escapeHTML(f.blockReason || 'Motivo não informado.')}</span>
                </p>
            </div>
        `).join('');
    }

// ── Cenários com Falha ────────────────────────────────────────────────────────
window.renderFailedScenariosList = function() {
        const container = document.getElementById('failed-scenarios-list-exec');
        if (!container) return;

        const failedScenarios = [];
        state.features.forEach(f => {
            if (f.cases) {
                f.cases.forEach(c => {
                    if (c.status === 'Falhou') {
                        failedScenarios.push({ featureName: f.name, scenario: c });
                    }
                });
            }
        });

        if (failedScenarios.length === 0) {
            container.innerHTML = `
                <div style="display: flex; align-items: center; justify-content: center; min-height: 72px; color: var(--success); font-weight: 600; padding: 16px 20px; background: #ecfdf5; border-radius: 8px; border: 1px dashed #a7f3d0;">
                    ✅ Nenhum cenário com falha!
                </div>
            `;
            return;
        }

        container.innerHTML = failedScenarios.map(item => `
            <div style="padding: 12px 14px; background: #fff5f5; border: 1px solid #fecaca; border-left: 4px solid #f87171; border-radius: 8px; margin-bottom: 10px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; margin-bottom: 8px;">
                    <strong style="color: #991b1b; font-size: 13px; display: flex; align-items: center; gap: 7px; line-height: 1.3;">
                        <span style="display: flex; align-items: center; justify-content: center; background: #fee2e2; width: 26px; height: 26px; border-radius: 6px; font-size: 13px; flex-shrink: 0;">🧪</span>
                        ${escapeHTML(item.scenario.name || 'Sem nome')}
                    </strong>
                    <span style="font-size: 10px; background: #f87171; color: white; padding: 3px 8px; border-radius: 12px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; white-space: nowrap; flex-shrink: 0;">Falhou</span>
                </div>
                <div style="font-size: 12px; color: #7f1d1d; background: #fee2e2; padding: 5px 10px; border-radius: 6px; border: 1px dashed #fca5a5;">
                    <strong style="color: #991b1b;">Funcionalidade:</strong> ${escapeHTML(item.featureName || 'Não informada')}
                </div>
            </div>
        `).join('');
    }

window.renderOpenBugsList = function() {
        const container = document.getElementById('open-bugs-list-exec');
        if(!container) return;

        const openBugs = state.bugs.filter(b => b.status === 'Aberto' || b.status === 'Em Andamento');

        if (openBugs.length === 0) {
            container.innerHTML = `
                <div style="display: flex; align-items: center; justify-content: center; height: 100%; min-height: 100px; color: var(--success); font-weight: 600; padding: 20px; background: #ecfdf5; border-radius: 8px; border: 1px dashed #a7f3d0;">
                    🎉 Uhuuu! Nenhum bug aberto no momento. A qualidade está em dia!
                </div>
            `;
            return;
        }

        container.innerHTML = openBugs.map(b => {
            let assigneeDisplay = escapeHTML(b.assignee || '🚫 Ninguém atuando momento, risco de atraso!');
            let sevColor = '#64748b';
            if (b.severity === 'Crítica') sevColor = '#991b1b';
            else if (b.severity === 'Alta') sevColor = '#c2410c';
            else if (b.severity === 'Média') sevColor = '#b45309';

            return `
                <div style="padding: 14px 16px; background: #fffbeb; border: 1px solid #fde68a; border-left: 4px solid #f59e0b; border-radius: 8px; margin-bottom: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
                        <strong style="color: #92400e; font-size: 14px; display: flex; align-items: center; gap: 8px;">
                            <span style="display: flex; align-items: center; justify-content: center; background: #fef3c7; width: 28px; height: 28px; border-radius: 6px; font-size: 14px;">🐞</span> 
                            ${escapeHTML(b.desc || 'Sem descrição')}
                        </strong>
                        <span style="font-size: 10px; background: ${sevColor}; color: white; padding: 4px 8px; border-radius: 12px; font-weight: bold; text-transform: uppercase;">Severidade: ${escapeHTML(b.severity || 'Não def.')}</span>
                    </div>
                    <div style="font-size: 13px; color: #92400e; background: #fef3c7; padding: 6px 12px; border-radius: 6px; border: 1px dashed #fcd34d;">
                        <strong style="color: #92400e;">Responsável:</strong> ${assigneeDisplay}
                    </div>
                </div>
            `;
        }).join('');
    }

    
window.renderBlockedFeaturesList = function() {
        const container = document.getElementById('blocked-features-list');
        if(!container) return;

        const blocked = state.features.filter(f => f.status === 'Bloqueada');
        document.getElementById('kpi-telas-bloqueadas').innerText = blocked.length;

        if (blocked.length === 0) {
            container.innerHTML = `
                <div style="display: flex; align-items: center; justify-content: center; height: 100%; min-height: 100px; color: var(--success); font-weight: 600; padding: 20px; background: #ecfdf5; border-radius: 8px; border: 1px dashed #a7f3d0;">
                    ✅ Nenhuma tela com impedimento
                </div>
            `;
            return;
        }

        container.innerHTML = blocked.map(f => `
            <div style="padding: 14px 16px; background: #fff5f5; border: 1px solid #fecaca; border-left: 4px solid #ef4444; border-radius: 8px; margin-bottom: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
                    <strong style="color: #991b1b; font-size: 14px; display: flex; align-items: center; gap: 8px;">
                        <span style="display: flex; align-items: center; justify-content: center; background: #fee2e2; width: 28px; height: 28px; border-radius: 6px; font-size: 14px;">🖥️</span> 
                        ${escapeHTML(f.name || 'Sem nome')}
                    </strong>
                    <span style="font-size: 10px; background: #ef4444; color: white; padding: 4px 8px; border-radius: 12px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px;">Bloqueada</span>
                </div>
                <p style="font-size: 13px; color: #7f1d1d; background: #fee2e2; padding: 10px 12px; border-radius: 6px; display: flex; align-items: flex-start; gap: 8px; line-height: 1.4; border: 1px dashed #fca5a5;">
                    <span style="font-size: 14px; margin-top: 1px;">📌</span> 
                    <span><strong style="color: #991b1b;">Motivo do Impedimento:</strong><br>${escapeHTML(f.blockReason || 'Motivo não informado.')}</span>
                </div>
            </div>
        `).join('');
    }

    
window.renderAlignments = function() {
        const execContainer = document.getElementById('alignments-list-exec');
        if (execContainer) {
            if (!state.alignments || state.alignments.length === 0) {
                execContainer.innerHTML = `
                    <div style="display: flex; align-items: center; justify-content: center; height: 100%; min-height: 80px; color: var(--text-muted); font-weight: 500; padding: 20px; background: #f8fafc; border-radius: 8px; border: 1px dashed #cbd5e1;">
                        Nenhum alinhamento ou débito técnico registrado no momento.
                    </div>
                `;
            } else {
                execContainer.innerHTML = state.alignments.map(a => `
                    <div style="padding: 12px 15px; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; margin-bottom: 10px; border-left: 4px solid var(--primary-blue);">
                        <p style="font-size: 13px; color: #1e3a8a; line-height: 1.5; margin: 0;">${a.text ? escapeHTML(a.text) : '<em>Alinhamento em branco...</em>'}</p>
                    </div>
                `).join('');
            }
        }

        const opBody = document.getElementById('table-alignments-body');
        if (opBody && !isUserTypingIn(opBody)) {
            opBody.innerHTML = (state.alignments || []).map((a, index) => `
                <tr>
                    <td>
                        <input type="text" value="${escapeHTML(a.text)}" placeholder="Ex: Botão na tela home com distanciamento errado, aprovar com débito técnico..." onchange="updateAlignment(${index}, this.value)" style="background: #f8fafc;">
                    </td>
                    <td style="text-align: center;">
                        <button class="btn-outline" style="padding: 6px 10px; color: var(--danger); border-color: var(--danger);" onclick="removeAlignment(${index})">Remover</button>
                    </td>
                </tr>
            `).join('');
        }
    }

    
window.renderDailyReport = function() {
        const dateParts = state.currentDate.split('-');
        const formatData = `${dateParts[2]}/${dateParts[1]}`;
        
        const titleDisplay = document.getElementById('report-title-display');
        if (titleDisplay) {
            titleDisplay.innerText = `📝 REPORT DIÁRIO - ${formatData}`;
        }
        
        const textarea = document.getElementById('report-text');
        if(textarea && document.activeElement !== textarea) {
            textarea.value = state.reports[state.currentDate] || '';
        }

        const execDisplay = document.getElementById('report-text-exec');
        if (execDisplay) {
            if (state.reports[state.currentDate] && state.reports[state.currentDate].trim() !== '') {
                execDisplay.innerHTML = `<div style="padding: 15px; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; color: #1e3a8a; line-height: 1.6;">${escapeHTML(state.reports[state.currentDate])}</div>`;
            } else {
                execDisplay.innerHTML = `<div style="display: flex; align-items: center; justify-content: center; height: 100%; min-height: 80px; color: var(--text-muted); font-weight: 500; padding: 20px; background: #f8fafc; border-radius: 8px; border: 1px dashed #cbd5e1;">Nenhum report preenchido para este dia. Adicione-o na Área Operacional.</div>`;
            }
        }
    }

    
window.renderTables = function() {
        const headDaily = document.getElementById('table-features-daily-head');
        const bodyDaily = document.getElementById('table-features-daily-body');
        const sprintDays = parseInt(state.config.sprintDays) || 20;

        if(!isUserTypingIn(bodyDaily)) {
            const _tblStartDate = state.config && state.config.startDate;
            let headersDays = '';
            for(let i=1; i<=sprintDays; i++) {
                let thContent;
                if (_tblStartDate) {
                    const d = new Date(_tblStartDate + 'T00:00:00');
                    d.setDate(d.getDate() + i - 1);
                    const dateLbl = `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}`;
                    thContent = `<span style="display:block;font-size:11px;font-weight:800;color:#0f172a;line-height:1.1;">D${i}</span><span style="display:block;font-size:10px;font-weight:500;color:#64748b;line-height:1.1;">${dateLbl}</span>`;
                } else {
                    thContent = `D${i}`;
                }
                headersDays += `<th style="min-width: 65px; text-align: center; padding: 8px 4px;">${thContent}</th>`;
            }
            headDaily.innerHTML = `
                <tr>
                    <th class="sticky-col">Funcionalidade / Tela</th>
                    <th style="min-width: 130px; text-align: center;">Qtd. Testes (Total)</th>
                    <th style="min-width: 140px; text-align: center;">Total Executado</th>
                    ${headersDays}
                </tr>
            `;

            bodyDaily.innerHTML = state.features.map((f, index) => {
                let daysHtml = '';
                for(let i=1; i<=sprintDays; i++) {
                    let gCount = (f.gherkinExecs && f.gherkinExecs[`D${i}`]) || 0;
                    let totalVal = (f.execution && f.execution[`D${i}`] !== undefined && f.execution[`D${i}`] !== 0) ? f.execution[`D${i}`] : '';

                    let inputStyle = "width: 50px; text-align: center; padding: 6px; border-radius: 6px; font-weight: 600; outline: none; transition: all 0.2s;";
                    if (gCount > 0) {
                        inputStyle += " border: 1px solid #a7f3d0; background-color: #ecfdf5; color: #047857;";
                    } else {
                        inputStyle += " border: 1px solid #cbd5e1; background-color: #ffffff; color: var(--text-main);";
                    }

                    let titleExtra = gCount > 0 ? `title="Contém ${gCount} execução(ões) via Gherkin"` : '';

                    daysHtml += `<td style="text-align: center; vertical-align: middle;">
                        <input type="number" min="${gCount}" max="${f.tests}" value="${totalVal}" onchange="updateFeatureExecution(${index}, 'D${i}', this.value)" placeholder="" style="${inputStyle}" ${titleExtra}>
                    </td>`;
                }

                let colorExec = (f.exec === f.tests && f.tests > 0) ? 'var(--success)' : 'var(--text-main)';

                return `
                <tr>
                    <td class="sticky-col" style="font-weight: 600; color: #0f172a; display: flex; align-items: center; justify-content: space-between; gap: 8px;">
                        <span style="${f.status === 'Bloqueada' ? 'color: var(--danger); font-style: italic;' : ''}">${escapeHTML(f.name || 'Sem nome')}</span>
                        ${f.status === 'Bloqueada' ? '<span style="font-size: 9px; background: #fee2e2; color: #b91c1c; padding: 2px 6px; border-radius: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; border: 1px solid #fecaca; white-space: nowrap;">Bloqueada</span>' : ''}
                    </td>
                    <td style="color: var(--text-muted); font-weight: 600; text-align: center; font-size: 15px; background: #f8fafc;">${f.tests}</td>
                    <td style="font-weight: 700; text-align: center; color: ${colorExec}; font-size: 15px;">${f.exec}</td>
                    ${daysHtml}
                </tr>
                `;
            }).join('');
        }



        const tbodyBl = document.querySelector('#table-blockers tbody');
        if(!isUserTypingIn(tbodyBl)) {
            tbodyBl.innerHTML = state.blockers.map((b, index) => `
                <tr>
                    <td><input type="date" value="${b.date}" onchange="updateBlocker(${index}, 'date', this.value)"></td>
                    <td>
                        <input type="text" list="motivos-list" value="${escapeHTML(b.reason || '')}" placeholder="Selecione ou digite um motivo..." onchange="updateBlocker(${index}, 'reason', this.value)">
                    </td>
                    <td><input type="number" value="${b.hours}" onchange="updateBlocker(${index}, 'hours', this.value)"></td>
                    <td style="text-align: center;"><button class="btn-outline" style="padding: 6px 10px; color: var(--danger); border-color: var(--danger);" onclick="removeBlocker(${index})">Remover</button></td>
                </tr>
            `).join('');
        }

        const tbodyBugs = document.querySelector('#table-bugs tbody');
        if(!isUserTypingIn(tbodyBugs)) {
            const filters = window._bugFilters || { status: 'Todos', assignee: 'Todos', stack: 'Todos' };
            let sortedBugs = state.bugs.map((b, i) => ({ bug: b, originalIndex: i }));
            sortedBugs.sort((a, b) => {
                const aRes = a.bug.status === 'Resolvido' ? 1 : 0;
                const bRes = b.bug.status === 'Resolvido' ? 1 : 0;
                return aRes - bRes;
            });
            // Apply filters
            sortedBugs = sortedBugs.filter(item => {
                const b = item.bug;
                if (filters.status !== 'Todos' && b.status !== filters.status) return false;
                if (filters.stack !== 'Todos' && b.stack !== filters.stack) return false;
                if (filters.assignee === 'Não Atribuído') return !(b.assignee || '').trim();
                if (filters.assignee !== 'Todos' && b.assignee !== filters.assignee) return false;
                return true;
            });

            const stackBadgeColor = { Front: '#3b82f6', BFF: '#8b5cf6', Back: '#10b981' };
            const sevBadgeColor = { Baixa: '#10b981', Média: '#f59e0b', Alta: '#f97316', Crítica: '#ef4444' };

            tbodyBugs.innerHTML = sortedBugs.map(item => {
                const b = item.bug;
                const index = item.originalIndex;

                const rowStyle = b.status === 'Resolvido' ? 'opacity: 0.82; background-color: #f0fdf4;' : '';
                const stackColor = stackBadgeColor[b.stack] || '#64748b';
                const sevColor = sevBadgeColor[b.severity] || '#64748b';
                const statusColor = b.status === 'Resolvido' ? 'var(--success)' : b.status === 'Em Andamento' ? 'var(--warning)' : 'var(--danger)';

                const badge = (txt, color) =>
                    `<span style="display:inline-block;padding:2px 8px;border-radius:12px;font-size:11px;font-weight:700;background:${color}22;color:${color};border:1px solid ${color}44;white-space:nowrap;">${escapeHTML(txt)}</span>`;

                return `
                <tr style="${rowStyle}">
                    <td style="font-family: monospace; font-size: 12px; font-weight: 700; color: #475569;">${escapeHTML(b.id || '—')}</td>
                    <td style="max-width: 280px;">
                        <div style="font-weight: 600; color: #0f172a; margin-bottom: 3px; white-space: normal; line-height: 1.3;">${escapeHTML(b.desc || 'Sem descrição')}</div>
                        <div style="font-size: 11px; color: var(--text-muted);">${escapeHTML(b.feature || 'Funcionalidade não informada')}</div>
                    </td>
                    <td style="text-align:center;">${badge(b.stack || '—', stackColor)}</td>
                    <td style="text-align:center;">${badge(b.severity || '—', sevColor)}</td>
                    <td>
                        <select onchange="this.blur(); handleBugStatusChange(${index}, this.value, this)" style="color:${statusColor}; font-weight:700; border-color:${statusColor}44; background:${statusColor}11;">
                            <option value="Aberto" ${b.status==='Aberto'?'selected':''}>Aberto</option>
                            <option value="Em Andamento" ${b.status==='Em Andamento'?'selected':''}>Em Andamento</option>
                            <option value="Resolvido" ${b.status==='Resolvido'?'selected':''}>Resolvido</option>
                        </select>
                    </td>
                    <td style="text-align:center;">
                        <input type="number" min="0" value="${b.retests || 0}" onchange="updateBug(${index}, 'retests', this.value)" style="width:55px; text-align:center;">
                    </td>
                    <td style="text-align:center; white-space:nowrap;">
                        <button class="btn-outline" style="padding:5px 9px; font-size:13px;" onclick="openBugEditModal(${index})" title="Editar Bug">✏️</button>
                        <button class="btn-outline" style="padding:5px 9px; font-size:13px; color:var(--primary-blue); border-color:#cbd5e1;" onclick="duplicateBug(${index})" title="Duplicar Bug">📑</button>
                        <button class="btn-outline" style="padding:5px 9px; font-size:13px; color:var(--danger); border-color:var(--danger);" onclick="removeBug(${index})" title="Remover Bug">🗑️</button>
                    </td>
                </tr>
            `}).join('');
        }
    }

    
window.renderTestCasesAccordion = function() {
        const container = document.getElementById('test-cases-container');
        if(isUserTypingIn(container)) return; 
        
        const openFeatureIds = Array.from(container.querySelectorAll('details[open]')).map(d => d.dataset.featureId);

        let html = '';

        html += state.features.map((f, fIndex) => {
            const cases = f.cases || [];
            const isOpen = openFeatureIds.includes(String(f.id)) ? 'open' : '';
            
            const isBlocked = f.status === 'Bloqueada';
            const sumHeaderStyle = isBlocked ? "background: #fef2f2; color: #991b1b; border: 1px solid #fecaca;" : "";
            
            const currentFilter = f.activeFilter || 'Todos';
            
            return `
            <details class="styled-accordion" data-feature-id="${f.id}" ${isOpen} style="${isBlocked ? 'border-color: #fecaca;' : ''}">
                <summary style="${sumHeaderStyle}">
                    <span style="display: flex; align-items: center; gap: 8px;">
                        <span class="dnd-handle" draggable="true" onclick="event.preventDefault(); event.stopPropagation();" title="Arraste para reordenar a funcionalidade">⠿</span>
                        ▶ ${escapeHTML(f.name || 'Funcionalidade sem nome')}
                        ${isBlocked ? '🛑' : ''}
                    </span>
                    <span class="badge" style="${isBlocked ? 'background: #dc2626;' : ''}">${f.tests} Testes no Total</span>
                </summary>
                <div class="accordion-content">
                    
                    <div style="background: #f1f5f9; padding: 20px; border-radius: 8px; margin-bottom: 25px; border: 1px solid #e2e8f0; display: flex; flex-direction: column; gap: 14px;">
                        <div style="display: flex; gap: 20px; align-items: flex-end; flex-wrap: wrap;">
                            <div style="flex-grow: 1; min-width: 250px;">
                                <label style="font-size: 11px; color: var(--text-muted); font-weight: 700; display: block; margin-bottom: 5px; text-transform: uppercase;">Nome da Funcionalidade</label>
                                <input type="text" value="${escapeHTML(f.name)}" placeholder="Ex: Tela de Login" onchange="updateFeature(${fIndex}, 'name', this.value)" style="font-weight: 600; font-size: 15px; border-color: #cbd5e1;">
                            </div>
                            <div style="width: 140px;">
                                <label style="font-size: 11px; color: var(--text-muted); font-weight: 700; display: block; margin-bottom: 5px; text-transform: uppercase;">Status Atual</label>
                                <select onchange="this.blur(); updateFeature(${fIndex}, 'status', this.value)" style="font-weight: 600; font-size: 14px; border-color: #cbd5e1; height: 42px;">
                                    <option value="Ativa" ${f.status === 'Ativa' ? 'selected' : ''}>🟢 Ativa</option>
                                    <option value="Bloqueada" ${f.status === 'Bloqueada' ? 'selected' : ''}>🔴 Bloqueada</option>
                                </select>
                            </div>
                            <div style="flex-grow: 1; min-width: 200px;">
                                <label style="font-size: 11px; color: var(--text-muted); font-weight: 700; display: block; margin-bottom: 5px; text-transform: uppercase;">Motivo do Impedimento</label>
                                <input type="text" value="${escapeHTML(f.blockReason || '')}" placeholder="${f.status === 'Bloqueada' ? 'Descreva o motivo da tela estar bloqueada...' : 'Não aplicável (Tela ativa)'}" onchange="updateFeature(${fIndex}, 'blockReason', this.value)" ${f.status !== 'Bloqueada' ? 'disabled' : ''} style="${f.status !== 'Bloqueada' ? 'opacity: 0.5; background: #f8fafc;' : ''} font-weight: 600; font-size: 14px; border-color: #cbd5e1;">
                            </div>
                            <div style="width: 150px;">
                                <label style="font-size: 11px; color: var(--text-muted); font-weight: 700; display: block; margin-bottom: 5px; text-transform: uppercase;">Carga Massiva (Qtd)</label>
                                <input type="number" min="0" value="${f.manualTests || 0}" placeholder="0" onchange="updateFeature(${fIndex}, 'manualTests', this.value)" style="font-weight: 600; font-size: 15px; border-color: #cbd5e1;">
                            </div>
                            <button class="btn-outline" style="height: 42px; color: var(--danger); border-color: var(--danger);" onclick="removeFeature(${fIndex})">🗑 Excluir Funcionalidade</button>
                        </div>
                        <!-- Imagem de Referência (Mockup) -->
                        <div style="display: flex; align-items: center; gap: 14px; flex-wrap: wrap; border-top: 1px solid #e2e8f0; padding-top: 14px;">
                            <label style="font-size: 11px; color: var(--text-muted); font-weight: 700; text-transform: uppercase; flex-shrink: 0; white-space: nowrap;">📎 Imagem de Referência</label>
                            ${f.mockupImage ? `
                            <img src="${f.mockupImage}" onclick="previewMockup(${fIndex})" style="height: 60px; width: auto; max-width: 120px; border-radius: 6px; border: 1px solid #cbd5e1; object-fit: contain; cursor: zoom-in; background: #fff;" title="Clique para visualizar em tela cheia" alt="Mockup">
                            <span style="font-size: 12px; color: var(--text-muted);">Clique na imagem para ampliar</span>
                            <button class="btn-outline" onclick="removeMockupImage(${fIndex})" style="padding: 5px 12px; height: 32px; font-size: 12px; color: var(--danger); border-color: #fecaca; background: #fef2f2;">🗑️ Remover</button>
                            <button class="btn-outline" onclick="document.getElementById('mockup-${fIndex}').click()" style="padding: 5px 12px; height: 32px; font-size: 12px; color: var(--primary-blue); border-color: #bfdbfe; background: #eff6ff;">🔄 Substituir</button>
                            ` : `
                            <button class="btn-outline" onclick="document.getElementById('mockup-${fIndex}').click()" style="padding: 5px 14px; height: 34px; font-size: 12px; color: var(--primary-blue); border-color: #bfdbfe; background: #eff6ff; font-weight: 600;">📸 Anexar Mockup</button>
                            <span style="font-size: 12px; color: var(--text-muted);">PNG, JPG, WebP, GIF — máx. 5MB</span>
                            `}
                            <input type="file" id="mockup-${fIndex}" accept="image/*" style="display: none;" onchange="uploadMockupImage(${fIndex}, this)">
                        </div>
                    </div>

                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; border-bottom: 1px solid #e2e8f0; padding-bottom: 10px; flex-wrap: wrap; gap: 10px;">
                        <h4 style="font-size: 14px; color: #0f172a; margin: 0;">Cenários Gherkin Mapeados (${cases.length})</h4>
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <label style="font-size: 12px; color: var(--text-muted); font-weight: 600; text-transform: uppercase;">Filtrar Status:</label>
                            <select onchange="updateFeatureFilter(${fIndex}, this.value)" style="width: auto; padding: 6px 12px; font-size: 13px; border-radius: 6px; border: 1px solid #cbd5e1; font-weight: 600; color: var(--text-main); height: 32px; cursor: pointer; outline: none;">
                                <option value="Todos" ${currentFilter === 'Todos' ? 'selected' : ''}>👀 Mostrar Todos</option>
                                <option value="Pendente" ${currentFilter === 'Pendente' ? 'selected' : ''}>⏳ Pendentes</option>
                                <option value="Concluído" ${currentFilter === 'Concluído' ? 'selected' : ''}>✅ Concluídos</option>
                                <option value="Falhou" ${currentFilter === 'Falhou' ? 'selected' : ''}>❌ Falharam</option>
                                <option value="Bloqueado" ${currentFilter === 'Bloqueado' ? 'selected' : ''}>🚧 Bloqueados</option>
                            </select>
                        </div>
                    </div>

                    <!-- Barra de Ações em Massa -->
                    <div id="bulk-bar-${fIndex}" style="display:flex; align-items:center; gap:12px; flex-wrap:wrap; padding:10px 14px; background:#f0f9ff; border:1px solid #bae6fd; border-radius:8px; margin-bottom:14px;">
                        <label style="display:flex; align-items:center; gap:7px; font-weight:700; font-size:13px; cursor:pointer; color:var(--primary-blue); flex-shrink:0; user-select:none;">
                            <input type="checkbox" id="bulk-select-all-${fIndex}"
                                onchange="selectAllCasesInFeature(${fIndex}, this.checked)"
                                style="width:16px; height:16px; cursor:pointer; accent-color:var(--primary-blue);">
                            Selecionar Todos
                        </label>
                        <span class="bulk-count" style="font-size:12px; color:#64748b; font-weight:600;"></span>
                        <div class="bulk-actions" style="display:none; align-items:center; gap:8px; flex-wrap:wrap;">
                            <select id="bulk-status-${fIndex}" style="font-size:13px; font-weight:600; padding:5px 10px; border-radius:6px; border:1px solid #cbd5e1; height:34px; cursor:pointer;">
                                <option value="Pendente">⏳ Pendente</option>
                                <option value="Concluído">✅ Concluído</option>
                                <option value="Falhou">❌ Falhou</option>
                                <option value="Bloqueado">🚧 Bloqueado</option>
                            </select>
                            <input type="date" id="bulk-date-${fIndex}"
                                ${state.config.startDate ? `min="${state.config.startDate}"` : ''}
                                ${state.config.endDate ? `max="${state.config.endDate}"` : ''}
                                style="font-size:13px; padding:5px 8px; border-radius:6px; border:1px solid #cbd5e1; height:34px;"
                                title="Data de execução para todos os cenários selecionados (opcional — usa data atual como fallback)">
                            <button onclick="bulkApplyStatus(${fIndex})" class="btn-primary" style="padding:5px 14px; height:34px; font-size:13px;">✅ Aplicar em Massa</button>
                            <button onclick="clearBulkSelection(${fIndex})" class="btn-outline" style="padding:5px 12px; height:34px; font-size:13px; color:var(--text-muted);">✕ Limpar</button>
                        </div>
                    </div>

                    ${cases.map((tc, tcIndex) => {
                        let borderColor = 'var(--primary-blue)';
                        let bgColor = '#ffffff';
                        let opacity = '1';
                        let statusVal = tc.status || 'Pendente';

                        if(statusVal === 'Concluído') { borderColor = 'var(--success)'; bgColor = '#f8fafc'; opacity = '0.85'; }
                        else if(statusVal === 'Falhou') { borderColor = 'var(--danger)'; }
                        else if(statusVal === 'Bloqueado') { borderColor = 'var(--warning)'; }

                        let displayStyle = (currentFilter !== 'Todos' && statusVal !== currentFilter) ? 'display: none;' : 'display: block;';

                        // --- Date Picker: conversão dayKey ↔ data real ---
                        const _startCfg      = state.config.startDate || '';
                        const _sprintDayCnt  = parseInt(state.config.sprintDays) || 20;
                        const _execDateVal   = (tc.executionDay && _startCfg) ? dayKeyToDate(tc.executionDay) : '';
                        // Prioriza endDate configurado; fallback: startDate + sprintDays - 1
                        const _execEndDate   = state.config.endDate || (_startCfg ? (() => {
                            const d = new Date(_startCfg + 'T00:00:00');
                            d.setDate(d.getDate() + _sprintDayCnt - 1);
                            return d.toISOString().split('T')[0];
                        })() : '');
                        const _execHasError  = !!(tc.status && tc.status !== 'Pendente' && !tc.executionDay);
                        const _execBorder    = _execHasError
                            ? 'border: 2px solid var(--danger); box-shadow: 0 0 0 3px rgba(239,68,68,0.12);'
                            : '';
                        const _execTitle     = !_startCfg
                            ? 'Configure a Data de Início (aba Configurações) para ativar o cálculo automático do dia da sprint.'
                            : _execHasError
                                ? 'Selecione a data de execução para confirmar o novo status.'
                                : `Data de execução — calculada a partir de ${_startCfg}`;
                        const _execBadge     = tc.executionDay
                            ? `<span style="font-size:11px;font-weight:700;color:var(--primary-blue);background:#eff6ff;border:1px solid #bfdbfe;border-radius:4px;padding:2px 6px;white-space:nowrap;" title="Dia calculado automaticamente">${escapeHTML(tc.executionDay)}</span>`
                            : (_startCfg ? '' : '<span style="font-size:11px;color:var(--warning);white-space:nowrap;" title="Data de Início não configurada">⚠️</span>');

                        const _isSelected = !!(window._selectedCases && window._selectedCases[`${fIndex}:${tcIndex}`]);
                        const _selStyle = _isSelected ? 'outline: 2px solid var(--primary-blue); box-shadow: 0 0 0 4px rgba(37,99,235,0.1);' : '';

                        return `
                        <div id="tc-card-${fIndex}-${tcIndex}" class="test-case-card" style="border-left-color: ${borderColor}; background-color: ${bgColor}; opacity: ${opacity}; ${displayStyle} ${_selStyle}">
                            <div class="flex-between mb-2" style="flex-wrap: wrap; gap: 10px;">
                                <div style="display: flex; gap: 10px; flex-grow: 1; flex-wrap: wrap; align-items: flex-start;">
                                    <label style="display:flex; align-items:center; flex-shrink:0; cursor:pointer; margin-top:6px;" onclick="event.stopPropagation()">
                                        <input type="checkbox"
                                            data-bulk-findex="${fIndex}"
                                            data-bulk-tcindex="${tcIndex}"
                                            ${_isSelected ? 'checked' : ''}
                                            onchange="toggleCaseSelection(${fIndex}, ${tcIndex}, this.checked)"
                                            style="width:16px; height:16px; cursor:pointer; accent-color:var(--primary-blue);">
                                    </label>
                                    <input type="text" id="tc-name-${tc.id}" value="${escapeHTML(tc.name)}" placeholder="Título do Caso de Teste" onchange="this.blur(); updateTestCase(${fIndex}, ${tcIndex}, 'name', this.value)" style="font-weight: 600; flex-grow: 1; min-width: 200px;">
                                    
                                    <select onchange="this.blur(); updateTestCase(${fIndex}, ${tcIndex}, 'complexity', this.value)" style="width: 130px; font-weight: 600; color: var(--text-muted);">
                                        <option value="Baixa" ${tc.complexity === 'Baixa' ? 'selected' : ''}>🟢 Baixa</option>
                                        <option value="Moderada" ${tc.complexity === 'Moderada' ? 'selected' : ''}>🟡 Moderada</option>
                                        <option value="Alta" ${tc.complexity === 'Alta' ? 'selected' : ''}>🔴 Alta</option>
                                    </select>

                                    <select data-role="status-select" onchange="handleTestCaseStatusChange(${fIndex}, ${tcIndex}, this.value, this)" style="width: 130px; font-weight: 600; color: ${tc.status === 'Concluído' ? 'var(--success)' : tc.status === 'Falhou' ? 'var(--danger)' : tc.status === 'Bloqueado' ? 'var(--warning)' : 'var(--text-muted)'};">
                                        <option value="Pendente" ${tc.status === 'Pendente' || !tc.status ? 'selected' : ''}>⏳ Pendente</option>
                                        <option value="Concluído" ${tc.status === 'Concluído' ? 'selected' : ''}>✅ Concluído</option>
                                        <option value="Falhou" ${tc.status === 'Falhou' ? 'selected' : ''}>❌ Falhou</option>
                                        <option value="Bloqueado" ${tc.status === 'Bloqueado' ? 'selected' : ''}>🚧 Bloqueado</option>
                                    </select>

                                    <div style="display:flex;align-items:center;gap:5px;flex-wrap:nowrap;">
                                        <input type="date"
                                            data-role="execution-day"
                                            value="${_execDateVal}"
                                            ${_startCfg ? `min="${_startCfg}" max="${_execEndDate}"` : ''}
                                            onchange="this.blur(); handleExecutionDateChange(${fIndex}, ${tcIndex}, this.value, this)"
                                            style="width:148px; font-weight:600; color:var(--text-muted); font-size:13px; padding:6px 8px; ${_execBorder}"
                                            title="${_execTitle}"
                                        >
                                        ${_execBadge}
                                    </div>
                                </div>
                                <div style="display: flex; gap: 8px;">
                                    <button class="btn-outline" style="padding: 6px 12px; color: var(--primary-blue); border-color: #cbd5e1; font-size: 13px;" onclick="duplicateTestCase(${fIndex}, ${tcIndex})" title="Duplicar Caso de Teste">🔁 Clonar</button>
                                    <button class="btn-outline" style="padding: 6px 12px; color: var(--danger); border-color: transparent; background: #fef2f2; font-size: 13px;" onclick="removeTestCase(${fIndex}, ${tcIndex})" title="Excluir">🗑️</button>
                                </div>
                            </div>
                            <div style="display: flex; gap: 12px; align-items: flex-start;">
                                <textarea placeholder="Escreva o cenário em Gherkin..." onchange="updateTestCase(${fIndex}, ${tcIndex}, 'gherkin', this.value)" rows="5" style="font-family: monospace; font-size: 13px; resize: vertical; flex: 1 1 0; min-width: 0; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px; background-color: #fafafa; margin-bottom: 0;">${escapeHTML(tc.gherkin)}</textarea>
                                ${f.mockupImage ? `
                                <div style="flex: 0 0 auto; width: clamp(120px, 35%, 260px);">
                                    <div style="font-size: 10px; color: var(--text-muted); font-weight: 700; text-transform: uppercase; margin-bottom: 5px; letter-spacing: 0.5px;">📎 Referência Visual</div>
                                    <img src="${f.mockupImage}" onclick="previewMockup(${fIndex})" style="width: 100%; border-radius: 6px; border: 1px solid #e2e8f0; object-fit: contain; max-height: 160px; background: #fff; cursor: zoom-in;" title="Imagem de referência — clique para ampliar" alt="Mockup">
                                </div>
                                ` : ''}
                            </div>
                        </div>
                    `;
                    }).join('')}
                    <button class="btn-outline" onclick="addTestCase(${fIndex})" style="margin-top: 10px; width: 100%; border-style: dashed; padding: 12px; font-weight: 600; color: var(--primary-blue); border-color: #93c5fd;">+ Adicionar Novo Caso de Teste</button>
                </div>
            </details>`;
        }).join('');

        container.innerHTML = html;
        initFeatureDragDrop();
    }

    // ─── Drag & Drop — Funcionalidades ────────────────────────────────────────
window.initFeatureDragDrop = function() {
        const container = document.getElementById('test-cases-container');
        if (!container || container._dndBound) return;
        container._dndBound = true;

        let _dragSrcIndex = null;

        container.addEventListener('dragstart', (e) => {
            const handle = e.target.closest('.dnd-handle');
            if (!handle) { e.preventDefault(); return; }
            const details = handle.closest('details[data-feature-id]');
            if (!details) { e.preventDefault(); return; }

            const allDetails = [...container.querySelectorAll(':scope > details[data-feature-id]')];
            _dragSrcIndex = allDetails.indexOf(details);
            details.classList.add('dnd-dragging');
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', String(_dragSrcIndex));
        });

        container.addEventListener('dragover', (e) => {
            e.preventDefault();
            const details = e.target.closest('details[data-feature-id]');
            if (!details) return;
            e.dataTransfer.dropEffect = 'move';
            container.querySelectorAll('details[data-feature-id]').forEach(d => d.classList.remove('dnd-over'));
            details.classList.add('dnd-over');
        });

        container.addEventListener('dragleave', (e) => {
            if (!container.contains(e.relatedTarget)) {
                container.querySelectorAll('details[data-feature-id]').forEach(d => d.classList.remove('dnd-over'));
            }
        });

        container.addEventListener('dragend', () => {
            container.querySelectorAll('details[data-feature-id]').forEach(d => d.classList.remove('dnd-dragging', 'dnd-over'));
            _dragSrcIndex = null;
        });

        container.addEventListener('drop', (e) => {
            e.preventDefault();
            const details = e.target.closest('details[data-feature-id]');
            if (!details || _dragSrcIndex === null) return;

            const allDetails = [...container.querySelectorAll(':scope > details[data-feature-id]')];
            const dropIndex = allDetails.indexOf(details);
            if (dropIndex === -1 || _dragSrcIndex === dropIndex) { _dragSrcIndex = null; return; }

            const moved = state.features.splice(_dragSrcIndex, 1)[0];
            state.features.splice(dropIndex, 0, moved);
            _dragSrcIndex = null;
            saveState();
        });
    }

    // --- MTTR ---

window.renderMTTRKPI = function() {
        const kpiEl = document.getElementById('kpi-mttr');
        const kpiSubEl = document.getElementById('kpi-mttr-sub');
        if (!kpiEl) return;

        const resolvedBugs = (state.bugs || []).filter(b =>
            b.status === 'Resolvido' && b.openedAt && b.resolvedAt
        );
        const days = resolvedBugs.map(b => calcMTTR(b)).filter(d => d !== null);

        if (days.length === 0) {
            kpiEl.textContent = '—';
            if (kpiSubEl) kpiSubEl.textContent = 'Nenhum bug resolvido com datas';
            return;
        }

        const avg = (days.reduce((a, b) => a + b, 0) / days.length).toFixed(1);
        kpiEl.textContent = avg + 'd';
        if (kpiSubEl) kpiSubEl.textContent = `Baseado em ${days.length} bug(s) resolvido(s)`;
    }

window.renderMTTRChart = function() {
        const stacks = ['Front', 'BFF', 'Back'];
        const severities = ['Baixa', 'Média', 'Alta', 'Crítica'];
        const sevColors = { 'Baixa': '#10b981', 'Média': '#f59e0b', 'Alta': '#f97316', 'Crítica': '#ef4444' };

        const resolvedBugs = (state.bugs || []).filter(b =>
            b.status === 'Resolvido' && b.openedAt && b.resolvedAt
        );

        const datasets = severities.map(sev => ({
            label: sev,
            backgroundColor: sevColors[sev],
            borderRadius: 4,
            data: stacks.map(stack => {
                const group = resolvedBugs.filter(b => b.stack === stack && b.severity === sev);
                if (group.length === 0) return null;
                const days = group.map(b => calcMTTR(b)).filter(d => d !== null);
                if (days.length === 0) return null;
                return Math.round((days.reduce((a, b) => a + b, 0) / days.length) * 10) / 10;
            })
        }));

        const hasData = resolvedBugs.length > 0;

        createChart('chart-mttr', 'bar', {
            labels: stacks,
            datasets: hasData ? datasets : [{ label: 'Sem dados', data: [0, 0, 0], backgroundColor: '#e2e8f0', borderRadius: 4 }]
        }, {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: { stacked: false, grid: { display: false } },
                y: {
                    beginAtZero: true,
                    title: { display: true, text: 'Dias (média)', font: { size: 12 }, color: '#64748b' },
                    ticks: { stepSize: 1 }
                }
            },
            plugins: {
                legend: { position: 'top' },
                datalabels: {
                    color: '#ffffff',
                    font: { weight: 'bold', size: 11 },
                    formatter: function(value) { return value !== null && value > 0 ? value + 'd' : ''; }
                }
            }
        });
    }

    // --- SOLUÇÃO BLINDADA: RENDERIZAÇÃO DE GRÁFICOS APENAS SE VISÍVEIS ---

window.createChart = function(canvasId, type, data, options) {
        try {
            // Usa a forma nativa do Chart.js para verificar e limpar o canvas existente
            let existingChart = Chart.getChart(canvasId);
            if (existingChart) {
                existingChart.destroy();
            }
            
            const canvas = document.getElementById(canvasId);
            if (!canvas) return;
            
            const ctx = canvas.getContext('2d');
            new Chart(ctx, { type, data, options });
        } catch(e) {
            console.error(`Falha ao renderizar o gráfico ${canvasId}:`, e);
        }
    }

    
window.renderCharts = function() {
        try {
            Chart.defaults.font.family = "'Inter', system-ui, -apple-system, sans-serif";
            Chart.defaults.color = '#64748b';
            
            const sprintDays = parseInt(state.config.sprintDays) || 20;
            
            const validFeatures = (state.features || []).filter(f => f !== null && f !== undefined);
            if (validFeatures.length === 0) return;

            const totalTests = validFeatures.reduce((acc, f) => acc + (parseInt(f.tests) || 0), 0);
            const meta = totalTests > 0 ? totalTests / sprintDays : 0;

            const globalExecution = {};
            let maxDay = 0;
            validFeatures.forEach(f => {
                if(f.execution) {
                    Object.keys(f.execution).forEach(k => {
                        let val = parseInt(f.execution[k]);
                        if(!isNaN(val)) {
                            let dNum = parseInt(k.replace('D', ''));
                            if(dNum > maxDay) maxDay = dNum;
                            globalExecution[k] = (globalExecution[k] || 0) + val;
                        }
                    });
                }
            });

            // ── Labels: "Início" + D1..D20 (com datas reais se startDate configurado) ──
            const startDateStr = state.config && state.config.startDate;
            let dayLabels;
            if (startDateStr) {
                const startDate = new Date(startDateStr + 'T00:00:00');
                dayLabels = Array.from({length: sprintDays}, (_, i) => {
                    const d = new Date(startDate);
                    d.setDate(d.getDate() + i);
                    return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}`;
                });
            } else {
                dayLabels = Array.from({length: sprintDays}, (_, i) => `D${i+1}`);
            }
            // Ponto 0 = "Início" (antes de qualquer execução), D1..D20 = fim de cada dia
            const labelsBD = ['Início', ...dayLabels];

            // ── Ideal: sprintDays+1 pontos (Início=totalTests, D1=totalTests-meta, ...) ──
            const idealData = Array.from({length: sprintDays + 1}, (_, i) =>
                Math.max(0, totalTests - (meta * i))
            );

            // ── Real: começa em totalTests e acumula as execuções dia a dia ──
            let realData = [totalTests]; // ponto 0 = Início (nenhuma execução ainda)
            let currentTotal = totalTests;
            for (let i = 1; i <= sprintDays; i++) {
                if (i <= maxDay || (globalExecution[`D${i}`] !== undefined)) {
                    currentTotal -= (globalExecution[`D${i}`] || 0);
                    realData.push(currentTotal);
                } else {
                    realData.push(null);
                }
            }

            // ── Dias com execução zero dentro do range já decorrido ──────────
            // zeroExecFlags[i] = true quando o dia i já aconteceu mas exec foi 0
            const zeroExecFlags = [false]; // índice 0 = "Início", nunca marcado
            for (let i = 1; i <= sprintDays; i++) {
                const inRange = i <= maxDay;
                const execVal = globalExecution[`D${i}`] || 0;
                zeroExecFlags.push(inRange && execVal === 0);
            }

            // Cores e tamanhos dos pontos da linha Real
            const ptColor  = zeroExecFlags.map((z, idx) =>
                (z ? '#ef4444' : (realData[idx] !== null ? '#2563eb' : 'transparent'))
            );
            const ptRadius = zeroExecFlags.map((z, idx) =>
                (idx === 0 ? 3 : z ? 7 : (realData[idx] !== null ? 4 : 0))
            );
            const ptBorderW = zeroExecFlags.map(z => z ? 2 : 1);

            createChart('chart-burndown', 'line', {
                labels: labelsBD,
                datasets: [
                    {
                        label: 'Ideal',
                        data: idealData,
                        borderColor: '#ef4444',
                        borderDash: [5, 5],
                        tension: 0.1,
                        pointRadius: 0,
                        datalabels: { display: false }
                    },
                    {
                        label: 'Real',
                        data: realData,
                        borderColor: '#2563eb',
                        backgroundColor: '#2563eb',
                        tension: 0.1,
                        pointBackgroundColor: ptColor,
                        pointBorderColor: ptColor,
                        pointRadius: ptRadius,
                        pointHoverRadius: ptRadius.map(r => r + 2),
                        pointBorderWidth: ptBorderW,
                        datalabels: { align: 'top', color: '#2563eb', font: { weight: 'bold', size: 10 } }
                    }
                ]
            }, {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        ticks: {
                            color: (ctx) => zeroExecFlags[ctx.index] ? '#ef4444' : '#94a3b8',
                            font:  (ctx) => ({ weight: zeroExecFlags[ctx.index] ? '700' : '400', size: 11 })
                        }
                    },
                    y: { beginAtZero: true }
                }
            });

            const validBlockers = (state.blockers || []).filter(b => b !== null && b !== undefined);
            const blockersGrouped = validBlockers.reduce((acc, b) => { 
                const h = parseInt(b.hours) || 0; 
                const r = b.reason || 'Outros';
                acc[r] = (acc[r] || 0) + h; 
                return acc; 
            }, {});
            
            const blockersTodayGrouped = validBlockers.filter(b => b.date === state.currentDate).reduce((acc, b) => { 
                const h = parseInt(b.hours) || 0;
                const r = b.reason || 'Outros';
                acc[r] = (acc[r] || 0) + h; 
                return acc; 
            }, {});
                
            const totalHorasGeral = Object.values(blockersGrouped).reduce((a, b) => a + b, 0);
            const totalHorasHoje = Object.values(blockersTodayGrouped).reduce((a, b) => a + b, 0);
            
            const validBugs = (state.bugs || []).filter(b => b !== null && b !== undefined);
            const bugsGrouped = validBugs.reduce((acc, b) => { 
                const st = b.stack || 'Não Informado';
                acc[st] = (acc[st] || 0) + 1; 
                return acc; 
            }, {});

            const stackLabels = Object.keys(bugsGrouped).length > 0 ? Object.keys(bugsGrouped) : ['Nenhum'];
            const stackData = Object.values(bugsGrouped).length > 0 ? Object.values(bugsGrouped) : [0];

            let uniqueStacks = [...new Set(validBugs.map(b => b.stack || 'Não Informado'))];
            if (uniqueStacks.length === 0) uniqueStacks = ['Nenhum']; 

            const abertoData = uniqueStacks.map(stack => validBugs.filter(b => (b.stack || 'Não Informado') === stack && b.status === 'Aberto').length);
            const andamentoData = uniqueStacks.map(stack => validBugs.filter(b => (b.stack || 'Não Informado') === stack && b.status === 'Em Andamento').length);
            const resolvidoData = uniqueStacks.map(stack => validBugs.filter(b => (b.stack || 'Não Informado') === stack && b.status === 'Resolvido').length);

            let uniqueFeatures = [...new Set(validBugs.map(b => b.feature || 'Não informada'))];
            if (uniqueFeatures.length === 0) uniqueFeatures = ['Nenhuma'];

            const featFrontData = uniqueFeatures.map(feat => validBugs.filter(b => (b.feature || 'Não informada') === feat && b.stack === 'Front').length);
            const featBffData = uniqueFeatures.map(feat => validBugs.filter(b => (b.feature || 'Não informada') === feat && b.stack === 'BFF').length);
            const featBackData = uniqueFeatures.map(feat => validBugs.filter(b => (b.feature || 'Não informada') === feat && b.stack === 'Back').length);

            const baseColors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#f43f5e', '#6366f1', '#eab308'];
            const getColors = (len) => Array.from({length: len}, (_, i) => baseColors[i % baseColors.length]);

            const btLabels = Object.keys(blockersTodayGrouped).length > 0 ? Object.keys(blockersTodayGrouped) : ['Nenhum'];
            const btData = Object.values(blockersTodayGrouped).length > 0 ? Object.values(blockersTodayGrouped) : [0];
            const btColors = Object.keys(blockersTodayGrouped).length > 0 ? getColors(Object.keys(blockersTodayGrouped).length) : ['#e2e8f0'];

            createChart('chart-blockers-motivo-top', 'doughnut', {
                labels: btLabels, datasets: [{ data: btData, backgroundColor: btColors, borderWidth: 0 }]
            }, { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: {boxWidth: 12, font: {family: "'Inter', sans-serif"}} }, title: { display: true, text: `Total de Horas Bloqueio (Hoje): ${totalHorasHoje}h`, position: 'bottom', font: { size: 13, weight: 'bold', family: "'Inter', sans-serif" }, color: '#64748b', padding: { top: 15 } } } });

            const bgLabels = Object.keys(blockersGrouped).length > 0 ? Object.keys(blockersGrouped) : ['Nenhum'];
            const bgData = Object.values(blockersGrouped).length > 0 ? Object.values(blockersGrouped) : [0];
            const bgColors = Object.keys(blockersGrouped).length > 0 ? getColors(Object.keys(blockersGrouped).length) : ['#e2e8f0'];

            createChart('chart-blockers', 'doughnut', {
                labels: bgLabels, datasets: [{ data: bgData, backgroundColor: bgColors, borderWidth: 0 }]
            }, { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: {boxWidth: 12} }, title: { display: true, text: `Total de Horas Bloqueio do Projeto: ${totalHorasGeral}h`, position: 'bottom', font: { size: 13, weight: 'bold' }, color: '#64748b', padding: { top: 15 } } } });

            createChart('chart-bugs-stack', 'pie', {
                labels: stackLabels, datasets: [{ data: stackData, backgroundColor: ['#3b82f6', '#10b981', '#0f172a', '#f59e0b'], borderWidth: 0 }]
            }, { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: {boxWidth: 12} } } });

            createChart('chart-bugs-bar', 'bar', {
                labels: uniqueStacks, datasets: [ { label: 'Aberto', data: abertoData, backgroundColor: '#ef4444', borderRadius: 4 }, { label: 'Em Andamento', data: andamentoData, backgroundColor: '#f59e0b', borderRadius: 4 }, { label: 'Resolvido', data: resolvidoData, backgroundColor: '#10b981', borderRadius: 4 } ]
            }, { responsive: true, maintainAspectRatio: false, scales: { x: { stacked: true }, y: { stacked: true, beginAtZero: true, ticks: { stepSize: 1 } } }, plugins: { legend: { position: 'top' }, datalabels: { color: '#ffffff', font: { weight: 'bold', size: 11 }, formatter: function(value) { return value > 0 ? value : ''; } } } });

            createChart('chart-bugs-feature', 'bar', {
                labels: uniqueFeatures, datasets: [ { label: 'Front', data: featFrontData, backgroundColor: '#3b82f6', borderRadius: 4 }, { label: 'BFF', data: featBffData, backgroundColor: '#10b981', borderRadius: 4 }, { label: 'Back', data: featBackData, backgroundColor: '#0f172a', borderRadius: 4 } ]
            }, { responsive: true, maintainAspectRatio: false, scales: { x: { stacked: true }, y: { stacked: true, beginAtZero: true, ticks: { stepSize: 1 } } }, plugins: { legend: { position: 'top' }, datalabels: { color: '#ffffff', font: { weight: 'bold', size: 11 }, formatter: function(value) { return value > 0 ? value : ''; } } } });

            let featureNames = validFeatures.map(f => f.name || 'Sem Nome');
            let featureExecData = validFeatures.map(f => parseInt(f.exec) || 0);
            let featureRestData = validFeatures.map(f => Math.max(0, (parseInt(f.tests) || 0) - (parseInt(f.exec) || 0)));
            
            if(featureNames.length === 0) { featureNames = ['Nenhuma']; featureExecData = [0]; featureRestData = [0]; }

            const containerProgresso = document.getElementById('container-feature-progress');
            const alturaNecessaria = Math.max(250, validFeatures.length * 45); 
            if (containerProgresso) {
                containerProgresso.style.height = alturaNecessaria + 'px';
            }

            createChart('chart-feature-progress', 'bar', {
                labels: featureNames, datasets: [ { label: 'Executados', data: featureExecData, backgroundColor: '#10b981', borderRadius: 4 }, { label: 'Restantes', data: featureRestData, backgroundColor: '#e2e8f0', borderRadius: 4 } ]
            }, { indexAxis: 'y', responsive: true, maintainAspectRatio: false, scales: { x: { stacked: true }, y: { stacked: true } }, plugins: { legend: { position: 'top' }, datalabels: { color: (context) => context.datasetIndex === 1 ? '#64748b' : '#ffffff', font: { weight: 'bold', size: 11 }, formatter: function(value) { return value > 0 ? value : ''; } } } });

            renderMTTRChart();

        } catch (e) {
            console.error("Erro interno ao construir gráficos: ", e);
        }
    }

    
window.varColor = function(name) { return getComputedStyle(document.documentElement).getPropertyValue(name).trim(); }

    
window.showExecutionDayHint = function(card, message) {
        if (!card) return;
        let hint = card.querySelector('[data-role="execution-day-hint"]');
        if (!hint) {
            hint = document.createElement('div');
            hint.setAttribute('data-role', 'execution-day-hint');
            hint.style.cssText = 'margin: 10px 0 0; padding: 8px 10px; border-radius: 8px; background: #fef2f2; border: 1px solid #fecaca; color: var(--danger); font-size: 12px; font-weight: 600;';
            const textarea = card.querySelector('textarea');
            if (textarea) textarea.insertAdjacentElement('beforebegin', hint);
            else card.appendChild(hint);
        }
        hint.textContent = message;
        hint.style.display = 'block';
    }

    
window.hideExecutionDayHint = function(card) {
        if (!card) return;
        const hint = card.querySelector('[data-role="execution-day-hint"]');
        if (hint) hint.remove();
    }

    
