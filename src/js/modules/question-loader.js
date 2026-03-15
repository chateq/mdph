/**
 * Question loading and filtering
 */

import { responses } from './storage.js';

export let allQuestions = [];
export let visible = [];

function tokenizeCondition(input) {
  const s = String(input || '');
  const tokens = [];
  let i = 0;

  const isWs = c => c === ' ' || c === '\t' || c === '\n' || c === '\r';
  const isIdentStart = c => /[A-Za-z_]/.test(c);
  const isIdent = c => /[A-Za-z0-9_]/.test(c);

  while (i < s.length) {
    const c = s[i];
    if (isWs(c)) {
      i += 1;
      continue;
    }

    if (c === '(' || c === ')') {
      tokens.push({ type: c });
      i += 1;
      continue;
    }

    const two = s.slice(i, i + 2);
    const three = s.slice(i, i + 3);
    if (three === '===') {
      tokens.push({ type: 'op', value: '===' });
      i += 3;
      continue;
    }
    if (three === '!==') {
      tokens.push({ type: 'op', value: '!==' });
      i += 3;
      continue;
    }
    if (two === '&&' || two === '||') {
      tokens.push({ type: 'op', value: two });
      i += 2;
      continue;
    }

    if (c === '\'' || c === '"') {
      const quote = c;
      i += 1;
      let out = '';
      while (i < s.length) {
        const ch = s[i];
        if (ch === '\\' && i + 1 < s.length) {
          out += s[i + 1];
          i += 2;
          continue;
        }
        if (ch === quote) {
          i += 1;
          break;
        }
        out += ch;
        i += 1;
      }
      tokens.push({ type: 'string', value: out });
      continue;
    }

    if (isIdentStart(c)) {
      let start = i;
      i += 1;
      while (i < s.length && isIdent(s[i])) i += 1;
      const ident = s.slice(start, i);
      tokens.push({ type: 'ident', value: ident });
      continue;
    }

    // caractère inattendu: on arrête de façon safe
    tokens.push({ type: 'unknown', value: c });
    i += 1;
  }

  tokens.push({ type: 'eof' });
  return tokens;
}

function parseCondition(condition) {
  const tokens = tokenizeCondition(condition);
  let pos = 0;

  const peek = () => tokens[pos] || { type: 'eof' };
  const next = () => (pos < tokens.length ? tokens[pos++] : { type: 'eof' });

  const parsePrimary = () => {
    const t = peek();
    if (t.type === '(') {
      next();
      const expr = parseOr();
      if (peek().type === ')') next();
      return expr;
    }
    if (t.type === 'ident') {
      next();
      return { type: 'ident', name: t.value };
    }
    if (t.type === 'string') {
      next();
      return { type: 'string', value: t.value };
    }
    // fallback safe
    next();
    return { type: 'string', value: '' };
  };

  const parseComparison = () => {
    let left = parsePrimary();
    const t = peek();
    if (t.type === 'op' && (t.value === '===' || t.value === '!==')) {
      next();
      const right = parsePrimary();
      return { type: 'cmp', op: t.value, left, right };
    }
    // si pas de comparaison, on considère l'ident comme vérité si non vide
    return left;
  };

  const parseAnd = () => {
    let node = parseComparison();
    while (peek().type === 'op' && peek().value === '&&') {
      next();
      node = { type: 'and', left: node, right: parseComparison() };
    }
    return node;
  };

  const parseOr = () => {
    let node = parseAnd();
    while (peek().type === 'op' && peek().value === '||') {
      next();
      node = { type: 'or', left: node, right: parseAnd() };
    }
    return node;
  };

  return parseOr();
}

function evalConditionAst(ast) {
  const evalValue = node => {
    if (!node) return '';
    if (node.type === 'string') return String(node.value || '');
    if (node.type === 'ident') return String(responses[node.name] ?? '');
    return '';
  };

  const evalBool = node => {
    if (!node) return true;
    if (node.type === 'and') return evalBool(node.left) && evalBool(node.right);
    if (node.type === 'or') return evalBool(node.left) || evalBool(node.right);
    if (node.type === 'cmp') {
      const l = evalValue(node.left);
      const r = evalValue(node.right);
      return node.op === '===' ? l === r : l !== r;
    }
    if (node.type === 'ident') return String(responses[node.name] ?? '') !== '';
    if (node.type === 'string') return String(node.value || '') !== '';
    return true;
  };

  return evalBool(ast);
}

function evaluateCondition(condition) {
  if (!condition) return true;
  // compat: si condition simple "champ === 'x'" (ancien comportement)
  try {
    const ast = parseCondition(condition);
    return evalConditionAst(ast);
  } catch {
    return true;
  }
}

export function refreshVisible() {
  visible = allQuestions.filter(q => {
    if (q.isIntroduction) {
      return true;
    }

    if (q.pageCondition) {
      if (!evaluateCondition(q.pageCondition)) {
        return false;
      }
    }
    
    if (q.sectionCondition) {
      if (!evaluateCondition(q.sectionCondition)) {
        return false;
      }
    }

    if (!q.condition_affichage) {
      return true;
    }

    return evaluateCondition(q.condition_affichage);
  });
  
  return visible;
}

