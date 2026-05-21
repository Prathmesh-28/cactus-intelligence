import { useCallback, useMemo, useState } from 'react';
import {
  ReactFlow,
  type Node,
  type Edge,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  Handle,
  Position,
  type NodeProps,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { X, ExternalLink, RefreshCw } from 'lucide-react';
import type { OrgChart, OrgNode } from '../../types';

const DEPT_COLORS: Record<string, string> = {
  Engineering: '#EBF3FF',
  Product: '#F3EEFF',
  Sales: '#FFF3E8',
  Marketing: '#FFF8E8',
  Finance: '#E8F5F5',
  Operations: '#F2F2F2',
  HR: '#FEF0F0',
  People: '#FEF0F0',
  default: '#F8F6F1',
};

const CONFIDENCE_COLORS = {
  confirmed: '#27AE60',
  inferred: '#E67E22',
  estimated: '#9BB0A1',
};

type PersonNodeData = {
  person: OrgNode;
};

function PersonNode({ data }: NodeProps) {
  const personData = data as unknown as PersonNodeData;
  const { person } = personData;
  const bgColor = DEPT_COLORS[person.department ?? 'default'] ?? DEPT_COLORS.default;
  const confidenceColor = CONFIDENCE_COLORS[person.confidence ?? 'estimated'];

  return (
    <div
      className="relative rounded-xl border shadow-sm px-4 py-3 min-w-[160px] max-w-[200px] cursor-pointer hover:shadow-md transition-shadow"
      style={{ background: bgColor, borderColor: '#E8EDE9' }}
    >
      <Handle type="target" position={Position.Top} style={{ background: '#2E6B4F', width: 8, height: 8 }} />

      {/* Confidence dot */}
      <div
        className="absolute top-2 right-2 w-2 h-2 rounded-full"
        style={{ background: confidenceColor }}
        title={person.confidence}
      />

      <p className="text-xs font-semibold text-[#0F1A14] leading-snug pr-3">{person.name || 'Unknown'}</p>
      <p className="text-xs text-[#2E6B4F] mt-0.5">{person.title}</p>

      {person.tenure && (
        <span className="inline-block mt-1.5 px-1.5 py-0.5 bg-white/60 rounded text-[10px] text-[#4A5E52] border border-[#E8EDE9]">
          {person.tenure}
        </span>
      )}
      {person.previousCompany && (
        <p className="text-[10px] text-[#9BB0A1] mt-1 truncate">prev: {person.previousCompany}</p>
      )}
      {person.teamSize != null && (
        <p className="text-[10px] text-[#4A5E52] mt-0.5">{person.teamSize} reports</p>
      )}

      <Handle type="source" position={Position.Bottom} style={{ background: '#2E6B4F', width: 8, height: 8 }} />
    </div>
  );
}

const nodeTypes = { person: PersonNode };

// BFS layout
function buildFlowFromOrg(orgTree: OrgNode): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  interface QItem { node: OrgNode; parentId: string | null; level: number; siblingIndex: number; totalSiblings: number }
  const queue: QItem[] = [{ node: orgTree, parentId: null, level: 0, siblingIndex: 0, totalSiblings: 1 }];
  const levelCounters: number[] = [];

  while (queue.length) {
    const { node, parentId, level, siblingIndex, totalSiblings } = queue.shift()!;

    if (levelCounters[level] == null) levelCounters[level] = 0;
    levelCounters[level]++;

    const id = node.id || `node-${nodes.length}`;
    const actualNode: OrgNode = { ...node, id };

    nodes.push({
      id,
      type: 'person',
      position: { x: siblingIndex * 220 - (totalSiblings - 1) * 110, y: level * 160 },
      data: { person: actualNode } as unknown as Record<string, unknown>,
    });

    if (parentId) {
      edges.push({ id: `${parentId}-${id}`, source: parentId, target: id, type: 'smoothstep' });
    }

    const children = node.children ?? [];
    children.forEach((child, i) => {
      queue.push({ node: child, parentId: id, level: level + 1, siblingIndex: i, totalSiblings: children.length });
    });
  }

  // Re-layout: collect by level and position evenly
  const byLevel: Node[][] = [];
  nodes.forEach(n => {
    const lvl = Math.round((n.position.y) / 160);
    if (!byLevel[lvl]) byLevel[lvl] = [];
    byLevel[lvl].push(n);
  });
  const H_GAP = 240;
  byLevel.forEach(lvlNodes => {
    if (!lvlNodes) return;
    const total = lvlNodes.length;
    lvlNodes.forEach((n, i) => {
      n.position.x = (i - (total - 1) / 2) * H_GAP;
    });
  });

  return { nodes, edges };
}

interface DetailDrawerProps {
  person: OrgNode;
  onClose: () => void;
}

