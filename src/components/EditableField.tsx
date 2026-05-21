import { useState, useRef, useEffect } from 'react';
import { Edit2, Check, X } from 'lucide-react';

interface EditableFieldProps {
  value: string | number | null | undefined;
  onSave: (val: string) => Promise<void>;
  className?: string;
  multiline?: boolean;
  label?: string;
  canEdit?: boolean;
}

export function EditableField({
  value,
  onSave,
  className = '',
  multiline = false,
  label,
  canEdit = true,
}: EditableFieldProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value ?? ''));
  const [saving, setSaving] = useState(false);
  const ref = useRef<HTMLInputElement & HTMLTextAreaElement>(null);

  useEffect(() => { if (editing) ref.current?.focus(); }, [editing]);
  useEffect(() => { setDraft(String(value ?? '')); }, [value]);

  const save = async () => {
    if (draft === String(value ?? '')) { setEditing(false); return; }
    setSaving(true);
    try { await onSave(draft); setEditing(false); }
    catch { /* keep editing on error */ }
    setSaving(false);
  };

  const cancel = () => { setDraft(String(value ?? '')); setEditing(false); };

  if (!canEdit) {
    return <span className={className}>{value ?? '—'}</span>;
  }

  if (editing) {
    return (
      <span className="inline-flex items-center gap-1.5 group">
        {multiline ? (
          <textarea
            ref={ref as React.Ref<HTMLTextAreaElement>}
            value={draft}
            onChange={e => setDraft(e.target.value)}
            rows={3}
            className={`px-2 py-1 border border-[#2E6B4F] rounded-lg text-sm outline-none resize-y bg-white text-[#0F1A14] w-full ${className}`}
            onKeyDown={e => { if (e.key === 'Escape') cancel(); }}
          />
        ) : (
          <input
            ref={ref as React.Ref<HTMLInputElement>}
            value={draft}
            onChange={e => setDraft(e.target.value)}
            className={`px-2 py-1 border border-[#2E6B4F] rounded-lg text-sm outline-none bg-white text-[#0F1A14] ${className}`}
            onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') cancel(); }}
          />
        )}
        <button onClick={save} disabled={saving} className="p-1 bg-[#27AE60] text-white rounded-md hover:bg-[#229954] shrink-0">
          <Check size={12} />
        </button>
        <button onClick={cancel} className="p-1 bg-[#E8EDE9] text-[#4A5E52] rounded-md hover:bg-[#D4E0D7] shrink-0">
          <X size={12} />
        </button>
      </span>
    );
  }

  return (
    <span
      className={`group inline-flex items-center gap-1.5 cursor-pointer hover:bg-[#F0F7F2] rounded px-1 -mx-1 transition-colors ${className}`}
      onClick={() => setEditing(true)}
      title={label ? `Edit ${label}` : 'Click to edit'}
    >
      <span>{value ?? '—'}</span>
      <Edit2 size={11} className="opacity-0 group-hover:opacity-100 text-[#2E6B4F] shrink-0 transition-opacity" />
    </span>
  );
}

// ── EditableList — for string arrays (keyProducts, markets, openRoles, etc.) ──
interface EditableListProps {
  items: string[];
  onSave: (items: string[]) => Promise<void>;
  canEdit?: boolean;
  itemClassName?: string;
}

export function EditableList({ items, onSave, canEdit = true, itemClassName = '' }: EditableListProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(items.join('\n'));
  const [saving, setSaving] = useState(false);

  useEffect(() => { setDraft(items.join('\n')); }, [items]);

  const save = async () => {
    setSaving(true);
    const next = draft.split('\n').map(s => s.trim()).filter(Boolean);
    try { await onSave(next); setEditing(false); } catch {}
    setSaving(false);
  };

  if (!canEdit) {
    return (
      <div className="flex flex-wrap gap-1.5">
        {items.map((item, i) => (
          <span key={i} className={itemClassName}>{item}</span>
        ))}
      </div>
    );
  }

  if (editing) {
    return (
      <div className="space-y-2">
        <textarea
          autoFocus
          value={draft}
          onChange={e => setDraft(e.target.value)}
          rows={Math.max(3, items.length + 1)}
          placeholder="One item per line"
          className="w-full px-3 py-2 border border-[#2E6B4F] rounded-lg text-sm outline-none resize-y bg-white text-[#0F1A14]"
        />
        <div className="flex gap-2">
          <button onClick={save} disabled={saving} className="px-3 py-1.5 bg-[#27AE60] text-white text-xs rounded-lg hover:bg-[#229954]">
            Save
          </button>
          <button onClick={() => { setDraft(items.join('\n')); setEditing(false); }} className="px-3 py-1.5 bg-[#E8EDE9] text-[#4A5E52] text-xs rounded-lg">
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="group flex flex-wrap gap-1.5 cursor-pointer rounded p-1 -m-1 hover:bg-[#F0F7F2] transition-colors"
      onClick={() => setEditing(true)}
      title="Click to edit"
    >
      {items.map((item, i) => <span key={i} className={itemClassName}>{item}</span>)}
      <Edit2 size={11} className="opacity-0 group-hover:opacity-100 text-[#2E6B4F] self-center ml-1 transition-opacity" />
    </div>
  );
}