export async function loadAllQuestions() {
  try {
    // Charger la configuration des pages
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

    const pagesResponse = await fetch(pagesConfigPath);
    if (!pagesResponse.ok) {
      throw new Error(`Erreur HTTP: ${pagesResponse.status}`);
    }
    const pagesConfig = await pagesResponse.json();

    allQuestions = [];
    
    // Charger toutes les pages dans l'ordre
    for (const pageConfig of pagesConfig.pages.sort((a, b) => a.order - b.order)) {
      try {
        const pageResponse = await fetch(`/data/${pageConfig.questionsFile}`);
        const pageData = await pageResponse.json();

        const useQuestionProgress = pageConfig && pageConfig.progressMode === 'questions';
        
        if (pageData?.sections) {
          const pageTotalQuestions = useQuestionProgress
            ? pageData.sections.reduce((acc, s) => acc + (Array.isArray(s.questions) ? s.questions.length : 0), 0)
            : 0;
          let pageQuestionIndex = 0;

          for (const section of pageData.sections) {
            // TOUJOURS charger les sections, les conditions seront évaluées dynamiquement
            if (section.questions) {
              // Ajouter l'info de la page à chaque question
              const questionsWithPage = section.questions.map((q, index) => ({
                ...q,
                pageId: pageConfig.id,
                pageTitle: pageConfig.title,
                pageCondition: pageConfig.condition,
                sectionTitle: section.title,
                sectionDescription: section.description,
                sectionCondition: section.condition_section,
                isIntroduction: section.isIntroduction || false,
                estimatedTime: section.estimatedTime,
                isEntryFlow: useQuestionProgress ? true : (q.isEntryFlow || false),
                progressStep: useQuestionProgress ? (pageQuestionIndex + index + 1) : q.progressStep,
                progressTotal: useQuestionProgress ? pageTotalQuestions : q.progressTotal
              }));
              pageQuestionIndex += section.questions.length;
              allQuestions.push(...questionsWithPage);
            } else {
              // Si c'est une section sans questions (comme l'introduction)
              const sectionQuestion = {
                id: section.id || `section_${pageConfig.id}_${section.title.toLowerCase().replace(/\s+/g, '_')}`,
                type: section.type || 'section', // Utiliser le type défini ou 'section' par défaut
                title: section.title,
                description: section.description,
                isIntroduction: section.isIntroduction || false,
                obligatoire: section.obligatoire,
                buttonText: section.buttonText,
                hasCheckbox: section.hasCheckbox,
                checkboxLabel: section.checkboxLabel,
                requireCheckbox: section.requireCheckbox,
                hideTitle: section.hideTitle,
                hideDescription: section.hideDescription,
                estimatedTime: section.estimatedTime,
                pageId: pageConfig.id,
                pageTitle: pageConfig.title
              };
              
              // Ajouter les options si elles existent (pour les boutons radio)
              if (section.type === 'radio' && section.options) {
                sectionQuestion.options = section.options;
              }

              if (section.followUp) {
                sectionQuestion.followUp = section.followUp;
              }
              
              allQuestions.push(sectionQuestion);
            }
          }
        } else if (pageData?.isRecap) {
          // Gérer les pages récap qui ont une structure directe (pas de sections)
          allQuestions.push({
            id: `recap_${pageConfig.id}`,
            type: 'recap',
            title: pageData.title,
            description: pageData.description,
            description2: pageData.description2,
            isRecap: true,
            targetQuestionIds: pageData.targetQuestionIds,
            buttons: pageData.buttons,
            pageId: pageConfig.id,
            pageTitle: pageConfig.title
          });
        } else if (pageData?.isCelebration) {
          // Gérer les pages de félicitations qui ont une structure directe (pas de sections)
          allQuestions.push({
            id: `celebration_${pageConfig.id}`,
            type: 'celebration',
            title: pageData.title,
            description: pageData.description,
            nextStepMessage: pageData.nextStepMessage,
            continueButtonText: pageData.continueButtonText,
            isCelebration: true,
            pageId: pageConfig.id,
            pageTitle: pageConfig.title
          });
        } else if (pageData?.questions && Array.isArray(pageData.questions)) {
          const questionsWithPage = pageData.questions.map(q => ({
            ...q,
            pageId: pageConfig.id,
            pageTitle: pageConfig.title,
            pageCondition: pageConfig.condition,
            sectionTitle: q.sectionTitle || q.title || pageConfig.title,
            sectionDescription: q.sectionDescription || q.description || pageConfig.description
          }));
          allQuestions.push(...questionsWithPage);
        } else if (Array.isArray(pageData)) {
          // Si le fichier est directement un tableau de questions
          const questionsWithPage = pageData.map(q => ({
            ...q,
            pageId: pageConfig.id,
            pageTitle: pageConfig.title,
            pageCondition: pageConfig.condition
          }));
          allQuestions.push(...questionsWithPage);
        }
      } catch (pageError) {
        console.error(`Erreur lors du chargement de ${pageConfig.title}:`, pageError);
      }
    }

    if (!Array.isArray(allQuestions)) {
      console.error('Format de questions invalide :', allQuestions);
      allQuestions = [];
    }
  } catch (error) {
    console.error('Erreur lors du chargement des questions :', error);
    throw error;
  }
}
