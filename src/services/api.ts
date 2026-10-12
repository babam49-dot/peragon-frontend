const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export interface Position {
  id: string;
  name: string;
  description: string;
  parentId: string | null;
  createdAt?: string;
  updatedAt?: string;
  parent?: Position | null;
  children?: Position[];
}

export interface CreatePositionInput {
  name: string;
  description?: string;
  parentId?: string | null;
}

export interface UpdatePositionInput {
  name?: string;
  description?: string;
  parentId?: string | null;
}

export async function fetchPositions(): Promise<Position[]> {
  const res = await fetch(`${API_BASE}/positions`, {
    cache: 'no-store',
  });
  if (!res.ok) {
    const errorBody = await res.text().catch(() => '');
    throw new Error(`Failed to fetch positions (${res.status}): ${errorBody || res.statusText}`);
  }
  return res.json();
}

export async function createPosition(data: CreatePositionInput): Promise<Position> {
  const res = await fetch(`${API_BASE}/positions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: data.name,
      description: data.description || '',
      parentId: data.parentId || null,
    }),
  });
  if (!res.ok) {
    const errorBody = await res.text().catch(() => '');
    throw new Error(`Failed to create position (${res.status}): ${errorBody || res.statusText}`);
  }
  return res.json();
}

export async function updatePosition(id: string, data: UpdatePositionInput): Promise<Position> {
  const res = await fetch(`${API_BASE}/positions/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const errorBody = await res.text().catch(() => '');
    throw new Error(`Failed to update position (${res.status}): ${errorBody || res.statusText}`);
  }
  return res.json();
}

export async function deletePosition(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/positions/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    const errorBody = await res.text().catch(() => '');
    throw new Error(`Failed to delete position (${res.status}): ${errorBody || res.statusText}`);
  }
}
