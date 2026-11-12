let currentState;
const selector = document.getElementById('scenario-selector');
const remediation = document.getElementById('remediation-button');
const reset = document.getElementById('scenario-reset');
const metrics = document.getElementById('metrics');

function format(value) {
  for (const [scale, suffix] of [[1e9, 'B'], [1e6, 'M'], [1e3, 'K']]) {
    if (Math.abs(value) >= scale) return `${(value / scale).toFixed(2)}${suffix}`;
  }
  return value.toLocaleString('en-US', { maximumFractionDigits: 2 });
}

function exactDetails(entries) {
  const details = document.createElement('details');
  details.className = 'exact-values';
  const summary = document.createElement('summary');
  summary.textContent = 'Exact values';
  details.append(summary);
  for (const [label, value] of entries) {
    const line = document.createElement('p');
    line.textContent = `${label}: ${typeof value === 'number' ? value.toLocaleString('en-US', { maximumFractionDigits: 20 }) : value}`;
    details.append(line);
  }
  return details;
}

function timestampText(timestamp) {
  const date = new Date(timestamp);
  if (!Number.isFinite(date.getTime())) return 'Timestamp unavailable';
  const formatted = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Kolkata' }).format(date);
  const minutes = Math.max(0, Math.floor((Date.now() - date.getTime()) / 60000));
  const age = minutes === 0 ? 'just now' : minutes < 60 ? `${minutes} min ago`
    : `${Math.floor(minutes / 60)}h ${minutes % 60}m ago`;
  return `${formatted} IST · ${age}`;
}

function updateFixtureTimestamp() {
  if (!currentState) return;
  document.getElementById('demo-provenance').textContent = `Synthetic provider values and allowances; not account measurements. Fixture created ${timestampText(currentState.capturedAt)}. Forecasts include the sensitivity multiplier; fractional reads are projected, not observed counters.`;
}

function setBusy(busy) {
  selector.disabled = busy;
  reset.disabled = busy;
  remediation.disabled = busy || !currentState || currentState.remediated || currentState.evaluation.blastRadius <= 1;
  metrics.setAttribute('aria-busy', String(busy));
}

function renderMetricDetails(metric, input, tone) {
  const detail = document.createElement('div');
  detail.className = 'metric-detail';
  const title = document.createElement('strong');
  const displayName = metric.provider === 'vercel' && metric.metricKey === 'serverless_cpu_gb_hours'
    ? 'Legacy Function Duration (demo)' : metric.metricName;
  title.textContent = `${metric.provider.toUpperCase()} · ${displayName}`;
  const current = document.createElement('p');
  current.textContent = `Current ${format(metric.currentUsage)} / hard limit ${format(metric.hardLimit)} ${metric.unit}`;
  const projected = document.createElement('p');
  projected.textContent = `Weighted forecast ${format(metric.projectedTotal)} / safe ceiling ${format(metric.safeLimit)} ${metric.unit}`;
  const context = document.createElement('p');
  const headroom = metric.safeLimit - metric.projectedTotal;
  context.textContent = `${headroom < 0 ? 'Over ceiling' : 'Safety headroom'} ${format(Math.abs(headroom))} ${metric.unit}`;
  if (input) context.textContent += ` · Δ ${format(input.projectedDelta)} × sensitivity ${format(input.sensitivityMultiplier)}`;
  const track = document.createElement('div');
  track.className = 'bar-bg';
  const bar = document.createElement('div');
  bar.className = `bar-fill fill-${tone}`;
  bar.style.width = `${Math.min(100, metric.blastRadius * 100)}%`;
  track.append(bar);
  detail.append(title, current, projected, context, track);
  const entries = [['Current', metric.currentUsage], ['Hard quota', metric.hardLimit],
    ['Weighted forecast', metric.projectedTotal], ['Safety ceiling', metric.safeLimit],
    ['Safety headroom (negative = breach)', headroom], ['B (full precision)', String(metric.blastRadius)]];
  if (input) entries.push(['Projected delta', input.projectedDelta], ['Sensitivity multiplier', input.sensitivityMultiplier]);
  detail.append(exactDetails(entries));
  return detail;
}

