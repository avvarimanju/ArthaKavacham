import React from 'react';
import ForgeReconciler, {
  Text,
  Badge,
  Lozenge,
  DynamicTable,
  SectionMessage,
  Stack,
  Box,
  Inline,
} from '@forge/react';
import { evaluateQuotaGate } from '../math/quotaEngine';
import { getJudgeDemoMetrics } from '../telemetry/cloudProviders';
import { MetricBlastResult } from '../types';

function renderLozenge(item: MetricBlastResult): React.ReactElement {
  if (item.isBreached) {
    return <Lozenge appearance="removed">BREACH (B={item.blastRadius})</Lozenge>;
  }
  if (item.blastRadius >= 0.8) {
    return <Lozenge appearance="moved">WARNING (B={item.blastRadius})</Lozenge>;
  }
  return <Lozenge appearance="success">HEALTHY (B={item.blastRadius})</Lozenge>;
}

function buildTableRows(items: MetricBlastResult[]) {
  return items.map((item, index) => ({
    key: `row-${index}`,
    cells: [
      { key: 'provider', content: <Text>{item.provider.toUpperCase()}</Text> },
      { key: 'metric', content: <Text>{item.metricName}</Text> },
      { key: 'projected', content: <Text>{item.projectedTotal.toLocaleString()} {item.unit}</Text> },
      { key: 'ceiling', content: <Text>{item.safeLimit.toLocaleString()} {item.unit}</Text> },
      { key: 'status', content: renderLozenge(item) },
    ],
  }));
}

export const FinOpsPanel: React.FC = () => {
  const metrics = getJudgeDemoMetrics('BREACH');
  const evaluation = evaluateQuotaGate(metrics, true);
  const isBlocked = evaluation.decision === 'BLOCK';

  const head = {
    cells: [
      { key: 'provider', content: 'Provider' },
      { key: 'metric', content: 'Metric' },
      { key: 'projected', content: 'Projected Load' },
      { key: 'ceiling', content: 'Safe Ceiling' },
      { key: 'status', content: 'Status' },
    ],
  };

  return (
    <Stack space="space.150">
      <Box>
        <Inline space="space.100" alignBlock="center">
          <Text>ArthaKavacham Shield Gate:</Text>
          {isBlocked ? (
            <Lozenge appearance="removed">TRANSITION BLOCKED</Lozenge>
          ) : (
            <Lozenge appearance="success">GATE PASSED</Lozenge>
          )}
          <Badge appearance="primary">{`B = ${evaluation.blastRadius}`}</Badge>
          <Badge appearance="added">{`C = ${evaluation.confidenceIndex}`}</Badge>
        </Inline>
      </Box>

      {isBlocked && (
        <SectionMessage title="Active Quota Breach Detected" appearance="error">
          <Text>{evaluation.verdictSummary}</Text>
          <Text>Use @ArthaKavacham Rovo action to apply remediation or create an optimization subtask.</Text>
        </SectionMessage>
      )}

      <DynamicTable head={head} rows={buildTableRows(evaluation.metricBreakdown)} />
    </Stack>
  );
};

export const renderIssuePanel = ForgeReconciler.render(<FinOpsPanel />);
export const renderAdrMacro = ForgeReconciler.render(<FinOpsPanel />);
