/**
 * Centralise le rendu des différents écrans (intro / félicitations / récap / formulaire).
 * Fichier simplifié - les gestionnaires d'événements complexes sont dans page-renderer-handlers.js
 */

import { $ } from './dom-utils.js';
import { responses, saveLocal } from './storage.js';
import { renderInput } from './input-renderer.js';
import { updateProgress } from './progress.js';
import {
  selectionLimitRules,
  isSelectionOverLimit,
  setupRadioHandlers,
  setupFileHandlers,
  setupCheckboxMultipleHandlers,
  setupCheckboxWithFrequencyHandlers
} from './page-renderer-handlers.js';

// ===== UTILITAIRES UI =====
const setProgressVisible = (isVisible) => {
  const el = document.querySelector('.progress');
  if (el) el.style.display = isVisible ? '' : 'none';
};

const setFormHeaderVisible = (isVisible) => {
  const el = document.querySelector('.form-header');
  if (el) el.style.display = isVisible ? '' : 'none';
};

const setContainerMode = (mode) => {
  const container = document.querySelector('.main .container');
  if (!container) return;
  container.classList.remove('is-introduction', 'is-celebration', 'is-recap');
  if (mode) container.classList.add(mode);
};

const resetButton = (el) => {
  if (!el?.parentNode) return null;
  const newEl = el.cloneNode(true);
  el.parentNode.replaceChild(newEl, el);
  return newEl;
};

const setupNavButton = (buttonId, { visible = true, text, className, onClick } = {}) => {
  const el = $(buttonId);
  if (!el) return null;
  el.style.display = visible ? 'inline-block' : 'none';
  if (text !== undefined) el.innerHTML = text;
  if (className !== undefined) el.className = className;
  const newEl = resetButton(el);
  if (newEl && onClick) newEl.addEventListener('click', onClick);
  return newEl;
};

const ensureNavButtonsVisible = () => document.body.classList.remove('hide-nav-buttons');

const redirectToFinalStep = () => {
  try {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search || '');
    const nextParams = new URLSearchParams();
    const parcours = params.get('parcours');
    const entry = params.get('entry');
    if (parcours) nextParams.set('parcours', parcours);
    if (entry) nextParams.set('entry', entry);
    if (!entry) {
      const entryFlow = responses?.entry_flow;
      const typeDemande = responses?.type_demande;
      if (entryFlow === 'refus' || typeDemande === 'refus') nextParams.set('entry', 'refus');
    }
    const qs = nextParams.toString();
    window.location.href = `/finaliser-projet-de-vie${qs ? `?${qs}` : ''}`;
  } catch {}
};

