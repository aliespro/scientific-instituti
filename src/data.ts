import type { MindMap, MindNode, MindEdge, NodeColor } from './types';
import type { Lang } from './i18n';
import { makeT } from './i18n';

let idCounter = 0;

export function uid(prefix = 'n'): string {
  idCounter += 1;
  return `${prefix}_${Date.now().toString(36)}_${idCounter}_${Math.random().toString(36).slice(2, 7)}`;
}

function node(p: Partial<MindNode> & { title: string; id: string; parentId: string | null; x: number; y: number }): MindNode {
  return {
    title: p.title,
    body: p.body ?? '',
    kind: p.kind ?? 'idea',
    x: p.x,
    y: p.y,
    width: p.width,
    parentId: p.parentId,
    childPlacement: p.childPlacement ?? null,
    collapsed: p.collapsed ?? false,
    color: p.color ?? 'blue',
    icon: p.icon ?? 'Lightbulb',
    tags: p.tags ?? [],
    importance: p.importance ?? 'medium',
    confidence: p.confidence ?? 'medium',
    reviewStatus: p.reviewStatus ?? 'new',
    link: p.link,
    groupId: p.groupId ?? null,
    origin: 'user',
    createdAt: p.createdAt ?? Date.now(),
    updatedAt: p.updatedAt ?? Date.now(),
    id: p.id,
  };
}

function edge(fromId: string, toId: string, type: MindEdge['type']): MindEdge {
  return {
    id: `e_${fromId}_${toId}_${type}`,
    from: { kind: 'node', id: fromId },
    to: { kind: 'node', id: toId },
    type,
    direction: 'forward',
    label: '',
    strength: 'normal',
    status: 'confirmed',
    lineStyle: type === 'opposite' ? 'dashed' : 'solid',
    curve: 'curved',
    origin: 'user',
    createdAt: Date.now(),
  };
}

// ── Sample map ──────────────────────────────────────────────────────────────
// Content is real data, not UI labels — stays in Persian as the demo dataset.

