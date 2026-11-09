import { vi } from 'vitest';
import { AtlassianClient } from '../src/atlassian/client';
export function fakeClient(): AtlassianClient {
  return { issue: vi.fn(async (): Promise<Awaited<ReturnType<AtlassianClient['issue']>>> =>
    ({ key: 'PROJ-42', fields: { labels: [], project: { id: '1' } } })),
    property: vi.fn(async (): Promise<unknown> => ({ adrIds: ['123'] })),
    adr: vi.fn(async (): Promise<{ approved: boolean; hasPolicy: boolean }> => ({ approved: true, hasPolicy: true })),
    labels: vi.fn(async (): Promise<void> => {}), comment: vi.fn(async (): Promise<void> => {}),
    subtask: vi.fn(async (): Promise<string> => 'PROJ-43') };
}
