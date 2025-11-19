import {
  CheckCircleIcon,
  ExclamationCircleIcon,
  InProgressIcon,
  PendingIcon,
  PlayIcon,
  PauseIcon,
  ExclamationTriangleIcon,
  ClockIcon,
} from '@patternfly/react-icons';
import { LabelProps } from '@patternfly/react-core';
import { PyTorchJobKind, TrainJobKind, RayJobKind } from '../../k8sTypes';
import { PyTorchJobState, TrainJobState, RayJobState, TrainingJobState, TrainingJobType } from '../../types';
import { getWorkloadForPyTorchJob, getWorkloadForTrainJob, getWorkloadForRayJob } from '../../api';

export const getStatusInfo = (
  status: TrainingJobState,
): {
  label: string;
  status?: LabelProps['status'];
  color?: LabelProps['color'];
  IconComponent: React.ComponentType;
} => {
  switch (status) {
    case PyTorchJobState.SUCCEEDED:
    case TrainJobState.COMPLETE:
    case RayJobState.SUCCEEDED:
      return {
        label: status === TrainJobState.COMPLETE ? 'Complete' : 'Succeeded',
        color: 'green',
        IconComponent: CheckCircleIcon,
      };
    case PyTorchJobState.FAILED:
    case TrainJobState.FAILED:
    case RayJobState.FAILED:
      return {
        label: 'Failed',
        color: 'red',
        IconComponent: ExclamationCircleIcon,
      };
    case PyTorchJobState.RUNNING:
    case TrainJobState.RUNNING:
    case RayJobState.RUNNING:
      return {
        label: 'Running',
        color: 'blue',
        IconComponent: InProgressIcon,
      };
    case RayJobState.NEW:
      return {
        label: 'New',
        color: 'grey',
        IconComponent: PendingIcon,
      };
    case RayJobState.STOPPED:
      return {
        label: 'Stopped',
        color: 'grey',
        IconComponent: PauseIcon,
      };
    case PyTorchJobState.RESTARTING:
      return {
        label: 'Restarting',
        color: 'blue',
        IconComponent: InProgressIcon,
      };
    case PyTorchJobState.PENDING:
    case TrainJobState.PENDING:
      return {
        label: 'Pending',
        color: 'teal',
        IconComponent: PendingIcon,
      };
    case PyTorchJobState.QUEUED:
      return {
        label: 'Queued',
        color: 'grey',
        IconComponent: ClockIcon,
      };
    case PyTorchJobState.CREATED:
      return {
        label: 'Created',
        color: 'grey',
        IconComponent: PlayIcon,
      };
    case PyTorchJobState.PAUSED:
      return {
        label: 'Paused',
        color: 'grey',
        IconComponent: PauseIcon,
      };
    case PyTorchJobState.SUSPENDED:
    case TrainJobState.SUSPENDED:
    case RayJobState.SUSPENDED:
      return {
        label: 'Suspended',
        color: 'grey',
        IconComponent: PauseIcon,
      };
    case TrainJobState.RESUMED:
      return {
        label: 'Resumed',
        color: 'purple',
        IconComponent: PlayIcon,
      };
    case PyTorchJobState.PREEMPTED:
      return {
        label: 'Preempted',
        color: 'orangered',
        IconComponent: ExclamationTriangleIcon,
      };
    default:
      return {
        label: 'Unknown',
        status: 'warning',
        IconComponent: ExclamationCircleIcon,
      };
  }
};

/**
 * Get basic PyTorch job status from conditions (synchronous)
 * This is the core status extraction function used internally
 */
const getBasicJobStatus = (job: PyTorchJobKind): PyTorchJobState => {
  if (!job.status?.conditions) {
    return PyTorchJobState.UNKNOWN;
  }

  // Sort conditions by lastTransitionTime (most recent first)
  const sortedConditions = job.status.conditions.toSorted((a, b) =>
    (b.lastTransitionTime || '').localeCompare(a.lastTransitionTime || ''),
  );

  // Find the most recent condition with status='True' (current active state)
  const currentCondition = sortedConditions.find((condition) => condition.status === 'True');

  if (!currentCondition) {
    return PyTorchJobState.UNKNOWN;
  }

  switch (currentCondition.type) {
    case 'Succeeded':
      return PyTorchJobState.SUCCEEDED;
    case 'Failed':
      return PyTorchJobState.FAILED;
    case 'Running':
      return PyTorchJobState.RUNNING;
    case 'Created':
      return PyTorchJobState.CREATED;
    case 'Restarting':
      return PyTorchJobState.RESTARTING;
    default:
      return PyTorchJobState.UNKNOWN;
  }
};

