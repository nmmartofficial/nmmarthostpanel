import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildThemeDraftChanges,
  buildThemeProposalPreview,
  createRuleBasedThemeProposal,
  NM_SAHAYAK_THEME_KEYS,
  requestThemeProposal,
  saveApprovedThemeProposal,
  validateSahayakProposal,
  validateThemeChanges,
  validateThemeContext
} from './nmSahayak.js';

const currentTheme = {
  primaryColor: '#CC0000',
  backgroundColor: '#FFFFFF',
  headingFont: 'Inter',
  buttonRadius: 8,
  announcementVisible: true
};

const proposal = {
  scope: 'theme',
  summary: 'A coordinated blue palette',
  rationale: 'Blue and neutral surfaces improve visual consistency.',
  clarifyingQuestion: null,
  changes: {
    primaryColor: '#1D4ED8',
    backgroundColor: '#FFFFFF',
    headingFont: 'Poppins'
  }
};

test('accepts a Hindi premium homepage request as bounded theme settings', () => {
  const result = createRuleBasedThemeProposal('Homepage ko premium banao', currentTheme);
  assert.equal(result.scope, 'theme');
  assert.equal(result.changes.primaryColor, '#1D4ED8');
  assert.equal(result.changes.headingFont, 'Poppins');
  assert.equal(result.changes.productCardStyle, 'premium');
});

test('assistant allowlist cannot change banners, section ordering, prices, inventory, or Android settings', () => {
  for (const key of ['banners', 'homepage_layout', 'sectionOrder', 'price', 'stock', 'delivery', 'androidTheme']) {
    assert.equal(Object.hasOwn(NM_SAHAYAK_THEME_KEYS, key), false);
  }
});

test('accepts a blue-theme Hinglish request without reading business data', () => {
  const result = createRuleBasedThemeProposal('Blue theme ke saath better colour combination suggest karo', currentTheme);
  assert.equal(result.scope, 'theme');
  assert.equal(result.changes.primaryColor, '#1D4ED8');
  assert.match(result.rationale, /no business or customer data/i);
});

test('asks for clarification for vague instructions and refuses unsupported banner/layout changes', () => {
  const vague = createRuleBasedThemeProposal('make it nice', currentTheme);
  assert.ok(vague.clarifyingQuestion);
  assert.deepEqual(vague.changes, {});

  const unsupported = createRuleBasedThemeProposal('Homepage sections ka order improve karo', currentTheme);
  assert.equal(unsupported.scope, 'unsupported');
  assert.deepEqual(unsupported.changes, {});
});

test('rejects arbitrary, unsupported, and out-of-range model changes', () => {
  assert.throws(() => validateThemeChanges({ customCss: 'body { display:none }' }), /Unsupported theme setting/);
  assert.throws(() => validateThemeChanges({ primaryColor: 'red' }), /Invalid color/);
  assert.throws(() => validateThemeChanges({ fontSizeBase: 99 }), /Out-of-range/);
  assert.throws(() => validateThemeChanges({ buttonStyle: 'javascript:alert(1)' }), /Unsupported value/);
  assert.throws(() => validateThemeChanges({ primaryColor: '#123456', announcementText: 'x'.repeat(241) }), /240 characters/);
});

test('rejects low-contrast primary and text colors in model proposals', () => {
  assert.throws(() => validateSahayakProposal({
    ...proposal,
    changes: { primaryColor: '#E0F7FA' }
  }, currentTheme), /white button text/);
  assert.throws(() => validateSahayakProposal({
    ...proposal,
    changes: { textColor: '#E5E7EB', backgroundColor: '#FFFFFF' }
  }, currentTheme), /accessible contrast/);
});

test('rejects malformed proposals, unknown output fields, and changes on unsupported scope', () => {
  assert.throws(() => validateSahayakProposal({ ...proposal, sql: 'select 1' }), /unsupported fields/i);
  assert.throws(() => validateSahayakProposal({ ...proposal, scope: 'unsupported' }), /cannot contain changes/);
  assert.throws(() => validateSahayakProposal({ ...proposal, changes: { tenant_id: 44 } }), /Unsupported theme setting/);
});

test('only valid allowlisted current theme values are accepted as model context', () => {
  assert.deepEqual(validateThemeContext(currentTheme), currentTheme);
  assert.throws(() => validateThemeContext({ primaryColor: 'url(https://example.com)' }), /Invalid color/);
});

test('builds a before and after preview without saving changes', () => {
  const preview = buildThemeProposalPreview(currentTheme, proposal);
  assert.deepEqual(preview.before, {
    primaryColor: '#CC0000',
    headingFont: 'Inter'
  });
  assert.equal(preview.after.primaryColor, '#1D4ED8');
  assert.equal(currentTheme.primaryColor, '#CC0000');
});

test('creates rollback changes only for supported values and refuses incomplete history', () => {
  const previous = { ...currentTheme };
  const target = { ...currentTheme, primaryColor: '#1D4ED8', unsupported: 'ignored' };
  assert.deepEqual(buildThemeDraftChanges(currentTheme, target, Object.keys(NM_SAHAYAK_THEME_KEYS)), {
    primaryColor: '#1D4ED8'
  });
  assert.throws(
    () => buildThemeDraftChanges(currentTheme, { primaryColor: '#1D4ED8' }, Object.keys(NM_SAHAYAK_THEME_KEYS)),
    /previous setting value is not available/
  );
  assert.deepEqual(currentTheme, previous);
});

test('approval calls the authorized save callback and verifies persisted values', async () => {
  let savedChanges;
  const result = await saveApprovedThemeProposal({
    candidate: proposal,
    currentTheme,
    saveDraft: async (changes) => {
      savedChanges = changes;
      return { ...currentTheme, ...changes };
    }
  });
  assert.deepEqual(savedChanges, {
    primaryColor: '#1D4ED8',
    headingFont: 'Poppins'
  });
  assert.equal(result.savedTheme.headingFont, 'Poppins');
});

test('failed and success-shaped incomplete saves are failures', async () => {
  await assert.rejects(() => saveApprovedThemeProposal({
    candidate: proposal,
    currentTheme,
    saveDraft: async () => { throw new Error('database write failed'); }
  }), /database write failed/);

  await assert.rejects(() => saveApprovedThemeProposal({
    candidate: proposal,
    currentTheme,
    saveDraft: async () => ({ ...currentTheme, primaryColor: '#1D4ED8' })
  }), /did not confirm every proposed theme value/);
});

test('requires an explicit supported non-empty proposal and save operation', async () => {
  const unsupported = createRuleBasedThemeProposal('Add a new banner schedule', currentTheme);
  await assert.rejects(() => saveApprovedThemeProposal({
    candidate: unsupported,
    currentTheme,
    saveDraft: async () => currentTheme
  }), /Only a non-empty supported theme proposal/);
  await assert.rejects(() => saveApprovedThemeProposal({
    candidate: proposal,
    currentTheme
  }), /save action is unavailable/);
});

test('local model request requires a valid signed-in session and handles timeout', async (context) => {
  const originalFetch = globalThis.fetch;
  context.after(() => { globalThis.fetch = originalFetch; });

  await assert.rejects(() => requestThemeProposal({
    instruction: 'Homepage ko premium banao',
    themeSettings: currentTheme,
    accessToken: ''
  }), /Sign in again/);

  globalThis.fetch = async () => {
    const error = new Error('timed out');
    error.name = 'TimeoutError';
    throw error;
  };
  await assert.rejects(() => requestThemeProposal({
    instruction: 'Homepage ko premium banao',
    themeSettings: currentTheme,
    accessToken: 'test-session-token'
  }), /timed out/);
});
