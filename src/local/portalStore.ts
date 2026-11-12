import { QuotaSnapshot, SnapshotStore } from '../state/snapshots';

export interface PortalStore extends SnapshotStore {
  storage?: 'sqlite' | 'turso';
  filename: string;
  close(): void;
}

export function portalSnapshot(value: unknown): QuotaSnapshot {
  if (!value || typeof value !== 'object' || (value as { source?: unknown }).source !== 'demo') {
    throw new Error('Portal storage accepts only demo snapshots');
  }
  return value as QuotaSnapshot;
}