// ===== RENDER INTRODUCTION =====
export function renderIntroductionPage(q, idx, render, visible, nextCallback) {
  setProgressVisible(true);
  setFormHeaderVisible(true);
  setContainerMode('is-introduction');
  
  const checkboxId = `intro_checkbox_${q.id}`;
  const savedCheckbox = responses[checkboxId] === true;
  const requiresCheckbox = q.obligatoire === true;
  const shouldDisableCheckbox = q.hasCheckbox && requiresCheckbox && !savedCheckbox;
  const showTitle = q.hideTitle !== true;
  const showDesc = q.hideDescription !== true && (!!q.description || !!q.estimatedTime);

  const radioKey = q.id || 'intro_radio';
  const selectedValue = responses[radioKey];
  const selectedOption = q.options?.find(opt => opt?.value === selectedValue);
  const followUp = selectedOption?.followUp;
  const followUpKey = followUp?.id;
  const followUpValue = followUpKey ? responses[followUpKey] : undefined;
  const disableRadio = (q.type === 'radio' && q.obligatoire && !selectedValue) || (followUp?.obligatoire && !followUpValue);
  const disableStart = (q.type === 'info' && q.hasCheckbox) ? shouldDisableCheckbox : (shouldDisableCheckbox || disableRadio);

  let radioOptions = '';
  if (q.type === 'radio' && q.options) {
    radioOptions = `
      <div class="field-container intro-radio-options">
        <div class="choice-grid">
          ${q.options.map(option => {
            const isChecked = responses[radioKey] === option.value;
            const hasSub = option.subOptions?.length > 0;
            let html = `
              <div class="radio-option-container" data-value="${option.value}">
                <label class="choice">
                  <input type="radio" name="${radioKey}" value="${option.value}" 
                         data-has-suboptions="${hasSub}" ${isChecked ? 'checked' : ''}>
                  <span>${option.label}</span>
                </label>`;
            if (hasSub) {
              const subFieldId = `${option.value}_suboptions`;
              const selectedSub = responses[subFieldId] || [];
              html += `
                <div class="sub-options-container" id="suboptions_${option.value}" style="${isChecked ? '' : 'display:none'}">
                  <div class="sub-options-grid">
                    ${option.subOptions.map(sub => `
                      <label class="sub-choice">
                        <input type="checkbox" name="sub_check" value="${sub.value}" 
                               ${selectedSub.includes(sub.value) ? 'checked' : ''}
                               data-parent="${option.value}" data-suboptions-field="${subFieldId}" />
                        <span>${sub.label}</span>
                      </label>
                    `).join('')}
                  </div>
                </div>`;
            }
            return html + '</div>';
          }).join('')}
        </div>
      </div>`;

    if (followUp && followUpKey) {
      if (followUp.type === 'text') {
        const savedText = responses[followUpKey] || '';
        radioOptions += `
          <div class="field-container intro-followup">
            ${followUp.prompt ? `<div class="introduction-content"><p>${followUp.prompt}</p></div>` : ''}
            <input type="text" data-intro-followup="text" id="intro_text_${followUpKey}" 
                   name="${followUpKey}" value="${savedText}" 
                   ${followUp.placeholder ? `placeholder="${followUp.placeholder}"` : ''} />
          </div>`;
      } else if (followUp.options) {
        radioOptions += `
          <div class="field-container intro-followup">
            ${followUp.prompt ? `<div class="introduction-content"><p>${followUp.prompt}</p></div>` : ''}
            <div class="choice-grid">
              ${followUp.options.map(opt => `
                <label class="choice">
                  <input type="radio" name="${followUpKey}" value="${opt.value}" 
                         ${responses[followUpKey] === opt.value ? 'checked' : ''}>
                  <span>${opt.label}</span>
                </label>
              `).join('')}
            </div>
          </div>`;
      }
    }
  }

  $('questionArea').innerHTML = `
    <div class="introduction-page${q.type === 'radio' ? ' intro-radio' : ''}">
      ${showTitle ? `<h2>${q.title || q.sectionTitle || 'Bienvenue'}</h2>` : ''}
      ${showDesc ? `
        <div class="introduction-content">
          <p>${(q.description || q.sectionDescription || '').replace(/\n/g, '</p><p>')}</p>
          ${q.estimatedTime ? `<div class="estimated-time">${q.estimatedTime}</div>` : ''}
        </div>` : ''}
      ${q.type === 'radio' ? radioOptions : ''}
      ${q.hasCheckbox ? `
        <div class="field-container">
          <label class="choice">
            <input type="checkbox" id="${checkboxId}" ${savedCheckbox ? 'checked' : ''} />
            <span>${q.checkboxLabel || ''}</span>
          </label>
        </div>` : ''}
      <button id="startBtn" class="btn btn-primary" ${disableStart ? 'disabled' : ''}>
        ${q.buttonText || (q.isIntroduction ? 'J\'ai compris' : 'Démarrer')}
      </button>
    </div>`;

  if (q.type === 'radio') {
    const selectedEl = document.querySelector(`.introduction-page input[type="radio"][name="${radioKey}"]:checked`);
    const followUps = document.querySelectorAll('.introduction-page .intro-followup');
    const touchedKey = `intro_touched_${radioKey}`;
    const hasTouched = sessionStorage.getItem(touchedKey) === '1';
    followUps.forEach(el => el.style.display = 'none');
    if (selectedEl && hasTouched) followUps.forEach(el => el.style.display = 'block');
  }
  
  setupNavButton('prevBtn', { visible: false });
  setupNavButton('nextBtn', { visible: false });
  
  const startBtn = document.getElementById('startBtn');
  if (!startBtn) return;
  
  const newBtn = startBtn.cloneNode(true);
  startBtn.parentNode.replaceChild(newBtn, startBtn);
  
  if (q.type === 'radio') {
    document.querySelectorAll('.introduction-page input[type="radio"]').forEach(radio => {
      radio.addEventListener('change', () => {
        try { sessionStorage.setItem(`intro_touched_${radioKey}`, '1'); } catch {}
        responses[radio.name] = radio.value;
        const hasSub = radio.getAttribute('data-has-suboptions') === 'true';
        if (hasSub) {
          document.querySelectorAll('.introduction-page .sub-options-container').forEach(c => {
            c.style.display = 'none';
            c.querySelectorAll('input[name="sub_check"]').forEach(cb => cb.checked = false);
            const subField = c.querySelector('input[name="sub_check"]')?.dataset.suboptionsField;
            if (subField && responses[subField]) delete responses[subField];
          });
          const subContainer = document.getElementById(`suboptions_${radio.value}`);
          if (subContainer) subContainer.style.display = 'block';
        }
        saveLocal(true);
        render();
      });
    });
    
    document.querySelectorAll('.introduction-page input[name="sub_check"]').forEach(subCb => {
      subCb.addEventListener('change', () => {
        const subField = subCb.dataset.suboptionsField;
        const parent = subCb.dataset.parent;
        const container = document.getElementById(`suboptions_${parent}`);
        if (!subField || !container) return;
        const values = Array.from(container.querySelectorAll('input[name="sub_check"]:checked')).map(cb => cb.value);
        responses[subField] = values.length ? values : undefined;
        if (!values.length) delete responses[subField];
        saveLocal(true);
      });
    });

    document.querySelectorAll('.introduction-page input[data-intro-followup="text"]').forEach(input => {
      input.addEventListener('input', () => { responses[input.name] = input.value; saveLocal(true); });
    });
  } else if (q.hasCheckbox) {
    const checkboxEl = document.getElementById(checkboxId);
    if (checkboxEl) {
      checkboxEl.addEventListener('change', () => {
        if ((q.type === 'info' && q.hasCheckbox) || requiresCheckbox) newBtn.disabled = !checkboxEl.checked;
      });
    }
  }

  newBtn.addEventListener('click', () => {
    try {
      if (q?.type === 'radio') {
        const checked = document.querySelector(`.introduction-page input[type="radio"][name="${radioKey}"]:checked`);
        if (checked?.value) responses[radioKey] = checked.value;
        if (followUp && followUpKey) {
          if (followUp.type === 'text') {
            const el = document.getElementById(`intro_text_${followUpKey}`);
            if (el) responses[followUpKey] = el.value;
          } else if (followUp.options) {
            const checkedFollowUp = document.querySelector(`.introduction-page input[type="radio"][name="${followUpKey}"]:checked`);
            if (checkedFollowUp?.value) responses[followUpKey] = checkedFollowUp.value;
          }
        }
        saveLocal(true);
      }
      if (q?.hasCheckbox) {
        const checkboxEl = document.getElementById(checkboxId);
        if (checkboxEl) { responses[checkboxId] = checkboxEl.checked; saveLocal(true); }
      }
    } catch {}
    if (nextCallback) nextCallback();
  });
  
  updateProgress(idx, visible);
}

