import React, { useEffect, useRef, useState } from 'react';
import { ImagePlus, Info, Trash2 } from 'lucide-react';
import { ProfileDialog } from '../ProfileDialog';
import { SokoTabs, sokoTokens } from '../sokoDesignSystem/SokoComponents';

export type CompanyImageKind = 'logo' | 'cover';
type FitMode = 'fill' | 'fit';

const ACCEPTED = ['image/png', 'image/jpeg', 'image/webp'];
const MAX_BYTES = 5 * 1024 * 1024;

const SPEC: Record<CompanyImageKind, { w: number; h: number; title: string; hint: string }> = {
  logo: { w: 320, h: 320, title: 'Company logo', hint: 'Square image works best. PNG, JPG or WebP, up to 5 MB.' },
  cover: { w: 1500, h: 500, title: 'Company cover image', hint: 'Landscape image around 3:1 (e.g. 1500 × 500). PNG, JPG or WebP, up to 5 MB.' },
};

const btn = `${sokoTokens.focus} inline-flex items-center justify-center gap-2 h-9 px-3.5 rounded-xl text-sm font-medium transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed`;
const btnPrimary = `${btn} bg-blue-600 text-white hover:bg-blue-700`;
const btnSecondary = `${btn} border border-slate-200 bg-white text-slate-700 hover:bg-slate-50`;
const btnDanger = `${btn} text-rose-700 hover:bg-rose-50`;

const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('This file could not be read as an image.'));
    img.src = src;
  });

/** Renders the source into the target frame, cropping (fill) or letterboxing (fit), and returns a compact data URL. */
const renderFramed = (img: HTMLImageElement, kind: CompanyImageKind, mode: FitMode) => {
  const { w, h } = SPEC[kind];
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  const scale = mode === 'fill' ? Math.max(w / img.width, h / img.height) : Math.min(w / img.width, h / img.height);
  const dw = img.width * scale;
  const dh = img.height * scale;
  if (mode === 'fit') {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);
  }
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
  return canvas.toDataURL('image/webp', 0.86);
};

export const CompanyImageDialog: React.FC<{
  kind: CompanyImageKind;
  current?: string;
  fallback: React.ReactNode;
  onSave: (dataUrl: string | undefined) => boolean;
  onClose: () => void;
}> = ({ kind, current, fallback, onSave, onClose }) => {
  const spec = SPEC[kind];
  const inputRef = useRef<HTMLInputElement>(null);
  const [source, setSource] = useState<HTMLImageElement | null>(null);
  const [mode, setMode] = useState<FitMode>('fill');
  const [preview, setPreview] = useState<string | undefined>(current);
  const [error, setError] = useState('');

  useEffect(() => {
    if (source) setPreview(renderFramed(source, kind, mode));
  }, [source, mode, kind]);

  const pick = (file?: File) => {
    setError('');
    if (!file) return;
    if (!ACCEPTED.includes(file.type)) return setError('Choose a PNG, JPG or WebP image.');
    if (file.size > MAX_BYTES) return setError(`This file is ${(file.size / 1024 / 1024).toFixed(1)} MB. The maximum is 5 MB.`);
    const reader = new FileReader();
    reader.onload = () => loadImage(String(reader.result)).then(setSource, (e: Error) => setError(e.message));
    reader.onerror = () => setError('This file could not be read.');
    reader.readAsDataURL(file);
  };

  const changed = !!source;
  const frame = kind === 'logo' ? 'w-40 h-40 rounded-2xl' : 'w-full aspect-[3/1] rounded-xl';

  return (
    <ProfileDialog
      title={current ? `Replace ${spec.title.toLowerCase()}` : `Add ${spec.title.toLowerCase()}`}
      subtitle="Company-owned image. It never replaces any member's personal profile photo."
      size={kind === 'cover' ? 'lg' : 'md'}
      onClose={onClose}
      footer={
        <div className="flex flex-wrap items-center justify-between gap-2">
          {current && !changed ? (
            <button type="button" onClick={() => onSave(undefined) && onClose()} className={btnDanger}>
              <Trash2 className="w-4 h-4" /> Remove {kind}
            </button>
          ) : <span />}
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className={btnSecondary}>Cancel</button>
            <button type="button" disabled={!changed} onClick={() => preview && onSave(preview) && onClose()} className={btnPrimary}>
              Save {kind}
            </button>
          </div>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <div className={`${frame} ${kind === 'logo' ? 'self-center' : ''} overflow-hidden border border-slate-200 bg-slate-50 flex items-center justify-center`}>
          {preview ? <img src={preview} alt={`${spec.title} preview`} className="w-full h-full object-cover" /> : fallback}
        </div>

        {source && (
          <SokoTabs
            tabs={[{ id: 'fill' as const, label: kind === 'logo' ? 'Crop to square' : 'Crop to 3:1' }, { id: 'fit' as const, label: 'Fit whole image' }]}
            active={mode}
            onChange={setMode}
            label="Image framing"
          />
        )}

        <div className="flex flex-wrap items-center gap-3">
          <input ref={inputRef} type="file" accept={ACCEPTED.join(',')} className="sr-only" onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ''; }} aria-label={`Upload ${spec.title.toLowerCase()}`} />
          <button type="button" onClick={() => inputRef.current?.click()} className={btnSecondary}>
            <ImagePlus className="w-4 h-4" /> {preview ? 'Choose another image' : 'Choose image'}
          </button>
          <p className="text-xs text-slate-500">{spec.hint}</p>
        </div>

        {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}

        <p className="flex items-start gap-2 text-[11px] text-slate-500 leading-relaxed">
          <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          Prototype: the image is resized and kept in this browser&apos;s local storage only. Permanent, secure storage requires a backend file-storage integration.
        </p>
      </div>
    </ProfileDialog>
  );
};
