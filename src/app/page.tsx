'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Modal,
  Button,
  TextInput,
  Textarea,
  Badge,
  Card,
  Group,
  Stack,
  ActionIcon,
  Tooltip,
  Loader,
} from '@mantine/core';
import {
  fetchPositions,
  createPosition,
  updatePosition,
  deletePosition,
  Position,
} from '../services/api';

// Initial organization hierarchy matching the project requirements
const INITIAL_POSITIONS = [
  { id: '1', name: 'CEO', description: 'Chief Executive Officer - Leading overall company strategy', parentId: null },
  { id: '2', name: 'CTO', description: 'Chief Technology Officer - Overseeing engineering & technical vision', parentId: '1' },
  { id: '3', name: 'Project Manager', description: 'Managing cross-functional project planning & execution', parentId: '2' },
  { id: '4', name: 'Product Owner', description: 'Defining roadmap, user stories, and product priorities', parentId: '3' },
  { id: '5', name: 'Tech Lead', description: 'Guiding technical architecture, mentoring, and code reviews', parentId: '4' },
  { id: '6', name: 'Frontend Developer', description: 'Building responsive user interfaces with Next.js and Mantine', parentId: '5' },
  { id: '7', name: 'Backend Developer', description: 'Developing scalable NestJS REST APIs and PostgreSQL queries', parentId: '5' },
  { id: '8', name: 'DevOps Engineer', description: 'Managing CI/CD pipelines, Docker containers, and cloud deployment', parentId: '5' },
  { id: '9', name: 'QA Engineer', description: 'Quality assurance, automated testing, and regression testing', parentId: '4' },
  { id: '10', name: 'Scrum Master', description: 'Facilitating sprint ceremonies, removing blockers, and agile coaching', parentId: '4' },
  { id: '11', name: 'CFO', description: 'Chief Financial Officer - Financial planning, risk management, and investments', parentId: '1' },
  { id: '12', name: 'Chef Accountant', description: 'Managing corporate accounting, audits, and financial reporting', parentId: '11' },
  { id: '13', name: 'Financial Analyst', description: 'Financial forecasting, budget variance, and KPI metrics', parentId: '12' },
  { id: '14', name: 'Account and Payable', description: 'Processing company vendor invoices and ledger payments', parentId: '12' },
  { id: '15', name: 'Internal Audit', description: 'Ensuring internal fiscal compliance and governance policies', parentId: '11' },
  { id: '16', name: 'COO', description: 'Chief Operating Officer - Day-to-day business administration and operations', parentId: '1' },
  { id: '17', name: 'Product Manager', description: 'Operations and service pipeline product management', parentId: '16' },
  { id: '18', name: 'Operation Manager', description: 'Optimizing internal logistics, workflows, and facility operations', parentId: '16' },
  { id: '19', name: 'Customer Relation', description: 'Client partnerships, feedback loops, and customer success', parentId: '16' },
  { id: '20', name: 'HR', description: 'Human Resources - Talent acquisition, onboarding, and people culture', parentId: '1' },
];

