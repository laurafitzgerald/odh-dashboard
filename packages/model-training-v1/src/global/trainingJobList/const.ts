import { SortableData } from '@odh-dashboard/internal/components/table/index';
import { getTrainingJobStatusSync, TrainingJob, getJobStatus } from './utils';
import { PyTorchJobKind } from '../../k8sTypes';

export const columns: SortableData<TrainingJob>[] = [
  {
    field: 'name',
    label: 'Name',
    width: 15,
    sortable: (a: TrainingJob, b: TrainingJob): number =>
      (a.metadata.annotations?.['opendatahub.io/display-name'] || a.metadata.name).localeCompare(
        b.metadata.annotations?.['opendatahub.io/display-name'] || b.metadata.name,
      ),
  },
  {
    field: 'type',
    label: 'Type',
    width: 10,
    sortable: (a: TrainingJob, b: TrainingJob): number =>
      (a.kind || '').localeCompare(b.kind || ''),
  },
  {
    field: 'project',
    label: 'Project',
    width: 15,
    sortable: (a: TrainingJob, b: TrainingJob): number =>
      a.metadata.namespace.localeCompare(b.metadata.namespace),
  },
  {
    field: 'nodes',
    label: 'Nodes',
    width: 15,
    sortable: (a: TrainingJob, b: TrainingJob): number => {
      const getNodes = (job: TrainingJob): number => {
        if (job.kind === 'PyTorchJob') {
          const pytorchJob = job as PyTorchJobKind;
          return (pytorchJob.spec.pytorchReplicaSpecs.Worker?.replicas || 0) +
                 (pytorchJob.spec.pytorchReplicaSpecs.Master?.replicas || 0);
        } else if (job.kind === 'RayJob') {
          const rayJob = job as any;
          const workerGroups = rayJob.spec.rayClusterSpec?.workerGroupSpecs || [];
          const totalWorkers = workerGroups.reduce((sum: number, group: any) => sum + (group.replicas || 0), 0);
          return totalWorkers + 1; // +1 for head node
        }
        return 0;
      };
      
      return getNodes(a) - getNodes(b);
    },
    info: {
      popoverProps: { hasAutoWidth: true },
      popover: 'Total number of nodes',
    },
  },
  {
    field: 'clusterQueue',
    label: 'Cluster queue',
    width: 10,
    sortable: (a: TrainingJob, b: TrainingJob): number => {
      const aQueue = a.metadata.labels?.['kueue.x-k8s.io/queue-name'] || '';
      const bQueue = b.metadata.labels?.['kueue.x-k8s.io/queue-name'] || '';
      return aQueue.localeCompare(bQueue);
    },
  },
  {
    field: 'created',
    label: 'Created',
    width: 15,
    sortable: (a: TrainingJob, b: TrainingJob): number => {
      const first = a.metadata.creationTimestamp;
      const second = b.metadata.creationTimestamp;
      return new Date(first ?? 0).getTime() - new Date(second ?? 0).getTime();
    },
  },
  {
    field: 'status',
    label: 'Status',
    width: 15,
    sortable: (a: TrainingJob, b: TrainingJob): number => {
      const aState = getJobStatus(a);
      const bState = getJobStatus(b);
      return aState.localeCompare(bState);
    },
  },
  {
    field: 'kebab',
    label: '',
    sortable: false,
  },
];

export enum TrainingJobToolbarFilterOptions {
  name = 'Name',
  clusterQueue = 'Cluster queue',
  status = 'Status',
}

export const TrainingJobFilterOptions = {
  [TrainingJobToolbarFilterOptions.name]: 'Name',
  [TrainingJobToolbarFilterOptions.clusterQueue]: 'Cluster queue',
  [TrainingJobToolbarFilterOptions.status]: 'Status',
};

export type TrainingJobFilterDataType = Record<TrainingJobToolbarFilterOptions, string | undefined>;

export const initialTrainingJobFilterData: TrainingJobFilterDataType = {
  [TrainingJobToolbarFilterOptions.name]: '',
  [TrainingJobToolbarFilterOptions.clusterQueue]: '',
  [TrainingJobToolbarFilterOptions.status]: '',
};
