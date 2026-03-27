/**
 * Centralise le rendu des différents écrans (intro / félicitations / récap / formulaire).
 * Important: les écrans intro gèrent eux-mêmes leurs inputs et le bouton (les nav boutons sont masqués).
 */

import { $ } from './dom-utils.js';
import { responses, saveLocal } from './storage.js';
import { renderInput } from './input-renderer.js';
import { updateProgress } from './progress.js';
import { createConfetti, addConfettiStyles } from './confetti.js';

function setProgressVisible(isVisible) {
  const progressContainer = document.querySelector('.progress');
  if (progressContainer) {
    progressContainer.style.display = isVisible ? '' : 'none';
  }
}

function setFormHeaderVisible(isVisible) {
  const formHeader = document.querySelector('.form-header');
  if (formHeader) {
    formHeader.style.display = isVisible ? '' : 'none';
  }
}

function setContainerMode(mode) {
  const container = document.querySelector('.main .container');
  if (!container) return;
  container.classList.remove('is-introduction', 'is-celebration', 'is-recap');
  if (mode) container.classList.add(mode);
}

function resetButton(el) {
  if (!el || !el.parentNode) return null;
  const newEl = el.cloneNode(true);
  el.parentNode.replaceChild(newEl, el);
  return newEl;
}

function setupNavButton(buttonId, { visible = true, text, className, onClick } = {}) {
  const el = $(buttonId);
  if (!el) return null;

  el.style.display = visible ? 'inline-block' : 'none';
  if (text !== undefined) el.innerHTML = text;
  if (className !== undefined) el.className = className;

  const newEl = resetButton(el);
  if (newEl && onClick) newEl.addEventListener('click', onClick);
  return newEl;
}

function ensureNavButtonsVisible() {
  document.body.classList.remove('hide-nav-buttons');
}

// Règles de limite de sélection (module-level pour éviter duplication)
const selectionLimitRules = {
  situation_generale: { max: 2, message: 'Choisissez 1 ou 2 situations maximum.' },
  difficultes_quotidiennes: { max: 3, message: 'Essayez de garder uniquement les 3 difficultés les plus importantes.' },
  difficultes_travail: { max: 2, message: 'Choisissez jusqu\'à 2 difficultés principales.' },
  consequences_difficultes: { max: 2, message: 'Indiquez uniquement les 2 conséquences les plus marquantes.' },
  consequences_travail: { max: 2, message: 'Indiquez uniquement les 2 conséquences les plus marquantes.' },
  type_demande: { max: 3, message: 'Pour plus de clarté, choisissez jusqu\'à 3 aides utiles.' },
  priorites_actuelles: { max: 4, message: 'Concentrez-vous sur 4 priorités maximum.' }
};

const isSelectionOverLimit = (questionDiv, questionId) => {
  const rule = selectionLimitRules[questionId];
  if (!rule || !questionDiv) return false;
  const checked = questionDiv.querySelectorAll('input[name="multi_check"]:checked');
  return (checked?.length || 0) > rule.max;
};

function redirectToFinalStep() {
  try {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search || '');
      const nextParams = new URLSearchParams();

      const parcours = params.get('parcours');
      const entry = params.get('entry');

      if (parcours) nextParams.set('parcours', parcours);
      if (entry) nextParams.set('entry', entry);

      if (!entry) {
        const entryFlow = responses && typeof responses === 'object' ? responses.entry_flow : null;
        const typeDemande = responses && typeof responses === 'object' ? responses.type_demande : null;
        if (entryFlow === 'refus' || typeDemande === 'refus') {
          nextParams.set('entry', 'refus');
        }
      }

      const qs = nextParams.toString();
      window.location.href = `/finaliser-projet-de-vie${qs ? `?${qs}` : ''}`;
    }
  } catch {
  }
}

