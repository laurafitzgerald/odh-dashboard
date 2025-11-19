import * as React from 'react';
import { Tr, Td, ActionsColumn } from '@patternfly/react-table';
import {
  Timestamp,
  Flex,
  FlexItem,
  TimestampTooltipVariant,
  Icon,
  Tooltip,
  Button,
} from '@patternfly/react-core';
import { CubesIcon, CpuIcon, EditIcon } from '@patternfly/react-icons';
import { Link } from 'react-router-dom';
import ResourceNameTooltip from '@odh-dashboard/internal/components/ResourceNameTooltip';
import { getDisplayNameFromK8sResource } from '@odh-dashboard/internal/concepts/k8s/utils';
import { relativeTime } from '@odh-dashboard/internal/utilities/time';
import useNotification from '@odh-dashboard/internal/utilities/useNotification';
import TrainingJobProject from './TrainingJobProject';
import { getTrainingJobStatusSync, TrainingJob, getJobStatus } from './utils';
import TrainingJobClusterQueue from './TrainingJobClusterQueue';
import HibernationToggleModal from './HibernationToggleModal';
import TrainingJobStatus from './components/TrainingJobStatus';
import TrainingJobType from './components/TrainingJobType';
import ScaleWorkersModal from './ScaleWorkersModal';
import StateActionToggle from './StateActionToggle';
import { PyTorchJobKind } from '../../k8sTypes';
import { PyTorchJobState, TrainingJobState } from '../../types';
import { togglePyTorchJobHibernation } from '../../api';
import { scaleWorkersAndStayPaused, scaleWorkersAndResume, scaleWorkers } from '../../api/scaling';

type PyTorchJobTableRowProps = {
  job: TrainingJob;
  jobStatus?: TrainingJobState;
  onDelete: (job: TrainingJob) => void;
  onStatusUpdate?: (jobId: string, newStatus: TrainingJobState) => void;
  onJobUpdate?: (jobId: string, updatedJob: TrainingJob) => void;
};

