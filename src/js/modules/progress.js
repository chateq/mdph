/**
 * Progression (barre + libellé) basée sur la page courante.
 */

import { $ } from './dom-utils.js';

export function updateProgress(idx, visible) {
  const total = visible.length;
  const currentQuestion = visible[idx];

  if (currentQuestion && currentQuestion.isEntryFlow) {
    const currentStep = currentQuestion.progressStep || idx + 1;
    const totalSteps = currentQuestion.progressTotal || 1;
    $('progressText').textContent = `Étape ${currentStep} sur ${totalSteps}`;
    $('progressFill').style.width = totalSteps ? `${Math.round((currentStep / totalSteps) * 100)}%` : '0%';
    $('questionId').textContent = '';
    $('prevBtn').disabled = idx <= 0;
    $('nextBtn').textContent = idx >= total - 1 ? 'Terminer' : 'Suivant';
    return;
  }

  let currentModule = 1;
  let currentPageTitle = '';
  let currentPageDescription = '';

  if (currentQuestion) {
    const match = currentQuestion.pageId?.match(/page(\d+)/);
    if (match) {
      currentModule = parseInt(match[1], 10);
    }

    currentPageTitle = currentQuestion.pageTitle || '';
    currentPageDescription = currentQuestion.sectionDescription || currentQuestion.pageTitle || '';

    const moduleTitle = document.getElementById('moduleTitle');
    const moduleDescription = document.getElementById('moduleDescription');

    if (moduleTitle) moduleTitle.textContent = currentPageTitle;
    if (moduleDescription) moduleDescription.textContent = currentPageDescription;
  }

  const currentStep = currentModule;
  const totalSteps = 4;
  const partieText = `Partie ${currentStep} sur ${totalSteps}${currentPageTitle ? ` ${currentPageTitle}` : ''}`;

  $('progressText').textContent = partieText;
  $('progressFill').style.width = totalSteps ? `${Math.round((currentStep / totalSteps) * 100)}%` : '0%';
  $('questionId').textContent = '';
  $('prevBtn').disabled = idx <= 0;
  $('nextBtn').textContent = idx >= total - 1 ? 'Terminer' : 'Suivant';
}
