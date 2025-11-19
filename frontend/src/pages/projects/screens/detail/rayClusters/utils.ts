import { RayClusterKind, WorkloadKind } from '#~/k8sTypes';

export const getWorkloadForRayCluster = (
  rayCluster: RayClusterKind,
  workloads: WorkloadKind[],
): WorkloadKind | undefined =>
  workloads.find((workload) =>
    workload.metadata.ownerReferences?.some(
      (ref) => ref.kind === 'RayCluster' && ref.name === rayCluster.metadata.name,
    ),
  );

export const getKueueStatus = (workload?: WorkloadKind): string => {
  if (!workload) {
    return 'Not queued';
  }

  const conditions = workload.status?.conditions || [];
  const admittedCondition = conditions.find((c) => c.type === 'Admitted');

  if (admittedCondition?.status === 'True') {
    return 'Admitted';
  }

  const quotaReservedCondition = conditions.find((c) => c.type === 'QuotaReserved');
  if (quotaReservedCondition?.status === 'False') {
    return 'Queued';
  }

  return 'Pending';
};

export type RayClusterStatus = 'Ready' | 'Suspended' | 'Failed' | 'Starting' | 'Unknown';

export const getRayClusterStatus = (
  rayCluster: RayClusterKind,
  workload?: WorkloadKind,
): RayClusterStatus => {
  // First check if there's an explicit state field (some Ray versions have this)
  const explicitState = rayCluster.status?.state;

  // Check workload conditions if Kueue is being used
  if (workload) {
    const conditions = workload.status?.conditions || [];
    const admittedCondition = conditions.find((c) => c.type === 'Admitted');

    // If workload is not admitted yet, cluster is effectively suspended
    if (admittedCondition?.status !== 'True') {
      return 'Suspended';
    }
  }

  // Check worker replicas to determine if cluster is ready
  const desiredWorkerReplicas = rayCluster.status?.desiredWorkerReplicas ?? 0;
  const availableWorkerReplicas = rayCluster.status?.availableWorkerReplicas ?? 0;

  // If explicit state shows ready, use that
  if (explicitState === 'ready') {
    return 'Ready';
  }

  // If explicit state shows suspended, but workload is admitted, it's starting
  if (explicitState === 'suspended' && workload) {
    const conditions = workload.status?.conditions || [];
    const admittedCondition = conditions.find((c) => c.type === 'Admitted');
    if (admittedCondition?.status === 'True') {
      // Workload is admitted but cluster might still be starting up
      if (availableWorkerReplicas > 0) {
        return 'Ready';
      }
      return 'Starting';
    }
  }

  // Check if failed
  if (explicitState === 'failed') {
    return 'Failed';
  }

  // Derive status from worker replicas
  if (desiredWorkerReplicas > 0) {
    if (availableWorkerReplicas === desiredWorkerReplicas) {
      return 'Ready';
    }
    if (availableWorkerReplicas > 0) {
      return 'Starting';
    }
  }

  // If we have desired replicas but none available yet
  if (desiredWorkerReplicas > 0 && availableWorkerReplicas === 0) {
    return 'Starting';
  }

  // Default fallback
  return explicitState
    ? ((explicitState.charAt(0).toUpperCase() + explicitState.slice(1)) as RayClusterStatus)
    : 'Unknown';
};
