// Imports des modules
import { $, setStatus } from './modules/dom-utils.js';
import { loadSaved, resetAll, responses, saveLocal } from './modules/storage.js';
import { visible, refreshVisible, loadAllQuestions, allQuestions } from './modules/question-loader.js';
import { updateProgress } from './modules/progress.js';
import { updateFormHeader } from './modules/form-header.js';
import { renderIntroductionPage, renderCelebrationPage, renderRecapPage, renderNormalPage, renderMultiQuestionPage } from './modules/page-renderer.js';
import { next as navNext, prev as navPrev } from './modules/navigation.js';
import { initCharCounters } from './modules/char-counter.js';
import { initUniversalMenu } from './modules/universal-menu.js';

// Variables globales
let idx = 0;

// Fonction principale de rendu
function render() {
  refreshVisible();
  console.log('DEBUG: visible.length =', visible.length);
  console.log('DEBUG: visible[0] =', visible[0]);
  console.log('DEBUG: idx =', idx);
  const q = visible[idx];
  
  // Mettre à jour le titre et la description
  updateFormHeader(q);
  
  if (!q) {
    const questionArea = $('questionArea');
    if (questionArea) {
      questionArea.innerHTML = '<h2>Formulaire terminé !</h2>';
    } else {
      console.error('L\'élément avec l\'ID "questionArea" n\'a pas été trouvé dans le DOM');
    }
    if ($('nextBtn')) $('nextBtn').style.display = 'none';
    if ($('prevBtn')) $('prevBtn').style.display = 'inline-block';
    updateProgress(idx, visible);
    return;
  }
  
  // Retirer d'abord les classes spéciales si elles existent
  const container = document.querySelector('.main .container');
  if (container) {
    container.classList.remove('is-introduction', 'is-celebration', 'is-recap');
  }
  
  // Vérifier le type de page et rendre en conséquence
  if (q.isIntroduction) {
    renderIntroductionPage(q, idx, render, visible, next);
    return;
  }

  if (q.isCelebration) {
    renderCelebrationPage(q, idx, render, visible, next, prev);
    return;
  }

  if (q.isRecap) {
    renderRecapPage(q, idx, render, visible, next, prev);
    return;
  }

  // Page coordonnees : afficher toutes les questions de cette page ensemble
  if (q.pageId === 'coordonnees') {
    const currentPageId = q.pageId;
    const pageQuestions = visible.filter(question => question.pageId === currentPageId);
    // Trouver l'index de la dernière question de cette page pour la progression
    const lastQuestionIndex = visible.findIndex(question => 
      question.pageId === currentPageId && 
      visible.indexOf(question) === Math.max(...pageQuestions.map(pq => visible.indexOf(pq)))
    );
    renderMultiQuestionPage(pageQuestions, lastQuestionIndex, visible, next, prev);
    return;
  }

  // Page normale
  renderNormalPage(q, idx, visible, next, prev);
  
  // Initialiser les compteurs de caractères après le rendu
  setTimeout(initCharCounters, 0);
}

// Fonctions de navigation
function next() {
  idx = navNext(idx, render, visible);
  render();
}

function prev() {
  idx = navPrev(idx, render, visible);
  render();
}

// Fonction de réinitialisation
function resetAllResponses() {
  if (resetAll()) {
    idx = 0;
    refreshVisible();
    render();
    setStatus('Réinitialisé.');
  }
}

// Fonction d'initialisation
async function boot() {
  let qs = '';
  try {
    qs = typeof window !== 'undefined' ? window.location.search : '';
    if (qs && qs.includes('reset=1')) {
      localStorage.removeItem('cerfa_responses_v1');
    }
  } catch {
  }

  loadSaved();
  console.log('DEBUG: responses =', responses);

  try {
    await loadAllQuestions();
    console.log('DEBUG: allQuestions.length =', allQuestions?.length);
    console.log('DEBUG: first 5 allQuestions =', allQuestions?.slice(0, 5));
  } catch (error) {
    console.error('Erreur lors du chargement des questions :', error);
    setStatus('Erreur de chargement des questions');
    console.error('Détails de l\'erreur:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
  }

  // Réinitialiser l'index à 0 pour commencer par la première question (l'introduction)
  idx = 0;
  refreshVisible();
  console.log('DEBUG: after refreshVisible, visible.length =', visible.length);
  render();
}

// Ajouter les écouteurs d'événements uniquement si les éléments existent
if ($('nextBtn')) $('nextBtn').addEventListener('click', next);
if ($('prevBtn')) $('prevBtn').addEventListener('click', prev);

// Exposer les fonctions nécessaires globalement si besoin
window.resetAll = resetAllResponses;
window.boot = boot;

// Démarrer l'application
initUniversalMenu();
boot();