const SAMPLE_FA: Array<[string, string, string | null, number, number, Partial<MindNode>]> = [
  ['n_root', 'یادگیری مؤثر', null, 0, 0, { color: 'violet', icon: 'Brain', importance: 'high', confidence: 'high', reviewStatus: 'mastered', body: 'فرایند یادگیری که به درک عمیق و ماندگار منجر می‌شود', tags: ['هسته'] }],
  ['n_prep', 'آماده‌سازی', 'n_root', -500, -300, { color: 'blue', icon: 'Target', importance: 'high', confidence: 'high', reviewStatus: 'reviewing', body: 'پیش از شروع یادگیری، هدف و انگیزه روشن باشد', tags: ['گروه ۱'], childPlacement: 'tree-left' }],
  ['n_goal', 'هدف‌گذاری', 'n_prep', -800, -420, { color: 'blue', icon: 'Flag', importance: 'high', confidence: 'high', reviewStatus: 'reviewing', body: 'داشتن هدف مشخص مسیر یادگیری را روشن می‌کند', tags: ['پیش‌نیاز'] }],
  ['n_motivate', 'انگیزه درونی', 'n_prep', -800, -260, { color: 'blue', icon: 'Heart', importance: 'high', confidence: 'medium', reviewStatus: 'learning', body: 'کنجکاوی و علاقه واقعی، سوخت یادگیری ماندگار است', tags: ['روانی'] }],
  ['n_plan', 'برنامه زمانی', 'n_prep', -800, -100, { color: 'blue', icon: 'Clock', importance: 'medium', confidence: 'high', reviewStatus: 'mastered', body: 'تقسیم زمان یادگیری به بازه‌های قابل مدیریت', tags: ['زمان‌بندی'] }],
  ['n_deep', 'درک عمیق', 'n_root', -500, 200, { color: 'green', icon: 'BookOpen', importance: 'high', confidence: 'medium', reviewStatus: 'learning', body: 'فراتر از حفظیات رفتن و درک چرایی و چگونگی', tags: ['گروه ۲', 'هسته'], childPlacement: 'tree-left' }],
  ['n_focus', 'تمرکز کامل', 'n_deep', -800, 80, { color: 'green', icon: 'Eye', importance: 'high', confidence: 'medium', reviewStatus: 'reviewing', body: 'حذف عوامل حواس‌پرتی و توجه کامل به موضوع', tags: ['تمرکز'] }],
  ['n_question', 'پرسشگری', 'n_deep', -800, 240, { color: 'green', icon: 'HelpCircle', importance: 'high', confidence: 'medium', reviewStatus: 'learning', body: 'طرح سوال چرا و چگونه درباره هر مفهوم', tags: ['تفکر انتقادی'] }],
  ['n_chunk', 'تکه‌بندی', 'n_deep', -800, 400, { color: 'green', icon: 'Puzzle', importance: 'medium', confidence: 'high', reviewStatus: 'mastered', body: 'شکستن اطلاعات بزرگ به بخش‌های کوچک و قابل هضم', tags: ['تکنیک'] }],
  ['n_elabor', 'توضیح‌افزایی', 'n_deep', -500, 420, { color: 'green', icon: 'Lightbulb', importance: 'high', confidence: 'medium', reviewStatus: 'learning', body: 'افزودن جزئیات و مثال به مفاهیم برای درک بهتر', tags: ['تکنیک'] }],
  ['n_structure', 'ساختارسازی', 'n_root', 400, 300, { color: 'amber', icon: 'Layers', importance: 'high', confidence: 'medium', reviewStatus: 'learning', body: 'سازمان‌دهی اطلاعات به صورت گروه‌ها و روابط معنایی', tags: ['گروه ۳'], childPlacement: 'tree-left' }],
  ['n_grouping', 'گروه‌بندی', 'n_structure', 200, 480, { color: 'amber', icon: 'Layers', importance: 'high', confidence: 'high', reviewStatus: 'reviewing', body: 'قرار دادن مفاهیم مشابه در یک گروه — چانکینگ شناختی', tags: ['گروه‌بندی', 'هسته'] }],
  ['n_relate', 'ارتباط‌دهی', 'n_structure', 500, 480, { color: 'amber', icon: 'Network', importance: 'high', confidence: 'medium', reviewStatus: 'learning', body: 'ساختن پیوندهای معنایی بین مفاهیم', tags: ['ارتباط'] }],
  ['n_bigpic', 'تصویر کلی', 'n_structure', 700, 320, { color: 'amber', icon: 'Compass', importance: 'high', confidence: 'low', reviewStatus: 'new', body: 'دیدن کل موضوع و ارتباط گروه‌ها با هم', tags: ['تصویر کلی'] }],
  ['n_retain', 'تثبیت و کاربرد', 'n_root', 500, -200, { color: 'rose', icon: 'Zap', importance: 'high', confidence: 'medium', reviewStatus: 'reviewing', body: 'بازیابی فعال، مرور فاصله‌دار و کاربرد واقعی', tags: ['گروه ۴'], childPlacement: 'tree-left' }],
  ['n_recall', 'بازیابی فعال', 'n_retain', 800, -380, { color: 'rose', icon: 'Brain', importance: 'high', confidence: 'medium', reviewStatus: 'reviewing', body: 'یادآوری از حافظه به جای بازخوانی منفعلانه', tags: ['تکنیک اصلی'] }],
  ['n_spaced', 'مرور فاصله‌دار', 'n_retain', 800, -200, { color: 'rose', icon: 'Clock', importance: 'high', confidence: 'high', reviewStatus: 'mastered', body: 'افزایش فاصله‌های مرور برای ماندگاری طولانی‌مدت', tags: ['زمان‌بندی'] }],
  ['n_apply', 'کاربرد واقعی', 'n_retain', 800, 0, { color: 'rose', icon: 'Rocket', importance: 'high', confidence: 'low', reviewStatus: 'new', body: 'استفاده از دانش در موقعیت‌های واقعی و پروژه‌ها', tags: ['هدف نهایی'] }],
  ['n_teach', 'آموزش به دیگران', 'n_retain', 800, 180, { color: 'rose', icon: 'Award', importance: 'high', confidence: 'low', reviewStatus: 'new', body: 'یادگیری عمیق‌ترین سطح، آموزش است — تکنیک فاینمن', tags: ['فاینمن', 'عمل'] }],
];

