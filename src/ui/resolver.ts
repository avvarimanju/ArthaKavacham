import { createAtlassianClient } from '../atlassian/client';
import Resolver, { Request } from '@forge/resolver';
import { evaluateIssue } from '../state/snapshots';
import { EvaluationResult } from '../types';
const resolver: Resolver = new Resolver();
resolver.define('getEvaluation', async (request: Request<unknown>): Promise<EvaluationResult> => {
  const extension = request.context.extension as { issue?: { key?: string }; content?: { id?: string } };
  let key: string | undefined = extension.issue?.key;
  if (!key && extension.content?.id) {
    const { kvs } = await import('@forge/kvs');
    key = await kvs.get<string>(`adr-issue:${extension.content.id}`);
  }
  if (!key) throw new Error('No issue is configured for this view');
  const client = await createAtlassianClient();
  await client.issue(key);
  return evaluateIssue(key);
});
export const handler: ReturnType<Resolver['getDefinitions']> = resolver.getDefinitions();
