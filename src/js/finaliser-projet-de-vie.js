import { loadSaved, responses, saveLocal } from './modules/storage.js';

function setStatus(msg) {
  const el = document.getElementById('pricingStatus');
  if (el) el.textContent = msg || '';
}

function isRecoursOrRefusFlow() {
  try {
    const qs = typeof window !== 'undefined' ? window.location.search : '';
    const params = new URLSearchParams(qs || '');
    const parcours = params.get('parcours');
    const entry = params.get('entry');

    if (parcours === 'recours' || entry === 'refus') return true;

    if (parcours === 'verification-dossier' || parcours === 'premiere-demande' || parcours === 'renouvellement' || parcours === 'aggravation') return false;

    const entryFlow = responses && typeof responses === 'object' ? responses.entry_flow : null;
    const typeDemande = responses && typeof responses === 'object' ? responses.type_demande : null;
    if (entryFlow === 'refus' || typeDemande === 'refus') return true;

    const looksLikeRecours = responses && typeof responses === 'object' && (
      responses.mode_refus !== undefined
      || responses.type_recours !== undefined
      || responses.aide_refusee !== undefined
      || responses.date_notification !== undefined
      || responses.courrier_decision !== undefined
      || responses.demarche_deja_engagee !== undefined
      || responses.upload_documents !== undefined
      || responses.rgpd_consent_refus !== undefined
    );
    if (looksLikeRecours) return true;
  } catch {
  }
  return false;
}

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function getSelectedAdvisor() {
  try {
    return responses && typeof responses === 'object' ? responses.__advisorSelected : null;
  } catch {
    return null;
  }
}

function setSelectedAdvisor(advisor) {
  try {
    responses.__advisorSelected = advisor;
    saveLocal(true);
  } catch {
  }
}

async function startPayment(offer, advisor) {
  try {
    setStatus('Redirection vers le paiement…');
    const resp = await fetch('/api/create-checkout-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ offer, advisor }),
    });
    if (!resp.ok) {
      let details = '';
      try { details = await resp.text(); } catch {}
      throw new Error(details || `Erreur HTTP: ${resp.status}`);
    }
    const data = await resp.json();
    if (!data || !data.url) throw new Error('URL de paiement manquante');
    try {
      if (data.paymentId) sessionStorage.setItem('mollie_payment_id', String(data.paymentId));
    } catch {}
    window.location.href = data.url;
  } catch (e) {
    try { console.error(e); } catch {}
    setStatus('Impossible de démarrer le paiement.');
  }
}

async function downloadFilledPdf() {
  try {
    setStatus('Génération du PDF…');
    const payload = responses && typeof responses === 'object' ? responses : {};

    const resp = await fetch('/api/fill', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!resp.ok) {
      let details = '';
      try {
        details = await resp.text();
      } catch {
      }
      throw new Error(details || `Erreur HTTP: ${resp.status}`);
    }

    const blob = await resp.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'cerfa_rempli.pdf';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    setStatus('PDF prêt.');
  } catch (e) {
    try {
      console.error(e);
    } catch {
    }
    setStatus('Impossible de générer le PDF.');
  }
}

