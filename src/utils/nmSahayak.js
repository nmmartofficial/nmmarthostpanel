export const NM_SAHAYAK_LOCAL_URL = 'http://127.0.0.1:4178';
export const NM_SAHAYAK_MODEL = 'qwen3:4b';
export const MAX_NM_SAHAYAK_PROMPT_LENGTH = 1200;

export const NM_SAHAYAK_THEME_KEYS = Object.freeze({
  primaryColor: 'color',
  secondaryColor: 'color',
  backgroundColor: 'color',
  textColor: 'color',
  highlightColor: 'color',
  accentColor: 'color',
  fontFamily: 'font',
  headingFont: 'font',
  bodyFont: 'font',
  fontSizeBase: 'fontSize',
  letterSpacing: 'letterSpacing',
  lineHeight: 'lineHeight',
  bannerRadius: 'radius',
  cardRadius: 'radius',
  buttonRadius: 'radius',
  categoryCardStyle: 'categoryCardStyle',
  bannerTextPosition: 'bannerTextPosition',
  bannerCtaStyle: 'bannerCtaStyle',
  productCardStyle: 'productCardStyle',
  headerStyle: 'headerStyle',
  footerStyle: 'footerStyle',
  buttonStyle: 'buttonStyle',
  animationSpeed: 'animationSpeed',
  shadowStyle: 'shadowStyle',
  announcementText: 'announcementText',
  announcementVisible: 'boolean',
  animationsEnabled: 'boolean'
});

const FONTS = new Set([
  'Inter', 'Roboto', 'Open Sans', 'Lato', 'Poppins', 'Montserrat',
  'Raleway', 'Playfair Display', 'Oswald', 'Ubuntu', 'Merriweather'
]);

const ENUMS = {
  letterSpacing: new Set(['0em', '0.01em', '0.02em', '0.04em', '0.06em']),
  categoryCardStyle: new Set(['soft', 'glass', 'bold']),
  bannerTextPosition: new Set(['left', 'center', 'right']),
  bannerCtaStyle: new Set(['solid', 'outline', 'pill']),
  productCardStyle: new Set(['compact', 'premium', 'offer']),
  headerStyle: new Set(['classic', 'minimal', 'modern', 'centered']),
  footerStyle: new Set(['simple', 'detailed', 'modern']),
  buttonStyle: new Set(['flat', 'gradient', 'outline', 'shadow']),
  animationSpeed: new Set(['slow', 'normal', 'fast']),
  shadowStyle: new Set(['none', 'soft', 'bold', 'glow'])
};

const NUMBER_RANGES = {
  fontSizeBase: [10, 22],
  lineHeight: [1, 2],
  bannerRadius: [0, 32],
  cardRadius: [0, 32],
  buttonRadius: [0, 32]
};

function validateSetting(key, value) {
  const kind = NM_SAHAYAK_THEME_KEYS[key];
  if (!kind) throw new Error(`Unsupported theme setting: ${key}`);

  if (kind === 'color') {
    if (typeof value !== 'string' || !/^#[0-9a-f]{6}$/i.test(value)) {
      throw new Error(`Invalid color for ${key}`);
    }
    return value.toUpperCase();
  }
  if (kind === 'font') {
    if (typeof value !== 'string' || !FONTS.has(value)) throw new Error(`Unsupported font for ${key}`);
    return value;
  }
  if (kind === 'boolean') {
    if (typeof value !== 'boolean') throw new Error(`Invalid boolean for ${key}`);
    return value;
  }
  if (kind === 'announcementText') {
    if (typeof value !== 'string' || value.length > 240) throw new Error('Announcement text must be 240 characters or fewer');
    return value;
  }
  if (kind === 'fontSize' || kind === 'lineHeight' || kind === 'radius') {
    const [min, max] = NUMBER_RANGES[key];
    if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) {
      throw new Error(`Out-of-range value for ${key}`);
    }
    if (kind === 'radius' && !Number.isInteger(value)) throw new Error(`Invalid radius for ${key}`);
    if (key === 'fontSizeBase' && !Number.isInteger(value)) throw new Error('Invalid font size');
    if (key === 'lineHeight' && Math.abs(value * 10 - Math.round(value * 10)) > 1e-8) throw new Error('Invalid line height');
    return value;
  }
  if (!ENUMS[key]?.has(value)) throw new Error(`Unsupported value for ${key}`);
  return value;
}

export function validateThemeChanges(changes, { allowEmpty = false } = {}) {
  if (!changes || typeof changes !== 'object' || Array.isArray(changes)) {
    throw new Error('Theme proposal changes must be an object');
  }
  const keys = Object.keys(changes);
  if ((!allowEmpty && keys.length === 0) || keys.length > 12) {
    throw new Error('Theme proposal must contain 1 to 12 supported changes');
  }
  return Object.fromEntries(keys.map((key) => [key, validateSetting(key, changes[key])]));
}

export function validateThemeContext(settings) {
  if (!settings || typeof settings !== 'object' || Array.isArray(settings)) {
    throw new Error('Current theme settings are unavailable');
  }
  return Object.fromEntries(Object.entries(settings)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => [key, validateSetting(key, value)]));
}