export default function HierarchyPage() {
  const [positions, setPositions] = useState<Position[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());

  // Async States
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // Modal States
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  // Form States
  const [formData, setFormData] = useState<{ name: string; description: string; parentId: string | null }>({
    name: '',
    description: '',
    parentId: null,
  });

  // Fetch positions from NestJS API (supports silent background sync without flickering)
  const loadPositions = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    setApiError(null);
    try {
      const data = await fetchPositions();
      setPositions(data);
      if (data.length > 0) {
        setSelectedId((prev) => (data.some((p) => p.id === prev) ? prev : data[0].id));
      } else {
        setSelectedId('');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not connect to NestJS backend';
      console.error('Error fetching positions from backend:', err);
      setApiError(msg);
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // 1. Initial load on page mount
    loadPositions(false);

    // 2. Auto-sync interval: checks for changes in Neon every 3 seconds silently
    const interval = setInterval(() => {
      loadPositions(true);
    }, 3000);

    // 3. Instant tab-switch sync: refreshes the moment you switch back from Neon/Swagger
    const handleFocus = () => {
      loadPositions(true);
    };
    window.addEventListener('focus', handleFocus);

    // Cleanup interval and listener on unmount
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, [loadPositions]);

  // Selected position details
  const selectedPosition = useMemo(
    () => positions.find((p) => p.id === selectedId) || (positions.length > 0 ? positions[0] : null),
    [positions, selectedId]
  );

  // Find parent of selected position
  const selectedParent = useMemo(
    () => (selectedPosition?.parentId ? positions.find((p) => p.id === selectedPosition.parentId) : null),
    [positions, selectedPosition]
  );

  // Find direct children of selected position
  const selectedChildren = useMemo(
    () =>
      selectedPosition
        ? positions.filter((p) => (p.parentId ? p.parentId : null) === selectedPosition.id)
        : [],
    [positions, selectedPosition]
  );

  // Toggle node collapse
  const toggleCollapse = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const expandAll = () => setCollapsedIds(new Set());
  const collapseAll = () => {
    const allParentIds = new Set(
      positions
        .filter((p) => positions.some((c) => (c.parentId ? c.parentId : null) === p.id))
        .map((p) => p.id)
    );
    setCollapsedIds(allParentIds);
  };

  // Open Create Modal (under selected node or root)
  const openCreateModal = (parentPositionId: string | null = null) => {
    setFormData({
      name: '',
      description: '',
      parentId: parentPositionId,
    });
    setIsCreateOpen(true);
  };

  // Open Edit Modal
  const openEditModal = (pos: Position) => {
    setFormData({
      name: pos.name,
      description: pos.description || '',
      parentId: pos.parentId,
    });
    setIsEditOpen(true);
  };

  // Handle Save New Position via API
  const handleCreatePosition = async () => {
    if (!formData.name.trim()) return;
    setIsSaving(true);
    try {
      const created = await createPosition({
        name: formData.name.trim(),
        description: formData.description.trim(),
        parentId: formData.parentId || null,
      });
      await loadPositions();
      setSelectedId(created.id);
      setIsCreateOpen(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error creating position';
      alert(msg);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle Update Position via API
  const handleUpdatePosition = async () => {
    if (!selectedPosition || !formData.name.trim()) return;
    setIsSaving(true);
    try {
      await updatePosition(selectedPosition.id, {
        name: formData.name.trim(),
        description: formData.description.trim(),
      });
      await loadPositions();
      setIsEditOpen(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error updating position';
      alert(msg);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle Delete Position via API
  const handleDeletePosition = async () => {
    if (!selectedPosition) return;
    setIsSaving(true);
    try {
      await deletePosition(selectedPosition.id);
      await loadPositions();
      setIsDeleteOpen(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error deleting position';
      alert(msg);
    } finally {
      setIsSaving(false);
    }
  };

  // Seed sample hierarchy directly into the database
  const handleSeedPositions = async () => {
    setIsSaving(true);
    try {
      const idMap = new Map<string, string>();
      for (const item of INITIAL_POSITIONS) {
        const parentUuid = item.parentId ? idMap.get(item.parentId) || null : null;
        const created = await createPosition({
          name: item.name,
          description: item.description,
          parentId: parentUuid,
        });
        idMap.set(item.id, created.id);
      }
      await loadPositions();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error seeding positions';
      alert(`Error seeding positions: ${msg}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Build recursive tree map
  const treeRoots = useMemo(() => {
    const map = new Map<string | null, Position[]>();
    positions.forEach((pos) => {
      const parentKey = pos.parentId ? pos.parentId : null;
      const list = map.get(parentKey) || [];
      list.push(pos);
      map.set(parentKey, list);
    });
    return { map, roots: map.get(null) || [] };
  }, [positions]);

  // Filter positions when searching
  const matchesSearch = (pos: Position): boolean => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      pos.name.toLowerCase().includes(q) ||
      (pos.description ? pos.description.toLowerCase().includes(q) : false)
    );
  };

  // Recursive Tree Node Renderer
  const renderTreeNode = (pos: Position, depth = 0) => {
    const children = treeRoots.map.get(pos.id) || [];
    const hasChildren = children.length > 0;
    const isCollapsed = collapsedIds.has(pos.id);
    const isSelected = selectedId === pos.id;
    const isHighlighted = searchQuery && matchesSearch(pos);

    return (
      <div key={pos.id} className="relative">
        {/* Node Card */}
        <div
          onClick={() => setSelectedId(pos.id)}
          className={`group flex items-center justify-between p-2.5 my-1 rounded-xl cursor-pointer border transition-all duration-150 ${
            isSelected
              ? 'bg-blue-50 border-blue-500 shadow-sm dark:bg-blue-950/40 dark:border-blue-500'
              : 'bg-white hover:bg-slate-50 border-slate-200 dark:bg-slate-900 dark:border-slate-800 dark:hover:bg-slate-800/60'
          } ${isHighlighted && searchQuery ? 'ring-2 ring-amber-400' : ''}`}
          style={{ marginLeft: `${depth * 24}px` }}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            {/* Expand / Collapse Icon */}
            {hasChildren ? (
              <button
                type="button"
                onClick={(e) => toggleCollapse(pos.id, e)}
                className="w-5 h-5 flex items-center justify-center rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 transition-colors"
                title={isCollapsed ? 'Expand' : 'Collapse'}
              >
                <svg
                  className={`w-3.5 h-3.5 transform transition-transform ${isCollapsed ? '' : 'rotate-90'}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            ) : (
              <span className="w-5 h-5 flex items-center justify-center text-slate-300 dark:text-slate-700">
                •
              </span>
            )}

            {/* Role Badge / Icon */}
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                !pos.parentId
                  ? 'bg-amber-500 text-white shadow-sm shadow-amber-500/30'
                  : hasChildren
                  ? 'bg-indigo-500 text-white shadow-sm shadow-indigo-500/20'
                  : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
              }`}
            >
              {pos.name.substring(0, 2).toUpperCase()}
            </div>

            {/* Role Title and Direct Reports Counter */}
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span
                  className={`font-semibold text-sm truncate ${
                    isSelected ? 'text-blue-600 dark:text-blue-400' : 'text-slate-900 dark:text-slate-100'
                  }`}
                >
                  {pos.name}
                </span>
                {!pos.parentId && (
                  <Badge size="xs" color="yellow" variant="light">
                    Root / Top Level
                  </Badge>
                )}
                {hasChildren && (
                  <Badge size="xs" color="gray" variant="outline">
                    {children.length} {children.length === 1 ? 'report' : 'reports'}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-slate-500 truncate max-w-md dark:text-slate-400">
                {pos.description || 'No description provided'}
              </p>
            </div>
          </div>

          {/* Quick Actions (Add Subordinate, Edit, Delete) */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Tooltip label="Add Direct Subordinate" withArrow>
              <ActionIcon
                size="sm"
                variant="subtle"
                color="blue"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedId(pos.id);
                  openCreateModal(pos.id);
                }}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </ActionIcon>
            </Tooltip>
            <Tooltip label="Edit Position" withArrow>
              <ActionIcon
                size="sm"
                variant="subtle"
                color="gray"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedId(pos.id);
                  openEditModal(pos);
                }}
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                  />
                </svg>
              </ActionIcon>
            </Tooltip>
          </div>
        </div>

        {/* Recursive Children Container */}
        {hasChildren && !isCollapsed && (
          <div className="border-l-2 border-slate-200 dark:border-slate-800 ml-4 pl-1">
            {children.map((child) => renderTreeNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-50 flex flex-col font-sans">
      {/* Top Header */}
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur sticky top-0 z-30 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {/* Logo */}
            <div className="relative w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20 ring-1 ring-white/20 select-none">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 3v18" />
                <path d="M3 8h6" />
                <path d="M3 16h6" />
                <path d="M9 5h10a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2H9z" />
                <path d="M9 13h10a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2H9z" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white leading-none">
                  Peragon Information Systems
                </h1>
                <Badge size="xs" color="teal" variant="light">
                  Live API Connected
                </Badge>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Organization Employee Hierarchy & Structure Management
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => openCreateModal(null)}
              className="border-slate-300 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300"
            >
              + New Root Position
            </Button>
            <Button
              size="sm"
              onClick={() => openCreateModal(selectedId || null)}
              className="bg-blue-600 hover:bg-blue-700 shadow-sm"
              disabled={positions.length === 0}
            >
              + Add Subordinate
            </Button>
            <Tooltip label="Refresh hierarchy from database" withArrow>
              <ActionIcon variant="light" size="lg" onClick={() => loadPositions(false)} loading={isLoading}>
                🔄
              </ActionIcon>
            </Tooltip>
          </div>
        </div>
      </header>

      {/* API Error Notification */}
      {apiError && (
        <div className="bg-red-50 dark:bg-red-950/40 border-b border-red-200 dark:border-red-900 px-6 py-3">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-red-700 dark:text-red-300">
              <span>⚠️ <strong>Backend Connection Notice:</strong> {apiError}</span>
            </div>
            <Button size="xs" color="red" variant="light" onClick={() => loadPositions(false)}>
              Retry Connection
            </Button>
          </div>
        </div>
      )}

      {/* Main Content: Two-Column SPA Layout */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Organization Tree (7 cols) */}
        <section className="lg:col-span-7 flex flex-col bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          {/* Tree Controls Toolbar */}
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-900/50">
            <div className="flex-1 min-w-[200px]">
              <TextInput
                placeholder="Search position or role..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.currentTarget.value)}
                size="sm"
                rightSection={
                  searchQuery ? (
                    <ActionIcon size="xs" variant="transparent" onClick={() => setSearchQuery('')}>
                      ✕
                    </ActionIcon>
                  ) : null
                }
              />
            </div>
            <div className="flex items-center gap-2">
              <Button variant="subtle" size="xs" color="gray" onClick={expandAll} disabled={positions.length === 0}>
                Expand All
              </Button>
              <Button variant="subtle" size="xs" color="gray" onClick={collapseAll} disabled={positions.length === 0}>
                Collapse All
              </Button>
            </div>
          </div>

          {/* Tree Node List */}
          <div className="flex-1 p-4 overflow-y-auto max-h-[calc(100vh-250px)]">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2 px-1 flex items-center justify-between">
              <span>Organization Structure ({positions.length} Total Positions)</span>
              {isLoading && <Loader size="xs" />}
            </div>

            {isLoading && positions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-3">
                <Loader size="md" />
                <span className="text-sm">Loading hierarchy from Neon database...</span>
              </div>
            ) : treeRoots.roots.length === 0 ? (
              <div className="text-center py-16 px-4 bg-slate-50/50 dark:bg-slate-800/20 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 my-4">
                <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto mb-3 text-xl">
                  🏢
                </div>
                <h3 className="font-semibold text-slate-800 dark:text-slate-200 mb-1">
                  No positions in database yet
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-4">
                  Your Neon PostgreSQL database is connected and ready. You can create your root position or populate the standard 20 positions.
                </p>
                <div className="flex items-center justify-center gap-3">
                  <Button size="xs" onClick={() => openCreateModal(null)}>
                    + Create Root Position
                  </Button>
                  <Button
                    size="xs"
                    variant="outline"
                    color="indigo"
                    onClick={handleSeedPositions}
                    loading={isSaving}
                  >
                    🚀 Seed Standard 20 Positions
                  </Button>
                </div>
              </div>
            ) : (
              treeRoots.roots.map((root) => renderTreeNode(root, 0))
            )}
          </div>
        </section>

        {/* Right Column: Selected Position Detail Inspector (5 cols) */}
        <aside className="lg:col-span-5 flex flex-col gap-6">
          {selectedPosition ? (
            <Card
              shadow="sm"
              padding="lg"
              radius="lg"
              withBorder
              className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 sticky top-24"
            >
              {/* Header with Title and Actions */}
              <div className="flex items-start justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-4 mb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                      {selectedPosition.name}
                    </h2>
                    {!selectedPosition.parentId ? (
                      <Badge color="yellow" variant="filled">
                        Root Position
                      </Badge>
                    ) : (
                      <Badge color="blue" variant="light">
                        Level Role
                      </Badge>
                    )}
                  </div>
                  <span className="text-xs text-slate-400 font-mono mt-1 block truncate max-w-xs">
                    UUID: {selectedPosition.id}
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <Tooltip label="Edit Details" withArrow>
                    <ActionIcon variant="light" color="blue" onClick={() => openEditModal(selectedPosition)}>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                        />
                      </svg>
                    </ActionIcon>
                  </Tooltip>
                  <Tooltip label="Delete Role" withArrow>
                    <ActionIcon variant="light" color="red" onClick={() => setIsDeleteOpen(true)}>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </ActionIcon>
                  </Tooltip>
                </div>
              </div>

              {/* Description */}
              <div className="mb-4">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-1">
                  Role Description
                </label>
                <p className="text-sm text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                  {selectedPosition.description || 'No description provided for this role.'}
                </p>
              </div>

              {/* Reports To (Parent Position) */}
              <div className="mb-4">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-1">
                  Reports To (Immediate Manager)
                </label>
                {selectedParent ? (
                  <div
                    onClick={() => setSelectedId(selectedParent.id)}
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 cursor-pointer hover:border-blue-400 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 flex items-center justify-center font-bold text-xs">
                        {selectedParent.name.substring(0, 2).toUpperCase()}
                      </div>
                      <span className="font-medium text-sm text-slate-800 dark:text-slate-200">
                        {selectedParent.name}
                      </span>
                    </div>
                    <span className="text-xs text-blue-500 font-medium">View &rarr;</span>
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 text-xs text-amber-800 dark:text-amber-300">
                    👑 Root Position — Reports to the Board of Directors (No parent).
                  </div>
                )}
              </div>

              {/* Direct Subordinates / Children List */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Direct Subordinates ({selectedChildren.length})
                  </label>
                  <Button
                    variant="subtle"
                    size="compact-xs"
                    color="blue"
                    onClick={() => openCreateModal(selectedPosition.id)}
                  >
                    + Add Direct Report
                  </Button>
                </div>

                {selectedChildren.length === 0 ? (
                  <p className="text-xs text-slate-400 italic bg-slate-50 dark:bg-slate-800/30 p-3 rounded-xl text-center">
                    No direct reports. This is currently an individual contributor role.
                  </p>
                ) : (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {selectedChildren.map((child) => (
                      <div
                        key={child.id}
                        onClick={() => setSelectedId(child.id)}
                        className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-800/40 hover:bg-blue-50 dark:hover:bg-blue-950/30 cursor-pointer transition-colors"
                      >
                        <span className="text-xs font-medium text-slate-800 dark:text-slate-200">
                          {child.name}
                        </span>
                        <span className="text-[10px] text-slate-400">Select</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex gap-2">
                <Button
                  fullWidth
                  onClick={() => openCreateModal(selectedPosition.id)}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  + Add Direct Subordinate
                </Button>
              </div>
            </Card>
          ) : (
            <div className="p-8 text-center text-slate-400 border border-dashed rounded-2xl">
              Select a position from the tree to view details.
            </div>
          )}
        </aside>
      </main>

      {/* CREATE POSITION MODAL */}
      <Modal
        opened={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title={
          <span className="font-bold text-base">
            {formData.parentId ? 'Add Direct Subordinate' : 'Create New Root Position'}
          </span>
        }
        centered
        radius="lg"
      >
        <Stack gap="md">
          {formData.parentId && (
            <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-xl text-xs text-blue-700 dark:text-blue-300">
              Reporting to:{' '}
              <span className="font-bold">
                {positions.find((p) => p.id === formData.parentId)?.name || 'None'}
              </span>
            </div>
          )}

          <TextInput
            label="Position Name / Title"
            placeholder="e.g. Senior Backend Engineer"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.currentTarget.value })}
          />

          <Textarea
            label="Position Description"
            placeholder="Describe role responsibilities and duties..."
            rows={3}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.currentTarget.value })}
          />

          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={() => setIsCreateOpen(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button onClick={handleCreatePosition} loading={isSaving} disabled={!formData.name.trim()}>
              Save to Database
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* EDIT POSITION MODAL */}
      <Modal
        opened={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        title={<span className="font-bold text-base">Edit Position</span>}
        centered
        radius="lg"
      >
        <Stack gap="md">
          <TextInput
            label="Position Name / Title"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.currentTarget.value })}
          />

          <Textarea
            label="Position Description"
            rows={3}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.currentTarget.value })}
          />

          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={() => setIsEditOpen(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button onClick={handleUpdatePosition} loading={isSaving} disabled={!formData.name.trim()}>
              Update Position
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* DELETE CONFIRMATION MODAL */}
      <Modal
        opened={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        title={<span className="font-bold text-base text-red-600">Delete Position</span>}
        centered
        radius="lg"
      >
        <Stack gap="sm">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Are you sure you want to remove <span className="font-bold">{selectedPosition?.name}</span> from the database?
          </p>
          {selectedChildren.length > 0 && (
            <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-xl text-xs text-red-700 dark:text-red-300">
              ⚠️ <strong>Warning:</strong> This position has {selectedChildren.length} subordinate
              role(s). Deleting it will also remove its direct hierarchy!
            </div>
          )}

          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={() => setIsDeleteOpen(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button color="red" onClick={handleDeletePosition} loading={isSaving}>
              Confirm Delete
            </Button>
          </Group>
        </Stack>
      </Modal>
    </div>
  );
}
