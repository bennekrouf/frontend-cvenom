'use client';

// ManageBrandsModal — lightweight CRUD over the tenant brand library.
//
// Two views, toggled inside the same modal:
//   • LIST    — every brand the tenant has, with edit/delete buttons.
//   • EDITOR  — the 3-question brand questionnaire (vibe + primary + layout)
//               plus an Advanced accordion for the secondary knobs.
//
// Defaults mirror backend `core/branding.rs` vibe presets so what the user
// sees in the picker matches what the resolver will apply at generation time.

import React, { useEffect, useState } from 'react';
import {
  listBrands,
  getBrand,
  putBrand,
  deleteBrand,
  uploadBrandLogo,
  deleteBrandLogo,
  brandLogoUrl,
  slugifyBrandName,
  type Brand,
  type BrandSummary,
} from '@/lib/api';

// ── Vibe presets (mirror backend core/branding.rs) ────────────────────────────

interface VibePreset {
  id: string;
  label: string;
  primary: string;
  accent: string;
  layout: 'single' | 'sidebar_left' | 'header_banner';
  description: string;
}

const VIBES: VibePreset[] = [
  { id: 'corporate',  label: 'Corporate',  primary: '#E11937', accent: '#1A1A1A', layout: 'sidebar_left',  description: 'Clean, professional, red-on-white.' },
  { id: 'consulting', label: 'Consulting', primary: '#14365C', accent: '#C9A24B', layout: 'header_banner', description: 'Navy + gold, classic serif.' },
  { id: 'creative',   label: 'Creative',   primary: '#FF4F64', accent: '#2D2D2D', layout: 'header_banner', description: 'Bold rose, generous whitespace.' },
  { id: 'academic',   label: 'Academic',   primary: '#1F3A5F', accent: '#7A5C2E', layout: 'single',        description: 'Serif, dense, scholarly.' },
  { id: 'legal',      label: 'Legal',      primary: '#0B2545', accent: '#8B7355', layout: 'single',        description: 'Conservative deep navy.' },
  { id: 'tech',       label: 'Tech',       primary: '#6E40C9', accent: '#14A4E6', layout: 'sidebar_left',  description: 'Geometric, sidebar layout.' },
  { id: 'minimal',    label: 'Minimal',    primary: '#000000', accent: '#888888', layout: 'single',        description: 'Pure black & white.' },
];

const LAYOUTS = [
  { id: 'single',         label: 'Single column' },
  { id: 'sidebar_left',   label: 'Sidebar (left)' },
  { id: 'sidebar_right',  label: 'Sidebar (right)' },
  { id: 'header_banner',  label: 'Header banner' },
];

const DENSITIES = [
  { id: '',            label: 'Default' },
  { id: 'compact',     label: 'Compact' },
  { id: 'comfortable', label: 'Comfortable' },
  { id: 'generous',    label: 'Generous' },
];

const DIVIDERS = [
  { id: '',         label: 'Default' },
  { id: 'hairline', label: 'Hairline' },
  { id: 'bold',     label: 'Bold' },
  { id: 'none',     label: 'None' },
];

const emptyBrand = (): Brand => ({
  name: '',
  description: '',
  styling: {
    primary_color: '#E11937',
    secondary_color: '#5A5A5A',
    show_photo: false,
  },
});

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  isOpen: boolean;
  onClose: () => void;
  /** Called after any successful create/update/delete so the parent can refresh
   *  its own brand list (e.g. the picker in GenerateCVModal). */
  onChanged?: () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

type Mode =
  | { kind: 'list' }
  | { kind: 'edit'; slug: string }       // editing an existing brand
  | { kind: 'create' };                   // creating a new brand

