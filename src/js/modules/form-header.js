/**
 * Gère la mise à jour de l'en-tête du formulaire (titre et description).
 * Charge la configuration des pages depuis form_pages.json et met à jour l'interface utilisateur en conséquence.
 */

let formPagesData = null;

/**
 * Charge la configuration des pages du formulaire depuis le fichier JSON
 * @returns {Promise<Object>} Données des pages du formulaire
 */
export async function loadFormPages() {
  try {
    let pagesConfigPath = '/data/form_pages_premiere_demande.json';
    try {
      const qs = typeof window !== 'undefined' ? window.location.search : '';
      const params = new URLSearchParams(qs || '');
      const parcours = params.get('parcours');
      if (parcours === 'recours') {
        pagesConfigPath = '/data/form_pages_recours.json';
      } else if (parcours === 'verification-dossier') {
        pagesConfigPath = '/data/form_pages_verification.json';
      } else if (parcours === 'analyse_dossier') {
        pagesConfigPath = '/data/form_pages_analyse_dossier.json';
      } else if (parcours === 'renouvellement') {
        pagesConfigPath = '/data/form_pages_renouvellement.json';
      }
    } catch {
    }

    const response = await fetch(pagesConfigPath);
    if (!response.ok) throw new Error('Échec du chargement des pages du formulaire');
    formPagesData = await response.json();
  } catch (error) {
    console.error('Erreur lors du chargement des pages du formulaire :', error);
    formPagesData = { pages: [] };
  }
  return formPagesData;
}

/**
 * Met à jour l'en-tête du formulaire avec la question ou le message de fin
 * @param {Object} q - Question actuelle ou null si le formulaire est terminé
 */
export function updateFormHeader(q) {
  const titleEl = document.getElementById('formTitle');
  const descEl = document.getElementById('formDescription');
  
  if (!q) {
    if (titleEl) titleEl.textContent = 'Formulaire terminé';
    if (descEl) descEl.textContent = 'Merci d\'avoir rempli le formulaire';
    return;
  }
  
  const pageTitle = q.pageTitle || q.sectionTitle || q.title || 'Formulaire';
  
  // Mettre à jour le titre si l'élément existe
  if (titleEl) titleEl.textContent = pageTitle;
  
  // Mettre à jour la description si l'élément existe
  if (descEl) {
    let description = '';
    
    // Essayer de trouver la description dans form_pages.json
    const page = formPagesData?.pages?.find(p => p.title === pageTitle);
    description = page?.description || q.sectionDescription || q.description || '';
    
    descEl.textContent = description;
  }
  
  // Mettre à jour le titre de l'onglet du navigateur
  document.title = `${pageTitle} — CERFA MDPH`;
}

// Charger les données des pages dès l'import du module
loadFormPages();