function renderMetric(metric, input) {
  const warning = !metric.isBreached && metric.blastRadius >= 0.85;
  const tone = metric.isBreached ? 'danger' : warning ? 'warning' : 'success';
  const row = document.createElement('div');
  row.className = 'metric-row';
  row.setAttribute('role', 'listitem');
  row.dataset.provider = metric.provider;
  row.dataset.metricKey = metric.metricKey;
  const value = document.createElement('div');
  value.className = 'metric-value';
  value.style.color = `var(--${tone})`;
  value.textContent = `${(metric.blastRadius * 100).toFixed(2)}%`;
  const label = document.createElement('small');
  label.textContent = metric.isBreached ? 'BREACH' : warning ? 'NEAR CEILING' : 'WITHIN LIMIT';
  value.append(label);
  row.append(renderMetricDetails(metric, input, tone), value);
  return row;
}

function renderLocalState(state) {
  currentState = state;
  selector.value = state.scenario;
  const result = state.evaluation;
  const blocked = result.decision === 'BLOCK';
  const badge = document.getElementById('gate-status');
  badge.className = `status-pill ${blocked ? 'status-blocked' : 'status-allowed'}`;
  badge.textContent = `${blocked ? 'BLOCKED' : 'ALLOW'} (B=${result.blastRadius.toFixed(blocked ? 2 : 4)})`;
  const compliance = document.getElementById('compliance-status');
  compliance.className = `status-pill ${result.complianceIndicator ? 'status-allowed' : 'status-blocked'}`;
  compliance.textContent = result.complianceIndicator ? 'ADR approved (demo)' : 'ADR approval required';
  document.getElementById('verdict-summary').textContent = result.complianceIndicator && result.isBreached
    ? `BLOCKED: Projected ${result.highestRiskMetric.provider} ${result.highestRiskMetric.metricName} exceeds the safety ceiling by ${((result.blastRadius - 1) * 100).toFixed(2)}%.`
    : result.verdictSummary;
  document.querySelector('.formula-box').textContent = `B = max((U_i + ΔU_i × λ_i) / (Q_i × τ_i))\nB = ${result.blastRadius.toFixed(4)}\nC = ${result.confidenceIndex.toFixed(4)} (headroom index, not probability)`;
  metrics.replaceChildren(...result.metricBreakdown.map(metric => renderMetric(metric,
    state.inputs?.find(input => input.provider === metric.provider && input.metricKey === metric.metricKey))));
  document.getElementById('data-source').textContent = state.storage === 'turso' ? 'Demo quota data · persisted in live Turso' : 'Demo quota data · local SQLite';
  updateFixtureTimestamp();
  document.getElementById('local-status').textContent = state.storage === 'turso' ? 'Saved in Turso.' : 'Saved in local SQLite.';
  remediation.textContent = state.remediated ? 'Quota remediation applied' : 'Simulate quota remediation';
  renderRemediationComparison(state);
}

function renderRemediationComparison(state) {
  const panel = document.getElementById('remediation-comparison');
  const comparison = state.remediationComparison;
  panel.hidden = !state.remediated;
  panel.replaceChildren();
  if (!state.remediated) return;
  if (!comparison) {
    panel.textContent = 'An earlier simulation is saved, but its baseline is unavailable. Reset the scenario to record a before/after comparison.';
    return;
  }
  const title = document.createElement('strong');
  title.textContent = `Demo simulation: ${comparison.beforeDecision} → ${comparison.afterDecision}`;
  const change = document.createElement('p');
  change.textContent = `B: ${comparison.beforeBlastRadius.toFixed(4)} → ${comparison.afterBlastRadius.toFixed(4)}`;
  panel.append(title, change);
  for (const dimension of comparison.changedDimensions) {
    const line = document.createElement('p');
    line.textContent = `${dimension.provider.toUpperCase()} · ${dimension.metricName}: ${format(dimension.beforeProjected)} → ${format(dimension.afterProjected)} ${dimension.unit}`;
    panel.append(line);
  }
  const risk = state.evaluation.highestRiskMetric;
  const bottleneck = document.createElement('p');
  bottleneck.textContent = `Remaining bottleneck: ${risk.provider.toUpperCase()} · ${risk.metricName} at ${(risk.blastRadius * 100).toFixed(2)}% of safety ceiling. ${risk.blastRadius >= 0.85 ? 'Near-ceiling warnings remain; this is not a wide safety margin.' : 'No near-ceiling warning.'}`;
  const note = document.createElement('p');
  note.textContent = 'Synthetic delta reduction only. No cloud changes or Jira transitions were performed.';
  panel.append(bottleneck, note);
}

