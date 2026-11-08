import {
  validateJiraTransition,
  validateBitbucketMerge,
} from './validators/jiraWorkflowValidator';
import { renderIssuePanel, renderAdrMacro } from './ui/issuePanel';
import {
  handleEvaluateBlastRadius,
  handleApplyRemediation,
  handleCreateOptimizationSubtask,
} from './rovo/actions';
import { handleMcpEndpoint } from './mcp/mcpServer';
import { fetchCloudTelemetry } from './telemetry/cloudProviders';

export async function handleTelemetrySync(): Promise<{ status: string; syncedAt: string }> {
  const telemetry = await fetchCloudTelemetry('BREACH');
  const count = telemetry.reduce((acc, p) => acc + p.metrics.length, 0);
  console.log(`[ArthaKavacham Telemetry Sync] Synced ${count} metrics across ${telemetry.length} providers.`);
  return {
    status: 'SUCCESS',
    syncedAt: new Date().toISOString(),
  };
}

export {
  validateJiraTransition,
  validateBitbucketMerge,
  renderIssuePanel,
  renderAdrMacro,
  handleEvaluateBlastRadius,
  handleApplyRemediation,
  handleCreateOptimizationSubtask,
  handleMcpEndpoint,
};
