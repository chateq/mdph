# QUOTE N° 2026-04-001

**Service provider**  
Thomas RODRIGUEZ  
Web developer  
Email : [to be completed]  
SIRET : [to be completed]

**Client**  
[Name / Company]  
[Address]  
[Email]

**Issue date:** April 9, 2026  
**Validity:** 30 days  
**Subject:** Takeover and completion of the MDPH web platform (assistance with application files for the French Disability Support Agency)


## 1. Context

The project underwent initial development by a third-party provider. A comprehensive technical audit was conducted to assess the current state and identify remaining work.

This quote covers the project takeover, the correction of deficient elements, and the development of missing features.


## 2. Existing state audit

### 2.1 Functional elements, reused as-is

#### 2.1.1 Marketing website / Landing page

| Element | Detail |
|---------|--------|
| Homepage | OPTIMA methodology presentation, carousel, call-to-action |
| Legal pages | Ethics charter, privacy policy, terms of sale, legal notices, "About us" page |
| Navigation menu | Responsive header with desktop and mobile versions |
| Responsive design | Mobile, tablet and desktop adaptation |
| Fonts and icons | Poppins (4 weights) and Lucide icon library |

**Conclusion:** Functional and reusable as-is. The design will be updated during the graphic redesign (see item 4.5).

#### 2.1.2 Dynamic guided forms

| Element | Detail |
|---------|--------|
| Form engine | Modular architecture: 13 JavaScript modules, dynamic question loading from JSON files |
| Available journeys | 5 complete paths: First application, Renewal, File verification, Appeal, File analysis |
| Question types | Checkboxes with frequency, text input with character counter, multi-select, introduction, summary and celebration pages |
| Auto-save | Response persistence in browser (LocalStorage), resumable if interrupted |
| Navigation | Visual progress bar, conditional page sequencing based on answers |

**Conclusion:** The form engine is the project's strongest asset. The modular architecture is solid and reusable. However, form validation is too permissive: users can proceed by selecting only a broad category without providing sufficient detail, which undermines the quality of the generated output. Validation rules need to be tightened (see item 3.3).

#### 2.1.3 Payment system (Mollie)

| Element | Detail |
|---------|--------|
| Configured offers | 3 offers: Structured life project, Personalized support, Appeal offer |
| Payment flow | Session creation, Mollie checkout redirect, confirmation webhook, status verification |
| Confirmation pages | Separate pages for free and paid offers |

**Conclusion:** The Mollie integration is functional and complete.

### 2.2 Deficient elements, corrections required

#### 2.2.1 Routing (vercel.json)

The routing configuration file (225 lines) presents issues affecting reliability and SEO:

| Issue identified | Example |
|------------------|---------|
| Duplicate URLs | `/telecharger-votre-correction` and `/correction-pdf` point to the same page |
| Naming inconsistency | Mixed underscores and hyphens: `/prendre-rendez_vous` and `/prendre-rendez-vous` lead to the same file |
| Redundant aliases | `/confirmation-gratuite` and `/confirmation` are interchangeable, same for `/paiement-success` and `/paiement-confirme` |
| Overly broad catch-all | Any unknown URL returns the homepage with a 200 status, making 404 errors invisible |
| Missing API route | `/api/projet-de-vie-premium` is declared in builds but missing from routes, making the endpoint unreachable |

#### 2.2.2 Email sending

The `/api/send-paid-pdf` endpoint was intentionally disabled by the previous developer (returns a 410 "Deprecated" status), likely to redirect the flow through Mollie. However, the old email logic was left in place after the return statement instead of being removed. This dead code needs to be cleaned up, and the current email delivery flow needs to be verified end-to-end to confirm it works correctly through the Mollie path.

### 2.3 Non-functional elements, overhaul required

#### 2.3.1 PDF generation

| What is claimed | What actually exists |
|-----------------|----------------------|
| Parametric PDF with custom design | Simple filling of 3 fixed fields (`Text1`, `Text2`, `Text4`) in an existing PDF template |
| CERFA form generation (free version) | The CERFA PDF file referenced in the code does not exist in the repository, the feature is inoperable |
| Custom document design | No graphic design work performed on PDFs |

**Reusable elements:** The base logic (PDF loading, text writing, font embedding with `pdf-lib` and `fontkit`) can serve as a technical foundation.

