import { useEffect, useState } from 'react';
import {
  Building2,
  GitBranch,
  BookOpen,
  Users,
  Briefcase,
  ChevronDown,
  ChevronLeft,
  Plus,
  X,
  Settings2,
  UserCog,
  Trash2,
  Network,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { OrgUnit, Member, MemberRoleAssignment, OrgUnitType, Division, MemberRole } from '@/types';
import { orgUnitTypeLabels, divisionLabels, divisionColors, roleLabels, roleColors } from '@/lib/labels';
import { Avatar, Badge, Spinner, EmptyState } from '@/components/ui';

const typeIcons: Record<string, LucideIcon> = {
  group: Building2,
  division: GitBranch,
  institute: BookOpen,
  department: Users,
  deputy: Briefcase,
};

export function OrganizationPage() {
  const [loading, setLoading] = useState(true);
  const [orgUnits, setOrgUnits] = useState<OrgUnit[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [roles, setRoles] = useState<MemberRoleAssignment[]>([]);
  const [selectedUnit, setSelectedUnit] = useState<OrgUnit | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [showAddUnit, setShowAddUnit] = useState(false);
  const [showAddRole, setShowAddRole] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const [u, m, r] = await Promise.all([
      supabase.from('org_units').select('*, head:members(*), parent:org_units(*)').order('created_at'),
      supabase.from('members').select('*, department:departments(*)').order('full_name'),
      supabase.from('member_roles').select('*, member:members(*), org_unit:org_units(*)'),
    ]);
    setOrgUnits(u.data ?? []);
    setMembers(m.data ?? []);
    setRoles(r.data ?? []);

    const root = (u.data ?? []).find((unit: OrgUnit) => unit.type === 'group');
    if (root) {
      setExpandedIds(new Set([root.id, ...((u.data ?? []).filter((u2: OrgUnit) => u2.parent_id === root.id).map((u2: OrgUnit) => u2.id))]));
    }
    setLoading(false);
  }

  function buildTree(units: OrgUnit[]): OrgUnit[] {
    const map = new Map<string, OrgUnit>();
    units.forEach((u) => map.set(u.id, { ...u, children: [] }));
    const roots: OrgUnit[] = [];
    units.forEach((u) => {
      if (u.parent_id && map.has(u.parent_id)) {
        const parent = map.get(u.parent_id)!;
        parent.children = parent.children ?? [];
        parent.children.push(map.get(u.id)!);
      } else {
        roots.push(map.get(u.id)!);
      }
    });
    return roots;
  }

  function toggleExpand(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function getUnitRoles(unitId: string) {
    return roles.filter((r) => r.org_unit_id === unitId);
  }

  function getChildUnits(parentId: string): OrgUnit[] {
    return orgUnits.filter((u) => u.parent_id === parentId);
  }

  async function addUnit(data: { name: string; type: OrgUnitType; division: Division; parent_id: string; head_member_id?: string }) {
    await supabase.from('org_units').insert({
      name: data.name,
      type: data.type,
      division: data.division,
      parent_id: data.parent_id,
      head_member_id: data.head_member_id || null,
    });
    setShowAddUnit(false);
    loadData();
  }

  async function addRole(data: { member_id: string; org_unit_id: string; role: MemberRole }) {
    await supabase.from('member_roles').insert(data);
    setShowAddRole(false);
    loadData();
  }

  async function deleteRole(roleId: string) {
    await supabase.from('member_roles').delete().eq('id', roleId);
    loadData();
  }

  async function deleteUnit(unitId: string) {
    const children = getChildUnits(unitId);
    if (children.length > 0) {
      alert('این واحد دارای واحدهای فرعی است. ابتدا آن‌ها را حذف کنید.');
      return;
    }
    if (!confirm('این واحد سازمانی حذف شود؟')) return;
    await supabase.from('org_units').delete().eq('id', unitId);
    setSelectedUnit(null);
    loadData();
  }

  if (loading) return <Spinner className="py-20" />;

  const tree = buildTree(orgUnits);

  return (
    <div className="space-y-5 animate-fade-in" dir="rtl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Network size={22} className="text-emerald-600" />
          <h2 className="font-bold text-slate-800">ساختار سازمانی مجموعه</h2>
        </div>
        <button onClick={() => setShowAddUnit(true)} className="btn-primary">
          <Plus size={18} />
          واحد جدید
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Tree */}
        <div className="lg:col-span-2 card p-5">
          {tree.length === 0 ? (
            <EmptyState icon={<Network size={48} />} title="ساختاری تعریف نشده" />
          ) : (
            <div className="space-y-1">
              {tree.map((node) => (
                <OrgTreeNode
                  key={node.id}
                  node={node}
                  level={0}
                  expandedIds={expandedIds}
                  onToggle={toggleExpand}
                  onSelect={setSelectedUnit}
                  selectedId={selectedUnit?.id}
                  getRoles={getUnitRoles}
                />
              ))}
            </div>
          )}
        </div>

        {/* Detail panel */}
        <div className="card p-5">
          {selectedUnit ? (
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  {(() => {
                    const Icon = typeIcons[selectedUnit.type] ?? Users;
                    return (
                      <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                        <Icon size={20} />
                      </div>
                    );
                  })()}
                  <div>
                    <h3 className="font-bold text-slate-800">{selectedUnit.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge className="bg-slate-100 text-slate-600">{orgUnitTypeLabels[selectedUnit.type]}</Badge>
                      <Badge className={divisionColors[selectedUnit.division]}>
                        {divisionLabels[selectedUnit.division]}
                      </Badge>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => deleteUnit(selectedUnit.id)}
                  className="p-2 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              {selectedUnit.description && (
                <p className="text-sm text-slate-500 leading-relaxed">{selectedUnit.description}</p>
              )}

              {selectedUnit.head && (
                <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <Avatar name={selectedUnit.head.full_name} src={selectedUnit.head.avatar_url} size="md" />
                  <div>
                    <p className="text-sm font-medium text-slate-700">{selectedUnit.head.full_name}</p>
                    <p className="text-xs text-slate-400">سرپرست واحد</p>
                  </div>
                </div>
              )}

              {/* Roles */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                    <UserCog size={16} className="text-slate-400" />
                    نقش‌ها و دسترسی‌ها
                  </h4>
                  <button
                    onClick={() => setShowAddRole(true)}
                    className="text-xs text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
                  >
                    <Plus size={12} /> افزودن
                  </button>
                </div>

                <div className="space-y-2">
                  {getUnitRoles(selectedUnit.id).map((role) => (
                    <div key={role.id} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100 group">
                      <div className="flex items-center gap-2.5">
                        {role.member && <Avatar name={role.member.full_name} src={role.member.avatar_url} size="sm" />}
                        <div>
                          <p className="text-sm font-medium text-slate-700">{role.member?.full_name ?? '—'}</p>
                          <p className="text-xs text-slate-400">{role.member?.title ?? ''}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={roleColors[role.role]}>{roleLabels[role.role]}</Badge>
                        <button
                          onClick={() => deleteRole(role.id)}
                          className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 transition-all"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                  {getUnitRoles(selectedUnit.id).length === 0 && (
                    <p className="text-center text-xs text-slate-400 py-4">نقشی تعریف نشده</p>
                  )}
                </div>
              </div>

              {/* Sub-units */}
              {getChildUnits(selectedUnit.id).length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-slate-700 mb-3">واحدهای فرعی</h4>
                  <div className="space-y-1.5">
                    {getChildUnits(selectedUnit.id).map((child) => (
                      <button
                        key={child.id}
                        onClick={() => setSelectedUnit(child)}
                        className="w-full flex items-center gap-2 p-2.5 rounded-xl hover:bg-slate-50 border border-slate-100 transition-colors text-right"
                      >
                        {(() => {
                          const Icon = typeIcons[child.type] ?? Users;
                          return <Icon size={16} className="text-slate-400" />;
                        })()}
                        <span className="text-sm text-slate-700 flex-1">{child.name}</span>
                        <Badge className={divisionColors[child.division]}>{divisionLabels[child.division]}</Badge>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Network size={40} className="text-slate-200 mb-3" />
              <p className="text-sm text-slate-400">یک واحد را برای مشاهده جزئیات انتخاب کنید</p>
            </div>
          )}
        </div>
      </div>

      {showAddUnit && (
        <AddUnitModal
          orgUnits={orgUnits}
          members={members}
          onClose={() => setShowAddUnit(false)}
          onAdd={addUnit}
        />
      )}

      {showAddRole && selectedUnit && (
        <AddRoleModal
          members={members}
          orgUnit={selectedUnit}
          onClose={() => setShowAddRole(false)}
          onAdd={addRole}
        />
      )}
    </div>
  );
}

function OrgTreeNode({
  node,
  level,
  expandedIds,
  onToggle,
  onSelect,
  selectedId,
  getRoles,
}: {
  node: OrgUnit;
  level: number;
  expandedIds: Set<string>;
  onToggle: (id: string) => void;
  onSelect: (unit: OrgUnit) => void;
  selectedId?: string;
  getRoles: (unitId: string) => MemberRoleAssignment[];
}) {
  const hasChildren = (node.children?.length ?? 0) > 0;
  const isExpanded = expandedIds.has(node.id);
  const Icon = typeIcons[node.type] ?? Users;

  return (
    <div>
      <div
        className={`flex items-center gap-2 py-2 px-2 rounded-xl cursor-pointer transition-colors ${
          selectedId === node.id ? 'bg-emerald-50 ring-1 ring-emerald-100' : 'hover:bg-slate-50'
        }`}
        style={{ paddingRight: `${level * 24 + 8}px` }}
        onClick={() => onSelect(node)}
      >
        {hasChildren ? (
          <button
            onClick={(e) => { e.stopPropagation(); onToggle(node.id); }}
            className="p-0.5 rounded text-slate-400 hover:text-slate-600"
          >
            {isExpanded ? <ChevronDown size={16} /> : <ChevronLeft size={16} />}
          </button>
        ) : (
          <div className="w-4" />
        )}

        <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
          node.division === 'scientific' ? 'bg-emerald-50 text-emerald-600' :
          node.division === 'administrative' ? 'bg-amber-50 text-amber-600' :
          'bg-slate-100 text-slate-500'
        }`}>
          <Icon size={14} />
        </div>

        <span className={`text-sm flex-1 truncate ${
          node.type === 'group' ? 'font-bold text-slate-800' :
          node.type === 'division' ? 'font-semibold text-slate-700' :
          'text-slate-600'
        }`}>
          {node.name}
        </span>

        <Badge className={`${divisionColors[node.division]} text-[10px]`}>
          {divisionLabels[node.division]}
        </Badge>

        {getRoles(node.id).some((r) => r.role === 'wakil') && (
          <Badge className="bg-gold-100 text-gold-700 text-[10px]">وکیل</Badge>
        )}
      </div>

      {hasChildren && isExpanded && (
        <div>
          {node.children!.map((child) => (
            <OrgTreeNode
              key={child.id}
              node={child}
              level={level + 1}
              expandedIds={expandedIds}
              onToggle={onToggle}
              onSelect={onSelect}
              selectedId={selectedId}
              getRoles={getRoles}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function AddUnitModal({
  orgUnits,
  members,
  onClose,
  onAdd,
}: {
  orgUnits: OrgUnit[];
  members: Member[];
  onClose: () => void;
  onAdd: (data: { name: string; type: OrgUnitType; division: Division; parent_id: string; head_member_id?: string }) => void;
}) {
  const [name, setName] = useState('');
  const [type, setType] = useState<OrgUnitType>('institute');
  const [division, setDivision] = useState<Division>('scientific');
  const [parentId, setParentId] = useState('');
  const [headId, setHeadId] = useState('');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 animate-fade-in" dir="rtl" onClick={onClose}>
      <div className="card w-full max-w-lg animate-slide-up" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <h2 className="font-bold text-slate-800">واحد سازمانی جدید</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 transition-colors"><X size={18} /></button>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); onAdd({ name, type, division, parent_id: parentId, head_member_id: headId }); }} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">نام واحد *</label>
            <input type="text" required value={name} onChange={(e) => setName(e.target.value)} className="input" placeholder="مثلاً: مؤسسه علمی..." />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">نوع واحد</label>
              <select value={type} onChange={(e) => setType(e.target.value as OrgUnitType)} className="input">
                {Object.entries(orgUnitTypeLabels).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">بخش</label>
              <select value={division} onChange={(e) => setDivision(e.target.value as Division)} className="input">
                {Object.entries(divisionLabels).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">واحد بالادست</label>
            <select value={parentId} onChange={(e) => setParentId(e.target.value)} className="input">
              <option value="">انتخاب...</option>
              {orgUnits.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">سرپرست</label>
            <select value={headId} onChange={(e) => setHeadId(e.target.value)} className="input">
              <option value="">انتخاب...</option>
              {members.map((m) => <option key={m.id} value={m.id}>{m.full_name}</option>)}
            </select>
          </div>
          <div className="flex gap-3 pt-3 border-t border-slate-100">
            <button type="submit" className="btn-primary flex-1 justify-center">افزودن واحد</button>
            <button type="button" onClick={onClose} className="btn-secondary">انصراف</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AddRoleModal({
  members,
  orgUnit,
  onClose,
  onAdd,
}: {
  members: Member[];
  orgUnit: OrgUnit;
  onClose: () => void;
  onAdd: (data: { member_id: string; org_unit_id: string; role: MemberRole }) => void;
}) {
  const [memberId, setMemberId] = useState('');
  const [role, setRole] = useState<MemberRole>('member');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 animate-fade-in" dir="rtl" onClick={onClose}>
      <div className="card w-full max-w-md animate-slide-up" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <h2 className="font-bold text-slate-800">افزودن نقش در {orgUnit.name}</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 transition-colors"><X size={18} /></button>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); onAdd({ member_id: memberId, org_unit_id: orgUnit.id, role }); }} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">عضو *</label>
            <select required value={memberId} onChange={(e) => setMemberId(e.target.value)} className="input">
              <option value="">انتخاب...</option>
              {members.map((m) => <option key={m.id} value={m.id}>{m.full_name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">نقش</label>
            <select value={role} onChange={(e) => setRole(e.target.value as MemberRole)} className="input">
              {Object.entries(roleLabels).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div className="flex gap-3 pt-3 border-t border-slate-100">
            <button type="submit" className="btn-primary flex-1 justify-center">افزودن نقش</button>
            <button type="button" onClick={onClose} className="btn-secondary">انصراف</button>
          </div>
        </form>
      </div>
    </div>
  );
}