// ===== RENDER CELEBRATION =====
export function renderCelebrationPage(q, idx, render, visible, nextCallback, prevCallback) {
  setContainerMode('is-celebration');
  
  $('questionArea').innerHTML = `
    <div class="celebration-page">
      <h2>${q.title || 'Bravo !'}</h2>
      <div class="celebration-content">
        <p>${q.description || ''}</p>
        <p>${q.nextStepMessage || ''}</p>
      </div>
    </div>`;

  setupNavButton('prevBtn', { visible: true, text: 'Retour', className: 'btn', onClick: prevCallback });
  setupNavButton('nextBtn', { visible: true, text: q.continueButtonText || 'Continuer', className: 'btn btn-primary', onClick: nextCallback });
  setProgressVisible(false);
  setFormHeaderVisible(false);
}

// ===== RENDER RECAP =====
export function renderRecapPage(q, idx, render, visible, nextCallback, prevCallback) {
  setProgressVisible(false);
  const formHeader = document.querySelector('.form-header');
  const formTitle = document.getElementById('formTitle');
  const formDescription = document.getElementById('formDescription');
  
  if (formHeader && formTitle && formDescription) {
    formHeader.style.display = 'none';
    formTitle.textContent = '';
    formDescription.textContent = '';
  }
  setContainerMode('is-recap');

  const toParagraphs = (text) => String(text || '').replace(/en toute\s*\n\s*tranquillité\./g, 'en toute tranquillité.')
    .split('\n').filter(l => l.trim()).map(l => `<p>${l}</p>`).join('');

  const hasDesc2 = q.description2?.trim?.();
  const lead = hasDesc2 ? toParagraphs(q.description) : '';
  const desc = hasDesc2 ? toParagraphs(q.description2) : toParagraphs(q.description);

  $('questionArea').innerHTML = `
    <div class="recap-page${hasDesc2 ? ' has-recap-lead' : ''}">
      <h1>${q.title}</h1>
      <div class="recap-content">
        ${hasDesc2 ? `<div class="recap-lead">${lead}</div>` : ''}
        <div class="recap-description">${desc}</div>
      </div>
    </div>`;
  
  setupNavButton('prevBtn', { visible: true, text: '✏️ Modifier mes réponses', className: 'btn secondary', onClick: prevCallback });
  setupNavButton('nextBtn', { visible: true, text: 'Continuer', className: 'btn btn-primary', onClick: nextCallback });
  updateProgress(idx, visible);
}