const ManageBrandsModal: React.FC<Props> = ({ isOpen, onClose, onChanged }) => {
  const [mode, setMode] = useState<Mode>({ kind: 'list' });
  const [brands, setBrands] = useState<BrandSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Editor state — only populated when mode is edit/create.
  const [draft, setDraft] = useState<Brand>(emptyBrand());
  const [draftSlug, setDraftSlug] = useState<string>('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [saving, setSaving] = useState(false);
  // Logo state: existing server logo + locally-chosen replacement file.
  // `logoVersion` is bumped after every upload/delete to bust the <img> cache.
  const [logoExists, setLogoExists] = useState(false);
  const [pendingLogo, setPendingLogo] = useState<File | null>(null);
  const [logoVersion, setLogoVersion] = useState(0);

  // Reset to list view + refetch whenever the modal opens.
  useEffect(() => {
    if (!isOpen) return;
    setMode({ kind: 'list' });
    setError(null);
    refresh();
  }, [isOpen]);

  // Esc closes the modal (only from the list view — editor uses its own Back).
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && mode.kind === 'list' && !saving) onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, mode.kind, saving, onClose]);

  const refresh = async () => {
    setLoading(true);
    try {
      setBrands(await listBrands());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load brands');
    } finally {
      setLoading(false);
    }
  };

  const startCreate = () => {
    setDraft(emptyBrand());
    setDraftSlug('');
    setShowAdvanced(false);
    setLogoExists(false);
    setPendingLogo(null);
    setMode({ kind: 'create' });
  };

  const startEdit = async (summary: BrandSummary) => {
    setError(null);
    try {
      const b = await getBrand(summary.slug);
      setDraft(b);
      setDraftSlug(summary.slug);
      setShowAdvanced(false);
      setLogoExists(summary.has_logo);
      setPendingLogo(null);
      setLogoVersion((v) => v + 1);
      setMode({ kind: 'edit', slug: summary.slug });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load brand');
    }
  };

  const handleDelete = async (slug: string, name: string) => {
    if (!confirm(`Delete brand "${name}"? This can't be undone.`)) return;
    try {
      await deleteBrand(slug);
      await refresh();
      onChanged?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete brand');
    }
  };

  const applyVibe = (v: VibePreset) => {
    setDraft((d) => ({
      ...d,
      styling: {
        ...d.styling,
        vibe: v.id,
        primary_color: v.primary,
        accent_color: v.accent,
        layout: v.layout,
      },
    }));
  };

  const handleSave = async () => {
    if (!draft.name.trim()) {
      setError('Name is required');
      return;
    }
    const slug = mode.kind === 'edit' ? mode.slug : slugifyBrandName(draft.name);
    if (!slug) {
      setError('Name must contain letters or digits');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      // 1. Persist the brand first — logo upload requires the brand dir to exist.
      await putBrand(slug, draft);
      // 2. If the user picked a logo, upload it now.
      if (pendingLogo) {
        await uploadBrandLogo(slug, pendingLogo);
      }
      await refresh();
      onChanged?.();
      setMode({ kind: 'list' });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save brand');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveLogo = async () => {
    if (mode.kind !== 'edit') {
      // For new brands, there's no server-side logo yet — just drop the pending file.
      setPendingLogo(null);
      return;
    }
    try {
      await deleteBrandLogo(mode.slug);
      setLogoExists(false);
      setPendingLogo(null);
      setLogoVersion((v) => v + 1);
      onChanged?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to remove logo');
    }
  };

  if (!isOpen) return null;

  // ── Render ──────────────────────────────────────────────────────────────────

  const headerTitle =
    mode.kind === 'list'  ? 'Manage brands' :
    mode.kind === 'edit'  ? `Edit brand` :
                            'New brand';

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget && mode.kind === 'list' && !saving) onClose();
      }}
    >
      <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh]">
        {/* ── Header ── */}
        <div className="px-6 pt-5 pb-4 border-b border-border shrink-0 flex items-center gap-3">
          {mode.kind !== 'list' && (
            <button
              onClick={() => !saving && setMode({ kind: 'list' })}
              disabled={saving}
              className="text-sm text-muted-foreground hover:text-foreground disabled:opacity-50"
              title="Back to list"
            >
              ← Back
            </button>
          )}
          <h3 className="text-lg font-semibold text-foreground flex-1">{headerTitle}</h3>
          {mode.kind === 'list' && (
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground"
              title="Close"
            >
              ✕
            </button>
          )}
        </div>

        {/* ── Body ── */}
        <div className="overflow-y-auto flex-1 px-6 py-5">
          {error && (
            <div className="mb-4 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}

          {mode.kind === 'list' ? (
            <ListView
              brands={brands}
              loading={loading}
              onCreate={startCreate}
              onEdit={startEdit}
              onDelete={handleDelete}
            />
          ) : (
            <EditorView
              draft={draft}
              setDraft={setDraft}
              isEdit={mode.kind === 'edit'}
              draftSlug={mode.kind === 'edit' ? mode.slug : slugifyBrandName(draft.name)}
              draftSlugInput={draftSlug}
              setDraftSlugInput={setDraftSlug}
              showAdvanced={showAdvanced}
              setShowAdvanced={setShowAdvanced}
              onApplyVibe={applyVibe}
              logoExists={logoExists}
              pendingLogo={pendingLogo}
              onPickLogo={setPendingLogo}
              onRemoveLogo={handleRemoveLogo}
              existingLogoSrc={
                mode.kind === 'edit' && logoExists
                  ? brandLogoUrl(mode.slug, logoVersion)
                  : null
              }
            />
          )}
        </div>

        {/* ── Footer ── */}
        {mode.kind !== 'list' && (
          <div className="px-6 py-4 border-t border-border flex justify-end gap-3 shrink-0">
            <button
              onClick={() => !saving && setMode({ kind: 'list' })}
              disabled={saving}
              className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md text-sm hover:bg-secondary/80 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !draft.name.trim()}
              className="px-5 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving…' : 'Save brand'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ManageBrandsModal;

// ── List view ─────────────────────────────────────────────────────────────────

const ListView: React.FC<{
  brands: BrandSummary[];
  loading: boolean;
  onCreate: () => void;
  onEdit: (summary: BrandSummary) => void;
  onDelete: (slug: string, name: string) => void;
}> = ({ brands, loading, onCreate, onEdit, onDelete }) => {
  return (
    <div className="space-y-3">
      <button
        onClick={onCreate}
        className="w-full rounded-lg border-2 border-dashed border-border px-4 py-3 text-sm font-medium text-muted-foreground hover:border-primary hover:text-primary transition-colors"
      >
        + New brand
      </button>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : brands.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">
          No brands yet. Create one to apply consistent branding across your CVs.
        </p>
      ) : (
        brands.map((b) => (
          <div
            key={b.slug}
            className="flex items-center gap-3 rounded-lg border border-border bg-background px-4 py-3"
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {b.name}{b.has_logo && <span className="ml-2 text-xs text-muted-foreground">· logo</span>}
              </p>
              {b.description && (
                <p className="text-xs text-muted-foreground truncate">{b.description}</p>
              )}
            </div>
            <button
              onClick={() => onEdit(b)}
              className="text-xs font-medium text-primary hover:underline"
            >
              Edit
            </button>
            <button
              onClick={() => onDelete(b.slug, b.name)}
              className="text-xs font-medium text-destructive hover:underline"
            >
              Delete
            </button>
          </div>
        ))
      )}
    </div>
  );
};

// ── Editor view (the questionnaire) ───────────────────────────────────────────

const EditorView: React.FC<{
  draft: Brand;
  setDraft: React.Dispatch<React.SetStateAction<Brand>>;
  isEdit: boolean;
  draftSlug: string;
  draftSlugInput: string;
  setDraftSlugInput: (v: string) => void;
  showAdvanced: boolean;
  setShowAdvanced: (b: boolean) => void;
  onApplyVibe: (v: VibePreset) => void;
  logoExists: boolean;
  pendingLogo: File | null;
  onPickLogo: (f: File | null) => void;
  onRemoveLogo: () => void;
  existingLogoSrc: string | null;
}> = ({
  draft,
  setDraft,
  isEdit,
  draftSlug,
  showAdvanced,
  setShowAdvanced,
  onApplyVibe,
  logoExists,
  pendingLogo,
  onPickLogo,
  onRemoveLogo,
  existingLogoSrc,
}) => {
  const setStyling = <K extends keyof Brand['styling']>(key: K, value: Brand['styling'][K]) =>
    setDraft((d) => ({ ...d, styling: { ...d.styling, [key]: value } }));

  return (
    <div className="space-y-5">
      {/* Name + description */}
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Name <span className="text-destructive">*</span>
          </label>
          <input
            value={draft.name}
            onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
            placeholder="e.g. CGI"
            disabled={isEdit /* renames not supported in v1 */}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-60"
          />
          {!isEdit && draft.name && (
            <p className="mt-1 text-[11px] text-muted-foreground">
              Will be saved as <code className="font-mono">{draftSlug || '—'}</code>
            </p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Description</label>
          <input
            value={draft.description}
            onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
            placeholder="Short note shown in the brand picker"
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>
      </div>

      {/* Logo */}
      <LogoField
        existingLogoSrc={existingLogoSrc}
        logoExists={logoExists}
        pendingLogo={pendingLogo}
        onPick={onPickLogo}
        onRemove={onRemoveLogo}
        canRemoveServer={isEdit && logoExists}
        savedHint={!isEdit && !!pendingLogo}
      />

      {/* Vibe cards */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">Vibe</label>
        <p className="text-xs text-muted-foreground mb-2">
          Pick a preset to seed colors and layout. You can override any of them below.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {VIBES.map((v) => {
            const selected = draft.styling.vibe === v.id;
            return (
              <button
                key={v.id}
                onClick={() => onApplyVibe(v)}
                title={v.description}
                className={`flex flex-col items-center gap-1.5 rounded-lg border-2 px-2 py-3 text-xs font-medium transition-colors ${
                  selected
                    ? 'border-primary bg-primary/5 text-primary'
                    : 'border-border text-muted-foreground hover:border-primary/40 hover:text-foreground'
                }`}
              >
                <div className="flex gap-1">
                  <span className="h-4 w-4 rounded border border-border" style={{ backgroundColor: v.primary }} />
                  <span className="h-4 w-4 rounded border border-border" style={{ backgroundColor: v.accent }} />
                </div>
                <span>{v.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Primary color (always asked) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <ColorField
          label="Primary color"
          value={draft.styling.primary_color}
          onChange={(v) => setStyling('primary_color', v)}
        />
        <ColorField
          label="Secondary color"
          value={draft.styling.secondary_color}
          onChange={(v) => setStyling('secondary_color', v)}
        />
      </div>

      {/* Layout */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1">Layout</label>
        <select
          value={draft.styling.layout ?? ''}
          onChange={(e) => setStyling('layout', e.target.value)}
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
        >
          <option value="">Template default</option>
          {LAYOUTS.map((l) => (
            <option key={l.id} value={l.id}>{l.label}</option>
          ))}
        </select>
      </div>

      {/* Advanced accordion */}
      <div className="border-t border-border pt-3">
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          {showAdvanced ? '▾' : '▸'} Advanced
        </button>

        {showAdvanced && (
          <div className="mt-3 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <ColorField
                label="Accent color"
                value={draft.styling.accent_color ?? ''}
                onChange={(v) => setStyling('accent_color', v)}
              />
              <ColorField
                label="Neutral / body color"
                value={draft.styling.neutral_color ?? ''}
                onChange={(v) => setStyling('neutral_color', v)}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Density</label>
                <select
                  value={draft.styling.density ?? ''}
                  onChange={(e) => setStyling('density', e.target.value)}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                >
                  {DENSITIES.map((d) => (
                    <option key={d.id} value={d.id}>{d.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Divider style</label>
                <select
                  value={draft.styling.divider ?? ''}
                  onChange={(e) => setStyling('divider', e.target.value)}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                >
                  {DIVIDERS.map((d) => (
                    <option key={d.id} value={d.id}>{d.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Empty fields fall back to the template's defaults.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

// ── Logo dropzone with preview ────────────────────────────────────────────────

const LogoField: React.FC<{
  /** URL of the server-side logo (cache-busted). Null when no server logo. */
  existingLogoSrc: string | null;
  /** True when the server reports a stored logo for this brand. */
  logoExists: boolean;
  /** File picked locally, not yet uploaded. Overrides the server preview. */
  pendingLogo: File | null;
  onPick: (file: File | null) => void;
  /** Delete the server-side logo. Only meaningful when canRemoveServer is true. */
  onRemove: () => void;
  /** True when there's a server-side logo we can DELETE right now. */
  canRemoveServer: boolean;
  /** True when we have a pending file but the brand isn't saved yet — show a
   *  hint so the user knows the logo uploads as part of Save. */
  savedHint: boolean;
}> = ({ existingLogoSrc, logoExists, pendingLogo, onPick, onRemove, canRemoveServer, savedHint }) => {
  const [pendingPreview, setPendingPreview] = useState<string | null>(null);

  // Build an object URL for the locally-chosen file and clean it up.
  React.useEffect(() => {
    if (!pendingLogo) { setPendingPreview(null); return; }
    const url = URL.createObjectURL(pendingLogo);
    setPendingPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [pendingLogo]);

  const previewSrc = pendingPreview ?? existingLogoSrc ?? null;
  const hasAnyLogo = !!previewSrc || (!previewSrc && logoExists);

  return (
    <div>
      <label className="block text-sm font-medium text-foreground mb-1">Logo</label>
      <p className="text-xs text-muted-foreground mb-2">
        PNG or JPEG. Replaces the company logo on templates that show one.
      </p>
      <div className="flex items-center gap-4">
        <div className="h-20 w-20 rounded-md border border-border bg-muted/30 flex items-center justify-center overflow-hidden">
          {previewSrc ? (
            // Plain <img>; previewSrc is either a blob: URL or a cache-busted absolute URL.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={previewSrc} alt="Brand logo" className="max-h-full max-w-full object-contain" />
          ) : (
            <span className="text-[10px] text-muted-foreground/60 text-center px-1">No logo</span>
          )}
        </div>
        <div className="flex-1 space-y-2">
          <label className="inline-block cursor-pointer rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors">
            {hasAnyLogo ? 'Replace logo' : 'Choose file'}
            <input
              type="file"
              accept="image/png,image/jpeg"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                onPick(f);
                // Reset so picking the same file again still triggers onChange.
                e.target.value = '';
              }}
            />
          </label>
          {(pendingLogo || canRemoveServer) && (
            <button
              type="button"
              onClick={() => {
                if (pendingLogo) {
                  onPick(null);
                } else {
                  onRemove();
                }
              }}
              className="ml-2 text-xs font-medium text-destructive hover:underline"
            >
              {pendingLogo ? 'Discard' : 'Remove logo'}
            </button>
          )}
          {savedHint && (
            <p className="text-[11px] text-muted-foreground">Will upload when you save the brand.</p>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Reusable hex color field with swatch ──────────────────────────────────────

const ColorField: React.FC<{
  label: string;
  value: string;
  onChange: (v: string) => void;
}> = ({ label, value, onChange }) => {
  return (
    <div>
      <label className="block text-xs font-medium text-muted-foreground mb-1">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value || '#000000'}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-12 rounded border border-border cursor-pointer"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#RRGGBB"
          className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
      </div>
    </div>
  );
};