export function renderIntroductionPage(q, idx, render, visible, nextCallback) {
  setProgressVisible(true);
  setFormHeaderVisible(true);
  setContainerMode('is-introduction');
  
  const checkboxId = `intro_checkbox_${q.id}`;
  const savedCheckboxValue = responses[checkboxId] === true;
  const requiresCheckbox = q.obligatoire === true;
  const shouldDisableCheckbox = q.hasCheckbox && requiresCheckbox && !savedCheckboxValue;

  const shouldShowTitle = q.hideTitle !== true;
  const shouldShowDescription = q.hideDescription !== true && (!!q.description || !!q.estimatedTime);

  const radioKey = q.id || 'intro_radio';
  const selectedRadioValue = responses[radioKey];
  const selectedRadioOption = Array.isArray(q.options)
    ? q.options.find(opt => opt && opt.value === selectedRadioValue)
    : null;
  const followUp = (selectedRadioOption && selectedRadioOption.followUp ? selectedRadioOption.followUp : null);
  const followUpKey = followUp && followUp.id ? followUp.id : null;
  const followUpValue = followUpKey ? responses[followUpKey] : undefined;

  const shouldDisableRadio = (q.type === 'radio' && q.obligatoire === true && !selectedRadioValue)
    || (followUp && followUp.obligatoire === true && !followUpValue);
  // Pour type 'info' avec hasCheckbox, on ne bloque pas sur la sélection radio
  const shouldDisableStart = (q.type === 'info' && q.hasCheckbox)
    ? shouldDisableCheckbox
    : (shouldDisableCheckbox || shouldDisableRadio);

  let radioOptions = '';
  if (q.type === 'radio' && q.options) {
    radioOptions = `
      <div class="field-container intro-radio-options">
        <div class="choice-grid">
          ${q.options.map(option => {
            const isChecked = responses[radioKey] === option.value;
            const hasSubOptions = option.subOptions && Array.isArray(option.subOptions) && option.subOptions.length > 0;
            
            let optionHtml = `
              <div class="radio-option-container" data-value="${option.value}">
                <label class="choice">
                  <input type="radio" 
                         name="${radioKey}" 
                         value="${option.value}" 
                         data-has-suboptions="${hasSubOptions ? 'true' : 'false'}"
                         ${isChecked ? 'checked' : ''}>
                  <span>${option.label}</span>
                </label>
            `;
            
            // Ajouter les sous-options si présentes
            if (hasSubOptions) {
              const subOptionsFieldId = `${option.value}_suboptions`;
              const selectedSubOptions = Array.isArray(responses[subOptionsFieldId]) ? responses[subOptionsFieldId] : [];
              
              optionHtml += `
                <div class="sub-options-container" id="suboptions_${option.value}" style="${isChecked ? '' : 'display:none'}">
                  <div class="sub-options-grid">
                    ${option.subOptions.map(subOpt => {
                      const subChecked = selectedSubOptions.includes(subOpt.value) ? 'checked' : '';
                      return `
                        <label class="sub-choice">
                          <input type="checkbox" name="sub_check" value="${subOpt.value}" ${subChecked}
                                 data-parent="${option.value}" data-suboptions-field="${subOptionsFieldId}" />
                          <span>${subOpt.label}</span>
                        </label>
                      `;
                    }).join('')}
                  </div>
                </div>
              `;
            }
            
            optionHtml += `</div>`;
            return optionHtml;
          }).join('')}
        </div>
      </div>
    `;

    if (followUp && followUpKey && followUp.type === 'text') {
      const savedText = typeof responses[followUpKey] === 'string' ? responses[followUpKey] : '';
      radioOptions += `
        <div class="field-container intro-followup">
          ${followUp.prompt ? `
          <div class="introduction-content">
            <p>${followUp.prompt}</p>
          </div>
          ` : ''}
          <input type="text" data-intro-followup="text" id="intro_text_${followUpKey}" name="${followUpKey}" value="${savedText}" ${followUp.placeholder ? `placeholder="${followUp.placeholder}"` : ''} />
        </div>
      `;
    } else if (followUp && followUpKey && Array.isArray(followUp.options)) {
      radioOptions += `
        <div class="field-container intro-followup">
          ${followUp.prompt ? `
          <div class="introduction-content">
            <p>${followUp.prompt}</p>
          </div>
          ` : ''}
          <div class="choice-grid">
            ${followUp.options.map(option => `
              <label class="choice">
                <input type="radio"
                       name="${followUpKey}"
                       value="${option.value}"
                       ${responses[followUpKey] === option.value ? 'checked' : ''}>
                <span>${option.label}</span>
              </label>
            `).join('')}
          </div>
        </div>
      `;
    }
  }

  const introductionHTML = `
    <div class="introduction-page${q.type === 'radio' ? ' intro-radio' : ''}">
      ${shouldShowTitle ? `<h2>${q.title || q.sectionTitle || 'Bienvenue'}</h2>` : ''}
      ${shouldShowDescription ? `
      <div class="introduction-content">
        <p>${((q.description || q.sectionDescription) || '').replace(/\n/g, '</p><p>')}</p>
        ${q.estimatedTime ? `<div class="estimated-time">${q.estimatedTime}</div>` : ''}
      </div>
      ` : ''}
      ${q.type === 'radio' ? radioOptions : ''}
      ${q.hasCheckbox ? `
        <div class="field-container">
          <label class="choice">
            <input type="checkbox" id="${checkboxId}" ${savedCheckboxValue ? 'checked' : ''} />
            <span>${q.checkboxLabel || ''}</span>
          </label>
        </div>
      ` : ''}
      <button id="startBtn" class="btn btn-primary" ${shouldDisableStart ? 'disabled' : ''}>${q.buttonText || (q.isIntroduction ? 'J\'ai compris' : 'Démarrer')}</button>
    </div>
  `;
  
  $('questionArea').innerHTML = introductionHTML;

  // UX: le follow-up n'apparaît qu'après interaction utilisateur (évite un affichage dû à une valeur persistée).
  if (q.type === 'radio') {
    const selectedEl = document.querySelector(`.introduction-page input[type="radio"][name="${radioKey}"]:checked`);
    const followUps = document.querySelectorAll('.introduction-page .intro-followup');
    const touchedKey = `intro_touched_${radioKey}`;
    const hasTouched = typeof sessionStorage !== 'undefined' && sessionStorage.getItem(touchedKey) === '1';

    followUps.forEach(el => {
      el.style.display = 'none';
    });

    // N'afficher qu'après interaction utilisateur (évite un affichage permanent via une valeur persistée)
    if (selectedEl && hasTouched) {
      followUps.forEach(el => {
        el.style.display = 'block';
      });
    }
  }
  
  setupNavButton('prevBtn', { visible: false });
  setupNavButton('nextBtn', { visible: false });
  
  const startBtn = document.getElementById('startBtn');
  if (startBtn) {
    // Remplacement par clone: évite l'accumulation d'event listeners sur re-render.
    const newBtn = startBtn.cloneNode(true);
    startBtn.parentNode.replaceChild(newBtn, startBtn);
    
    if (q.type === 'radio') {
      const radioInputs = document.querySelectorAll('.introduction-page input[type="radio"]');
      radioInputs.forEach(radio => {
        radio.addEventListener('change', () => {
          try {
            const touchedKey = `intro_touched_${radioKey}`;
            if (typeof sessionStorage !== 'undefined') {
              sessionStorage.setItem(touchedKey, '1');
            }
          } catch (_) {
          }
          responses[radio.name] = radio.value;
          
          // Gérer l'affichage/masquage des sous-options
          const hasSubOptions = radio.getAttribute('data-has-suboptions') === 'true';
          if (hasSubOptions) {
            const allSubContainers = document.querySelectorAll('.introduction-page .sub-options-container');
            allSubContainers.forEach(container => {
              container.style.display = 'none';
              // Décocher les sous-options non visibles
              const subChecks = container.querySelectorAll('input[name="sub_check"]');
              subChecks.forEach(subCb => {
                subCb.checked = false;
              });
              // Supprimer du storage
              const subOptionsFieldId = container.querySelector('input[name="sub_check"]')?.getAttribute('data-suboptions-field');
              if (subOptionsFieldId && responses[subOptionsFieldId]) {
                delete responses[subOptionsFieldId];
              }
            });
            
            // Afficher les sous-options de la radio sélectionnée
            const subContainer = document.getElementById(`suboptions_${radio.value}`);
            if (subContainer) {
              subContainer.style.display = 'block';
            }
          }
          
          saveLocal(true);
          render();
        });
      });
      
      // Gérer les sous-checkboxes
      const subCheckboxes = document.querySelectorAll('.introduction-page input[name="sub_check"]');
      subCheckboxes.forEach(subCb => {
        subCb.addEventListener('change', function() {
          const subOptionsFieldId = this.getAttribute('data-suboptions-field');
          if (!subOptionsFieldId) return;
          
          const parent = this.getAttribute('data-parent');
          const container = document.getElementById(`suboptions_${parent}`);
          if (!container) return;
          
          const checkedSubs = container.querySelectorAll('input[name="sub_check"]:checked');
          const selectedValues = Array.from(checkedSubs).map(cb => cb.value);
          
          if (selectedValues.length > 0) {
            responses[subOptionsFieldId] = selectedValues;
          } else {
            delete responses[subOptionsFieldId];
          }
          saveLocal(true);
        });
      });

      const followUpTextInputs = document.querySelectorAll('.introduction-page input[data-intro-followup="text"]');
      followUpTextInputs.forEach(input => {
        input.addEventListener('input', () => {
          responses[input.name] = String(input.value || '');
          saveLocal(true);
        });
      });
    } else if (q.hasCheckbox) {
      const checkboxEl = document.getElementById(checkboxId);
      if (checkboxEl) {
        checkboxEl.addEventListener('change', () => {
          // Pour type info avec checkbox, ou requireCheckbox, on contrôle le bouton
          if ((q.type === 'info' && q.hasCheckbox) || requiresCheckbox) {
            newBtn.disabled = !checkboxEl.checked;
          }
        });
      }
    }

    newBtn.addEventListener('click', () => {
      try {
        if (q && q.type === 'radio') {
          const checked = document.querySelector(`.introduction-page input[type="radio"][name="${radioKey}"]:checked`);
          if (checked && checked.value !== undefined) {
            responses[radioKey] = checked.value;
          }

          if (followUp && followUpKey && followUp.type === 'text') {
            const followUpEl = document.getElementById(`intro_text_${followUpKey}`);
            if (followUpEl) {
              responses[followUpKey] = String(followUpEl.value || '');
            }
          } else if (followUp && followUpKey && Array.isArray(followUp.options)) {
            const checkedFollowUp = document.querySelector(`.introduction-page input[type="radio"][name="${followUpKey}"]:checked`);
            if (checkedFollowUp && checkedFollowUp.value !== undefined) {
              responses[followUpKey] = checkedFollowUp.value;
            }
          }

          saveLocal(true);
        }

        if (q && q.hasCheckbox) {
          const checkboxEl = document.getElementById(checkboxId);
          if (checkboxEl) {
            responses[checkboxId] = checkboxEl.checked;
            saveLocal(true);
          }
        }
      } catch (e) {
      }

      if (nextCallback) {
        nextCallback();
      }
    });
  } else {
    console.error('Le bouton de démarrage n\'a pas été trouvé dans le DOM');
  }
  
  updateProgress(idx, visible);
}