function DetailDrawer({ person, onClose }: DetailDrawerProps) {
  const searchUrl = `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(person.name ?? '')}`;
  return (
    <div className="absolute top-0 right-0 h-full w-72 bg-white border-l border-[#E8EDE9] shadow-xl z-10 overflow-y-auto">
      <div className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="font-semibold text-[#0F1A14]">{person.name}</h3>
            <p className="text-sm text-[#2E6B4F]">{person.title}</p>
          </div>
          <button onClick={onClose} className="text-[#9BB0A1] hover:text-[#4A5E52] p-1">
            <X size={16} />
          </button>
        </div>

        <div className="space-y-3 text-sm">
          {person.department && (
            <div>
              <p className="text-xs uppercase tracking-wide text-[#9BB0A1] mb-1">Department</p>
              <p className="text-[#0F1A14]">{person.department}</p>
            </div>
          )}
          {person.tenure && (
            <div>
              <p className="text-xs uppercase tracking-wide text-[#9BB0A1] mb-1">Tenure</p>
              <p className="text-[#0F1A14]">{person.tenure}</p>
            </div>
          )}
          {person.previousCompany && (
            <div>
              <p className="text-xs uppercase tracking-wide text-[#9BB0A1] mb-1">Previously at</p>
              <p className="text-[#0F1A14]">{person.previousCompany}</p>
            </div>
          )}
          {person.teamSize != null && (
            <div>
              <p className="text-xs uppercase tracking-wide text-[#9BB0A1] mb-1">Team Size</p>
              <p className="text-[#0F1A14]">{person.teamSize} people</p>
            </div>
          )}
          <div>
            <p className="text-xs uppercase tracking-wide text-[#9BB0A1] mb-1">Data Confidence</p>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ background: CONFIDENCE_COLORS[person.confidence] }} />
              <p className="text-[#0F1A14] capitalize">{person.confidence}</p>
            </div>
          </div>
        </div>

        <a
          href={person.linkedinUrl || searchUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-6 flex items-center gap-2 px-4 py-2 bg-[#0A66C2] text-white text-sm rounded-lg hover:bg-[#085196] transition-colors"
        >
          <ExternalLink size={14} />
          View LinkedIn Profile
        </a>
      </div>
    </div>
  );
}

interface OrgChartTabProps {
  orgChart: OrgChart;
  onRefresh?: () => void;
}

export function OrgChartTab({ orgChart, onRefresh }: OrgChartTabProps) {
  const [selectedPerson, setSelectedPerson] = useState<OrgNode | null>(null);

  const { nodes: initialNodes, edges: initialEdges } = useMemo(
    () => (orgChart?.orgTree ? buildFlowFromOrg(orgChart.orgTree) : { nodes: [], edges: [] }),
    [orgChart]
  );

  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    const person = (node.data as PersonNodeData).person;
    setSelectedPerson(person);
  }, []);

  if (!orgChart?.orgTree) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-sm text-[#4A5E52]">Limited public data available for this company's org structure.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-[#0F1A14]">{orgChart.company}</h3>
          <p className="text-xs text-[#4A5E52]">
            {orgChart.totalEmployees} employees · Last researched: {orgChart.lastUpdated}
          </p>
        </div>
        <div className="flex items-center gap-4">
          {/* Confidence legend */}
          <div className="hidden md:flex items-center gap-3 text-xs text-[#4A5E52]">
            {Object.entries(CONFIDENCE_COLORS).map(([k, v]) => (
              <div key={k} className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full" style={{ background: v }} />
                <span className="capitalize">{k}</span>
              </div>
            ))}
          </div>
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-[#2E6B4F] border border-[#D4E0D7] rounded-lg hover:bg-[#F0F7F2] transition-colors"
            >
              <RefreshCw size={12} />
              Refresh
            </button>
          )}
        </div>
      </div>

      {/* Org chart */}
      <div className="relative w-full rounded-xl border border-[#E8EDE9] overflow-hidden bg-[#FAFCFA]" style={{ height: '600px' }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          minZoom={0.2}
          maxZoom={1.5}
        >
          <Controls className="!bottom-4 !left-4" />
          <Background color="#D4E0D7" gap={20} size={1} />
        </ReactFlow>

        {selectedPerson && (
          <DetailDrawer person={selectedPerson} onClose={() => setSelectedPerson(null)} />
        )}
      </div>

      {/* Recent changes */}
      {orgChart.recentChanges?.length > 0 && (
        <div className="bg-white border border-[#E8EDE9] rounded-xl overflow-hidden shadow-sm">
          <div className="px-5 py-3 border-b border-[#E8EDE9]">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-[#4A5E52]">Recent Changes (Last 12 months)</h4>
          </div>
          {orgChart.recentChanges.map((c, i) => (
            <div key={i} className={`flex items-center gap-3 px-5 py-3 ${i < orgChart.recentChanges.length - 1 ? 'border-b border-[#E8EDE9]' : ''}`}>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${c.type === 'join' ? 'bg-[#27AE60]/10 text-[#27AE60]' : 'bg-[#C0392B]/10 text-[#C0392B]'}`}>
                {c.type === 'join' ? '+ Join' : '− Departure'}
              </span>
              <span className="text-sm text-[#0F1A14]">{c.name}</span>
              <span className="text-sm text-[#4A5E52]">· {c.title}</span>
              <span className="ml-auto text-xs text-[#9BB0A1]">{c.date}</span>
            </div>
          ))}
        </div>
      )}

      {/* Open roles */}
      {orgChart.openRoles?.length > 0 && (
        <div className="bg-white border border-[#E8EDE9] rounded-xl p-5 shadow-sm">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-[#4A5E52] mb-3">Open Senior Roles</h4>
          <div className="flex flex-wrap gap-2">
            {orgChart.openRoles.map((r, i) => (
              <span key={i} className="px-3 py-1.5 border-2 border-dashed border-[#3D9970]/40 bg-[#F0F7F2] rounded-lg text-xs text-[#2E6B4F] font-medium">
                HIRING · {r}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