const TrainingJobTableRow: React.FC<PyTorchJobTableRowProps> = ({
  job,
  jobStatus,
  onDelete,
  onStatusUpdate,
  onJobUpdate,
}) => {
  const notification = useNotification();
  const [hibernationModalOpen, setHibernationModalOpen] = React.useState(false);
  const [scaleWorkersModalOpen, setScaleWorkersModalOpen] = React.useState(false);
  const [isToggling, setIsToggling] = React.useState(false);
  const [isScaling, setIsScaling] = React.useState(false);

  const displayName = getDisplayNameFromK8sResource(job);
  
  // Calculate nodes based on job type
  const nodesCount = React.useMemo(() => {
    if (job.kind === 'PyTorchJob') {
      const pytorchJob = job as PyTorchJobKind;
      const workerReplicas = pytorchJob.spec.pytorchReplicaSpecs.Worker?.replicas || 0;
      const masterReplicas = pytorchJob.spec.pytorchReplicaSpecs.Master?.replicas || 0;
      return workerReplicas + masterReplicas;
    } else if (job.kind === 'RayJob') {
      const rayJob = job as any;
      const workerGroups = rayJob.spec.rayClusterSpec?.workerGroupSpecs || [];
      const totalWorkers = workerGroups.reduce((sum: number, group: any) => sum + (group.replicas || 0), 0);
      return totalWorkers + 1; // +1 for head node
    }
    return 0;
  }, [job]);
  
  const workerReplicas = job.kind === 'PyTorchJob' ? (job as PyTorchJobKind).spec.pytorchReplicaSpecs.Worker?.replicas || 0 : 0;
  const localQueueName = job.metadata.labels?.['kueue.x-k8s.io/queue-name'];
  
  // Check if job uses GPUs
  const hasGPU = React.useMemo(() => {
    if (job.kind === 'PyTorchJob') {
      const pytorchJob = job as PyTorchJobKind;
      const workerResources = pytorchJob.spec.pytorchReplicaSpecs.Worker?.template?.spec?.containers?.[0]?.resources;
      const masterResources = pytorchJob.spec.pytorchReplicaSpecs.Master?.template?.spec?.containers?.[0]?.resources;
      const resources = workerResources || masterResources || {};
      return (resources?.limits?.['nvidia.com/gpu'] || 0) > 0;
    } else if (job.kind === 'RayJob') {
      const rayJob = job as any;
      const workerGroups = rayJob.spec.rayClusterSpec?.workerGroupSpecs || [];
      return workerGroups.some((group: any) => {
        const resources = group.template?.spec?.containers?.[0]?.resources;
        return (resources?.limits?.['nvidia.com/gpu'] || 0) > 0;
      });
    }
    return false;
  }, [job]);

  const status = jobStatus || getJobStatus(job);
  const isPaused = status === PyTorchJobState.PAUSED;
  const isPreempted = status === PyTorchJobState.PREEMPTED;
  const isQueued = status === PyTorchJobState.QUEUED;
  const isRunning = status === PyTorchJobState.RUNNING;
  const isPending = status === PyTorchJobState.PENDING;
  const isTerminalState = status === PyTorchJobState.SUCCEEDED || 
                          status === PyTorchJobState.FAILED ||
                          status === 'Succeeded' || 
                          status === 'Failed';
  const canScaleWorkers = isPaused && job.kind === 'PyTorchJob';
  const isPyTorchJob = job.kind === 'PyTorchJob';
  const isNotPaused = isRunning || isPreempted || isQueued || isPending; // Allow scaling for multiple states

  const handleHibernationToggle = async () => {
    // Skip for RayJobs
    if (job.kind === 'RayJob') {
      console.warn('Hibernation toggle not supported for RayJobs');
      return;
    }
    
    setIsToggling(true);
    try {
      const result = await togglePyTorchJobHibernation(job as PyTorchJobKind);
      if (result.success) {
        // Update status optimistically based on current state
        const newStatus = isPaused ? PyTorchJobState.RUNNING : PyTorchJobState.PAUSED;
        const jobId = job.metadata.uid || job.metadata.name;
        onStatusUpdate?.(jobId, newStatus);
      } else {
        console.error('Failed to toggle hibernation:', result.error);
        //Show error notification
        notification.error(
          'Failed to toggle hibernation',
          result.error || 'Unknown error occurred',
        );
      }
    } catch (error) {
      console.error('Error toggling hibernation:', error);
      //Show error notification
      notification.error(
        'Failed to toggle hibernation',
        error instanceof Error ? error.message : 'Unknown error occurred',
      );
    } finally {
      setIsToggling(false);
      setHibernationModalOpen(false);
    }
  };

  const handleScaleWorkers = async (newWorkerCount: number) => {
    // Skip for non-PyTorch jobs
    if (job.kind !== 'PyTorchJob') {
      console.warn('Scaling not supported for this job type');
      return;
    }
    
    setIsScaling(true);
    const previousWorkerCount = workerReplicas;
    try {
      // Scale workers and ensure job stays paused
      const { updatedJob, pauseResult } = await scaleWorkersAndStayPaused(job as PyTorchJobKind, newWorkerCount);

      if (!pauseResult.success) {
        throw new Error(pauseResult.error || 'Failed to keep job paused after scaling');
      }

      const jobId = job.metadata.uid || job.metadata.name;
      onJobUpdate?.(jobId, updatedJob);

      // Show success notification
      const resourceDelta = newWorkerCount - previousWorkerCount;
      const pytorchJob = job as PyTorchJobKind;
      const masterCount = pytorchJob.spec.pytorchReplicaSpecs.Master?.replicas || 0;
      const totalNodes = newWorkerCount + masterCount;
      const deltaText =
        resourceDelta > 0
          ? `Scaled up by +${resourceDelta} worker${resourceDelta !== 1 ? 's' : ''}`
          : `Scaled down by ${resourceDelta} worker${Math.abs(resourceDelta) !== 1 ? 's' : ''}`;

      notification.success(
        'Workers scaled successfully',
        `${displayName} now has ${newWorkerCount} worker${
          newWorkerCount !== 1 ? 's' : ''
        } (${totalNodes} total nodes). ${deltaText}. Job ${
          isPaused ? 'remains paused' : 'has been paused'
        }.`,
      );
    } catch (error) {
      console.error('Error scaling workers:', error);
      notification.error(
        'Failed to scale workers',
        error instanceof Error ? error.message : 'Unknown error occurred',
      );
      throw error; // Re-throw to let modal handle the error
    } finally {
      setIsScaling(false);
    }
  };

  const handleScaleWorkersAndResume = async (newWorkerCount: number) => {
    setIsScaling(true);
    const previousWorkerCount = workerReplicas;
    try {
      // Scale workers and resume in one operation
      const { updatedJob, hibernationResult } = await scaleWorkersAndResume(job as PyTorchJobKind, newWorkerCount);

      if (!hibernationResult.success) {
        throw new Error(hibernationResult.error || 'Failed to resume job after scaling');
      }

      // Update both job and status
      const jobId = job.metadata.uid || job.metadata.name;
      onJobUpdate?.(jobId, updatedJob);
      onStatusUpdate?.(jobId, PyTorchJobState.RUNNING);

      // Show success notification
      const resourceDelta = newWorkerCount - previousWorkerCount;
      const pytorchJob = job as PyTorchJobKind;
      const masterCount = pytorchJob.spec.pytorchReplicaSpecs.Master?.replicas || 0;
      const totalNodes = newWorkerCount + masterCount;
      const deltaText =
        resourceDelta > 0
          ? `Scaled up by +${resourceDelta} worker${resourceDelta !== 1 ? 's' : ''}`
          : `Scaled down by ${resourceDelta} worker${Math.abs(resourceDelta) !== 1 ? 's' : ''}`;

      notification.success(
        'Workers scaled and job resumed',
        `${displayName} now has ${newWorkerCount} worker${
          newWorkerCount !== 1 ? 's' : ''
        } (${totalNodes} total nodes). ${deltaText} and training has resumed.`,
      );
    } catch (error) {
      console.error('Error scaling workers and resuming:', error);
      notification.error(
        'Failed to scale workers and resume',
        error instanceof Error ? error.message : 'Unknown error occurred',
      );
      throw error; // Re-throw to let modal handle the error
    } finally {
      setIsScaling(false);
    }
  };

  const handleScaleWorkersOnly = async (newWorkerCount: number) => {
    setIsScaling(true);
    const previousWorkerCount = workerReplicas;
    try {
      // Scale workers and resume in one operation
      const { updatedJob } = await scaleWorkers(job as PyTorchJobKind, newWorkerCount);

      // Update both job and status
      const jobId = job.metadata.uid || job.metadata.name;
      onJobUpdate?.(jobId, updatedJob);
      onStatusUpdate?.(jobId, PyTorchJobState.RUNNING);

      // Show success notification
      const resourceDelta = newWorkerCount - previousWorkerCount;
      const pytorchJob = job as PyTorchJobKind;
      const masterCount = pytorchJob.spec.pytorchReplicaSpecs.Master?.replicas || 0;
      const totalNodes = newWorkerCount + masterCount;
      const deltaText =
        resourceDelta > 0
          ? `Scaled up by +${resourceDelta} worker${resourceDelta !== 1 ? 's' : ''}`
          : `Scaled down by ${resourceDelta} worker${Math.abs(resourceDelta) !== 1 ? 's' : ''}`;

      notification.success(
        'Workers scaled and job resumed',
        `${displayName} now has ${newWorkerCount} worker${
          newWorkerCount !== 1 ? 's' : ''
        } (${totalNodes} total nodes). ${deltaText} and training has resumed.`,
      );
    } catch (error) {
      console.error('Error scaling workers and resuming:', error);
      notification.error(
        'Failed to scale workers and resume',
        error instanceof Error ? error.message : 'Unknown error occurred',
      );
      throw error; // Re-throw to let modal handle the error
    } finally {
      setIsScaling(false);
    }
  };

  // Build kebab menu actions with enhanced scaling option
  const actions = React.useMemo(() => {
    const items = [];

    // Add scale workers action (available for multiple states)
    if (canScaleWorkers) {
      items.push({
        title: (
          <Flex
            alignItems={{ default: 'alignItemsCenter' }}
            spaceItems={{ default: 'spaceItemsSm' }}
          >
            <FlexItem>
              <Icon size="sm">
                <EditIcon />
              </Icon>
            </FlexItem>
            <FlexItem>Scale Workers</FlexItem>
          </Flex>
        ),
        onClick: () => setScaleWorkersModalOpen(true),
      });
    }

    // Add suspend/resume for RayJobs (greyed out) - show for all states to communicate it's coming
    if (job.kind === 'RayJob') {
      items.push({
        title: isPaused ? 'Resume' : 'Suspend',
        onClick: () => {}, // No-op
        isDisabled: true,
        tooltipProps: {
          content: 'Suspend/Resume for RayJobs is coming soon',
        },
      });
    }

    // Add delete action
    items.push({
      title: 'Delete',
      onClick: () => onDelete(job),
    });

    return items;
  }, [
    status,
    isPaused,
    isPreempted,
    isQueued,
    isRunning,
    isPending,
    isTerminalState,
    canScaleWorkers,
    job,
    onDelete,
  ]);

  return (
    <>
      <Tr>
        <Td dataLabel="Name">
          <ResourceNameTooltip resource={job}>
            <Link to={`/jobs/${job.metadata.namespace}/${job.metadata.name}`}>
              {displayName}
            </Link>
          </ResourceNameTooltip>
        </Td>

        <Td dataLabel="Type">
          <TrainingJobType job={job} />
        </Td>

        <Td dataLabel="Project">
          <TrainingJobProject trainingJob={job} />
        </Td>

        <Td dataLabel="Nodes">
          <Flex
            alignItems={{ default: 'alignItemsCenter' }}
            spaceItems={{ default: 'spaceItemsSm' }}
          >
            <FlexItem>
              <Flex
                alignItems={{ default: 'alignItemsCenter' }}
                spaceItems={{ default: 'spaceItemsXs' }}
              >
                <FlexItem style={{ color: hasGPU ? '#9C27B0' : '#0066CC', display: 'flex', alignItems: 'center' }}>
                  {hasGPU ? <CubesIcon /> : <CpuIcon />}
                </FlexItem>
                <FlexItem>{nodesCount}</FlexItem>
              </Flex>
            </FlexItem>

            {/* Show scaling hint when scaling is available */}
            {(isNotPaused || canScaleWorkers) && (
              <FlexItem>
                <Tooltip content="Click to scale worker replicas">
                  <Button
                    variant="link"
                    isInline
                    onClick={() => setScaleWorkersModalOpen(true)}
                    className="pf-u-p-0 pf-u-color-200"
                    aria-label="Scale workers"
                  >
                    <Icon size="sm" className="pf-u-color-100">
                      <EditIcon />
                    </Icon>
                  </Button>
                </Tooltip>
              </FlexItem>
            )}
          </Flex>
        </Td>
        <Td dataLabel="Cluster queue">
          <TrainingJobClusterQueue
            localQueueName={localQueueName}
            namespace={job.metadata.namespace}
          />
        </Td>
        <Td dataLabel="Created">
          {job.metadata.creationTimestamp ? (
            <Timestamp
              date={new Date(job.metadata.creationTimestamp)}
              tooltip={{
                variant: TimestampTooltipVariant.default,
              }}
            >
              {relativeTime(Date.now(), new Date(job.metadata.creationTimestamp).getTime())}
            </Timestamp>
          ) : (
            'Unknown'
          )}
        </Td>
        <Td dataLabel="Status">
          <TrainingJobStatus job={job} jobStatus={jobStatus} />
        </Td>
        <Td>
          {(isRunning || isPaused) && isPyTorchJob && (
            <StateActionToggle
              isPaused={isPaused}
              onPause={() => setHibernationModalOpen(true)}
              onResume={() => setHibernationModalOpen(true)}
              isLoading={isToggling}
            />
          )}
          {(isRunning || isPaused) && !isPyTorchJob && (
            <Tooltip content="Suspend/Resume for RayJobs is coming soon">
              <span style={{ color: 'var(--pf-v5-global--disabled-color--100)' }}>
                Coming soon
              </span>
            </Tooltip>
          )}
        </Td>
        <Td isActionCell>
          <ActionsColumn items={actions} />
        </Td>
      </Tr>

      <HibernationToggleModal
        job={hibernationModalOpen ? job : undefined}
        isPaused={isPaused}
        isToggling={isToggling}
        onClose={() => setHibernationModalOpen(false)}
        onConfirm={handleHibernationToggle}
      />

      {scaleWorkersModalOpen && isPyTorchJob && (
        <ScaleWorkersModal
          job={job as PyTorchJobKind}
          jobStatus={status as PyTorchJobState}
          isNotPaused={isNotPaused}
          isOpen
          onClose={() => setScaleWorkersModalOpen(false)}
          onConfirm={handleScaleWorkers}
          onConfirmOnly={handleScaleWorkersOnly}
          onConfirmAndResume={handleScaleWorkersAndResume}
          isLoading={isScaling}
        />
      )}
    </>
  );
};

export default TrainingJobTableRow;