#### 2.3.2 AI integration (OpenAI)

| What is claimed | What actually exists |
|-----------------|----------------------|
| Personalized AI analysis of responses | Basic rewriting: AI compacts answers into a paragraph without analysis |
| Intelligent, tailored feedback | The prompt explicitly forbids the AI from adding, inferring or improving, reducing added value to near zero for a paid service |
| Reliable service | If the API key is missing, the system returns a raw 500 error with no clear user message |
| Accessible endpoint | The route `/api/projet-de-vie-premium` is not declared in routing and remains unreachable |

**Reusable elements:** The `openaiClient.js` module (API call, response parsing) can serve as a technical foundation.

#### 2.3.3 Professional matching and communication

| What is claimed | What actually exists |
|-----------------|----------------------|
| Adapted professional selection | A single hardcoded advisor; the UI simulates a choice that does not exist |
| Appointment booking | Calendly widget embedded pointing to a single link, with no system integration |
| User-professional communication | Non-existent: no messaging, no calls, no exchange possible |
| Professional notification | Non-existent: the advisor is not informed of payments or user responses |
| File transmission | Non-existent: the advisor has no access to user responses |

**Reusable elements:** The appointment page skeleton and the advisor ID passing through the payment flow.


## 3. Correction work

### 3.1 Routing rewrite

Complete rewrite of the `vercel.json` file:
- One path per page
- Consistent naming (hyphens only)
- Proper 404 error handling
- All API routes accessible

### 3.2 Form validation

The current forms allow users to move forward with minimal input (e.g. selecting only a broad category without any detail). This produces low-quality data that weakens the AI analysis and the generated PDF. Validation rules need to be reviewed and tightened across all journeys to ensure users provide enough information at each step before proceeding.

### 3.3 Email system cleanup

- Removal of dead code (deprecated `send-paid-pdf` endpoint)
- End-to-end validation of the PDF email delivery flow through Mollie


## 4. Development work

### 4.1 Parametric PDF generation

| Element | Detail |
|---------|--------|
| Dynamic generation | PDF creation from scratch with custom layout and variable length based on user responses |
| Design integration | Application of the graphic identity defined by the designer (see item 4.5) |
| Free version | Fix or redesign the CERFA generation mechanism |

### 4.2 AI integration overhaul

| Element | Detail |
|---------|--------|
| Prompt rewrite | Situation analysis, strategic advice, intelligent rephrasing using the OPTIMA method |
| Technical fixes | Accessible API route, proper error handling, graceful degradation |
| End-to-end validation | Complete flow: form, AI processing, PDF generation, email delivery |

### 4.3 Professional support system

#### Database and administration

| Element | Detail |
|---------|--------|
| Professional database | Name, email, specialty, qualifications, availability |
| Admin interface | Protected back-office for adding, editing and removing professionals |

#### Matching

| Element | Detail |
|---------|--------|
| Matching logic | Analysis of form responses to suggest relevant professionals based on specialty, disability type and location |

#### Appointment booking

| Element | Detail |
|---------|--------|
| Appointment system | Integrated booking solution with API, webhooks, multi-professional management and calendar sync (Google, Outlook) to replace the current Calendly widget |

#### Audio/video calls

| Element | Detail |
|---------|--------|
| Video room | Daily.co, embedded in the platform via iframe, no additional server required (10,000 free min/month) |
| User experience | User clicks, professional joins, no installation required |

#### Messaging

| Element | Detail |
|---------|--------|
| System | Email relay: each message goes through the platform and is relayed via email to both parties |
| Privacy | User and professional never see each other's email address |
| History | All exchanges are kept on the platform |
| Possible evolution | Migration to real-time integrated messaging if volume justifies it |

#### Notifications and follow-up

| Element | Detail |
|---------|--------|
| Professional notification | Automatic email on each booking with anonymized response summary |
| User confirmation | Email with professional's name, date, call link and practical information |
| Follow-up | Exchange history, file status, automatic reminders |

### 4.4 Health document analysis

Health data is a "special category" under GDPR (art. 9) and is subject to strict legal obligations in France. Before any development, the client must choose an approach that is both technically feasible and legally compliant.

#### Legal context

