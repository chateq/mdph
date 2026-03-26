/**
 * Extraction des réponses depuis le DOM.
 * Important: pour les radios, on retourne toujours des chaînes (compatibilité conditions).
 */

import { $ } from './dom-utils.js';
import { responses } from './storage.js';

function getScope(q) {
  try {
    if (q && q.id) {
      const byId = document.querySelector(`[data-question-id="${q.id}"]`);
      if (byId) return byId;
    }
  } catch {
  }
  return document;
}

export function getAnswerFromDom(q) {
  const type = q.type || q.type_champ;
  const scope = getScope(q);
  
  // Debug
  console.log('getAnswerFromDom - question:', q.id, 'type:', type, 'scope:', scope);

  if (type === 'file') {
    // Vérifier d'abord si une missing option est sélectionnée
    if (q.missingOptions && Array.isArray(q.missingOptions)) {
      const missingRadio = scope.querySelector(`input[name="${q.id}_missing"]:checked`);
      if (missingRadio) {
        // Exposer aussi <id>_missing pour les condition_affichage
        try {
          responses[`${q.id}_missing`] = String(missingRadio.value);
        } catch {
        }
        return missingRadio.value; // Retourner la valeur de la missing option cochée
      }
    }
    
    // Sinon, retourner les fichiers uploadés
    const el = scope.querySelector('#answer') || $('answer');
    if (!el || !el.files) return [];
    return Array.from(el.files).map(f => f.name);
  }
  
  if (type === 'checkbox') {
    if (Array.isArray(q.options) && q.options.length > 0) {
      const checkedBoxes = scope.querySelectorAll(`input[name="${q.id}"]:checked`);
      return Array.from(checkedBoxes).map(cb => cb.value);
    }

    const el = scope.querySelector('#answer');
    return el ? el.checked : false;
  }
  
  if (type === 'checkbox_single') {
    const el = (q && q.id ? scope.querySelector(`#${q.id}`) : null)
      || scope.querySelector('#answer');
    return el ? el.checked === true : false;
  }
  
  if (type === 'checkbox_multiple_with_frequency') {
    const checkedBoxes = scope.querySelectorAll('input[name="multi_check"]:checked');
    return Array.from(checkedBoxes).map(cb => cb.value);
  }

  if (type === 'checkbox_multiple') {
    const checkedBoxes = scope.querySelectorAll('input[name="multi_check"]:checked');
    return Array.from(checkedBoxes).map(cb => cb.value);
  }
  
  if (type === 'radio') {
    const el = (q && q.id ? scope.querySelector(`input[name="${q.id}"]:checked`) : null)
      || (q && q.id ? scope.querySelector(`input[name="opt_${q.id}"]:checked`) : null)
      || scope.querySelector('input[name="opt"]:checked')
      || scope.querySelector(`input[type="radio"][name="${q.id}"]:checked`);
    
    // Debug
    console.log('Radio - found element:', el, 'value:', el ? el.value : 'none');
    
    if (!el) return '';

    return String(el.value);
  }
  
  if (type === 'radio_with_text') {
    const el = (q && q.id ? scope.querySelector(`input[name="${q.id}"]:checked`) : null)
      || (q && q.id ? scope.querySelector(`input[name="opt_${q.id}"]:checked`) : null)
      || scope.querySelector('input[name="opt"]:checked');
    const radioValue = el ? el.value : '';

    const textEl = scope.querySelector('input[name="opt_text"]');
    if (textEl && textEl.value.trim()) {
      responses[q.id + '_text'] = textEl.value.trim();
    }
    
    return radioValue;
  }
  
  if (type === 'oui_non') {
    const el = (q && q.id ? scope.querySelector(`input[name="yn_${q.id}"]:checked`) : null)
      || scope.querySelector('input[name="yn"]:checked');
    return el ? el.value : '';
  }

  if (type === 'choix_multiple') {
    const el = (q && q.id ? scope.querySelector(`input[name="opt_${q.id}"]:checked`) : null)
      || scope.querySelector('input[name="opt"]:checked');
    return el ? el.value : '';
  }

  const el = scope.querySelector('#answer') || $('answer');
  // Pour les champs coordonnées: garder la valeur exacte sans trim
  if (q.className === 'coordonnees-page') {
    return el ? String(el.value || '') : '';
  }
  return el ? String(el.value || '').trim() : '';
}

export function validateRequired(q, answer) {
  if (!q.obligatoire) return true;
  if (typeof answer === 'boolean') return answer === true;
  if (Array.isArray(answer)) return answer.length > 0;
  if (answer === null || answer === undefined) return false;
  
  // Pour les inputs file avec missingOptions: une missing option cochée est valide
  if (q.type === 'file' && q.missingOptions && Array.isArray(q.missingOptions)) {
    // Si answer est une string et correspond à une missing option, c'est valide
    const missingValues = q.missingOptions.map(opt => opt.value || opt);
    return missingValues.includes(answer);
  }
  
  // Pour les champs coordonnées: aucune contrainte, juste non vide
  if (q.className === 'coordonnees-page') {
    return String(answer).length > 0;
  }
  return String(answer).trim().length > 0;
}