/**
 * Unified function to get training job status with hibernation support (async)
 * @param job - PyTorch job to check status for
 * @param options - Configuration options
 * @returns Promise resolving to the job's current status
 */
export const getTrainingJobStatus = async (
  job: PyTorchJobKind,
  options: {
    skipHibernationCheck?: boolean;
  } = {},
): Promise<{ status: PyTorchJobState; isLoading: boolean; error?: string }> => {
  const { skipHibernationCheck = false } = options;

  try {
    // Get basic status from PyTorch job conditions
    const basicStatus = getBasicJobStatus(job);

    // Skip hibernation check if disabled or job is in terminal state
    if (
      skipHibernationCheck ||
      basicStatus === PyTorchJobState.SUCCEEDED ||
      basicStatus === PyTorchJobState.FAILED
    ) {
      return { status: basicStatus, isLoading: false };
    }

    // Check workload status for Kueue-enabled jobs and runPolicy for non-Kueue jobs
    const workload = await getWorkloadForPyTorchJob(job);

    if (workload) {
      // Kueue-enabled job: Check workload status for queuing, hibernation and preemption

      // Priority 1: Check for paused/hibernated status - workload.spec.active = false
      if (workload.spec.active === false) {
        return { status: PyTorchJobState.PAUSED, isLoading: false };
      }

      // Priority 2: Check for preempted status - workload.spec.active = true AND job.spec.runPolicy.suspend = true
      const isWorkloadActive = workload.spec.active === true;
      const isJobSuspended = job.spec.runPolicy?.suspend === true;

      if (isWorkloadActive && isJobSuspended) {
        return { status: PyTorchJobState.PREEMPTED, isLoading: false };
      }

      // Priority 3: Check for queued status - workload conditions indicate waiting for resources
      const conditions = workload.status?.conditions || [];
      const quotaReservedCondition = conditions.find((c) => c.type === 'QuotaReserved');
      const podsReadyCondition = conditions.find((c) => c.type === 'PodsReady');

      const isWaitingForQuota =
        quotaReservedCondition &&
        quotaReservedCondition.status === 'False' &&
        quotaReservedCondition.reason === 'Pending';
      const isWaitingForPods =
        podsReadyCondition &&
        podsReadyCondition.status === 'False' &&
        podsReadyCondition.reason === 'WaitForStart';

      if (isWaitingForQuota && isWaitingForPods) {
        return { status: PyTorchJobState.QUEUED, isLoading: false };
      }
    } else {
      // Non-Kueue job: Check PyTorchJob runPolicy.suspend for hibernation
      const isSuspendedByRunPolicy = job.spec.runPolicy?.suspend === true;

      if (isSuspendedByRunPolicy) {
        return { status: PyTorchJobState.PAUSED, isLoading: false };
      }
    }

    // Return basic status if no special conditions are met
    return { status: basicStatus, isLoading: false };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.warn(`Failed to get status for PyTorchJob ${job.metadata.name}:`, errorMessage);

    // Fallback to basic status on error
    return {
      status: getBasicJobStatus(job),
      isLoading: false,
      error: errorMessage,
    };
  }
};

/**
 * Get training job status (synchronous version for sorting/filtering)
 * This version checks basic PyTorch job status and runPolicy.suspend for non-Kueue jobs
 * @param job - PyTorch job to check status for
 * @returns Job status including basic hibernation check
 */
export const getTrainingJobStatusSync = (job: PyTorchJobKind): PyTorchJobState => {
  const basicStatus = getBasicJobStatus(job);

  // Skip hibernation check for terminal states
  if (basicStatus === PyTorchJobState.SUCCEEDED || basicStatus === PyTorchJobState.FAILED) {
    return basicStatus;
  }

  // Check for non-Kueue job suspension via runPolicy.suspend
  const isSuspendedByRunPolicy = job.spec.runPolicy?.suspend === true;
  if (isSuspendedByRunPolicy) {
    return PyTorchJobState.PAUSED;
  }

  return basicStatus;
};

/**
 * Extract training progress percentage from job (independent of status)
 */