export function renderCelebrationPage(q, idx, render, visible, nextCallback, prevCallback) {
  setContainerMode('is-celebration');
  
  addConfettiStyles();
  
  const celebrationHTML = `
    <div class="celebration-page">
      <h2>${q.title || 'Bravo !'}</h2>
      <div class="celebration-content">
        <p>${q.description || ''}</p>
        <p>${q.nextStepMessage || ''}</p>
      </div>
    </div>
  `;
  
  $('questionArea').innerHTML = celebrationHTML;

  setupNavButton('prevBtn', { visible: true, text: 'Retour', className: 'btn', onClick: prevCallback });
  setupNavButton('nextBtn', { visible: true, text: q.continueButtonText || 'Continuer', className: 'btn btn-primary', onClick: nextCallback });
  setProgressVisible(false);
  setFormHeaderVisible(false);
  
  setTimeout(() => {
    createConfetti();
  }, 300);
}

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

  const toParagraphsHtml = (text) => {
    const safeText = String(text || '').replace(/en toute\s*\n\s*tranquillité\./g, 'en toute tranquillité.');
    return safeText
      .split('\n')
      .filter(line => line.trim() !== '')
      .map(line => `<p>${line}</p>`)
      .join('');
  };

  const hasDescription2 = typeof q.description2 === 'string' && q.description2.trim() !== '';
  const leadHtml = hasDescription2 ? toParagraphsHtml(q.description) : '';
  const descriptionHtml = hasDescription2 ? toParagraphsHtml(q.description2) : toParagraphsHtml(q.description);

  const recapHTML = `
    <div class="recap-page${hasDescription2 ? ' has-recap-lead' : ''}">
      <h1>${q.title}</h1>
      <div class="recap-content">
        ${hasDescription2 ? `
          <div class="recap-lead">
            ${leadHtml}
          </div>
        ` : ''}
        <div class="recap-description">
          ${descriptionHtml}
        </div>
      </div>
    </div>
  `;
  
  setupNavButton('prevBtn', {
    visible: true,
    text: '✏️ Modifier mes réponses',
    className: 'btn secondary',
    onClick: prevCallback ? () => prevCallback() : null
  });
  setupNavButton('nextBtn', {
    visible: true,
    text: 'Continuer',
    className: 'btn btn-primary',
    onClick: nextCallback ? () => nextCallback() : null
  });
  
  $('questionArea').innerHTML = recapHTML;
  
  updateProgress(idx, visible);
}

