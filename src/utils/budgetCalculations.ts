import { 
  TopologyNode, 
  TopologyPlanRecord, 
  ResolvedNodeBudgetMetrics, 
  ResolvedPlanBudgetMetrics 
} from '../types/topology';

/**
 * Resolves strongly typed budget and token consumption metrics for an individual node.
 * Safely handles null, undefined, and partial objects, ensuring non-NaN finite values.
 */
export function getNodeBudgetMetrics(node?: TopologyNode | null): ResolvedNodeBudgetMetrics {
  if (!node || typeof node !== 'object') {
    return {
      budgetLimitUsd: undefined,
      costUsd: 0,
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
    };
  }

  // 1. Budget Limit Ceiling (USD)
  const rawLimit = node.budget?.budgetLimitUsd ?? 
                   node.context?.budget?.budgetLimitUsd ?? 
                   (typeof node.context?.budgetLimitUsd === 'number' ? node.context.budgetLimitUsd : undefined);
  const budgetLimitUsd = (typeof rawLimit === 'number' && !isNaN(rawLimit) && rawLimit >= 0)
    ? Number(rawLimit.toFixed(4))
    : undefined;

  // 2. Consumed Cost (USD)
  const rawCost = node.budget?.costUsd ?? 
                  node.context?.budget?.costUsd ?? 
                  (typeof node.context?.costUsd === 'number' ? node.context.costUsd : 0);
  const costUsd = (typeof rawCost === 'number' && !isNaN(rawCost) && rawCost >= 0)
    ? Number(rawCost.toFixed(4))
    : 0;

  // 3. Prompt (Input) Tokens
  const rawIn = node.budget?.inputTokens ?? 
                node.context?.budget?.inputTokens ?? 
                (typeof node.context?.tokensUsed === 'object' ? node.context?.tokensUsed?.input : 0);
  const inputTokens = (typeof rawIn === 'number' && !isNaN(rawIn) && rawIn >= 0)
    ? Math.round(rawIn)
    : 0;

  // 4. Completion (Output) Tokens
  const rawOut = node.budget?.outputTokens ?? 
                 node.context?.budget?.outputTokens ?? 
                 (typeof node.context?.tokensUsed === 'object' ? node.context?.tokensUsed?.output : 0);
  const outputTokens = (typeof rawOut === 'number' && !isNaN(rawOut) && rawOut >= 0)
    ? Math.round(rawOut)
    : 0;

  // 5. Total Tokens (respects explicit total or sums input + output)
  const rawTot = node.budget?.totalTokens ?? 
                 node.context?.budget?.totalTokens ?? 
                 (
                   typeof node.context?.tokensUsed === 'number'
                     ? node.context.tokensUsed
                     : (typeof node.context?.tokensUsed === 'object' ? node.context?.tokensUsed?.total : undefined)
                 );
  const totalTokens = (typeof rawTot === 'number' && !isNaN(rawTot) && rawTot >= 0)
    ? Math.round(rawTot)
    : (inputTokens + outputTokens);

  return {
    budgetLimitUsd,
    costUsd,
    inputTokens,
    outputTokens,
    totalTokens,
  };
}

/**
 * Computes reactive aggregate budget metrics for an entire workflow DAG plan.
 * Preserves plan-level costs (such as multi-model council deliberation), falls back
 * to the sum of individual node budgets if the plan limit is unconfigured, and computes
 * non-negative headroom with clamped utilization percentages.
 */
export function computePlanBudgetMetrics(plan?: TopologyPlanRecord | null): ResolvedPlanBudgetMetrics {
  if (!plan || typeof plan !== 'object') {
    return {
      budgetLimitUsd: 1.00,
      costUsd: 0,
      remainingUsd: 1.00,
      utilizationPercent: 0,
      totalInputTokens: 0,
      totalOutputTokens: 0,
      totalTokens: 0,
    };
  }

  const nodes = Array.isArray(plan.nodes) ? plan.nodes : [];
  let calculatedCost = 0;
  let calculatedInputTokens = 0;
  let calculatedOutputTokens = 0;
  let calculatedTotalTokens = 0;
  let sumNodeBudgetLimits = 0;
  let hasNodeBudgetLimits = false;

  for (const n of nodes) {
    const m = getNodeBudgetMetrics(n);
    calculatedCost += m.costUsd || 0;
    calculatedInputTokens += m.inputTokens || 0;
    calculatedOutputTokens += m.outputTokens || 0;
    calculatedTotalTokens += m.totalTokens || 0;

    if (typeof m.budgetLimitUsd === 'number' && m.budgetLimitUsd > 0) {
      sumNodeBudgetLimits += m.budgetLimitUsd;
      hasNodeBudgetLimits = true;
    }
  }

  // 1. Total Consumed Spend: preserves plan-level costs (e.g. upfront council deliberation)
  const explicitPlanCost = plan.budget?.costUsd ?? (typeof plan.costUsd === 'number' ? plan.costUsd : undefined);
  const totalCostUsd = Number(
    (explicitPlanCost !== undefined ? Math.max(explicitPlanCost, calculatedCost) : calculatedCost).toFixed(4)
  );

  // 2. Budget Limit Ceiling: explicit plan limit -> sum of node limits -> fallback $1.00
  const explicitPlanLimit = plan.budget?.budgetLimitUsd ?? (typeof plan.budgetLimitUsd === 'number' ? plan.budgetLimitUsd : undefined);
  const budgetLimitUsd = explicitPlanLimit !== undefined
    ? Number(explicitPlanLimit.toFixed(4))
    : (hasNodeBudgetLimits ? Number(sumNodeBudgetLimits.toFixed(4)) : 1.00);

  // 3. Headroom & Utilization
  const remainingUsd = Number(Math.max(0, budgetLimitUsd - totalCostUsd).toFixed(4));
  const utilizationPercent = budgetLimitUsd > 0
    ? Math.min(100, Math.round((totalCostUsd / budgetLimitUsd) * 100))
    : (totalCostUsd > 0 ? 100 : 0);

  // 4. Token Aggregates
  const totalTokens = Math.max(calculatedTotalTokens, calculatedInputTokens + calculatedOutputTokens);

  return {
    budgetLimitUsd,
    costUsd: totalCostUsd,
    remainingUsd,
    utilizationPercent,
    totalInputTokens: calculatedInputTokens,
    totalOutputTokens: calculatedOutputTokens,
    totalTokens,
  };
}
