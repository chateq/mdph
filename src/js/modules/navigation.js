/**
 * Navigation helpers.
 * `inFlight` évite les doubles clics rapides (next/prev) qui peuvent désynchroniser l'index.
 */

import { responses, saveLocal } from './storage.js';
import { getAnswerFromDom, validateRequired } from './answer-extractor.js';
import { validateMinLength, getMinLengthErrorMessage } from './min-length-validator.js';

// Fonction pour créer un menu centralisé
export function createNavigation() {
  const header = document.querySelector('.header .container');
  if (!header) return;

  const existingNav = header.querySelector('.nav');
  if (existingNav) {
    existingNav.remove();
  }
}

let inFlight = false;

function getSectionRange(visible, idx) {
  try {
    const q = visible[idx];
    if (!q || !q.sectionTitle) return null;

    const sectionTitle = q.sectionTitle;
    const pageId = q.pageId;

    let start = idx;
    while (start > 0) {
      const prev = visible[start - 1];
      if (!prev || prev.sectionTitle !== sectionTitle) break;
      if (pageId && prev.pageId && prev.pageId !== pageId) break;
      start -= 1;
    }

    let end = idx;
    while (end + 1 < visible.length) {
      const next = visible[end + 1];
      if (!next || next.sectionTitle !== sectionTitle) break;
      if (pageId && next.pageId && next.pageId !== pageId) break;
      end += 1;
    }

    if (start === end) return null;
    return { start, end };
  } catch {
    return null;
  }
}

export function next(idx, render, visible) {
  if (inFlight) return idx;
  inFlight = true;
  
  try {
    const q = visible[idx];
    if (!q) {
      return idx;
    }

    const isLastQuestion = idx === visible.length - 1;

    const range = getSectionRange(visible, idx);
    if (range) {
      for (let i = range.start; i <= range.end; i += 1) {
        const qi = visible[i];
        if (!qi) continue;
        const ans = getAnswerFromDom(qi);

        if (qi.obligatoire && !validateRequired(qi, ans)) {
          alert('Cette question est obligatoire');
          return idx;
        }

        // Validation de la longueur minimale
        if (!validateMinLength(qi, ans)) {
          alert(getMinLengthErrorMessage(qi, ans));
          return idx;
        }

        if (ans !== undefined) {
          responses[qi.id] = ans;
        }
      }
      saveLocal(true);

      if (range.end === visible.length - 1) {
        try {
          if (typeof window !== 'undefined') {
            window.location.href = '/finaliser-projet-de-vie';
          }
        } catch {
        }
        return idx;
      }

      idx = range.end + 1;
    } else {
      const answer = getAnswerFromDom(q);
      
      if (q.obligatoire && !validateRequired(q, answer)) {
        alert('Cette question est obligatoire');
        return idx;
      }
      
      // Validation de la longueur minimale
      if (!validateMinLength(q, answer)) {
        alert(getMinLengthErrorMessage(q, answer));
        return idx;
      }
      
      if (answer !== undefined) {
        responses[q.id] = answer;
        saveLocal(true);
      }

      if (isLastQuestion) {
        try {
          if (typeof window !== 'undefined') {
            window.location.href = '/finaliser-projet-de-vie';
          }
        } catch {
        }
        return idx;
      }
      
      idx++;
    }
    
    if (idx >= visible.length) {
      idx = visible.length - 1;
    }
    
    return idx;
  } catch (error) {
    console.error('Erreur dans next():', error);
    return idx;
  } finally {
    inFlight = false;
  }
}

export function prev(idx, render, visible) {
  if (inFlight || idx <= 0) return idx;
  inFlight = true;
  
  try {
    const q = visible[idx];
    if (q) {
      const range = getSectionRange(visible, idx);
      if (range) {
        for (let i = range.start; i <= range.end; i += 1) {
          const qi = visible[i];
          if (!qi) continue;
          const ans = getAnswerFromDom(qi);
          if (ans !== undefined) {
            responses[qi.id] = ans;
          }
        }
        saveLocal(true);
        idx = range.start - 1;
      } else {
        const answer = getAnswerFromDom(q);
        if (answer !== undefined) {
          responses[q.id] = answer;
          saveLocal(true);
        }
        idx--;
      }
    } else {
      idx--;
    }

    // Si on tombe au milieu d'une section, revenir au début de la section précédente
    if (idx > 0) {
      const prevRange = getSectionRange(visible, idx);
      if (prevRange) {
        idx = prevRange.start;
      }
    }
    
    if (idx < 0) idx = 0;
    
    return idx;
  } catch (error) {
    console.error('Erreur dans prev():', error);
    return idx;
  } finally {
    inFlight = false;
  }
}