| Obligation | Detail |
|------------|--------|
| GDPR art. 9 | Health data requires explicit consent, strict purpose limitation, and a Data Protection Impact Assessment (DPIA) |
| HDS certification | In France, storing health data requires a certified HDS (Hébergeur de Données de Santé) host. Vercel and OpenAI are not HDS-certified |
| Transfer outside EU | Sending data to OpenAI (US) requires contractual safeguards (DPA, standard contractual clauses) |
| Anonymization vs pseudonymization | True anonymization (as defined by CNIL) must be irreversible. Removing names is usually only pseudonymization, which remains subject to GDPR |

#### Proposed options

| Option | Approach | Technical complexity | Legal risk | Recommendation |
|--------|----------|---------------------|------------|----------------|
| **A. Guided manual input** | User manually types or selects key information from their medical documents into a structured form. No document upload, no OCR, no storage | Low | Very low | **Recommended** — removes most legal risks while preserving most of the functional value |
| **B. Upload + immediate deletion + local AI** | Document uploaded, processed by a locally-run AI model (e.g. Llama, Mistral), result extracted, document immediately deleted. Nothing sent to third parties | High | Moderate | Viable if the client accepts the cost of a GPU server |
| **C. Upload + pseudonymization + OpenAI** | Document uploaded, pseudonymized (names, dates, IDs removed via regex + NER like Microsoft Presidio), then sent to OpenAI | Moderate | High | Not recommended — false negatives in pseudonymization expose the project to GDPR violations |
| **D. No document analysis** | Feature dropped from scope | None | None | Fallback option if GDPR constraints are too heavy |

#### Required steps before development

1. **Legal consultation** with a DPO or GDPR-specialized lawyer (not the technical provider)
2. **DPIA** (Data Protection Impact Assessment) — mandatory for health data processing
3. **Explicit user consent** mechanism, specific to health data processing (not buried in terms of service)
4. **Updated privacy policy** reflecting the chosen approach
5. **DPAs** (Data Processing Agreements) with all involved third parties

**Note:** This item will be priced separately following the scoping phase and the client's decision on which option to pursue. The technical provider is not responsible for legal compliance decisions; the client is responsible for ensuring GDPR and health data regulations are respected.

### 4.5 Graphic design

| Element | Detail |
|---------|--------|
| Website visual identity | Clean, simple redesign of all pages |
| Parametric PDF design | Layout and visual formatting of generated documents |

**Note:** Simple, functional design without logo creation. Logo is not included in this quote.


## 5. Summary

| Ref. | Item | Status | Action |
|------|------|--------|--------|
| 2.1.1 | Marketing website | Functional | Reused as-is |
| 2.1.2 | Guided forms | Functional (engine) | Validation to tighten |
| 2.1.3 | Mollie payment | Functional | Reused as-is |
| 3.1 | Routing | Deficient | Complete rewrite |
| 3.2 | Form validation | Too permissive | Tighten validation rules |
| 3.3 | Email sending | Partially deficient | Cleanup and validation |
| 4.1 | PDF generation | Non-functional | Complete overhaul |
| 4.2 | AI integration | Non-functional | Prompt overhaul and technical fixes |
| 4.3 | Professional support | Non-functional | Complete overhaul |
| 4.4 | Health document analysis | Non-existent | To be built (scoping required) |
| 4.5 | Graphic design | Non-existent | Simple design, no logo |


## 6. Recurring costs (not included in this quote)

| Service | Pricing model |
|---------|---------------|
| Vercel | Usage-based (free plan available) |
| OpenAI | Billed per API call |
| Mollie | Commission per transaction |
| Resend | Billed per email sent |
| Daily.co (video calls) | Free up to 10,000 min/month |
| Appointment booking | Depending on chosen provider |


## 7. Terms

- Item 4.4 (Health document analysis) requires a preliminary scoping meeting, a legal consultation (DPO or specialized lawyer) and a DPIA before development. The client is responsible for legal compliance decisions; the technical provider cannot be held liable for GDPR or health data regulations. This item will be priced separately following the scoping phase and the client's decision on the chosen approach.
- Item 4.5 (Graphic design) covers a simple, functional design. Logo creation is not included.
- Corrective and evolutionary maintenance is not included in this quote and will be subject to a separate agreement.
- This quote is valid for 30 days from its issue date.


**Approved**

Date: ____________________

Client signature: ____________________

Provider signature: ____________________