export function renderNormalPage(q, idx, visible, nextCallback, prevCallback) {
  // Retirer d'abord les modes "intro/celebration/recap" si nécessaire
  setContainerMode(null);

  let __nextBtnEl = null;

  const getOrCreateGlobalLimitBox = () => {
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

  const updateSelectionLimitUI = () => {
    const box = getOrCreateGlobalLimitBox();
    if (!box) return;
    const violations = [];
    try {
      const currentSection = q.sectionTitle;
      const sectionQuestions = visible.filter(question => question.sectionTitle === currentSection);
      sectionQuestions.forEach(qi => {
        const rule = selectionLimitRules[qi.id];
        if (!rule) return;
        const div = document.querySelector(`[data-question-id="${qi.id}"]`);
        if (!div) return;
        if (isSelectionOverLimit(div, qi.id)) violations.push(rule.message);
      });
    } catch {}
    if (violations.length) {
      box.innerHTML = violations.map(msg => `<div class="selection-limit-message">${msg}</div>`).join('');
      box.style.display = 'block';
    } else {
      box.innerHTML = '';
      box.style.display = 'none';
    }
  };

  const updateNextButtonDisabledState = () => {
    try {
      if (!__nextBtnEl) return;
      const div = document.querySelector(`[data-question-id="${q.id}"]`);
      __nextBtnEl.disabled = isSelectionOverLimit(div, q.id);
    } catch {}
  };
  
  // Restaurer la barre de progression et l'en-tête
  setProgressVisible(true);
  setFormHeaderVisible(true);
  
  // Remettre les boutons visibles pour les pages normales
  ensureNavButtonsVisible();
  
  // Restaurer les boutons de navigation normaux
  setupNavButton('prevBtn', { visible: true, text: 'Précédent', className: 'btn', onClick: prevCallback });
  __nextBtnEl = setupNavButton('nextBtn', { visible: true, text: 'Suivant', className: 'btn btn-primary', onClick: nextCallback });
  
  // Afficher chaque question dans sa propre carte individuelle
  // Affiche le titre de section une seule fois (pas de duplication avec renderInput)
  const sectionTitle = q.sectionTitle || q.title || '';
  
  let sectionHtml = `
    <div class="${q.className || ''} section-container">
      ${sectionTitle ? `<h2 class="q-title">${sectionTitle}</h2>` : ''}
      <div class="question-card" data-question-id="${q.id}">
        ${renderInput(q, responses[q.id])}
      </div>
    </div>
  `;
    
  $('questionArea').innerHTML = sectionHtml;

  // Zone unique d'erreurs en bas du formulaire (emplacement constant)
  getOrCreateGlobalLimitBox();
    
  // Helper pour attacher les événements communs
  const onChangeSave = (fn) => (e) => { fn(e); saveLocal(true); };
  const refreshUI = () => { updateSelectionLimitUI(); updateNextButtonDisabledState(); };

  // Sauvegarde live pour les champs texte
  if (q.type === 'text' || q.type === 'email' || q.type === 'textarea') {
    const questionDiv = document.querySelector(`[data-question-id="${q.id}"]`);
    const input = questionDiv?.querySelector('#answer');
    if (input) {
      input.addEventListener('input', (e) => { responses[q.id] = String(e.target.value ?? ''); saveLocal(true); });
    }
  }

  if (q.type === 'radio') {
    const questionDiv = document.querySelector(`[data-question-id="${q.id}"]`);
    if (questionDiv) {
      const radioInputs = questionDiv.querySelectorAll('input[type="radio"][name="' + q.id + '"]');

      const syncSubOptionTextFields = () => {
        try {
          questionDiv.querySelectorAll('.sub-options-container[id^="suboptions_"]').forEach(container => {
            container.querySelectorAll('.text-field-inline[data-subtext-for]').forEach(wrapper => {
              const subValue = wrapper.getAttribute('data-subtext-for');
              const cb = subValue
                ? container.querySelector(`input[name="sub_check"][value="${CSS.escape(subValue)}"]`)
                : null;
              const shouldShow = !!(cb && cb.checked);
              wrapper.style.display = shouldShow ? 'block' : 'none';
              if (!shouldShow) {
                const input = wrapper.querySelector('input[data-subtextfield]');
                const fid = input?.getAttribute('data-subtextfield');
                if (input) input.value = '';
                if (fid && responses[fid] !== undefined) delete responses[fid];
              }
            });
          });
        } catch {}
      };

      const syncRadioTextFields = () => {
        const checked = questionDiv.querySelector(`input[type="radio"][name="${q.id}"]:checked`);
        const selectedValue = checked ? String(checked.value) : '';
        questionDiv.querySelectorAll('.text-field-inline').forEach(wrapper => {
          const shouldShow = selectedValue && wrapper.getAttribute('data-text-for') === selectedValue;
          wrapper.style.display = shouldShow ? 'block' : 'none';
          if (!shouldShow) {
            const input = wrapper.querySelector('input[data-field]');
            const fieldId = input?.getAttribute('data-field');
            if (fieldId && responses[fieldId] !== undefined) { input.value = ''; delete responses[fieldId]; }
          }
        });
        questionDiv.querySelectorAll('.sub-options-container[id^="suboptions_"]').forEach(container => {
          const optValue = container.id.replace('suboptions_', '');
          const shouldShow = selectedValue === optValue;
          container.style.display = shouldShow ? 'block' : 'none';
          if (!shouldShow) {
            container.querySelectorAll('input[name="sub_check"]').forEach(cb => cb.checked = false);
            const subField = container.querySelector('input[data-suboptions-field]')?.getAttribute('data-suboptions-field');
            if (subField && responses[subField]) delete responses[subField];

            // Nettoyer aussi les sous-champs (ex: date/text) rendus via data-subfield
            container.querySelectorAll('input[data-subfield]').forEach(inp => {
              const fid = inp.getAttribute('data-subfield');
              if (fid && responses[fid] !== undefined) delete responses[fid];
              inp.value = '';
            });

            container.querySelectorAll('input[data-subtextfield]').forEach(inp => {
              const fid = inp.getAttribute('data-subtextfield');
              if (fid && responses[fid] !== undefined) delete responses[fid];
              inp.value = '';
            });
          }
        });

        // Synchroniser l'affichage des followUps inline (subtab) attachés aux options radio
        questionDiv.querySelectorAll('.sub-options-container[data-followup-for]').forEach(el => {
          const key = el.getAttribute('data-followup-for');
          const shouldShow = !!(selectedValue && key === selectedValue);
          el.style.display = shouldShow ? 'block' : 'none';
          if (!shouldShow) {
            el.querySelectorAll('input[type="radio"]').forEach(r => r.checked = false);
            const fid = el.querySelector('input[type="radio"]')?.getAttribute('name');
            if (fid && responses[fid] !== undefined) delete responses[fid];
          }
        });

        // Après le show/hide des containers, sync l'état des textfields des subOptions
        syncSubOptionTextFields();
        saveLocal(true);
      };
      
      radioInputs.forEach(radio => radio.addEventListener('change', syncRadioTextFields));
      questionDiv.querySelectorAll('.text-field-inline input[data-field]').forEach(input => {
        input.addEventListener('input', (e) => {
          const fieldId = e.target.getAttribute('data-field');
          if (fieldId) responses[fieldId] = String(e.target.value || '');
          saveLocal(true);
        });
      });
      questionDiv.querySelectorAll('input[name="sub_check"]').forEach(subCb => {
        subCb.addEventListener('change', () => {
          const container = document.getElementById(`suboptions_${subCb.getAttribute('data-parent')}`);
          const subField = subCb.getAttribute('data-suboptions-field');
          if (!subField || !container) return;
          const values = Array.from(container.querySelectorAll('input[name="sub_check"]:checked')).map(cb => cb.value);
          responses[subField] = values.length ? values : undefined;
          if (!values.length) delete responses[subField];

          syncSubOptionTextFields();
          saveLocal(true);
        });
      });

      // Sauvegarde live des champs texte des subOptions
      questionDiv.querySelectorAll('.sub-options-container input[data-subtextfield]').forEach(input => {
        input.addEventListener('input', (e) => {
          const fid = e.target.getAttribute('data-subtextfield');
          if (!fid) return;
          const val = String(e.target.value || '');
          if (val) responses[fid] = val;
          else delete responses[fid];
          saveLocal(true);
        });
      });

      // Sous-champs (date/text) dans les subOptions
      questionDiv.querySelectorAll('.sub-options-container input[data-subfield]').forEach(input => {
        const handler = (e) => {
          const fid = e.target.getAttribute('data-subfield');
          if (!fid) return;
          const val = String(e.target.value || '');
          if (val) responses[fid] = val;
          else delete responses[fid];
          saveLocal(true);
        };
        input.addEventListener('input', handler);
        input.addEventListener('change', handler);
      });

      // Sauvegarde live des followUps inline (radio) des options radio
      questionDiv.querySelectorAll('.sub-options-container[data-followup-for] input[type="radio"]').forEach(r => {
        r.addEventListener('change', (e) => {
          const fid = e.target.getAttribute('name');
          if (!fid) return;
          responses[fid] = String(e.target.value || '');
          saveLocal(true);
        });
      });

      syncRadioTextFields();
      syncSubOptionTextFields();
    }

    // Gestion des missingOptions pour les inputs file
    if (q.type === 'file' && q.missingOptions) {
      const questionDiv = document.querySelector(`[data-question-id="${q.id}"]`);
      if (questionDiv) {
        const missingRadios = questionDiv.querySelectorAll('input[name="' + q.id + '_missing"]');
        const fileInput = questionDiv.querySelector('#answer');
        
        // Synchroniser l'affichage des champs texte
        const syncMissingTextFields = () => {
          missingRadios.forEach(radio => {
            const hasText = radio.getAttribute('data-has-text') === 'true';
            const textFieldDiv = document.getElementById(`text_${radio.value}`);
            if (textFieldDiv) {
              textFieldDiv.style.display = radio.checked ? 'block' : 'none';
            }
          });
        };

        // Synchroniser l'affichage des followUps inline (subtab) attachés aux missingOptions
        const syncMissingFollowUps = () => {
          try {
            const checked = questionDiv.querySelector(`input[name="${q.id}_missing"]:checked`);
            const selected = checked ? String(checked.value || '') : '';
            questionDiv.querySelectorAll('.missing-followup[data-missing-followup-for]').forEach(el => {
              const key = el.getAttribute('data-missing-followup-for');
              const shouldShow = !!(selected && key === selected);
              el.style.display = shouldShow ? 'block' : 'none';
              if (!shouldShow) {
                el.querySelectorAll('input[type="radio"]').forEach(r => r.checked = false);
                const fid = el.querySelector('input[type="radio"]')?.getAttribute('name');
                if (fid && responses[fid] !== undefined) delete responses[fid];
              }
            });
          } catch {
          }
        };
        
        // Gérer le changement de radio missingOptions
        missingRadios.forEach(radio => {
          radio.addEventListener('change', () => {
            // Désactiver l'input file si une missing option est sélectionnée
            if (fileInput) {
              fileInput.disabled = missingRadios.some(r => r.checked);
            }
            
            // Sauvegarder la réponse
            if (radio.checked) {
              responses[q.id] = radio.value;
              responses[`${q.id}_missing`] = radio.value;
            } else {
              delete responses[q.id];
              delete responses[`${q.id}_missing`];
            }
            
            // Synchroniser les champs texte
            syncMissingTextFields();
            syncMissingFollowUps();
            saveLocal(true);
          });
        });
        
        // Gérer l'input file directement
        if (fileInput) {
          fileInput.addEventListener('change', (e) => {
            // Désactiver les missingOptions si un fichier est uploadé
            missingRadios.forEach(radio => {
              radio.checked = false;
            });
            syncMissingTextFields();
            
            // Sauvegarder les fichiers
            const files = Array.from(e.target.files);
            responses[q.id] = files.length > 0 ? files : undefined;
            delete responses[`${q.id}_missing`];

            // Masquer/vider les followUps inline
            syncMissingFollowUps();
            saveLocal(true);
          });
        }

        // Sauvegarde live des followUps inline (radio)
        questionDiv.querySelectorAll('.missing-followup input[type="radio"]').forEach(r => {
          r.addEventListener('change', (e) => {
            const fid = e.target.getAttribute('name');
            if (!fid) return;
            responses[fid] = String(e.target.value || '');
            saveLocal(true);
          });
        });
        
        // Gérer les champs texte des missingOptions
        questionDiv.querySelectorAll('.text-field-missing input[data-field]').forEach(input => {
          input.addEventListener('input', (e) => {
            const fieldId = e.target.getAttribute('data-field');
            if (fieldId) responses[fieldId] = String(e.target.value || '');
            saveLocal(true);
          });
        });
        
        // Initialiser l'état
        syncMissingTextFields();
        syncMissingFollowUps();
      }
    }
  }

  // Gestion des difficultés avec fréquences
  if (q.type === 'checkbox_multiple_with_frequency') {
    const questionDiv = document.querySelector(`[data-question-id="${q.id}"]`);
    if (questionDiv) {
      const rule = selectionLimitRules[q.id];
      questionDiv.querySelectorAll('input[name="multi_check"]').forEach(checkbox => {
        checkbox.addEventListener('change', () => {
          if (rule && checkbox.checked) {
            const checkedNow = questionDiv.querySelectorAll('input[name="multi_check"]:checked');
            if (checkedNow.length > rule.max) { checkbox.checked = false; return; }
          }
          const difficulty = checkbox.getAttribute('data-difficulty');
          const frequencyDiv = document.getElementById(`freq_${difficulty}`);
          const textDiv = document.getElementById(`text_${difficulty}`);
          if (frequencyDiv) {
            const isChecked = checkbox.checked;
            frequencyDiv.style.display = isChecked ? 'block' : 'none';
            if (textDiv) textDiv.style.display = isChecked ? 'block' : 'none';
            if (!isChecked) {
              frequencyDiv.querySelectorAll('input[type="radio"]').forEach(radio => {
                radio.checked = false;
                const fieldId = radio.getAttribute('data-frequency-field');
                if (fieldId && responses[fieldId]) delete responses[fieldId];
              });
              if (textDiv) {
                const ti = textDiv.querySelector('input[data-field]');
                const fid = ti?.getAttribute('data-field');
                if (ti) ti.value = '';
                if (fid && responses[fid]) delete responses[fid];
              }
            }
          }
          refreshUI();
        });
      });
      questionDiv.querySelectorAll('input[type="radio"][data-frequency-field]').forEach(radio => {
        radio.addEventListener('change', (e) => {
          const fieldId = e.target.getAttribute('data-frequency-field');
          if (fieldId) responses[fieldId] = e.target.value;
          saveLocal(true);
        });
      });
      questionDiv.querySelectorAll('input[type="text"][data-field]').forEach(input => {
        input.addEventListener('input', (e) => {
          const fieldId = e.target.getAttribute('data-field');
          if (fieldId) responses[fieldId] = e.target.value;
          saveLocal(true);
        });
      });
      refreshUI();
    }
  }

  // Gestion des checkbox_multiple avec/sans champs texte
  if (q.type === 'checkbox_multiple') {
    const questionDiv = document.querySelector(`[data-question-id="${q.id}"]`);
    if (questionDiv) {
      const rule = selectionLimitRules[q.id];
      const max1Auto = rule?.max === 1;

      const syncSubOptionTextFields = () => {
        try {
          questionDiv.querySelectorAll('.sub-options-container[id^="suboptions_"]').forEach(container => {
            container.querySelectorAll('.text-field-inline[data-subtext-for]').forEach(wrapper => {
              const subValue = wrapper.getAttribute('data-subtext-for');
              const cb = subValue
                ? container.querySelector(`input[name="sub_check"][value="${CSS.escape(subValue)}"]`)
                : null;
              const shouldShow = !!(cb && cb.checked);
              wrapper.style.display = shouldShow ? 'block' : 'none';
              if (!shouldShow) {
                const input = wrapper.querySelector('input[data-subtextfield]');
                const fid = input?.getAttribute('data-subtextfield');
                if (input) input.value = '';
                if (fid && responses[fid] !== undefined) delete responses[fid];
              }
            });
          });
        } catch {}
      };

      questionDiv.querySelectorAll('input[name="multi_check"]').forEach(cb => {
        cb.addEventListener('change', () => {
          if (rule && cb.checked && rule.max > 1) {
            const checkedNow = questionDiv.querySelectorAll('input[name="multi_check"]:checked');
            if (checkedNow.length > rule.max) { cb.checked = false; return; }
          }

          if (max1Auto && cb.checked) {
            questionDiv.querySelectorAll('input[name="multi_check"]:checked').forEach(other => {
              if (other !== cb) other.checked = false;
            });
          }
          const subContainer = document.getElementById(`suboptions_${cb.value}`);
          if (subContainer) {
            subContainer.hidden = !cb.checked;
            if (!cb.checked) {
              subContainer.querySelectorAll('input[name="sub_check"]').forEach(sub => sub.checked = false);
              const subField = subContainer.querySelector('input[data-suboptions-field]')?.getAttribute('data-suboptions-field');
              if (subField && responses[subField]) delete responses[subField];

              subContainer.querySelectorAll('input[data-subfield]').forEach(inp => {
                const fid = inp.getAttribute('data-subfield');
                if (fid && responses[fid] !== undefined) delete responses[fid];
                inp.value = '';
              });
              subContainer.querySelectorAll('input[data-subtextfield]').forEach(inp => {
                const fid = inp.getAttribute('data-subtextfield');
                if (fid && responses[fid] !== undefined) delete responses[fid];
                inp.value = '';
              });
            }
          }

          syncSubOptionTextFields();
          refreshUI();
        });
      });

      questionDiv.querySelectorAll('input[name="multi_check"][data-has-text="true"]').forEach(cb => {
        cb.addEventListener('change', () => {
          const textDiv = document.getElementById(`text_${cb.value}`);
          if (textDiv) {
            textDiv.style.display = cb.checked ? 'block' : 'none';
            if (!cb.checked) {
              const ti = textDiv.querySelector('input[data-field]');
              const fid = ti?.getAttribute('data-field');
              if (ti) ti.value = '';
              if (fid && responses[fid]) { delete responses[fid]; saveLocal(true); }
            }
          }
        });
      });
      questionDiv.querySelectorAll('input[name="sub_check"]').forEach(subCb => {
        subCb.addEventListener('change', () => {
          const container = document.getElementById(`suboptions_${subCb.getAttribute('data-parent')}`);
          const subField = subCb.getAttribute('data-suboptions-field');
          if (!subField || !container) return;
          const values = Array.from(container.querySelectorAll('input[name="sub_check"]:checked')).map(x => x.value);
          if (values.length) responses[subField] = values; else delete responses[subField];

          syncSubOptionTextFields();
          saveLocal(true);
        });
      });

      questionDiv.querySelectorAll('.sub-options-container input[data-subtextfield]').forEach(input => {
        input.addEventListener('input', (e) => {
          const fid = e.target.getAttribute('data-subtextfield');
          if (!fid) return;
          const val = String(e.target.value || '');
          if (val) responses[fid] = val;
          else delete responses[fid];
          saveLocal(true);
        });
      });

      questionDiv.querySelectorAll('.text-field-checkbox input[data-field]').forEach(input => {
        input.addEventListener('input', (e) => {
          const fieldId = e.target.getAttribute('data-field');
          if (fieldId) responses[fieldId] = e.target.value;
          saveLocal(true);
        });
      });

      syncSubOptionTextFields();
      refreshUI();
    }
  }

    // Init état du bouton Suivant après attachement des listeners
  try {
    if (typeof __nextBtnEl !== 'undefined' && __nextBtnEl) {
      const div = document.querySelector(`[data-question-id="${q.id}"]`);
      const hasViolation = isSelectionOverLimit(div, q.id);
      __nextBtnEl.disabled = hasViolation;
    }
  } catch {
  }

  updateSelectionLimitUI();

  updateProgress(idx, visible);
}

export function renderMultiQuestionPage(questions, idx, visible, nextCallback, prevCallback) {
  setContainerMode(null);

  let __nextBtnEl = null;

  // Restaurer la barre de progression et l'en-tête
  setProgressVisible(true);
  setFormHeaderVisible(true);

  ensureNavButtonsVisible();

  // Construire le HTML avec toutes les questions
  let sectionHtml = `<div class="coordonnees-page section-container">`;
  
  // Titre de la première question (ou section)
  const firstQ = questions[0];
  if (firstQ && firstQ.sectionTitle) {
    sectionHtml += `<h2 class="q-title">${firstQ.sectionTitle}</h2>`;
  }

  const firstDescription = (firstQ && (firstQ.sectionDescription || firstQ.description)) ? (firstQ.sectionDescription || firstQ.description) : '';
  if (firstDescription) {
    sectionHtml += `<p class="q-description">${firstDescription}</p>`;
  }

  questions.forEach(q => {
    // Gestion spéciale pour les sections avec checkbox (CGU)
    if (q.hasCheckbox && q.isIntroduction) {
      sectionHtml += `
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
        </div>
      `;
    } else {
      sectionHtml += `
        <div class="question-card" data-question-id="${q.id}">
          ${renderInput(q, responses[q.id])}
        </div>
      `;
    }
  });

  sectionHtml += `</div>`;

  $('questionArea').innerHTML = sectionHtml;

  // Restaurer les boutons avec gestion spéciale pour terms_acceptance
  const lastQ = questions[questions.length - 1];
  const hasTermsAcceptance = lastQ && lastQ.hasCheckbox && lastQ.isIntroduction;

  setupNavButton('prevBtn', { visible: true, text: 'Précédent', className: 'btn', onClick: prevCallback });

  const nextText = hasTermsAcceptance ? (lastQ.buttonText || 'Continuer') : 'Suivant';
  __nextBtnEl = setupNavButton('nextBtn', {
    visible: true,
    text: nextText,
    className: 'btn btn-primary',
    onClick: () => {
      if (hasTermsAcceptance && lastQ.requireCheckbox) {
        const termsCheckbox = document.getElementById('terms_checkbox');
        if (termsCheckbox && !termsCheckbox.checked) {
          alert('Vous devez accepter les conditions d\'utilisation pour continuer.');
          return;
        }
        responses[lastQ.id] = termsCheckbox && termsCheckbox.checked ? 'accepted' : '';
        saveLocal(true);
        redirectToFinalStep();
        return;
      }
      if (nextCallback) nextCallback();
    }
  });

  // Gestion spéciale pour le checkbox CGU
  if (__nextBtnEl && hasTermsAcceptance && lastQ.requireCheckbox) {
    const termsCheckbox = document.getElementById('terms_checkbox');
    if (termsCheckbox) {
      __nextBtnEl.disabled = !termsCheckbox.checked;
      termsCheckbox.addEventListener('change', function() {
        __nextBtnEl.disabled = !this.checked;
      });
    }
  }

  // Attacher les événements pour chaque question (sauf terms_acceptance déjà géré)
  questions.forEach(q => {
    if (q.hasCheckbox && q.isIntroduction) return; // Déjà géré ci-dessus

    const questionDiv = document.querySelector(`[data-question-id="${q.id}"]`);
    if (!questionDiv) return;

    // Sauvegarde live pour texte/email/textarea
    if (q.type === 'text' || q.type === 'email' || q.type === 'textarea') {
      const input = questionDiv.querySelector('input, textarea');
      if (input) {
        input.addEventListener('input', function () {
          responses[q.id] = String(this.value ?? '');
          saveLocal(true);
        });
      }
    }

    // Gestion des missingOptions pour les inputs file (incluant followUp inline)
    if (q.type === 'file' && q.missingOptions) {
      const missingRadios = questionDiv.querySelectorAll('input[name="' + q.id + '_missing"]');
      const fileInput = questionDiv.querySelector('#answer');

      const syncMissingTextFields = () => {
        missingRadios.forEach(radio => {
          const textFieldDiv = document.getElementById(`text_${radio.value}`);
          if (textFieldDiv) textFieldDiv.style.display = radio.checked ? 'block' : 'none';
        });
      };

      const syncMissingFollowUps = () => {
        try {
          const checked = questionDiv.querySelector(`input[name="${q.id}_missing"]:checked`);
          const selected = checked ? String(checked.value || '') : '';
          questionDiv.querySelectorAll('.missing-followup[data-missing-followup-for]').forEach(el => {
            const key = el.getAttribute('data-missing-followup-for');
            const shouldShow = !!(selected && key === selected);
            el.style.display = shouldShow ? 'block' : 'none';
            if (!shouldShow) {
              el.querySelectorAll('input[type="radio"]').forEach(r => r.checked = false);
              const fid = el.querySelector('input[type="radio"]')?.getAttribute('name');
              if (fid && responses[fid] !== undefined) delete responses[fid];
            }
          });
        } catch {
        }
      };

      missingRadios.forEach(radio => {
        radio.addEventListener('change', () => {
          if (fileInput) fileInput.disabled = missingRadios.some(r => r.checked);

          if (radio.checked) {
            responses[q.id] = radio.value;
            responses[`${q.id}_missing`] = radio.value;
          } else {
            delete responses[q.id];
            delete responses[`${q.id}_missing`];
          }

          syncMissingTextFields();
          syncMissingFollowUps();
          saveLocal(true);
        });
      });

      if (fileInput) {
        fileInput.addEventListener('change', (e) => {
          missingRadios.forEach(r => (r.checked = false));
          syncMissingTextFields();

          const files = Array.from(e.target.files);
          responses[q.id] = files.length > 0 ? files : undefined;
          delete responses[`${q.id}_missing`];

          syncMissingFollowUps();
          saveLocal(true);
        });
      }

      questionDiv.querySelectorAll('.missing-followup input[type="radio"]').forEach(r => {
        r.addEventListener('change', (e) => {
          const fid = e.target.getAttribute('name');
          if (!fid) return;
          responses[fid] = String(e.target.value || '');
          saveLocal(true);
        });
      });

      syncMissingTextFields();
      syncMissingFollowUps();
    }

    // Gestion des radios avec followUp inline (subtab)
    if (q.type === 'radio') {
      const radioInputs = questionDiv.querySelectorAll('input[type="radio"][name="' + q.id + '"]');
      
      const syncRadioFollowUps = () => {
        const checked = questionDiv.querySelector('input[type="radio"][name="' + q.id + '"]:checked');
        const selectedValue = checked ? String(checked.value) : '';
        
        questionDiv.querySelectorAll('.sub-options-container[data-followup-for]').forEach(el => {
          const key = el.getAttribute('data-followup-for');
          const shouldShow = !!(selectedValue && key === selectedValue);
          el.style.display = shouldShow ? 'block' : 'none';
          if (!shouldShow) {
            el.querySelectorAll('input[type="radio"]').forEach(r => r.checked = false);
            const fid = el.querySelector('input[type="radio"]')?.getAttribute('name');
            if (fid && responses[fid] !== undefined) delete responses[fid];
          }
        });
        saveLocal(true);
      };
      
      radioInputs.forEach(radio => {
        radio.addEventListener('change', syncRadioFollowUps);
      });
      
      // Sauvegarde live des followUps inline (radio)
      questionDiv.querySelectorAll('.sub-options-container[data-followup-for] input[type="radio"]').forEach(r => {
        r.addEventListener('change', (e) => {
          const fid = e.target.getAttribute('name');
          if (!fid) return;
          responses[fid] = String(e.target.value || '');
          saveLocal(true);
        });
      });
      
      syncRadioFollowUps();
    }
  });

  updateProgress(idx, visible);
}