const SAMPLE_EN: Array<[string, string, string | null, number, number, Partial<MindNode>]> = [
  ['n_root', 'Effective Learning', null, 0, 0, { color: 'violet', icon: 'Brain', importance: 'high', confidence: 'high', reviewStatus: 'mastered', body: 'A learning process that leads to deep, lasting understanding', tags: ['core'] }],
  ['n_prep', 'Preparation', 'n_root', -500, -300, { color: 'blue', icon: 'Target', importance: 'high', confidence: 'high', reviewStatus: 'reviewing', body: 'Before learning, clarify your goal and motivation', tags: ['group 1'], childPlacement: 'tree-left' }],
  ['n_goal', 'Goal Setting', 'n_prep', -800, -420, { color: 'blue', icon: 'Flag', importance: 'high', confidence: 'high', reviewStatus: 'reviewing', body: 'Having a clear goal lights the learning path', tags: ['prerequisite'] }],
  ['n_motivate', 'Intrinsic Motivation', 'n_prep', -800, -260, { color: 'blue', icon: 'Heart', importance: 'high', confidence: 'medium', reviewStatus: 'learning', body: 'Genuine curiosity and interest fuel lasting learning', tags: ['psychology'] }],
  ['n_plan', 'Time Planning', 'n_prep', -800, -100, { color: 'blue', icon: 'Clock', importance: 'medium', confidence: 'high', reviewStatus: 'mastered', body: 'Breaking learning time into manageable intervals', tags: ['scheduling'] }],
  ['n_deep', 'Deep Understanding', 'n_root', -500, 200, { color: 'green', icon: 'BookOpen', importance: 'high', confidence: 'medium', reviewStatus: 'learning', body: 'Going beyond memorization to understand why and how', tags: ['group 2', 'core'], childPlacement: 'tree-left' }],
  ['n_focus', 'Full Focus', 'n_deep', -800, 80, { color: 'green', icon: 'Eye', importance: 'high', confidence: 'medium', reviewStatus: 'reviewing', body: 'Eliminate distractions and give full attention to the topic', tags: ['focus'] }],
  ['n_question', 'Questioning', 'n_deep', -800, 240, { color: 'green', icon: 'HelpCircle', importance: 'high', confidence: 'medium', reviewStatus: 'learning', body: 'Asking why and how about every concept', tags: ['critical thinking'] }],
  ['n_chunk', 'Chunking', 'n_deep', -800, 400, { color: 'green', icon: 'Puzzle', importance: 'medium', confidence: 'high', reviewStatus: 'mastered', body: 'Breaking large information into small, digestible pieces', tags: ['technique'] }],
  ['n_elabor', 'Elaboration', 'n_deep', -500, 420, { color: 'green', icon: 'Lightbulb', importance: 'high', confidence: 'medium', reviewStatus: 'learning', body: 'Adding details and examples to concepts for better understanding', tags: ['technique'] }],
  ['n_structure', 'Structuring', 'n_root', 400, 300, { color: 'amber', icon: 'Layers', importance: 'high', confidence: 'medium', reviewStatus: 'learning', body: 'Organizing information into groups and semantic relations', tags: ['group 3'], childPlacement: 'tree-left' }],
  ['n_grouping', 'Grouping', 'n_structure', 200, 480, { color: 'amber', icon: 'Layers', importance: 'high', confidence: 'high', reviewStatus: 'reviewing', body: 'Placing similar concepts into a group — cognitive chunking', tags: ['grouping', 'core'] }],
  ['n_relate', 'Relating', 'n_structure', 500, 480, { color: 'amber', icon: 'Network', importance: 'high', confidence: 'medium', reviewStatus: 'learning', body: 'Building semantic links between concepts', tags: ['relation'] }],
  ['n_bigpic', 'Big Picture', 'n_structure', 700, 320, { color: 'amber', icon: 'Compass', importance: 'high', confidence: 'low', reviewStatus: 'new', body: 'Seeing the whole topic and how groups connect', tags: ['big picture'] }],
  ['n_retain', 'Retention & Application', 'n_root', 500, -200, { color: 'rose', icon: 'Zap', importance: 'high', confidence: 'medium', reviewStatus: 'reviewing', body: 'Active recall, spaced review, and real-world application', tags: ['group 4'], childPlacement: 'tree-left' }],
  ['n_recall', 'Active Recall', 'n_retain', 800, -380, { color: 'rose', icon: 'Brain', importance: 'high', confidence: 'medium', reviewStatus: 'reviewing', body: 'Retrieving from memory instead of passive re-reading', tags: ['core technique'] }],
  ['n_spaced', 'Spaced Repetition', 'n_retain', 800, -200, { color: 'rose', icon: 'Clock', importance: 'high', confidence: 'high', reviewStatus: 'mastered', body: 'Increasing review intervals for long-term retention', tags: ['scheduling'] }],
  ['n_apply', 'Real-world Application', 'n_retain', 800, 0, { color: 'rose', icon: 'Rocket', importance: 'high', confidence: 'low', reviewStatus: 'new', body: 'Using knowledge in real situations and projects', tags: ['end goal'] }],
  ['n_teach', 'Teach Others', 'n_retain', 800, 180, { color: 'rose', icon: 'Award', importance: 'high', confidence: 'low', reviewStatus: 'new', body: 'The deepest level of learning is teaching — Feynman technique', tags: ['feynman', 'action'] }],
];