// ===== RENDER NORMAL PAGE =====
export function renderNormalPage(q, idx, visible, nextCallback, prevCallback) {
  setContainerMode(null);
  let nextBtnEl = null;

  const getOrCreateLimitBox = () => {
    const root = $('questionArea');
    if (!root) return null;
    const existing = root.querySelector('.selection-limit-box');
    if (existing) return existing;
    const box = document.createElement('div');
    box.className = 'selection-limit-box';
    box.style.display = 'none';
    root.appendChild(box);
    return box;
  };

  const updateLimitUI = () => {
    const box = getOrCreateLimitBox();
    if (!box) return;
    const violations = [];
    try {
      const sectionQs = visible.filter(question => question.sectionTitle === q.sectionTitle);
      sectionQs.forEach(qi => {
        const rule = selectionLimitRules[qi.id];
        if (!rule) return;
        const div = document.querySelector(`[data-question-id="${qi.id}"]`);
        if (div && isSelectionOverLimit(div, qi.id)) violations.push(rule.message);
      });
    } catch {}
    box.innerHTML = violations.map(m => `<div class="selection-limit-message">${m}</div>`).join('');
    box.style.display = violations.length ? 'block' : 'none';
  };

  const updateNextBtn = () => {
    if (!nextBtnEl) return;
    const div = document.querySelector(`[data-question-id="${q.id}"]`);
    nextBtnEl.disabled = isSelectionOverLimit(div, q.id);
  };
  
  const refreshUI = () => { updateLimitUI(); updateNextBtn(); };
  
  setProgressVisible(true);
  setFormHeaderVisible(true);
  ensureNavButtonsVisible();
  setupNavButton('prevBtn', { visible: true, text: 'Précédent', className: 'btn', onClick: prevCallback });
  nextBtnEl = setupNavButton('nextBtn', { visible: true, text: 'Suivant', className: 'btn btn-primary', onClick: nextCallback });
  
  const sectionTitle = q.sectionTitle || q.title || '';
  $('questionArea').innerHTML = `
    <div class="${q.className || ''} section-container">
      ${sectionTitle ? `<h2 class="q-title">${sectionTitle}</h2>` : ''}
      <div class="question-card" data-question-id="${q.id}">${renderInput(q, responses[q.id])}</div>
    </div>`;

  getOrCreateLimitBox();

  // Sauvegarde live pour les champs texte
  if (['text', 'email', 'textarea'].includes(q.type)) {
    const input = document.querySelector(`[data-question-id="${q.id}"] #answer`);
    if (input) input.addEventListener('input', (e) => { responses[q.id] = e.target.value ?? ''; saveLocal(true); });
  }

  // Setup handlers selon le type
  const questionDiv = document.querySelector(`[data-question-id="${q.id}"]`);
  if (questionDiv) {
    if (q.type === 'radio') setupRadioHandlers(questionDiv, q);
    if (q.type === 'file' && q.missingOptions) setupFileHandlers(questionDiv, q);
    if (q.type === 'checkbox_multiple_with_frequency') setupCheckboxWithFrequencyHandlers(questionDiv, q, refreshUI);
    if (q.type === 'checkbox_multiple') setupCheckboxMultipleHandlers(questionDiv, q, refreshUI);
  }

  updateLimitUI();
  updateProgress(idx, visible);
}