function colorContrastRatio(first, second) {
  const luminance = (color) => {
    const channels = color.match(/[a-f\d]{2}/gi).map((value) => parseInt(value, 16) / 255);
    const linear = channels.map((channel) => channel <= 0.04045
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4);
    return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
  };
  const a = luminance(first);
  const b = luminance(second);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

function validateProposalContrast(changes, currentTheme = {}) {
  const effective = { ...currentTheme, ...changes };
  if (changes.primaryColor !== undefined || changes.backgroundColor !== undefined) {
    if (colorContrastRatio(effective.primaryColor || '#155EEF', '#FFFFFF') < 4.5) {
      throw new Error('The proposed primary color does not provide enough contrast for white button text.');
    }
  }
  if (changes.textColor !== undefined || changes.backgroundColor !== undefined) {
    if (colorContrastRatio(effective.textColor || '#111827', effective.backgroundColor || '#FFFFFF') < 4.5) {
      throw new Error('The proposed text and background colors do not provide accessible contrast.');
    }
  }
  if (changes.secondaryColor !== undefined) {
    if (colorContrastRatio(effective.textColor || '#111827', effective.secondaryColor) < 4.5) {
      throw new Error('The proposed secondary surface does not provide accessible text contrast.');
    }
  }
}

export function validateSahayakProposal(proposal, currentTheme = {}) {
  if (!proposal || typeof proposal !== 'object' || Array.isArray(proposal)) {
    throw new Error('The local model returned an invalid proposal.');
  }
  const allowedFields = new Set(['scope', 'summary', 'rationale', 'clarifyingQuestion', 'changes']);
  if (Object.keys(proposal).some((key) => !allowedFields.has(key))) {
    throw new Error('The proposal contains unsupported fields.');
  }
  if (!['theme', 'unsupported'].includes(proposal.scope)) {
    throw new Error('The proposal has an unsupported scope.');
  }
  if (typeof proposal.summary !== 'string' || !proposal.summary.trim() || proposal.summary.length > 240) {
    throw new Error('The proposal summary is invalid.');
  }
  if (typeof proposal.rationale !== 'string' || !proposal.rationale.trim() || proposal.rationale.length > 500) {
    throw new Error('The proposal explanation is invalid.');
  }
  if (proposal.clarifyingQuestion !== null && (
    typeof proposal.clarifyingQuestion !== 'string' || proposal.clarifyingQuestion.length > 300
  )) {
    throw new Error('The clarification question is invalid.');
  }
  const requestedChanges = validateThemeChanges(proposal.changes, { allowEmpty: true });
  const normalizedCurrentTheme = validateThemeContext(currentTheme);
  const changes = Object.fromEntries(Object.entries(requestedChanges)
    .filter(([key, value]) => normalizedCurrentTheme[key] !== value));
  validateProposalContrast(changes, normalizedCurrentTheme);
  if (proposal.scope === 'unsupported' && Object.keys(changes).length > 0) {
    throw new Error('Unsupported requests cannot contain changes.');
  }
  if (proposal.scope === 'theme' && Object.keys(changes).length === 0 && !proposal.clarifyingQuestion) {
    throw new Error('A theme proposal needs a change or a clarification question.');
  }
  return {
    scope: proposal.scope,
    summary: proposal.summary.trim(),
    rationale: proposal.rationale.trim(),
    clarifyingQuestion: proposal.clarifyingQuestion?.trim() || null,
    changes
  };
}

export function buildThemeProposalPreview(currentTheme, candidate) {
  const proposal = validateSahayakProposal(candidate, currentTheme);
  const before = Object.fromEntries(Object.keys(proposal.changes)
    .map((key) => [key, currentTheme?.[key] ?? null]));
  return {
    proposal,
    before,
    after: { ...before, ...proposal.changes }
  };
}

export function buildThemeDraftChanges(baseTheme, targetTheme, editableKeys) {
  if (!baseTheme || typeof baseTheme !== 'object' || Array.isArray(baseTheme)
    || !targetTheme || typeof targetTheme !== 'object' || Array.isArray(targetTheme)
    || !Array.isArray(editableKeys)) {
    throw new Error('The requested theme draft is invalid.');
  }
  const missingPreviousValues = editableKeys
    .filter((key) => baseTheme[key] !== undefined && targetTheme[key] === undefined);
  if (missingPreviousValues.length) {
    throw new Error('This draft cannot be rolled back safely because a previous setting value is not available.');
  }
  const changes = Object.fromEntries(editableKeys
    .filter((key) => targetTheme[key] !== undefined
      && JSON.stringify(baseTheme[key]) !== JSON.stringify(targetTheme[key]))
    .map((key) => [key, targetTheme[key]]));
  if (!Object.keys(changes).length || Object.keys(changes).length > 12) {
    throw new Error('The theme draft must contain 1 to 12 supported changes.');
  }
  return changes;
}

export async function saveApprovedThemeProposal({ candidate, currentTheme, saveDraft }) {
  const preview = buildThemeProposalPreview(currentTheme, candidate);
  if (preview.proposal.scope !== 'theme' || !Object.keys(preview.proposal.changes).length) {
    throw new Error('Only a non-empty supported theme proposal can be approved.');
  }
  if (typeof saveDraft !== 'function') throw new Error('The authorized theme save action is unavailable.');
  const savedTheme = await saveDraft(preview.proposal.changes);
  if (!savedTheme || typeof savedTheme !== 'object' || Array.isArray(savedTheme)
    || Object.entries(preview.proposal.changes).some(([key, value]) => savedTheme[key] !== value)) {
    throw new Error('Supabase did not confirm every proposed theme value.');
  }
  return { ...preview, savedTheme };
}

export function createRuleBasedThemeProposal(instruction, currentTheme) {
  const text = String(instruction || '').trim().toLowerCase();
  if (!text) {
    return {
      scope: 'theme',
      summary: 'Please describe the change you want.',
      rationale: 'A little more detail helps create a safe suggestion.',
      clarifyingQuestion: 'Do you want a color, typography, or card-style change?',
      changes: {}
    };
  }
  if (/(banner|section|homepage order|homepage section|homepage layout|schedule|placement|बैनर|सेक्शन|क्रम)/i.test(text)) {
    return {
      scope: 'unsupported',
      summary: 'This request needs banner or homepage-layout controls.',
      rationale: 'This assistant currently proposes only allowlisted website theme settings; it cannot read or change banner schedules or homepage section order.',
      clarifyingQuestion: null,
      changes: {}
    };
  }

  const premium = /(premium|प्रिमियम|प्रीमियम|classy|बेहतर|improve|sundar|सुंदर)/i.test(text);
  const blue = /(blue|नीला|नीली)/i.test(text);
  const changes = blue
    ? {
      primaryColor: '#1D4ED8',
      secondaryColor: '#EFF6FF',
      backgroundColor: '#FFFFFF',
      textColor: '#172554',
      highlightColor: '#DBEAFE',
      accentColor: '#F59E0B'
    }
    : premium
      ? {
        primaryColor: '#1D4ED8',
        secondaryColor: '#F8FAFC',
        backgroundColor: '#FFFFFF',
        textColor: '#111827',
        highlightColor: '#DBEAFE',
        accentColor: '#D4A017',
        headingFont: 'Poppins',
        categoryCardStyle: 'soft',
        productCardStyle: 'premium'
      }
      : {};

  if (!Object.keys(changes).length) {
    return {
      scope: 'theme',
      summary: 'Please clarify the theme change.',
      rationale: 'The rule-based helper only suggests predefined, validated theme options.',
      clarifyingQuestion: 'Would you like a blue palette, a premium style, or a typography change?',
      changes: {}
    };
  }

  const filtered = Object.fromEntries(Object.entries(changes)
    .filter(([key, value]) => currentTheme?.[key] !== value));
  if (!Object.keys(filtered).length) {
    return {
      scope: 'theme',
      summary: 'The current theme already matches this suggestion.',
      rationale: 'No setting needs to change for this style.',
      clarifyingQuestion: 'Would you like to adjust typography or card styles as well?',
      changes: {}
    };
  }
  return {
    scope: 'theme',
    summary: blue ? 'A coordinated blue theme is ready to preview.' : 'A premium-style theme is ready to preview.',
    rationale: 'This uses only predefined colors, fonts, and card styles; no business or customer data was used.',
    clarifyingQuestion: null,
    changes: validateThemeChanges(filtered, { allowEmpty: true })
  };
}

async function requestLocal(path, options = {}) {
  const { timeoutMs = 5000, ...requestOptions } = options;
  let response;
  try {
    response = await fetch(`${NM_SAHAYAK_LOCAL_URL}${path}`, {
      ...requestOptions,
      signal: AbortSignal.timeout(timeoutMs)
    });
  } catch (error) {
    if (error?.name === 'TimeoutError' || error?.name === 'AbortError') {
      throw new Error('The local NM Sahayak service timed out.');
    }
    throw new Error('Local Ollama is unavailable. Start the NM Sahayak local service and try again.');
  }
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.error || `Local NM Sahayak request failed (${response.status}).`);
  return data;
}

export async function checkLocalSahayak() {
  const result = await requestLocal('/health');
  return {
    available: result.available === true && result.model === NM_SAHAYAK_MODEL,
    model: result.model || null,
    message: result.message || ''
  };
}

export async function requestThemeProposal({ instruction, themeSettings, accessToken }) {
  const prompt = String(instruction || '').trim();
  if (!prompt || prompt.length > MAX_NM_SAHAYAK_PROMPT_LENGTH) {
    throw new Error(`Enter an instruction of 1 to ${MAX_NM_SAHAYAK_PROMPT_LENGTH} characters.`);
  }
  if (!accessToken) throw new Error('Sign in again to use NM Sahayak.');
  const currentTheme = validateThemeContext(themeSettings);
  const proposal = await requestLocal('/api/propose', {
    method: 'POST',
    timeoutMs: 155000,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`
    },
    body: JSON.stringify({
      instruction: prompt,
      currentTheme
    })
  });
  return validateSahayakProposal(proposal, currentTheme);
}