const SAMPLE_EDGES: Array<[string, string, MindEdge['type']]> = [
  ['n_root', 'n_prep', 'part-of'],
  ['n_root', 'n_deep', 'part-of'],
  ['n_root', 'n_structure', 'part-of'],
  ['n_root', 'n_retain', 'part-of'],
  ['n_prep', 'n_goal', 'part-of'],
  ['n_prep', 'n_motivate', 'part-of'],
  ['n_prep', 'n_plan', 'part-of'],
  ['n_deep', 'n_focus', 'part-of'],
  ['n_deep', 'n_question', 'part-of'],
  ['n_deep', 'n_chunk', 'part-of'],
  ['n_deep', 'n_elabor', 'part-of'],
  ['n_structure', 'n_grouping', 'part-of'],
  ['n_structure', 'n_relate', 'part-of'],
  ['n_structure', 'n_bigpic', 'part-of'],
  ['n_retain', 'n_recall', 'part-of'],
  ['n_retain', 'n_spaced', 'part-of'],
  ['n_retain', 'n_apply', 'part-of'],
  ['n_retain', 'n_teach', 'part-of'],
  ['n_goal', 'n_deep', 'causes'],
  ['n_motivate', 'n_goal', 'causes'],
  ['n_focus', 'n_deep', 'causes'],
  ['n_question', 'n_elabor', 'causes'],
  ['n_deep', 'n_grouping', 'causes'],
  ['n_grouping', 'n_relate', 'causes'],
  ['n_relate', 'n_bigpic', 'causes'],
  ['n_bigpic', 'n_retain', 'causes'],
  ['n_recall', 'n_spaced', 'related'],
  ['n_spaced', 'n_recall', 'causes'],
  ['n_apply', 'n_teach', 'causes'],
  ['n_teach', 'n_deep', 'causes'],
  ['n_elabor', 'n_relate', 'related'],
  ['n_chunk', 'n_grouping', 'related'],
  ['n_plan', 'n_focus', 'depends-on'],
];