export const getTrainingProgress = (job: TrainingJob): number => {
  // TrainJob with progressionStatus (most reliable)
  if (job.kind === 'TrainJob' && (job as any).status?.progressionStatus?.percentageComplete) {
    const percentage = parseFloat((job as any).status.progressionStatus.percentageComplete);
    return isNaN(percentage) ? 0 : Math.max(0, Math.min(100, percentage));
  }
  
  // PyTorchJob with completionPercentage
  if (job.kind === 'PyTorchJob' && (job as any).status?.completionPercentage) {
    const percentage = (job as any).status.completionPercentage;
    const num = typeof percentage === 'number' ? percentage : parseFloat(String(percentage));
    return isNaN(num) ? 0 : Math.max(0, Math.min(100, num));
  }
  
  // For completed jobs, return 100%
  if ((job as any).status?.conditions?.some((c: any) => 
    (c.type === 'Succeeded' || c.type === 'Complete') && c.status === 'True')) {
    return 100;
  }
  
  return 0;
};

/**
 * Get basic TrainJob status from conditions (synchronous)
 */
const getBasicTrainJobStatus = (job: TrainJobKind): TrainJobState => {
  // Check if job has any status at all
  if (!job.status) {
    // No status yet - job is likely just created/pending
    return TrainJobState.PENDING;
  }

  // Check conditions first
  if (!job.status.conditions) {
    // No conditions yet, but check other status indicators
    
    // If has progression status, it's likely running
    if (job.status.progressionStatus?.percentageComplete) {
      return TrainJobState.RUNNING;
    }
    
    // Check if there are active jobs in jobsStatus (early training phase)
    if (job.status.jobsStatus?.some((jobStatus) => jobStatus.active > 0)) {
      return TrainJobState.RUNNING;
    }
    
    // Check if jobs are starting up (ready > 0 but not succeeded yet)
    if (job.status.jobsStatus?.some((jobStatus) => jobStatus.ready > 0)) {
      return TrainJobState.RUNNING;
    }
    
    // If jobsStatus exists but no active jobs, likely pending
    if (job.status.jobsStatus && job.status.jobsStatus.length > 0) {
      return TrainJobState.PENDING;
    }
    
    // Fallback: if job has status but no conditions/progression, it's likely starting up
    return TrainJobState.PENDING;
  }

  // Sort conditions by lastTransitionTime (most recent first)
  const sortedConditions = job.status.conditions.toSorted((a, b) =>
    (b.lastTransitionTime || '').localeCompare(a.lastTransitionTime || ''),
  );

  // Check for specific conditions
  const completeCondition = sortedConditions.find(c => c.type === 'Complete' && c.status === 'True');
  const failedCondition = sortedConditions.find(c => c.type === 'Failed' && c.status === 'True');
  const suspendedCondition = sortedConditions.find(c => c.type === 'Suspended' && c.status === 'True');
  const resumedCondition = sortedConditions.find(c => c.type === 'Suspended' && c.status === 'False' && c.reason === 'Resumed');

  // Terminal states take priority
  if (completeCondition) {
    return TrainJobState.COMPLETE;
  }
  if (failedCondition) {
    return TrainJobState.FAILED;
  }
  
  // Check if training is actually complete (100% progress) even if suspended
  if (job.status.progressionStatus?.percentageComplete) {
    const percentage = parseFloat(job.status.progressionStatus.percentageComplete);
    if (percentage >= 100) {
      return TrainJobState.COMPLETE;
    }
  }
  
  if (suspendedCondition) {
    return TrainJobState.SUSPENDED;
  }
  
  // Check if job was recently resumed
  if (resumedCondition) {
    // If resumed and has active progress, show as running
    if (job.status.progressionStatus?.percentageComplete) {
      const percentage = parseFloat(job.status.progressionStatus.percentageComplete);
      if (percentage > 0 && percentage < 100) {
        return TrainJobState.RUNNING;
      }
    }
    return TrainJobState.RESUMED;
  }

  // Check if job has active training progress
  if (job.status.progressionStatus?.percentageComplete) {
    const percentage = parseFloat(job.status.progressionStatus.percentageComplete);
    if (percentage > 0) {
      return TrainJobState.RUNNING;
    }
  }

  // Check jobsStatus for various states
  if (job.status.jobsStatus && job.status.jobsStatus.length > 0) {
    // Check if there are active jobs (training is running)
    if (job.status.jobsStatus.some((jobStatus) => jobStatus.active > 0)) {
      return TrainJobState.RUNNING;
    }

    // Check if jobs are ready but not yet active (starting up)
    if (job.status.jobsStatus.some((jobStatus) => jobStatus.ready > 0)) {
      return TrainJobState.RUNNING;
    }

    // Check if all jobs are succeeded
    if (job.status.jobsStatus.every((jobStatus) => jobStatus.succeeded > 0 && jobStatus.active === 0)) {
      return TrainJobState.COMPLETE;
    }

    // Check if any jobs failed
    if (job.status.jobsStatus.some((jobStatus) => jobStatus.failed > 0)) {
      return TrainJobState.FAILED;
    }

    // If jobsStatus exists but no clear state, likely pending/starting
    return TrainJobState.PENDING;
  }

  // If we reach here, the job likely doesn't have enough status information yet
  // Check if the job was recently created (no meaningful status yet)
  if (job.metadata.creationTimestamp) {
    const createdTime = new Date(job.metadata.creationTimestamp);
    const now = new Date();
    const timeDiff = now.getTime() - createdTime.getTime();
    
    // If created less than 2 minutes ago and no status, likely pending
    if (timeDiff < 2 * 60 * 1000) {
      return TrainJobState.PENDING;
    }
  }

  return TrainJobState.UNKNOWN;
};