// ===== RENDER MULTI QUESTION PAGE =====
export function renderMultiQuestionPage(questions, idx, visible, nextCallback, prevCallback) {
  setContainerMode(null);
  setProgressVisible(true);
  setFormHeaderVisible(true);
  ensureNavButtonsVisible();

  const firstQ = questions[0];
  let html = `<div class="coordonnees-page section-container">`;
  if (firstQ?.sectionTitle) html += `<h2 class="q-title">${firstQ.sectionTitle}</h2>`;
  const firstDesc = firstQ?.sectionDescription || firstQ?.description;
  if (firstDesc) html += `<p class="q-description">${firstDesc}</p>`;

  questions.forEach(q => {
    if (q.hasCheckbox && q.isIntroduction) {
      html += `
        <div class="question-card terms-acceptance-card" data-question-id="${q.id}">
          <div class="terms-acceptance-content">
            ${q.hideTitle ? '' : `<h3 class="terms-title">${q.title || q.sectionTitle || ''}</h3>`}
            ${q.hideDescription ? '' : `<p class="terms-description">${q.description || q.sectionDescription || ''}</p>`}
            <div class="terms-checkbox-wrapper">
              <label class="terms-checkbox-label">
                <input type="checkbox" id="terms_checkbox" ${q.requireCheckbox ? 'data-required="true"' : ''}>
                <span class="checkbox-text">${q.checkboxLabel || 'J\'accepte les conditions'}</span>
              </label>
            </div>
          </div>
        </div>`;
    } else {
      html += `<div class="question-card" data-question-id="${q.id}">${renderInput(q, responses[q.id])}</div>`;
    }
  });
  html += `</div>`;

  $('questionArea').innerHTML = html;

  const lastQ = questions[questions.length - 1];
  const hasTerms = lastQ?.hasCheckbox && lastQ?.isIntroduction;
  let nextBtnEl = null;

  setupNavButton('prevBtn', { visible: true, text: 'Précédent', className: 'btn', onClick: prevCallback });
  nextBtnEl = setupNavButton('nextBtn', {
    visible: true, 
    text: hasTerms ? (lastQ.buttonText || 'Continuer') : 'Suivant',
    className: 'btn btn-primary',
    onClick: () => {
      if (hasTerms && lastQ.requireCheckbox) {
        const termsCb = document.getElementById('terms_checkbox');
        if (termsCb && !termsCb.checked) {
          alert('Vous devez accepter les conditions d\'utilisation pour continuer.');
          return;
        }
        responses[lastQ.id] = termsCb?.checked ? 'accepted' : '';
        saveLocal(true);
        redirectToFinalStep();
        return;
      }
      if (nextCallback) nextCallback();
    }
  });

  if (nextBtnEl && hasTerms && lastQ.requireCheckbox) {
    const termsCb = document.getElementById('terms_checkbox');
    if (termsCb) {
      nextBtnEl.disabled = !termsCb.checked;
      termsCb.addEventListener('change', () => nextBtnEl.disabled = !termsCb.checked);
    }
  }

  questions.forEach(q => {
    if (q.hasCheckbox && q.isIntroduction) return;
    const div = document.querySelector(`[data-question-id="${q.id}"]`);
    if (!div) return;

    if (['text', 'email', 'textarea'].includes(q.type)) {
      const input = div.querySelector('input, textarea');
      if (input) input.addEventListener('input', () => { responses[q.id] = input.value ?? ''; saveLocal(true); });
    }
    if (q.type === 'file' && q.missingOptions) setupFileHandlers(div, q);
    if (q.type === 'radio') setupRadioHandlers(div, q);
  });

  updateProgress(idx, visible);
}
