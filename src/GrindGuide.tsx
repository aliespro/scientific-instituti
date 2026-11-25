import { useState, useMemo } from 'react';
import * as LucideIcons from 'lucide-react';
import type { MindMap, Theme } from './types';
import { getChildren, getDescendants, getAncestors, getClusterRoots } from './layout';
import { useLang } from './lang-context';
import { makeT, type Lang, type TFunc } from './i18n';

interface GrindGuideProps {
  map: MindMap;
  theme: Theme;
  onClose: () => void;
  onSelectNode: (id: string) => void;
}

interface StepResult {
  letter: string;
  name: string;
  description: string;
  score: number;
  maxScore: number;
  tips: string[];
  status: 'good' | 'warning' | 'critical';
}

export default function GrindGuide({ map, theme, onClose, onSelectNode }: GrindGuideProps) {
  const [expandedStep, setExpandedStep] = useState<number | null>(0);
  const dark = theme === 'dark';
  const { t, lang } = useLang();

  const results = useMemo(() => analyzeGrind(map, lang), [map, lang]);

  const totalScore = results.reduce((sum, r) => sum + r.score, 0);
  const totalMax = results.reduce((sum, r) => sum + r.maxScore, 0);
  const overallPercent = totalMax > 0 ? Math.round((totalScore / totalMax) * 100) : 0;

  return (
    <aside className={`w-80 flex-shrink-0 border-l flex flex-col z-20 animate-slide-in-right ${dark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
      <div className={`h-14 flex items-center justify-between px-4 border-b ${dark ? 'border-slate-800' : 'border-slate-200'}`}>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-sm">
            <LucideIcons.GraduationCap size={15} className="text-white" />
          </div>
          <div>
            <div className={`text-sm font-bold ${dark ? 'text-white' : 'text-slate-800'}`}>{t('grind_guide')}</div>
            <div className={`text-[10px] ${dark ? 'text-slate-500' : 'text-slate-400'}`}>{t('grind_subtitle')}</div>
          </div>
        </div>
        <button onClick={onClose} className={`w-7 h-7 flex items-center justify-center rounded-lg ${dark ? 'text-slate-400 hover:bg-slate-800' : 'text-slate-400 hover:bg-slate-100'}`}>
          <LucideIcons.X size={16} />
        </button>
      </div>

      <div className={`px-4 py-3 border-b ${dark ? 'border-slate-800' : 'border-slate-200'}`}>
        <div className="flex items-center justify-between mb-1.5">
          <span className={`text-xs font-medium ${dark ? 'text-slate-400' : 'text-slate-500'}`}>{t('overall_score')}</span>
          <span className={`text-sm font-bold ${overallPercent >= 70 ? 'text-emerald-500' : overallPercent >= 40 ? 'text-amber-500' : 'text-rose-500'}`}>{totalScore}/{totalMax}</span>
        </div>
        <div className={`h-2 rounded-full overflow-hidden ${dark ? 'bg-slate-800' : 'bg-slate-100'}`}>
          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${overallPercent}%`, background: overallPercent >= 70 ? 'linear-gradient(90deg, #10b981, #14b8a6)' : overallPercent >= 40 ? 'linear-gradient(90deg, #f59e0b, #f97316)' : 'linear-gradient(90deg, #ef4444, #f43f5e)' }} />
        </div>
        <p className={`text-[11px] mt-2 leading-relaxed ${dark ? 'text-slate-500' : 'text-slate-400'}`}>
          {overallPercent >= 70 ? t('grind_good') : overallPercent >= 40 ? t('grind_ok') : t('grind_bad')}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto">
        {results.map((result, i) => {
          const isExpanded = expandedStep === i;
          const percent = Math.round((result.score / result.maxScore) * 100);
          const statusColor = result.status === 'good' ? 'text-emerald-500' : result.status === 'warning' ? 'text-amber-500' : 'text-rose-500';
          const statusBg = result.status === 'good' ? 'bg-emerald-500' : result.status === 'warning' ? 'bg-amber-500' : 'bg-rose-500';
          return (
            <div key={i} className={`border-b ${dark ? 'border-slate-800' : 'border-slate-100'}`}>
              <button onClick={() => setExpandedStep(isExpanded ? null : i)} className={`w-full flex items-start gap-3 px-4 py-3 text-right transition-colors ${dark ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50'}`}>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-sm font-bold ${result.status === 'good' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400' : result.status === 'warning' ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400' : 'bg-rose-100 text-rose-600 dark:bg-rose-900/40 dark:text-rose-400'}`}>{result.letter}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className={`text-sm font-semibold ${dark ? 'text-slate-200' : 'text-slate-700'}`}>{result.name}</span>
                    <span className={`text-xs font-bold ${statusColor}`}>{result.score}/{result.maxScore}</span>
                  </div>
                  <div className={`h-1 rounded-full mt-1.5 overflow-hidden ${dark ? 'bg-slate-800' : 'bg-slate-100'}`}>
                    <div className={`h-full ${statusBg} transition-all duration-300`} style={{ width: `${percent}%` }} />
                  </div>
                </div>
                <LucideIcons.ChevronDown size={16} className={`flex-shrink-0 mt-1 transition-transform ${isExpanded ? 'rotate-180' : ''} ${dark ? 'text-slate-500' : 'text-slate-400'}`} />
              </button>
              {isExpanded && (
                <div className="px-4 pb-3 pl-11 animate-fade-in">
                  <p className={`text-xs leading-relaxed mb-2.5 ${dark ? 'text-slate-400' : 'text-slate-500'}`}>{result.description}</p>
                  {result.tips.length > 0 && (
                    <div className="space-y-1.5">
                      {result.tips.map((tip, ti) => (
                        <div key={ti} className={`flex items-start gap-2 text-[11px] leading-relaxed ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
                          <LucideIcons.Lightbulb size={12} className="flex-shrink-0 mt-0.5 text-amber-400" />
                          <span>{tip}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className={`px-4 py-3 border-t ${dark ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-slate-50'}`}>
        <div className={`text-[10px] leading-relaxed ${dark ? 'text-slate-500' : 'text-slate-400'}`}>{t('grind_credit')}</div>
      </div>
    </aside>
  );
}

function analyzeGrind(map: MindMap, lang: Lang): StepResult[] {
  const allNodes = Object.values(map.nodes);
  const allEdges = Object.values(map.edges);
  const roots = getClusterRoots(map);
  const nonRootNodes = allNodes.filter((n) => n.parentId !== null);
  const t = makeT(lang);

  // --- G: Grouping ---
  const groupScore = (() => {
    let score = 0; const tips: string[] = []; const max = 5;
    // Multiple clusters with children (3-7 main branches across all clusters)
    const mainBranches = roots.flatMap((r) => getChildren(map, r.id));
    if (mainBranches.length >= 3 && mainBranches.length <= 7) score += 2;
    else if (mainBranches.length >= 2) { score += 1; if (mainBranches.length > 7) tips.push(t('grind_too_many_branches')); else tips.push(t('grind_min_3_branches')); }
    else tips.push(t('grind_not_enough_branches'));

    const branchColors = new Set(mainBranches.map((n) => n.color));
    if (mainBranches.length > 0 && branchColors.size >= Math.min(mainBranches.length, 4)) score += 1;
    else if (mainBranches.length > 1) tips.push(t('grind_unique_color'));

    const hasSubBranches = nonRootNodes.some((n) => getChildren(map, n.id).length > 0);
    if (hasSubBranches) score += 1;
    else tips.push(t('grind_add_subbranches'));

    const colorConsistent = mainBranches.filter((child) => { const gc = getChildren(map, child.id); return gc.length === 0 || gc.every((g) => g.color === child.color); });
    if (colorConsistent.length === mainBranches.length && mainBranches.length > 0) score += 1;
    else tips.push(t('grind_color_consistent'));

    const status: 'good' | 'warning' | 'critical' = score >= 4 ? 'good' : score >= 2 ? 'warning' : 'critical';
    return { score, maxScore: max, tips, status };
  })();

  // --- R: Relational ---
  const relationalScore = (() => {
    let score = 0; const tips: string[] = []; const max = 5;
    const nonPartOfEdges = allEdges.filter((e) => e.type !== 'part-of');
    if (nonPartOfEdges.length >= 3) score += 2;
    else if (nonPartOfEdges.length >= 1) { score += 1; tips.push(t('grind_more_causal')); }
    else tips.push(t('grind_no_meaningful'));

    const relationTypes = new Set(allEdges.map((e) => e.type));
    if (relationTypes.size >= 3) score += 1;
    else if (relationTypes.size <= 1) tips.push(t('grind_diverse_relations'));

    const customLabels = allEdges.filter((e) => e.label && e.label.trim().length > 0);
    if (customLabels.length >= 2) score += 1;
    else tips.push(t('grind_custom_labels'));

    if (nonRootNodes.length > 0) { const edgeRatio = allEdges.length / nonRootNodes.length; if (edgeRatio <= 3) score += 1; else tips.push(t('grind_too_many_edges')); }
    const status: 'good' | 'warning' | 'critical' = score >= 4 ? 'good' : score >= 2 ? 'warning' : 'critical';
    return { score, maxScore: max, tips, status };
  })();

  // --- I: Interconnected ---
  const interconnectedScore = (() => {
    let score = 0; const tips: string[] = []; const max = 5;
    const branchOf = new Map<string, string>();
    for (const root of roots) { branchOf.set(root.id, root.id); for (const desc of getDescendants(map, root.id)) branchOf.set(desc, root.id); }

    const crossLinks = allEdges.filter((e) => {
      if (e.from.kind !== 'node' || e.to.kind !== 'node') return false;
      const fb = branchOf.get(e.from.id); const tb = branchOf.get(e.to.id);
      return fb && tb && fb !== tb;
    });

    if (crossLinks.length >= 3) score += 2;
    else if (crossLinks.length >= 1) { score += 1; tips.push(t('grind_more_cross')); }
    else tips.push(t('grind_isolated'));

    const nodesWithEdges = new Set<string>();
    for (const e of allEdges) { if (e.from.kind === 'node') nodesWithEdges.add(e.from.id); if (e.to.kind === 'node') nodesWithEdges.add(e.to.id); }
    const isolated = allNodes.filter((n) => !nodesWithEdges.has(n.id) && getChildren(map, n.id).length === 0 && n.parentId !== null);
    if (isolated.length === 0) score += 1;
    else tips.push(t('grind_isolated_nodes', { n: isolated.length }));

    const hasBackLink = allEdges.some((e) => { if (e.from.kind !== 'node' || e.to.kind !== 'node') return false; return getAncestors(map, e.from.id).includes(e.to.id); });
    if (hasBackLink) score += 1;
    else tips.push(t('grind_back_link'));

    if (roots.length > 1) { const connectedRoots = new Set<string>(); for (const cl of crossLinks) { const fb = branchOf.get(cl.from.id); const tb = branchOf.get(cl.to.id); if (fb) connectedRoots.add(fb); if (tb) connectedRoots.add(tb); } if (connectedRoots.size >= Math.min(roots.length, 2)) score += 1; else tips.push(t('grind_connect_roots')); }
    else score += 1;

    const status: 'good' | 'warning' | 'critical' = score >= 4 ? 'good' : score >= 2 ? 'warning' : 'critical';
    return { score, maxScore: max, tips, status };
  })();

  // --- N: Nonverbal ---
  const nonverbalScore = (() => {
    let score = 0; const tips: string[] = []; const max = 5;
    const nodesWithIcons = allNodes.filter((n) => n.icon && n.icon !== 'Circle');
    const iconPercent = allNodes.length > 0 ? nodesWithIcons.length / allNodes.length : 0;
    if (iconPercent >= 0.8) score += 2;
    else if (iconPercent >= 0.5) { score += 1; tips.push(t('grind_more_icons')); }
    else tips.push(t('grind_most_no_icons'));

    const avgTitleLength = allNodes.reduce((sum, n) => sum + n.title.length, 0) / Math.max(allNodes.length, 1);
    if (avgTitleLength <= 15) score += 2;
    else if (avgTitleLength <= 25) { score += 1; tips.push(t('grind_shorter_titles')); }
    else tips.push(t('grind_titles_too_long'));

    const nodesWithTags = allNodes.filter((n) => n.tags.length > 0);
    if (nodesWithTags.length >= allNodes.length * 0.3) score += 1;
    else tips.push(t('grind_add_tags'));

    const status: 'good' | 'warning' | 'critical' = score >= 4 ? 'good' : score >= 2 ? 'warning' : 'critical';
    return { score, maxScore: max, tips, status };
  })();

  // --- D: Directional ---
  const directionalScore = (() => {
    let score = 0; const tips: string[] = []; const max = 5;
    const causalEdges = allEdges.filter((e) => ['causes', 'leads-to', 'depends-on', 'prevents', 'enables'].includes(e.type));
    if (causalEdges.length >= 3) score += 2;
    else if (causalEdges.length >= 1) { score += 1; tips.push(t('grind_more_directional')); }
    else tips.push(t('grind_no_directional'));

    let chainFound = false;
    for (const e of causalEdges) { if (e.from.kind === 'node' && e.to.kind === 'node') { const hasOutgoing = causalEdges.some((e2) => e2.from.kind === 'node' && e2.from.id === e.to.id); const hasIncoming = causalEdges.some((e2) => e2.to.kind === 'node' && e2.to.id === e.from.id); if (hasOutgoing && !hasIncoming) { chainFound = true; break; } } }
    if (chainFound) score += 1;
    else if (causalEdges.length >= 1) tips.push(t('grind_chain_hint'));

    const oppositeEdges = allEdges.filter((e) => e.type === 'opposite' || e.type === 'contradicts' || e.type === 'contrasts');
    if (oppositeEdges.length >= 1) score += 1;
    else tips.push(t('grind_add_opposite'));

    if (causalEdges.length >= 2) score += 1;
    const status: 'good' | 'warning' | 'critical' = score >= 4 ? 'good' : score >= 2 ? 'warning' : 'critical';
    return { score, maxScore: max, tips, status };
  })();

  // --- E: Emphasized ---
  const emphasizedScore = (() => {
    let score = 0; const tips: string[] = []; const max = 5;
    const highImportance = allNodes.filter((n) => n.importance === 'high');
    if (highImportance.length >= 3 && highImportance.length <= allNodes.length * 0.5) score += 2;
    else if (highImportance.length >= 1) { score += 1; if (highImportance.length > allNodes.length * 0.5) tips.push(t('grind_too_many_high')); else tips.push(t('grind_mark_important')); }
    else tips.push(t('grind_no_high'));

    const confidenceLevels = new Set(allNodes.map((n) => n.confidence));
    if (confidenceLevels.size >= 2) score += 1;
    else tips.push(t('grind_varied_confidence'));

    const reviewLevels = new Set(allNodes.map((n) => n.reviewStatus));
    if (reviewLevels.size >= 2) score += 1;
    else tips.push(t('grind_update_review'));

    const highWithDetail = highImportance.filter((n) => n.body || n.link);
    if (highImportance.length > 0 && highWithDetail.length >= highImportance.length * 0.5) score += 1;
    else if (highImportance.length > 0) tips.push(t('grind_add_detail'));

    const status: 'good' | 'warning' | 'critical' = score >= 4 ? 'good' : score >= 2 ? 'warning' : 'critical';
    return { score, maxScore: max, tips, status };
  })();

  return [
    { ...groupScore, letter: 'G', name: t('grind_grouping'), description: t('grind_grouping_desc') },
    { ...relationalScore, letter: 'R', name: t('grind_relating'), description: t('grind_relating_desc') },
    { ...interconnectedScore, letter: 'I', name: t('grind_interconnecting'), description: t('grind_interconnecting_desc') },
    { ...nonverbalScore, letter: 'N', name: t('grind_nonlinguistic'), description: t('grind_nonlinguistic_desc') },
    { ...directionalScore, letter: 'D', name: t('grind_directional'), description: t('grind_directional_desc') },
    { ...emphasizedScore, letter: 'E', name: t('grind_emphasis'), description: t('grind_emphasis_desc') },
  ];
}
