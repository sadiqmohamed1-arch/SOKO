import React from 'react';
import { Package } from 'lucide-react';
import {
  type AdminProduct,
  type ProductStatus,
  type QualityLevel,
  type ReportStatus,
  PRODUCT_STATUS_CLASSES,
  PRODUCT_STATUS_LABELS,
  QUALITY_CLASSES,
  QUALITY_LABELS,
  REPORT_STATUS_CLASSES,
  REPORT_STATUS_LABELS,
} from './productShared';

const pill = 'inline-flex items-center whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-semibold';

export const ProductStatusBadge: React.FC<{ status: ProductStatus }> = ({ status }) => (
  <span className={`${pill} ${PRODUCT_STATUS_CLASSES[status]}`}>{PRODUCT_STATUS_LABELS[status]}</span>
);

export const QualityBadge: React.FC<{ level: QualityLevel }> = ({ level }) => (
  <span className={`${pill} ${QUALITY_CLASSES[level]}`}>{QUALITY_LABELS[level]}</span>
);

export const ReportStatusBadge: React.FC<{ status: ReportStatus }> = ({ status }) => (
  <span className={`${pill} ${REPORT_STATUS_CLASSES[status]}`}>{REPORT_STATUS_LABELS[status]}</span>
);

export const ProductThumb: React.FC<{ product: AdminProduct; size?: 'sm' | 'lg' }> = ({ product, size = 'sm' }) => {
  const box = size === 'lg' ? 'h-14 w-14 rounded-xl' : 'h-10 w-10 rounded-lg';
  if (product.thumbnailUrl) {
    return <img src={product.thumbnailUrl} alt="" className={`${box} shrink-0 border border-slate-200 bg-slate-50 object-cover`} />;
  }
  return (
    <span className={`${box} flex shrink-0 items-center justify-center border border-slate-200 bg-slate-100 text-slate-400`} title={product.imagePaths.length > 0 ? 'Image not available to display' : 'No product image'}>
      <Package className={size === 'lg' ? 'h-5 w-5' : 'h-4 w-4'} aria-hidden="true" />
    </span>
  );
};