async function updateLocalState(endpoint, payload) {
  setBusy(true);
  try {
    const options = payload === undefined ? {} : {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
    };
    const response = await fetch(endpoint, options);
    const state = await response.json();
    if (!response.ok) throw new Error(state.error || 'Local request failed');
    renderLocalState(state);
  } catch (error) {
    if (currentState) selector.value = currentState.scenario;
    currentState = undefined;
    const badge = document.getElementById('gate-status');
    badge.textContent = 'UNAVAILABLE';
    badge.className = 'status-pill status-blocked';
    document.getElementById('local-status').textContent = `Portal storage unavailable: ${error.message}. Check the server and database configuration.`;
  } finally { setBusy(false); }
}

function setupLocalPortal() {
  document.body.classList.add('local-portal');
  document.getElementById('scenario-controls').hidden = false;
  document.getElementById('gate-status').textContent = 'LOADING';
  document.querySelector('.formula-box').textContent = 'Loading quota evaluation…';
  metrics.replaceChildren(document.createTextNode('Loading quota metrics…'));
  selector.addEventListener('change', () => updateLocalState('/api/local/scenario', { scenario: selector.value }));
  reset.addEventListener('click', () => updateLocalState('/api/local/scenario', { scenario: selector.value }));
  remediation.addEventListener('click', () => updateLocalState('/api/local/remediate', {}));
  updateLocalState('/api/local/status');
  document.getElementById('live-turso-card').hidden = false;
  document.getElementById('refresh-turso').addEventListener('click', () => loadTursoUsage(true));
  loadTursoUsage(false);
  setInterval(() => { updateFixtureTimestamp(); loadTursoUsage(false); }, 60000);
}

async function loadTursoUsage(refresh) {
  const button = document.getElementById('refresh-turso');
  const output = document.getElementById('live-turso-status');
  button.disabled = true;
  try {
    const response = await fetch(`/api/local/turso-usage${refresh ? '/refresh' : ''}`, refresh ? {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}',
    } : {});
    if (!response.ok) throw new Error('Live usage endpoint unavailable');
    const state = await response.json();
    if (!state.configured) {
      output.textContent = 'Not configured. Add TURSO_ORGANIZATION and TURSO_API_TOKEN to .env.local, then restart. These are separate from database credentials.';
      button.disabled = true;
      return;
    }
    renderTursoMeasurements(state);
    button.disabled = false;
  } catch (error) {
    output.textContent = error.message;
    button.disabled = false;
  }
}

function renderTursoMeasurements(state) {
  const output = document.getElementById('live-turso-status');
  const details = document.getElementById('live-turso-details');
  details.replaceChildren();
  output.textContent = state.source === 'measured'
    ? `Plan: ${state.planName}. Billing-cycle reads: ${format(state.rowsRead)} / allowance ${format(state.rowsReadLimit)}. Storage: ${format(state.storageBytes / 1000000)} / allowance ${format(state.storageBytesLimit / 1000000)} MB. Collected ${timestampText(state.capturedAt)}. ${state.stale ? 'STALE — refresh required.' : 'Recent collection; upstream reporting may lag.'}`
    : 'No measurements collected yet. Refresh to query Turso.';
  if (state.source === 'measured') details.append(exactDetails([
    ['Billing-cycle reads', state.rowsRead], ['Read allowance', state.rowsReadLimit],
    ['Storage bytes', state.storageBytes], ['Storage allowance bytes', state.storageBytesLimit],
    ['Collected (UTC)', state.capturedAt],
    ['Billing period start (UTC)', state.billingPeriodStart ?? 'Not supplied'],
    ['Billing period end (UTC)', state.billingPeriodEnd ?? 'Not supplied'],
  ]));
  if (state.error) output.textContent += ` ${state.error}`;
}

if (['localhost', '127.0.0.1'].includes(window.location.hostname)) setupLocalPortal();