export function createSampleMap(lang: Lang = 'fa'): MindMap {
  const now = Date.now();
  const t = makeT(lang);
  const data = lang === 'en' ? SAMPLE_EN : SAMPLE_FA;

  const nodes: Record<string, MindNode> = {};
  for (const [id, title, parentId, x, y, extra] of data) {
    nodes[id] = node({ id, title, parentId, x, y, ...extra });
  }

  const edges: Record<string, MindEdge> = {};
  for (const [from, to, type] of SAMPLE_EDGES) {
    const e = edge(from, to, type);
    edges[e.id] = e;
  }

  return {
    id: 'map_sample',
    title: t('sample_map_title'),
    description: t('sample_map_desc'),
    schemaVersion: 2,
    nodes,
    edges,
    groups: {},
    strokes: {},
    symbols: {},
    viewport: { x: 0, y: 0, zoom: 1 },
    createdAt: now,
    updatedAt: now,
  };
}

function emptyMap(title: string, description: string, rootTitle: string, rootIcon: string, rootColor: NodeColor): MindMap {
  const now = Date.now();
  const rootId = 'n_root';
  return {
    id: `map_${Date.now().toString(36)}`,
    title,
    description,
    schemaVersion: 2,
    nodes: {
      [rootId]: node({ id: rootId, title: rootTitle, parentId: null, x: 0, y: 0, icon: rootIcon, color: rootColor, importance: 'high' }),
    },
    edges: {},
    groups: {},
    strokes: {},
    symbols: {},
    viewport: { x: 0, y: 0, zoom: 1 },
    createdAt: now,
    updatedAt: now,
  };
}

export function createEmptyMap(lang: Lang = 'fa'): MindMap {
  const t = makeT(lang);
  return emptyMap(t('default_new_map'), t('default_empty_map'), t('default_main_topic'), 'Brain', 'violet');
}

// ── Templates ───────────────────────────────────────────────────────────────

export interface Template {
  id: string;
  titleKey: string;
  descKey: string;
  icon: string;
  build: (lang: Lang) => MindMap;
}

