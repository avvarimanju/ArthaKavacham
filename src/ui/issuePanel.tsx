import React, { useEffect, useState } from 'react';
import ForgeReconciler, { Text, Lozenge, DynamicTable, SectionMessage, Stack } from '@forge/react';
import { makeInvoke } from '@forge/bridge';
import { EvaluationResult, MetricBlastResult } from '../types';
const invoke = makeInvoke<{ getEvaluation: () => EvaluationResult }>();
interface TableRow { key: string; cells: { key: string; content: React.ReactElement }[] }
function buildRows(items: MetricBlastResult[]): TableRow[] {
  return items.map((item: MetricBlastResult, index: number): TableRow => ({ key: String(index), cells: [
    { key: 'provider', content: <Text>{item.provider}</Text> },
    { key: 'metric', content: <Text>{item.metricName}</Text> },
    { key: 'blast', content: <Text>{item.blastRadius.toFixed(4)}</Text> },
    { key: 'state', content: <Lozenge appearance={item.isBreached ? 'removed' : 'success'}>{item.isBreached ? 'BREACH' : 'WITHIN LIMIT'}</Lozenge> },
  ] }));
}
export function FinOpsPanel(): React.ReactElement {
  const [evaluation, setEvaluation] = useState<EvaluationResult>();
  const [error, setError] = useState<string>();
  useEffect((): void => {
    invoke('getEvaluation').then(setEvaluation).catch((reason: unknown): void => {
      setError(reason instanceof Error ? reason.message : 'Snapshot unavailable');
    });
  }, []);
  if (error) return <SectionMessage appearance="error" title="Gate unavailable"><Text>{error}</Text></SectionMessage>;
  if (!evaluation) return <Text>Loading cached quota evaluation...</Text>;
  return <Stack space="space.150">
    <Text>{evaluation.verdictSummary}</Text>
    <Text>{`B=${evaluation.blastRadius.toFixed(4)}; C=${evaluation.confidenceIndex.toFixed(4)}`}</Text>
    <DynamicTable head={{ cells: ['Provider', 'Metric', 'Blast radius', 'Status'].map((content: string): { key: string; content: string } => ({ key: content, content })) }} rows={buildRows(evaluation.metricBreakdown)} />
  </Stack>;
}
ForgeReconciler.render(<FinOpsPanel />);