/**
 * Get TrainJob status with hibernation support (async)
 */
export const getTrainJobStatusWithHibernation = async (
  job: TrainJobKind,
): Promise<TrainJobState> => {
  const standardStatus = getBasicTrainJobStatus(job);

  // If the job is in a terminal state (complete or failed), don't check hibernation
  // Terminal states take precedence over hibernation status
  if (standardStatus === TrainJobState.COMPLETE || standardStatus === TrainJobState.FAILED) {
    return standardStatus;
  }

  // If job is already detected as resumed or running, return that status
  if (standardStatus === TrainJobState.RESUMED || standardStatus === TrainJobState.RUNNING) {
    return standardStatus;
  }

  try {
    const workload = await getWorkloadForTrainJob(job);
    if (workload) {
      // Kueue-enabled job: Check workload hibernation
      if (workload.spec.active === false) {
        return TrainJobState.SUSPENDED;
      }
    } else {
      // Non-Kueue job: Check TrainJob spec.suspend
      if (job.spec.suspend === true) {
        return TrainJobState.SUSPENDED;
      }
    }
  } catch (error) {
    console.warn('Failed to check hibernation status for TrainJob:', error);
  }

  return standardStatus;
};

/**
 * Get RayJob status from conditions
 */
export const getBasicRayJobStatus = (job: RayJobKind): RayJobState => {
  if (!job.status) {
    return RayJobState.NEW;
  }

  const jobStatus = job.status.jobStatus;
  const deploymentStatus = job.status.jobDeploymentStatus;

  // Check deployment status first for suspended state
  if (deploymentStatus === 'Suspended' || job.spec.suspend === true) {
    return RayJobState.SUSPENDED;
  }

  // Map RayJob statuses
  switch (jobStatus) {
    case 'SUCCEEDED':
      return RayJobState.SUCCEEDED;
    case 'FAILED':
      return RayJobState.FAILED;
    case 'RUNNING':
      return RayJobState.RUNNING;
    case 'STOPPED':
      return RayJobState.STOPPED;
    case 'NEW':
      return RayJobState.NEW;
    default:
      return RayJobState.NEW;
  }
};

// Generic functions that work with all job types
export type TrainingJob = PyTorchJobKind | TrainJobKind | RayJobKind;

export const getJobType = (job: TrainingJob): TrainingJobType => {
  if (job.kind === 'TrainJob') return TrainingJobType.TRAIN;
  if (job.kind === 'RayJob') return TrainingJobType.RAY;
  return TrainingJobType.PYTORCH;
};

export const getJobStatus = (job: TrainingJob): TrainingJobState => {
  if (job.kind === 'TrainJob') {
    return getBasicTrainJobStatus(job as TrainJobKind);
  }
  if (job.kind === 'RayJob') {
    return getBasicRayJobStatus(job as RayJobKind);
  }
  return getTrainingJobStatusSync(job as PyTorchJobKind);
};

export const getJobStatusWithHibernationGeneric = async (job: TrainingJob): Promise<TrainingJobState> => {
  if (job.kind === 'TrainJob') {
    return getTrainJobStatusWithHibernation(job as TrainJobKind);
  }
  if (job.kind === 'RayJob') {
    return getBasicRayJobStatus(job as RayJobKind);
  }
  const result = await getTrainingJobStatus(job as PyTorchJobKind);
  return result.status;
};

export const getJobDisplayName = (job: TrainingJob): string => {
  return job.metadata.annotations?.['opendatahub.io/display-name'] || job.metadata.name;
};

// Legacy exports for backward compatibility
export const getJobStatusFromPyTorchJob = getTrainingJobStatusSync;
export const getJobStatusWithHibernation = async (job: PyTorchJobKind): Promise<PyTorchJobState> => {
  const result = await getTrainingJobStatus(job);
  return result.status;
};