function renderAccordion(openOfferId = null) {
  const root = document.getElementById('pricingAccordion');
  if (!root) return;

  const isRecoursFlow = isRecoursOrRefusFlow();

  try {
    const pricingArea = document.getElementById('pricingArea');
    if (pricingArea) {
      const titleEl = pricingArea.querySelector('h1');
      const descEl = pricingArea.querySelector('p.muted');
      if (isRecoursFlow) {
        pricingArea.style.textAlign = '';
        if (titleEl) {
          titleEl.textContent = 'Finaliser votre recours MDPH';
          titleEl.style.textAlign = 'center';
        }
        if (descEl) descEl.textContent = '';
      } else {
        pricingArea.style.textAlign = '';
        if (titleEl) {
          titleEl.textContent = 'Finaliser votre projet de vie MDPH';
          titleEl.style.textAlign = '';
        }
        if (descEl) descEl.textContent = 'Vous avez renseigné les informations nécessaires. Choisissez maintenant comment vous souhaitez récupérer ou finaliser votre document.';
      }
    }
  } catch {
  }

  if (isRecoursFlow) {
    try {
      root.style.display = 'grid';
      root.style.gridTemplateColumns = 'minmax(0, 1fr)';
      root.style.maxWidth = '360px';
      root.style.width = '100%';
      root.style.marginLeft = 'auto';
      root.style.marginRight = 'auto';
      root.style.justifyContent = 'stretch';
      root.style.alignItems = 'start';
      root.style.gap = '18px';
    } catch {
    }

    root.innerHTML = `
      <div class="pricing-item" data-offer="recours" style="text-align:left;">
        <div class="pricing-header">
          <div class="btn-wrapper">
            <span class="pricing-badge">Offre</span>
            <button type="button" class="btn" data-toggle="recours">
              <span class="pricing-price">50 €</span>
              <span class="pricing-title">Recours MDPH (refus) — document structuré</span>
            </button>
          </div>
        </div>
        <div class="pricing-body" data-body="recours" style="display:${openOfferId === 'recours' ? 'block' : 'none'};">
          <ul class="pricing-features">
            <li class="no-tick"><strong>Produits possibles</strong></li>
            <li>Analyse décision</li>
            <li>Recours RAPO</li>
            <li>Recours contentieux</li>
            <li class="no-tick"><strong>Choix livraison</strong></li>
            <li><strong>STANDARD</strong> — Livraison sous 3h ouvrées</li>
            <li><strong>PRIORITAIRE</strong> — Livraison sous 45 minutes</li>
            <li class="no-tick"><strong>Résumé achat</strong></li>
            <li>document PDF structuré</li>
            <li>échange gratuit 15 minutes</li>
            <li>livraison par email sécurisé</li>
            <li class="no-tick"><strong>Mention</strong></li>
            <li class="cross">Aucune garantie de décision MDPH.</li>
          </ul>
          <div class="form-actions">
            <button class="btn btn-primary" id="payRecoursBtn" type="button">Continuer</button>
          </div>
        </div>
      </div>
    `;

    const payRecoursBtn = document.getElementById('payRecoursBtn');
    if (payRecoursBtn) {
      payRecoursBtn.addEventListener('click', () => startPayment('recours'));
    }

    const toggles = root.querySelectorAll('[data-toggle]');
    toggles.forEach(btn => {
      btn.addEventListener('click', () => {
        const offer = btn.getAttribute('data-toggle');
        if (!offer) return;
        const next = openOfferId === offer ? null : offer;
        renderAccordion(next);
      });
    });

    return;
  }

  try {
    root.style.display = '';
    root.style.gridTemplateColumns = '';
    root.style.maxWidth = '';
    root.style.width = '';
    root.style.marginLeft = '';
    root.style.marginRight = '';
    root.style.justifyContent = '';
    root.style.alignItems = '';
    root.style.gap = '';
  } catch {
  }

  const advisors = [
    { id: 'conseiller', prenom: 'Conseiller', role: 'Conseiller', score: 'Clarté 10/10', img: '/photo_5783179550492659090_y.jpg' },
  ];

  let selected = getSelectedAdvisor();
  if (!selected) {
    selected = advisors[0];
    setSelectedAdvisor(selected);
  }

  root.innerHTML = `
    <div class="pricing-item" data-offer="free">
      <div class="pricing-header">
        <div class="btn-wrapper">
          <span class="pricing-badge" style="visibility:hidden;">&nbsp;</span>
          <button type="button" class="btn" data-toggle="free"><span class="pricing-price">Gratuit</span><span class="pricing-title">Télécharger mon récapitulatif</span></button>
        </div>
      </div>
      <div class="pricing-body" data-body="free" style="display:${openOfferId === 'free' ? 'block' : 'none'};">
        <ul class="pricing-features">
          <li>PDF récapitulatif tel que rempli</li>
          <li>Aucune relecture</li>
          <li>Aucune reformulation</li>
          <li>Aucun accompagnement</li>
        </ul>
        <div class="form-actions">
          <button class="btn btn-primary" id="downloadFreePdfBtn" type="button">Continuer</button>
        </div>
      </div>
    </div>

    <div class="pricing-item" data-offer="49">
      <div class="pricing-header">
        <div class="btn-wrapper">
          <span class="pricing-badge">Le plus choisi</span>
          <button type="button" class="btn" data-toggle="49"><span class="pricing-price">49 €</span><span class="pricing-title">Projet de vie structuré pour la MDPH</span></button>
        </div>
      </div>
      <div class="pricing-body" data-body="49" style="display:${openOfferId === '49' ? 'block' : 'none'};">
        <ul class="pricing-features">
          <li>Relecture complète du projet de vie</li>
          <li>Reformulation selon les critères MDPH</li>
          <li>Mise en cohérence de l’ensemble</li>
          <li>PDF final prêt à être utilisé</li>
          <li>Aucun rendez-vous inclus</li>
          <li>Téléchargement du PDF après paiement</li>
        </ul>
        <div class="form-actions">
          <button class="btn btn-primary" id="pay49Btn" type="button">Continuer</button>
        </div>
      </div>
    </div>

    <div class="pricing-item" data-offer="79">
      <div class="pricing-header">
        <div class="btn-wrapper">
          <span class="pricing-badge">Avec échange humain</span>
          <button type="button" class="btn" data-toggle="79">
            <span class="pricing-price">79 €</span>
            <span class="pricing-title">Accompagnement personnalisé</span>
          </button>
        </div>
      </div>
      <div class="pricing-body" data-body="79" style="display:${openOfferId === '79' ? 'block' : 'none'};">
        <ul class="pricing-features">
          <li>Tout ce qui est inclus dans l’offre à 49 €</li>
          <li>Un échange individuel de 30 minutes</li>
          <li>Réponses adaptées à la situation</li>
          <li>Ajustements complémentaires si besoin</li>
          <li>PDF final prêt à être utilisé</li>
        </ul>

        <div style="border-top: 1px solid rgba(0,0,0,.08); padding-top: 12px; margin-top: 12px;">
          <div style="font-weight: 600; margin-bottom: 10px;">Choisir la personne pour l’échange</div>
          <div id="advisorList" style="display:flex; flex-direction:column; gap: 6px;"></div>
        </div>

        <div class="form-actions" style="justify-content:flex-start; gap:12px; margin-top: 14px;">
          <button class="btn btn-primary" id="pay79Btn" type="button">Continuer</button>
        </div>
      </div>
    </div>
  `;

  const downloadFreePdfBtn = document.getElementById('downloadFreePdfBtn');
  if (downloadFreePdfBtn) {
    downloadFreePdfBtn.addEventListener('click', () => {
      window.location.href = '/telecharger-votre-correction';
    });
  }

  const advisorList = document.getElementById('advisorList');
  if (advisorList) {
    advisorList.innerHTML = advisors.map(a => {
      const checked = selected && selected.id === a.id;
      return `
        <label class="choice" style="display:flex; align-items:center; gap: 8px; padding: 6px 8px; border: 1px solid rgba(0,0,0,.1); border-radius: 8px; cursor: pointer;">
          <input type="radio" name="advisor" value="${escapeHtml(a.id)}" ${checked ? 'checked' : ''} />
          <img src="${escapeHtml(a.img)}" alt="${escapeHtml(a.prenom)}" style="width: 28px; height: 28px; border-radius: 999px; object-fit: cover; border: 1px solid rgba(0,0,0,.12);" />
          <div style="display:flex; flex-direction:column; gap: 1px;">
            <div style="font-weight: 600;">${escapeHtml(a.prenom)}</div>
            <div class="muted">${escapeHtml(a.role)} — ${escapeHtml(a.score)}</div>
          </div>
        </label>
      `;
    }).join('');

    const radios = advisorList.querySelectorAll('input[type="radio"][name="advisor"]');
    radios.forEach(r => {
      r.addEventListener('change', () => {
        const chosen = advisors.find(a => a.id === r.value);
        if (!chosen) return;
        setSelectedAdvisor(chosen);
        renderAccordion('79');
      });
    });

    const pay79Btn = document.getElementById('pay79Btn');
    if (pay79Btn) {
      if (selected) {
        pay79Btn.style.display = 'inline-flex';
        pay79Btn.addEventListener('click', () => startPayment('79', selected.id));
      } else {
        pay79Btn.style.display = 'none';
      }
    }

    const pay49Btn = document.getElementById('pay49Btn');
    if (pay49Btn) {
      pay49Btn.addEventListener('click', () => startPayment('49'));
    }
  }

  const toggles = root.querySelectorAll('[data-toggle]');
  toggles.forEach(btn => {
    btn.addEventListener('click', () => {
      const offer = btn.getAttribute('data-toggle');
      if (!offer) return;
      const next = openOfferId === offer ? null : offer;
      renderAccordion(next);
    });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  try {
    loadSaved();
  } catch {
  }

  // Si l'utilisateur arrive ici sans réponses, on ne le bloque pas mais on affiche un message.
  try {
    const hasAny = responses && typeof responses === 'object' && Object.keys(responses).length > 0;
    if (!hasAny) {
      setStatus('Vos réponses ne sont pas chargées. Vous pouvez revenir au formulaire si besoin.');
    }
  } catch {
  }

  renderAccordion(null);
});
