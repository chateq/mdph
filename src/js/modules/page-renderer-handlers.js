/**
 * Gestionnaires d'événements pour les différents types de questions.
 * Ce module centralise toute la logique d'interaction utilisateur complexe.
 */

import { $ } from './dom-utils.js';
import { responses, saveLocal } from './storage.js';

// Règles de limite de sélection
export const selectionLimitRules = {
  situation_generale: { max: 2, message: 'Choisissez 1 ou 2 situations maximum.' },
  difficultes_quotidiennes: { max: 3, message: 'Essayez de garder uniquement les 3 difficultés les plus importantes.' },
  difficultes_travail: { max: 2, message: 'Choisissez jusqu\'à 2 difficultés principales.' },
  consequences_difficultes: { max: 2, message: 'Indiquez uniquement les 2 conséquences les plus marquantes.' },
  consequences_travail: { max: 2, message: 'Indiquez uniquement les 2 conséquences les plus marquantes.' },
  type_demande: { max: 3, message: 'Pour plus de clarté, choisissez jusqu\'à 3 aides utiles.' },
  priorites_actuelles: { max: 4, message: 'Concentrez-vous sur 4 priorités maximum.' }
};

export const isSelectionOverLimit = (questionDiv, questionId) => {
  const rule = selectionLimitRules[questionId];
  if (!rule || !questionDiv) return false;
  const checked = questionDiv.querySelectorAll('input[name="multi_check"]:checked');
  return (checked?.length || 0) > rule.max;
};

// ===== HANDLERS POUR RADIO =====
export function setupRadioHandlers(questionDiv, q) {
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

    questionDiv.querySelectorAll('.sub-options-container[data-followup-for]').forEach(el => {
      const key = el.getAttribute('data-followup-for');
      const shouldShow = !!(selectedValue && key === selectedValue);
      el.style.display = shouldShow ? 'block' : 'none';
      if (!shouldShow) {
        const followUpId = el.getAttribute('data-followup-id');
        el.querySelectorAll('input[type="radio"]').forEach(r => r.checked = false);
        const fid = el.querySelector('input[type="radio"]')?.getAttribute('name');
        if (fid && responses[fid] !== undefined) delete responses[fid];
        el.querySelectorAll('input[type="checkbox"][data-followup-checkbox="true"]').forEach(cb => (cb.checked = false));
        if (followUpId && responses[followUpId] !== undefined) delete responses[followUpId];
        el.querySelectorAll('input[data-followup-text-field-id]').forEach(inp => {
          const tid = inp.getAttribute('data-followup-text-field-id');
          if (tid && responses[tid] !== undefined) delete responses[tid];
          inp.value = '';
          const wrapper = inp.closest('.text-field-checkbox');
          if (wrapper) wrapper.style.display = 'none';
        });
        el.querySelectorAll('[data-followup-textquestion-id]').forEach(inp => {
          const tid = inp.getAttribute('data-followup-textquestion-id');
          if (tid && responses[tid] !== undefined) delete responses[tid];
          inp.value = '';
        });
      }
    });

    syncSubOptionTextFields();
    saveLocal(true);
  };

  radioInputs.forEach(radio => radio.addEventListener('change', syncRadioTextFields));

  questionDiv.querySelectorAll('.text-field-inline input[data-field]').forEach(input => {
    input.addEventListener('input', (e) => {
      const fieldId = e.target.getAttribute('data-field');
      if (fieldId) responses[fieldId] = e.target.value;
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

  questionDiv.querySelectorAll('.sub-options-container[data-followup-for] input[type="radio"]').forEach(r => {
    r.addEventListener('change', (e) => {
      const fid = e.target.getAttribute('name');
      if (!fid) return;
      responses[fid] = String(e.target.value || '');
      saveLocal(true);
    });
  });

  questionDiv.querySelectorAll('.sub-options-container[data-followup-for] input[type="checkbox"][data-followup-checkbox="true"]').forEach(cb => {
    cb.addEventListener('change', (e) => {
      const followUpId = e.target.getAttribute('data-followup-id');
      if (!followUpId) return;
      const container = e.target.closest(`.sub-options-container[data-followup-id="${CSS.escape(followUpId)}"]`) || questionDiv;
      const checkedValues = Array.from(container.querySelectorAll(`input[type="checkbox"][data-followup-checkbox="true"][data-followup-id="${CSS.escape(followUpId)}"]:checked`)).map(x => x.value);
      if (checkedValues.length) responses[followUpId] = checkedValues;
      else delete responses[followUpId];
      const hasText = e.target.getAttribute('data-has-text') === 'true';
      if (hasText) {
        const val = String(e.target.value || '');
        const wrapper = container.querySelector(`.text-field-checkbox[data-followup-text-for="${CSS.escape(val)}"]`);
        if (wrapper) wrapper.style.display = e.target.checked ? 'block' : 'none';
        if (!e.target.checked) {
          const textId = e.target.getAttribute('data-followup-text-field-id');
          if (textId && responses[textId] !== undefined) delete responses[textId];
          const input = wrapper?.querySelector('input[data-followup-text-field-id]');
          if (input) input.value = '';
        }
      }
      saveLocal(true);
    });
  });

  questionDiv.querySelectorAll('.sub-options-container[data-followup-for] input[data-followup-text-field-id]').forEach(inp => {
    const handler = (e) => {
      const fid = e.target.getAttribute('data-followup-text-field-id');
      if (!fid) return;
      const val = String(e.target.value || '');
      if (val) responses[fid] = val;
      else delete responses[fid];
      saveLocal(true);
    };
    inp.addEventListener('input', handler);
    inp.addEventListener('change', handler);
  });

  questionDiv.querySelectorAll('.sub-options-container[data-followup-for] [data-followup-textquestion-id]').forEach(inp => {
    const handler = (e) => {
      const fid = e.target.getAttribute('data-followup-textquestion-id');
      if (!fid) return;
      const val = String(e.target.value || '');
      if (val) responses[fid] = val;
      else delete responses[fid];
      saveLocal(true);
    };
    inp.addEventListener('input', handler);
    inp.addEventListener('change', handler);
  });

  syncRadioTextFields();
  syncSubOptionTextFields();
}

// ===== HANDLERS POUR FILE =====
export function setupFileHandlers(questionDiv, q) {
  if (!q.missingOptions) return;

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
    } catch {}
  };

  missingRadios.forEach(radio => {
    radio.addEventListener('change', () => {
      if (fileInput) fileInput.disabled = missingRadios.some(r => r.checked);
      if (radio.checked) {
        responses[q.id] = radio.value;
        responses[q.id + '_missing'] = radio.value;
      } else {
        delete responses[q.id];
        delete responses[q.id + '_missing'];
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
      delete responses[q.id + '_missing'];
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

  questionDiv.querySelectorAll('.text-field-missing input[data-field]').forEach(input => {
    input.addEventListener('input', (e) => {
      const fieldId = e.target.getAttribute('data-field');
      if (fieldId) responses[fieldId] = String(e.target.value || '');
      saveLocal(true);
    });
  });

  syncMissingTextFields();
  syncMissingFollowUps();
}

// ===== HANDLERS POUR CHECKBOX MULTIPLE =====
export function setupCheckboxMultipleHandlers(questionDiv, q, refreshUI) {
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
}

// ===== HANDLERS POUR CHECKBOX WITH FREQUENCY =====
export function setupCheckboxWithFrequencyHandlers(questionDiv, q, refreshUI) {
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
}
