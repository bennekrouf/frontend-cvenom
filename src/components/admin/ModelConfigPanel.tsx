'use client';

import { useState, useEffect } from 'react';
import {
  getModelConfig,
  saveModelConfig,
  ModelConfig,
  UpdateProviderModelConfig,
} from '@/lib/api';
import { toast } from 'sonner';

const PROVIDERS = ['claude', 'cohere', 'deepseek', 'mistral'] as const;
type Provider = (typeof PROVIDERS)[number];

const OPERATIONS = [
  { key: 'cv_import',      label: 'CV Import' },
  { key: 'translation',    label: 'Translation' },
  { key: 'job_matching',   label: 'Job Matching' },
  { key: 'cv_optimization', label: 'CV Optimization' },
  { key: 'cover_letter',   label: 'Cover Letter' },
  { key: 'portfolio',      label: 'Portfolio' },
] as const;

// Recommended models per provider with usage hints
const MISTRAL_MODELS = [
  { value: 'open-mistral-nemo',    label: 'Mistral Nemo',   hint: 'Cheapest — simple formatting, translation' },
  { value: 'mistral-small-latest', label: 'Small (recommended)', hint: 'CV generation, rewriting sections' },
  { value: 'mistral-medium-latest', label: 'Medium',         hint: 'LinkedIn analysis, job matching' },
  { value: 'mistral-large-latest', label: 'Large',           hint: 'Complex reasoning, nuanced rewrites' },
];

function ProviderSection({
  name,
  config,
  onChange,
}: {
  name: Provider;
  config: UpdateProviderModelConfig & { api_key_masked?: string | null };
  onChange: (c: UpdateProviderModelConfig & { api_key_masked?: string | null }) => void;
}) {
  return (
    <div className="border border-slate-700 rounded-lg p-4 space-y-3">
      <h3 className="text-sm font-semibold text-white capitalize">{name}</h3>

      <div>
        <label className="block text-xs text-slate-400 mb-1">Model</label>
        {name === 'mistral' ? (
          <select
            value={config.model}
            onChange={(e) => onChange({ ...config, model: e.target.value })}
            className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
          >
            {MISTRAL_MODELS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label} — {m.hint}
              </option>
            ))}
          </select>
        ) : (
          <input
            value={config.model}
            onChange={(e) => onChange({ ...config, model: e.target.value })}
            className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-slate-400 mb-1">Max tokens</label>
          <input
            type="number"
            value={config.max_tokens}
            onChange={(e) => onChange({ ...config, max_tokens: Number(e.target.value) })}
            className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
          />
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1">Temperature</label>
          <input
            type="number"
            step="0.1"
            min="0"
            max="2"
            value={config.temperature}
            onChange={(e) => onChange({ ...config, temperature: Number(e.target.value) })}
            className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs text-slate-400 mb-1">
          API Key
          {config.api_key_masked && (
            <span className="ml-2 text-green-400">✓ {config.api_key_masked}</span>
          )}
        </label>
        <input
          type="password"
          value={config.api_key ?? ''}
          onChange={(e) => onChange({ ...config, api_key: e.target.value })}
          placeholder={config.api_key_masked ? '(leave blank to keep current)' : `Enter ${name} API key`}
          className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
        />
      </div>
    </div>
  );
}

type ProviderState = UpdateProviderModelConfig & { api_key_masked?: string | null };

export default function ModelConfigPanel() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [configPath, setConfigPath] = useState('');

  const [providers, setProviders] = useState({
    cv_import: 'deepseek',
    translation: 'deepseek',
    job_matching: 'deepseek',
    cv_optimization: 'deepseek',
    cover_letter: 'deepseek',
    portfolio: 'deepseek',
  });

  const defaultProvider = (): ProviderState => ({
    model: '',
    max_tokens: 4096,
    temperature: 0.1,
    api_key: '',
    api_key_masked: null,
  });

  const [claude, setClaude] = useState<ProviderState>(defaultProvider);
  const [cohere, setCohere] = useState<ProviderState>(defaultProvider);
  const [deepseek, setDeepseek] = useState<ProviderState>(defaultProvider);
  const [mistral, setMistral] = useState<ProviderState>({
    ...defaultProvider(),
    model: 'mistral-small-latest',
  });

  useEffect(() => {
    getModelConfig()
      .then(({ config, config_path }) => {
        setConfigPath(config_path);
        setProviders(config.providers as typeof providers);
        if (config.claude)   setClaude(c => ({ ...c, ...config.claude, api_key: '' }));
        if (config.cohere)   setCohere(c => ({ ...c, ...config.cohere, api_key: '' }));
        if (config.deepseek) setDeepseek(c => ({ ...c, ...config.deepseek, api_key: '' }));
        if (config.mistral)  setMistral(c => ({ ...c, ...config.mistral, api_key: '' }));
      })
      .catch(() => toast.error('Failed to load model config'))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const strip = ({ api_key_masked: _, ...rest }: ProviderState): UpdateProviderModelConfig => rest;
      const result = await saveModelConfig({
        providers,
        claude:   strip(claude),
        cohere:   strip(cohere),
        deepseek: strip(deepseek),
        mistral:  strip(mistral),
      });
      toast.success(result.message);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="text-sm text-slate-400">Loading…</p>;

  return (
    <div>
      <h2 className="text-lg font-semibold text-white mb-1">LLM Model Configuration</h2>
      <p className="text-sm text-slate-400 mb-6">
        Changes are written to <code className="text-indigo-400">{configPath}</code> and
        trigger a cv-import service restart (~2s).
      </p>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Operation routing */}
        <div>
          <h3 className="text-sm font-semibold text-slate-300 mb-3">Provider per operation</h3>
          <div className="grid grid-cols-2 gap-3">
            {OPERATIONS.map(({ key, label }) => (
              <div key={key}>
                <label className="block text-xs text-slate-400 mb-1">{label}</label>
                <select
                  value={providers[key as keyof typeof providers]}
                  onChange={(e) => setProviders((p) => ({ ...p, [key]: e.target.value }))}
                  className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                >
                  {PROVIDERS.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </div>

        {/* Per-provider config */}
        <div>
          <h3 className="text-sm font-semibold text-slate-300 mb-3">Provider settings</h3>
          <div className="space-y-4">
            <ProviderSection name="mistral"  config={mistral}  onChange={setMistral} />
            <ProviderSection name="claude"   config={claude}   onChange={setClaude} />
            <ProviderSection name="deepseek" config={deepseek} onChange={setDeepseek} />
            <ProviderSection name="cohere"   config={cohere}   onChange={setCohere} />
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm rounded font-medium"
        >
          {saving ? 'Saving…' : 'Save & restart cv-import'}
        </button>
      </form>
    </div>
  );
}
