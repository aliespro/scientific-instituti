import type { RelationType, RelationTypeMeta, RelationFamily } from './types';
import { makeT, type Lang } from './i18n';

export const RELATION_TYPES: (RelationTypeMeta & { tKey: string })[] = [
  { value: 'causes',        tKey: 'rel_causes',        label: 'causes',        family: 'causal',      color: '#f59e0b', lineStyle: 'solid',  defaultDirection: 'forward' },
  { value: 'leads-to',      tKey: 'rel_leads-to',      label: 'leads to',      family: 'causal',      color: '#f97316', lineStyle: 'solid',  defaultDirection: 'forward' },
  { value: 'prevents',      tKey: 'rel_prevents',      label: 'prevents',      family: 'causal',      color: '#ef4444', lineStyle: 'solid',  defaultDirection: 'forward' },
  { value: 'precedes',      tKey: 'rel_precedes',      label: 'precedes',      family: 'causal',      color: '#06b6d4', lineStyle: 'solid',  defaultDirection: 'forward' },
  { value: 'depends-on',    tKey: 'rel_depends-on',    label: 'depends on',    family: 'causal',      color: '#8b5cf6', lineStyle: 'solid',  defaultDirection: 'forward' },
  { value: 'enables',       tKey: 'rel_enables',       label: 'enables',       family: 'causal',      color: '#10b981', lineStyle: 'solid',  defaultDirection: 'forward' },
  { value: 'part-of',       tKey: 'rel_part-of',       label: 'part of',       family: 'structural',  color: '#3b82f6', lineStyle: 'solid',  defaultDirection: 'forward' },
  { value: 'type-of',       tKey: 'rel_type-of',       label: 'type of',       family: 'structural',  color: '#3b82f6', lineStyle: 'solid',  defaultDirection: 'forward' },
  { value: 'has-property',  tKey: 'rel_has-property',  label: 'has property',  family: 'structural',  color: '#06b6d4', lineStyle: 'solid',  defaultDirection: 'forward' },
  { value: 'defines',       tKey: 'rel_defines',       label: 'defines',       family: 'structural',  color: '#64748b', lineStyle: 'solid',  defaultDirection: 'forward' },
  { value: 'supports',      tKey: 'rel_supports',      label: 'supports',      family: 'reasoning',   color: '#10b981', lineStyle: 'solid',  defaultDirection: 'none' },
  { value: 'contradicts',   tKey: 'rel_contradicts',   label: 'contradicts',   family: 'reasoning',   color: '#ef4444', lineStyle: 'solid',  defaultDirection: 'none' },
  { value: 'example-of',    tKey: 'rel_example-of',    label: 'example of',    family: 'reasoning',   color: '#10b981', lineStyle: 'solid',  defaultDirection: 'forward' },
  { value: 'question-about',tKey: 'rel_question-about',label: 'question about',family: 'reasoning',   color: '#f59e0b', lineStyle: 'solid',  defaultDirection: 'forward' },
  { value: 'assumes',       tKey: 'rel_assumes',       label: 'assumes',       family: 'reasoning',   color: '#8b5cf6', lineStyle: 'dashed', defaultDirection: 'forward' },
  { value: 'similar-to',    tKey: 'rel_similar-to',    label: 'similar to',    family: 'comparative', color: '#06b6d4', lineStyle: 'solid',  defaultDirection: 'none' },
  { value: 'opposite',      tKey: 'rel_opposite',      label: 'opposite',      family: 'comparative', color: '#ef4444', lineStyle: 'dashed', defaultDirection: 'none' },
  { value: 'analogy',       tKey: 'rel_analogy',       label: 'analogy',       family: 'comparative', color: '#8b5cf6', lineStyle: 'solid',  defaultDirection: 'none' },
  { value: 'contrasts',     tKey: 'rel_contrasts',     label: 'contrasts with',family: 'comparative', color: '#f97316', lineStyle: 'solid',  defaultDirection: 'none' },
  { value: 'related',       tKey: 'rel_related',       label: 'related to',    family: 'general',     color: '#64748b', lineStyle: 'solid',  defaultDirection: 'none' },
  { value: 'custom',        tKey: 'rel_custom',        label: 'custom',        family: 'general',     color: '#64748b', lineStyle: 'solid',  defaultDirection: 'none' },
];

export const RELATION_FAMILIES: { value: RelationFamily; label: string; tKey: string }[] = [
  { value: 'causal',      tKey: 'family_causal',      label: 'causal' },
  { value: 'structural',  tKey: 'family_structural',  label: 'structural' },
  { value: 'reasoning',   tKey: 'family_reasoning',   label: 'reasoning' },
  { value: 'comparative', tKey: 'family_comparative', label: 'comparative' },
  { value: 'general',     tKey: 'family_general',     label: 'general' },
];

const RELATION_MAP: Record<string, RelationTypeMeta & { tKey: string }> = {};
for (const r of RELATION_TYPES) RELATION_MAP[r.value] = r;

export function getRelationMeta(type: string): RelationTypeMeta & { tKey: string } {
  return RELATION_MAP[type] ?? RELATION_MAP['related'];
}

export function getRelationColor(type: string): string {
  return getRelationMeta(type).color;
}

export function getRelationLabel(type: string, lang?: Lang): string {
  const meta = getRelationMeta(type);
  if (lang) return makeT(lang)(meta.tKey);
  return meta.label;
}

export function getRelationLabelT(type: string, t: (key: string) => string): string {
  const meta = getRelationMeta(type);
  return t(meta.tKey);
}

// v1 -> v2 relation type mapping
export function mapV1Relation(old: string): RelationType {
  const m: Record<string, RelationType> = {
    'causes': 'causes',
    'part-of': 'part-of',
    'opposite': 'opposite',
    'example': 'example-of',
    'depends-on': 'depends-on',
    'related': 'related',
  };
  return m[old] ?? 'related';
}
