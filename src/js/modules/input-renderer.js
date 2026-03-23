/**
 * Renders form inputs based on question type and configuration.
 * Handles various input types including text, radio, checkboxes, and custom components.
 */

import { normalizeOuiNon } from '../../utils/utils.js';
import { responses } from './storage.js';

export function renderInput(q, value) {
  const type = q.type || q.type_champ;
  console.log('renderInput:', q.id, 'description:', q.description); // DEBUG
  const description = q.description ? `<div class="field-description">${q.description}</div>` : '';

  const shouldAutoAddTextField = (optValue, optLabel, opt) => {
    if (!opt || opt.hasTextField) return false;
    if (typeof optLabel === 'string' && /^\s*autre\b/i.test(optLabel)) return true;
    if (typeof optValue === 'string' && /^autre/i.test(optValue)) return true;
    return false;
  };

  const withPrecisez = (label) => {
    const base = String(label || '');
    if (/pr\s*é\s*c\s*i\s*s\s*e\s*z/i.test(base)) return base;
    return `${base} (précisez)`;
  };
  
  if (type === 'file') {
    const isMultiple = q.multiple === true;
    const acceptAttr = q.accept ? `accept="${q.accept}"` : '';
    const multipleAttr = isMultiple ? 'multiple' : '';
    const hint = q.hint ? `<div class="field-description">${q.hint}</div>` : '';

    // Ajouter les missingOptions si présentes
    let missingOptionsHtml = '';
    if (q.missingOptions && Array.isArray(q.missingOptions)) {
      missingOptionsHtml = `
        <div class="missing-options">
          ${q.missingOptions.map(opt => {
            const optValue = opt.value || opt;
            const optLabel = opt.label || opt;
            const hasTextField = opt.hasTextField || false;
            const textFieldId = `${optValue}_text`;
            const textFieldValue = responses[textFieldId] || '';
            
            let optionHtml = `
              <label class="choice missing-option">
                <input type="radio" name="${q.id}_missing" value="${optValue}" 
                       data-has-text="${hasTextField ? 'true' : 'false'}" />
                <span>${optLabel}</span>
              </label>`;
            
            // Ajouter le champ texte si cette option l'a
            if (hasTextField) {
              optionHtml += `
                <div class="text-field-missing" id="text_${optValue}" hidden>
                  <input type="text" 
                         placeholder="${opt.textFieldPlaceholder || 'Précisez...'}" 
                         value="${textFieldValue}" 
                         data-field="${textFieldId}"
                         class="input" />
                </div>`;
            }
            
            return optionHtml;
          }).join('')}
        </div>`;
    }

    return `
      <div class="field-container">
        ${q.question ? `<div class="question-title">${q.question}</div>` : ''}
        ${description}
        ${hint}
        <input class="input" id="answer" type="file" ${acceptAttr} ${multipleAttr} />
        ${missingOptionsHtml}
      </div>`;
  }

  if (type === 'text' || type === 'email') {
    const inputType = type === 'email' && q.className !== 'coordonnees-page' ? 'email' : 'text';
    return `
      <div class="field-container">
        ${q.question ? `<div class="question-title">${q.question}</div>` : ''}
        ${description}
        <input class="input" id="answer" type="${inputType}" placeholder="${q.placeholder || ''}" value="${value ? String(value) : ''}" />
      </div>`;
  }
  
  if (type === 'texte_long' || type === 'textarea') {
    const charCount = q.showCharCount ? `
      <div class="char-counter">
        <span class="char-count">0</span> / ${q.maxLength || 600} caractères
        ${q.minLength ? `<span class="char-min">(minimum ${q.minLength})</span>` : ''}
      </div>
    ` : '';

    const textareaClass = q.showCharCount ? 'input textarea-large' : 'input';
    const rowsAttr = q.rows ? `rows="${q.rows}"` : (q.showCharCount ? 'rows="10"' : '');
    
    return `
      <div class="field-container">
        ${q.question ? `<div class="question-title">${q.question}</div>` : ''}
        ${description}
        <textarea class="${textareaClass}" id="answer" ${rowsAttr}
                  placeholder="${q.placeholder || 'Votre réponse...'}"
                  ${q.minLength ? `minlength="${q.minLength}"` : ''}
                  ${q.maxLength ? `maxlength="${q.maxLength}"` : ''}
                  ${q.showCharCount ? 'data-char-counter="true"' : ''}>${value ? String(value) : ''}</textarea>
        ${charCount}
      </div>`;
  }

  if (type === 'date') {
    return `
      <div class="field-container">
        <input class="input" id="answer" type="date" value="${value ? String(value) : ''}" />
        ${description}
      </div>`;
  }

  if (type === 'checkbox') {
    const defaultVal = q.defaultValue !== undefined ? q.defaultValue : false;
    const currentValue = value !== undefined ? value : defaultVal;
    const checked = currentValue ? 'checked' : '';
    const checkboxValue = q.id || 'checkbox_value';
    return `
      <div class="field-container">
        ${description}
        <label class="choice">
          ${q.label}
          <input type="checkbox" id="answer" value="${checkboxValue}" ${checked}/> 
        </label>
      </div>`;
  }

  if (type === 'checkbox_single') {
    const defaultVal = q.defaultValue !== undefined ? q.defaultValue : false;
    const currentValue = value !== undefined ? value : defaultVal;
    const checked = currentValue ? 'checked' : '';
    const checkboxValue = q.id || 'checkbox_value';
    const label = q.checkboxLabel || q.label || '';
    return `
      <div class="field-container">
        ${description}
        <label class="choice">
          ${label}
          <input type="checkbox" id="answer" value="${checkboxValue}" ${checked}/> 
        </label>
      </div>`;
  }

  if (type === 'checkbox_multiple_with_frequency' && Array.isArray(q.options)) {
    const selectedValues = Array.isArray(value) ? value : [];
    const frequencyOptions = q.frequencyOptions || [
      {"value": "quotidien", "label": "Tous les jours"},
      {"value": "fluctuant", "label": "Fluctuant"},
      {"value": "hebdomadaire", "label": "Plusieurs fois par semaine"}
    ];
    
    return `
      <div class="field-container">
        <div class="question-text">
          ${q.question ? `<div class="question-title">${q.question}</div>` : ''}
          ${description}
        </div>
        <div class="difficultes-with-frequency" id="answer">
          ${q.options.map(opt => {
            const optValue = opt.value || opt;
            const optLabel = opt.label || opt;
            const checked = selectedValues.includes(optValue) ? 'checked' : '';
            const frequencyFieldId = opt.frequencyField || `freq_${optValue}`;
            const currentFrequency = responses[frequencyFieldId] || '';
            const textFieldId = opt.pdfField ? `${opt.pdfField}_text` : `${optValue}_text`;
            const textFieldValue = responses[textFieldId] || '';
            
            return `
              <div class="difficulte-item" data-value="${optValue}">
                <label class="choice">
                  <input type="checkbox" name="multi_check" value="${optValue}" ${checked} 
                         data-difficulty="${optValue}" />
                  <span>${optLabel}</span>
                </label>
                
                ${opt.hasTextField ? `
                  <div class="text-field-checkbox" id="text_${optValue}" ${checked ? '' : 'hidden'}>
                    <input type="text" placeholder="${opt.textFieldPlaceholder || 'Précisez...'}" 
                           value="${textFieldValue}" 
                           data-field="${textFieldId}"
                           class="text-input" />
                  </div>
                ` : ''}
                
                <div class="frequency-options" id="freq_${optValue}" ${checked ? '' : 'hidden'}>
                  <div class="frequency-label">Fréquence :</div>
                  <div class="frequency-choices">
                    ${frequencyOptions.map(freqOpt => `
                      <label class="frequency-choice">
                        <input type="radio" name="freq_${optValue}" value="${freqOpt.value}" 
                               ${currentFrequency === freqOpt.value ? 'checked' : ''}
                               data-frequency-field="${frequencyFieldId}" />
                        <span>${freqOpt.label}</span>
                      </label>
                    `).join('')}
                  </div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
      
`;
  }

  if (type === 'checkbox_multiple' && Array.isArray(q.options)) {
    const selectedValues = Array.isArray(value) ? value : [];
    
    // Special styling for Daily Difficulties section
    const isDifficultesQuotidiennes = q.id === 'difficultes_quotidiennes';
    const containerClass = isDifficultesQuotidiennes ? 'difficultes-container' : 'choice-grid';
    const choiceClass = isDifficultesQuotidiennes ? 'difficulte-choice' : 'choice';
    
    // Skip question display for Daily Difficulties as it's in the section title
    const showQuestion = !isDifficultesQuotidiennes && q.question;
    
    return `
      <div class="field-container">
        <div class="question-text">
          ${showQuestion ? `<div class="question-title">${q.question}</div>` : ''}
          ${description}
        </div>
        <div class="${containerClass}" id="answer">
          ${q.options.map(opt => {
            const optValue = opt.value || opt;
            const optLabel = opt.label || opt;
            const checked = selectedValues.includes(optValue) ? 'checked' : '';
            
            let optionHtml = `
              <div class="checkbox-option-container" data-value="${optValue}">
                <label class="choice">
                  <input type="checkbox" name="multi_check" value="${optValue}" ${checked} 
                         data-has-text="${opt.hasTextField ? 'true' : 'false'}" 
                         data-has-suboptions="${opt.subOptions && opt.subOptions.length > 0 ? 'true' : 'false'}" />
                  ${optLabel}
                </label>`;
            
            // Ajouter le champ texte si cette option l'a
            if (opt.hasTextField) {
              const textFieldId = opt.pdfField ? `${opt.pdfField}_text` : `${optValue}_text`;
              const textFieldValue = responses[textFieldId] || '';
              optionHtml += `
                <div class="text-field-checkbox" id="text_${optValue}" ${checked ? '' : 'hidden'}>
                  <input type="text" 
                         placeholder="${opt.textFieldPlaceholder || 'Précisez...'}" 
                         value="${textFieldValue}" 
                         data-field="${textFieldId}"
                         class="text-input" />
                </div>`;
            }
            
            // Ajouter les sous-choix si présents
            if (opt.subOptions && Array.isArray(opt.subOptions) && opt.subOptions.length > 0) {
              const subOptionsFieldId = `${optValue}_suboptions`;
              const selectedSubOptions = Array.isArray(responses[subOptionsFieldId]) ? responses[subOptionsFieldId] : [];
              const subTitle = opt.subOptionsTitle ? `<div class="sub-options-title">${opt.subOptionsTitle}</div>` : '';
              
              optionHtml += `
                <div class="sub-options-container" id="suboptions_${optValue}" ${checked ? '' : 'hidden'}>
                  ${subTitle}
                  <div class="sub-options-grid">
                    ${opt.subOptions.map(subOpt => {
                      const subType = subOpt && subOpt.type ? String(subOpt.type) : 'checkbox';
                      if (subType === 'date' || subType === 'text') {
                        const subFieldId = subOpt.fieldId || `${q.id}__${optValue}__${subOpt.value || 'field'}`;
                        const subVal = responses[subFieldId] || '';
                        const inputType = subType === 'date' ? 'date' : 'text';
                        return `
                          <label class="sub-choice">
                            <span>${subOpt.label || ''}</span>
                            <input class="input" type="${inputType}" value="${String(subVal)}" data-subfield="${subFieldId}" />
                          </label>
                        `;
                      }

                      const subChecked = selectedSubOptions.includes(subOpt.value) ? 'checked' : '';
                      return `
                        <label class="sub-choice">
                          <input type="checkbox" name="sub_check" value="${subOpt.value}" ${subChecked}
                                 data-parent="${optValue}" data-suboptions-field="${subOptionsFieldId}" />
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
      </div>`;
  }

  if (type === 'radio' && Array.isArray(q.options)) {
    const defaultVal = q.defaultValue !== undefined ? q.defaultValue : '';
    const currentValue = value !== undefined ? value : defaultVal;
    
    // Preserve boolean values without string conversion
    const v = currentValue;
    
    // Format description with line breaks if it exists
    const description = q.description ? `
      <div class="field-description">
        ${q.description.replace(/\n/g, '<br>')}
      </div>` : '';
    
    return `
      <div class="field-container">
        ${description}
        <div class="choice-grid" id="answer">
          ${q.options.map(opt => {
            const optValue = opt.value || opt;
            const optLabel = opt.label || opt;

            const autoAddText = shouldAutoAddTextField(optValue, optLabel, opt);
            const hasTextField = !!(opt && opt.hasTextField) || autoAddText;
            const textFieldId = (opt && opt.pdfField) ? `${opt.pdfField}_text` : `${optValue}_text`;
            const textFieldValue = responses[textFieldId] || '';
            
            // Handle both boolean and string comparisons
            let isChecked;
            if (typeof v === 'boolean' && (optValue === true || optValue === false)) {
              isChecked = v === optValue;
            } else {
              isChecked = String(optValue) === String(v);
            }
            
            const checked = isChecked ? 'checked' : '';

            const finalLabel = autoAddText ? withPrecisez(optLabel) : String(optLabel);
            let radioHtml = `
              <div class="radio-option-container" data-value="${optValue}">
                <label class="choice">
                  <input type="radio" name="${q.id}" value="${optValue}" ${checked} 
                         data-has-text="${hasTextField ? 'true' : 'false'}" 
                         data-has-suboptions="${opt.subOptions && opt.subOptions.length > 0 ? 'true' : 'false'}" />
                  <span>${finalLabel}</span>
                </label>`;
            
            if (hasTextField) {
              radioHtml += `
                <div class="text-field-inline" data-text-for="${optValue}" style="${isChecked ? '' : 'display:none'}">
                  <input type="text" placeholder="${(opt && opt.textFieldPlaceholder) ? opt.textFieldPlaceholder : 'Précisez...'}" value="${textFieldValue}" data-field="${textFieldId}" class="text-input" />
                </div>`;
            }
            
            if (opt.subOptions && Array.isArray(opt.subOptions) && opt.subOptions.length > 0) {
              const subOptionsFieldId = `${optValue}_suboptions`;
              const selectedSubOptions = Array.isArray(responses[subOptionsFieldId]) ? responses[subOptionsFieldId] : [];
              const subTitle = (opt && opt.subOptionsTitle) ? `<div class="sub-options-title">${opt.subOptionsTitle}</div>` : '';
              
              radioHtml += `
                <div class="sub-options-container" id="suboptions_${optValue}" style="${isChecked ? '' : 'display:none'}">
                  ${subTitle}
                  <div class="sub-options-grid">
                    ${opt.subOptions.map(subOpt => {
                      const subType = subOpt && subOpt.type ? String(subOpt.type) : 'checkbox';
                      if (subType === 'date' || subType === 'text') {
                        const subFieldId = subOpt.fieldId || `${q.id}__${optValue}__${subOpt.value || 'field'}`;
                        const subVal = responses[subFieldId] || '';
                        const inputType = subType === 'date' ? 'date' : 'text';
                        return `
                          <label class="sub-choice">
                            <span>${subOpt.label || ''}</span>
                            <input class="input" type="${inputType}" value="${String(subVal)}" data-subfield="${subFieldId}" />
                          </label>
                        `;
                      }

                      const subChecked = selectedSubOptions.includes(subOpt.value) ? 'checked' : '';
                      return `
                        <label class="sub-choice">
                          <input type="checkbox" name="sub_check" value="${subOpt.value}" ${subChecked}
                                 data-parent="${optValue}" data-suboptions-field="${subOptionsFieldId}" />
                          <span>${subOpt.label}</span>
                        </label>
                      `;
                    }).join('')}
                  </div>
                </div>`;
            }
            
            radioHtml += `</div>`;
            return radioHtml;
          }).join('')}
        </div>
      </div>`;
  }

  if (type === 'radio_with_text' && Array.isArray(q.options)) {
    const defaultVal = q.defaultValue !== undefined ? q.defaultValue : '';
    const currentValue = value !== undefined ? value : defaultVal;
    const v = currentValue ? String(currentValue) : '';
    
    return `
      <div>
        ${q.description ? `<div class="field-description">${q.description}</div>` : ''}
        <div class="choice-grid" id="answer">
          ${q.options.map(opt => {
            const optValue = opt.value || opt;
            const optLabel = opt.label || opt;
            const checked = String(optValue) === v ? 'checked' : '';
            return `<label class="choice"><input type="radio" name="opt_${q.id}" value="${optValue}" ${checked}/> ${optLabel}</label>`;
          }).join('')}
        </div>
      </div>`;
  }

  if (type === 'oui_non') {
    const v = normalizeOuiNon(value);
    const checkedOui = v === 'oui' ? 'checked' : '';
    const checkedNon = v === 'non' ? 'checked' : '';
    
    return `
      <div>
        ${q.description ? `<div class="field-description">${q.description}</div>` : ''}
        <div class="choice-grid" id="answer">
          <label class="choice"><input type="radio" name="yn_${q.id}" value="oui" ${checkedOui}/> Oui</label>
          <label class="choice"><input type="radio" name="yn_${q.id}" value="non" ${checkedNon}/> Non</label>
        </div>
      </div>`;
  }

  if (type === 'choix_multiple' && Array.isArray(q.valeurs_possibles)) {
    const v = value ? String(value) : '';
    return `
      <div class="choice-grid" id="answer">
        ${q.valeurs_possibles.map(opt => {
          const checked = opt === v ? 'checked' : '';
          return `<label class="choice"><input type="radio" name="opt_${q.id}" value="${opt}" ${checked}/> ${opt}</label>`;
        }).join('')}
      </div>
    `;
  }

  // Default to text input for unknown types
  return `
    <div class="field-container">
      <input class="input" id="answer" type="text" placeholder="Ta réponse..." value="${value ? String(value) : ''}" />
      ${description ? `<div class="field-description">${description}</div>` : ''}
    </div>`;
}