export const TEMPLATES: Template[] = [
  {
    id: 'learning',
    titleKey: 'tpl_new_topic',
    descKey: 'tpl_new_topic_desc',
    icon: 'BookOpen',
    build: (lang) => {
      const t = makeT(lang);
      const m = emptyMap(t('tpl_new_topic'), t('tpl_new_topic_desc2'), t('tpl_main_topic'), 'BookOpen', 'blue');
      const rootId = 'n_root';
      const branches: Array<[string, string, NodeColor, number, number]> = [
        [t('tpl_prerequisites'), 'Flag', 'amber', -300, -180],
        [t('tpl_key_concepts'), 'Key', 'green', 300, -180],
        [t('tpl_relations_links'), 'Network', 'cyan', -300, 180],
        [t('tpl_apply'), 'Rocket', 'rose', 300, 180],
      ];
      for (const [title, icon, color, x, y] of branches) {
        const id = uid();
        m.nodes[id] = node({ id, title, parentId: rootId, x, y, icon, color });
        m.edges[`e_${rootId}_${id}_part-of`] = edge(rootId, id, 'part-of');
      }
      return m;
    },
  },
  {
    id: 'project',
    titleKey: 'tpl_project_planning',
    descKey: 'tpl_project_planning_desc',
    icon: 'Rocket',
    build: (lang) => {
      const t = makeT(lang);
      const m = emptyMap(t('tpl_project_planning'), t('tpl_project_planning_desc2'), t('tpl_project_root'), 'Rocket', 'violet');
      const rootId = 'n_root';
      const branches: Array<[string, string, NodeColor, number, number]> = [
        [t('tpl_goals'), 'Target', 'blue', -300, -180],
        [t('tpl_tasks'), 'CheckCircle', 'green', 300, -180],
        [t('tpl_resources'), 'Layers', 'cyan', -300, 180],
        [t('tpl_risks'), 'AlertCircle', 'rose', 300, 180],
      ];
      for (const [title, icon, color, x, y] of branches) {
        const id = uid();
        m.nodes[id] = node({ id, title, parentId: rootId, x, y, icon, color });
        m.edges[`e_${rootId}_${id}_part-of`] = edge(rootId, id, 'part-of');
      }
      return m;
    },
  },
  {
    id: 'decision',
    titleKey: 'tpl_decision',
    descKey: 'tpl_decision_desc',
    icon: 'Compass',
    build: (lang) => {
      const t = makeT(lang);
      const m = emptyMap(t('tpl_decision'), t('tpl_decision_desc2'), t('tpl_decision_root'), 'Compass', 'amber');
      const rootId = 'n_root';
      const branches: Array<[string, string, NodeColor, number, number]> = [
        [t('tpl_options'), 'Network', 'blue', -300, -180],
        [t('tpl_criteria'), 'Key', 'green', 300, -180],
        [t('tpl_pros'), 'TrendingUp', 'cyan', -300, 180],
        [t('tpl_cons'), 'AlertCircle', 'rose', 300, 180],
      ];
      for (const [title, icon, color, x, y] of branches) {
        const id = uid();
        m.nodes[id] = node({ id, title, parentId: rootId, x, y, icon, color });
        m.edges[`e_${rootId}_${id}_part-of`] = edge(rootId, id, 'part-of');
      }
      return m;
    },
  },
  {
    id: 'problem',
    titleKey: 'tpl_problem_solving',
    descKey: 'tpl_problem_solving_desc',
    icon: 'Puzzle',
    build: (lang) => {
      const t = makeT(lang);
      const m = emptyMap(t('tpl_problem_solving'), t('tpl_problem_solving_desc2'), t('tpl_problem_root'), 'Puzzle', 'rose');
      const rootId = 'n_root';
      const branches: Array<[string, string, NodeColor, number, number]> = [
        [t('tpl_define_problem'), 'AlertCircle', 'rose', -300, -180],
        [t('tpl_roots'), 'GitBranch', 'amber', 300, -180],
        [t('tpl_solutions'), 'Lightbulb', 'green', -300, 180],
        [t('tpl_evaluation'), 'CheckCircle', 'cyan', 300, 180],
      ];
      for (const [title, icon, color, x, y] of branches) {
        const id = uid();
        m.nodes[id] = node({ id, title, parentId: rootId, x, y, icon, color });
        m.edges[`e_${rootId}_${id}_part-of`] = edge(rootId, id, 'part-of');
      }
      return m;
    },
  },
  {
    id: 'brainstorm',
    titleKey: 'tpl_brainstorm',
    descKey: 'tpl_brainstorm_desc',
    icon: 'Lightbulb',
    build: (lang) => {
      const t = makeT(lang);
      const m = emptyMap(t('tpl_brainstorm'), t('tpl_brainstorm_desc2'), t('tpl_brainstorm_root'), 'Lightbulb', 'orange');
      const rootId = 'n_root';
      const branches: Array<[string, string, NodeColor, number, number]> = [
        [t('tpl_ideas'), 'Lightbulb', 'amber', -300, -180],
        [t('tpl_categorize'), 'Layers', 'cyan', 300, -180],
        [t('tpl_prioritize'), 'Star', 'green', -300, 180],
        [t('tpl_next_action'), 'Rocket', 'rose', 300, 180],
      ];
      for (const [title, icon, color, x, y] of branches) {
        const id = uid();
        m.nodes[id] = node({ id, title, parentId: rootId, x, y, icon, color });
        m.edges[`e_${rootId}_${id}_part-of`] = edge(rootId, id, 'part-of');
      }
      return m;
    },
  },
];
