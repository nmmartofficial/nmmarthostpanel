import React, { useEffect, useMemo, useState } from 'react';
import { Bot, History, Loader2, RotateCcw, Sparkles } from 'lucide-react';
import { supabase } from '../supabase';
import {
  checkLocalSahayak,
  buildThemeProposalPreview,
  createRuleBasedThemeProposal,
  NM_SAHAYAK_THEME_KEYS,
  requestThemeProposal,
  saveApprovedThemeProposal,
  validateSahayakProposal
} from '../utils/nmSahayak';

function ProposalValue({ value }) {
  if (typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value)) {
    return <span className="inline-flex items-center gap-2"><span className="h-4 w-4 rounded border border-slate-300" style={{ backgroundColor: value }} />{value}</span>;
  }
  return <span>{String(value)}</span>;
}

export default function NmSahayakPanel({
  currentUser,
  isAuthorized,
  currentTheme,
  canSave,
  onApproveProposal,
  onRestoreTheme
}) {
  const [connection, setConnection] = useState({ state: 'checking', message: 'Checking local Ollama…' });
  const [instruction, setInstruction] = useState('');
  const [proposal, setProposal] = useState(null);
  const [proposalSource, setProposalSource] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [operation, setOperation] = useState('');
  const [history, setHistory] = useState([]);
  const isPlatformAdmin = isAuthorized === true && currentUser?.role === 'super_admin';
  const safeCurrentTheme = useMemo(() => Object.fromEntries(
    Object.keys(NM_SAHAYAK_THEME_KEYS)
      .filter((key) => currentTheme?.[key] !== undefined)
      .map((key) => [key, currentTheme[key]])
  ), [currentTheme]);

  const refreshConnection = async () => {
    setConnection({ state: 'checking', message: 'Checking local Ollama…' });
    try {
      const result = await checkLocalSahayak();
      setConnection(result.available
        ? { state: 'available', message: `${result.model} ready on this computer.` }
        : { state: 'unavailable', message: result.message || 'Local model is unavailable.' });
    } catch (failure) {
      setConnection({ state: 'unavailable', message: failure.message || 'Start the local NM Sahayak service.' });
    }
  };

  useEffect(() => {
    let active = true;
    checkLocalSahayak().then((result) => {
      if (active) setConnection(result.available
        ? { state: 'available', message: `${result.model} ready on this computer.` }
        : { state: 'unavailable', message: result.message || 'Local model is unavailable.' });
    }).catch((failure) => {
      if (active) setConnection({ state: 'unavailable', message: failure.message || 'Start the local NM Sahayak service.' });
    });
    return () => { active = false; };
  }, []);

  const generateProposal = async () => {
    setBusy(true);
    setOperation('thinking');
    setError('');
    setProposal(null);
    setProposalSource(null);
    try {
      const { data, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw new Error('Could not verify your sign-in session.');
      const accessToken = data?.session?.access_token;
      if (!accessToken) throw new Error('Sign in again to use NM Sahayak.');
      const result = await requestThemeProposal({
        instruction,
        themeSettings: safeCurrentTheme,
        accessToken
      });
      setProposal(result);
      setProposalSource('local');
      setConnection({ state: 'available', message: 'Local qwen3:4b generated this proposal.' });
    } catch (failure) {
      setError(failure.message || 'Local AI could not create a proposal.');
      if (/unavailable|timed out|failed|not reachable/i.test(failure.message || '')) {
        setConnection({ state: 'unavailable', message: failure.message });
      }
    } finally {
      setBusy(false);
      setOperation('');
    }
  };

  const createRuleBasedProposal = () => {
    setError('');
    try {
      setProposal(validateSahayakProposal(createRuleBasedThemeProposal(instruction, safeCurrentTheme)));
      setProposalSource('rules');
    } catch (failure) {
      setError(failure.message || 'Could not create a safe rule-based proposal.');
    }
  };

  const approveProposal = async () => {
    if (!proposal || proposal.scope !== 'theme' || !Object.keys(proposal.changes).length || !canSave || busy) return;
    setBusy(true);
    setOperation('saving');
    setError('');
    try {
      const before = currentTheme && typeof currentTheme === 'object' ? { ...currentTheme } : { ...safeCurrentTheme };
      const approved = await saveApprovedThemeProposal({
        candidate: proposal,
        currentTheme: safeCurrentTheme,
        saveDraft: onApproveProposal
      });
      setHistory((previous) => [{
        id: `${Date.now()}-${previous.length}`,
        summary: proposal.summary,
        source: proposalSource,
        before,
        after: { ...approved.savedTheme },
        savedAt: new Date().toLocaleString()
      }, ...previous].slice(0, 10));
      setProposal(null);
      setProposalSource(null);
      setConnection((state) => ({
        ...state,
        message: 'Approved and saved as an unpublished Supabase draft. Publishing remains a separate action.'
      }));
      return approved.savedTheme;
    } catch (failure) {
      setError(failure.message || 'The proposal was not saved.');
    } finally {
      setBusy(false);
      setOperation('');
    }
  };

  const restoreProposal = async (entry) => {
    if (!canSave || busy || !window.confirm('Restore the earlier theme as a draft? This does not publish it.')) return;
    setBusy(true);
    setOperation('restoring');
    setError('');
    try {
      await onRestoreTheme(entry.before);
      setConnection((state) => ({
        ...state,
        message: 'Earlier theme restored and verified as a draft. It is not published.'
      }));
    } catch (failure) {
      setError(failure.message || 'The earlier draft could not be restored.');
    } finally {
      setBusy(false);
      setOperation('');
    }
  };

  const preview = proposal ? buildThemeProposalPreview(safeCurrentTheme, proposal) : null;
  const previewChanges = Object.entries(preview?.proposal.changes || {});

  return (
    <section className="space-y-4 rounded-xl border border-violet-200 bg-violet-50/60 p-4" aria-labelledby="nm-sahayak-heading">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="nm-sahayak-heading" className="flex items-center gap-2 text-lg font-bold text-slate-900"><Bot size={19} />NM Sahayak · Local AI</h2>
          <p className="mt-1 text-xs text-slate-600">Hindi/Hinglish theme suggestions from this computer’s Ollama model. No cloud AI calls.</p>
        </div>
        <button type="button" onClick={refreshConnection} disabled={connection.state === 'checking'} className="rounded-lg border border-violet-300 bg-white px-3 py-2 text-xs font-semibold disabled:opacity-50">
          {connection.state === 'checking' ? 'Checking…' : 'Check local AI'}
        </button>
      </div>

      <div role="status" aria-live="polite" className={`rounded-lg border p-3 text-sm ${connection.state === 'available' ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : connection.state === 'checking' ? 'border-slate-200 bg-white text-slate-700' : 'border-amber-200 bg-amber-50 text-amber-950'}`}>
        <strong>{connection.state === 'available' ? 'Local AI available' : connection.state === 'checking' ? 'Checking local AI' : 'Local AI unavailable'}</strong>
        <span className="ml-2">{connection.message}</span>
      </div>

      {!isPlatformAdmin && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-900">Theme proposals require an active platform super-admin account. Tenant and other roles cannot save this global theme.</p>}
      <label className="block space-y-1 text-sm font-medium text-slate-800">
        <span>What would you like to improve?</span>
        <textarea value={instruction} onChange={(event) => setInstruction(event.target.value.slice(0, 1200))} maxLength={1200} rows={2} placeholder="Homepage ko premium banao; blue theme suggest karo…" disabled={!isPlatformAdmin || busy} className="w-full rounded-lg border border-slate-300 bg-white p-3 text-sm disabled:bg-slate-100" />
      </label>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={generateProposal} disabled={!isPlatformAdmin || busy || !instruction.trim() || !Object.keys(safeCurrentTheme).length} className="inline-flex items-center gap-2 rounded-lg bg-violet-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
          {operation === 'thinking' ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
          {operation === 'thinking' ? 'Thinking locally…' : 'Ask local AI'}
        </button>
        {connection.state === 'unavailable' && (
          <button type="button" onClick={createRuleBasedProposal} disabled={!isPlatformAdmin || busy || !instruction.trim()} className="rounded-lg border border-amber-400 bg-white px-4 py-2 text-sm font-semibold text-amber-950 disabled:opacity-50">
            Use rule-based suggestion
          </button>
        )}
      </div>

      {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-900">{error}</p>}
      {proposal && (
        <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-bold text-slate-900">Proposal preview</h3>
            <span className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase ${proposalSource === 'local' ? 'bg-violet-100 text-violet-800' : 'bg-amber-100 text-amber-900'}`}>
              {proposalSource === 'local' ? 'Local qwen3:4b' : 'Rule-based · no AI'}
            </span>
          </div>
          <p className="text-sm font-semibold text-slate-800">{proposal.summary}</p>
          <p className="text-sm text-slate-600">{proposal.rationale}</p>
          {proposal.clarifyingQuestion && <p className="rounded bg-blue-50 p-2 text-sm text-blue-900">Please clarify: {proposal.clarifyingQuestion}</p>}
          {proposal.scope === 'unsupported' && <p className="rounded bg-amber-50 p-2 text-sm text-amber-950">No changes were generated. Banner scheduling and homepage section order are not connected to this assistant.</p>}
          {previewChanges.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[380px] text-left text-xs">
                <thead><tr className="border-b text-slate-500"><th className="py-2 pr-3">Setting</th><th className="py-2 pr-3">Before</th><th className="py-2">After</th></tr></thead>
                <tbody>{previewChanges.map(([key, value]) => (
                  <tr key={key} className="border-b border-slate-100">
                    <th className="py-2 pr-3 font-medium text-slate-700">{key}</th>
                    <td className="py-2 pr-3 text-slate-500"><ProposalValue value={preview?.before[key] ?? 'Default'} /></td>
                    <td className="py-2 font-semibold text-slate-900"><ProposalValue value={value} /></td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={approveProposal} disabled={!canSave || busy || proposal.scope !== 'theme' || !previewChanges.length} className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
              {operation === 'saving' ? 'Saving draft…' : 'Approve & save draft'}
            </button>
            <button type="button" onClick={() => { setProposal(null); setProposalSource(null); }} disabled={busy} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold disabled:opacity-50">Discard proposal</button>
            <span className="text-xs text-slate-500">Saving creates an unpublished draft; it never publishes automatically.</span>
          </div>
        </div>
      )}

      {history.length > 0 && (
        <div className="space-y-2 rounded-lg border border-slate-200 bg-white p-3">
          <h3 className="flex items-center gap-2 text-sm font-bold text-slate-800"><History size={15} />This-session proposal history</h3>
          {history.map((entry) => (
            <div key={entry.id} className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-2 text-xs">
              <span>{entry.summary} · {entry.savedAt} · {entry.source === 'local' ? 'local model' : 'rule-based'}</span>
              <button type="button" onClick={() => restoreProposal(entry)} disabled={!canSave || busy} className="inline-flex items-center gap-1 rounded border border-slate-300 px-2 py-1 font-semibold disabled:opacity-50"><RotateCcw size={12} />Restore prior draft</button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
