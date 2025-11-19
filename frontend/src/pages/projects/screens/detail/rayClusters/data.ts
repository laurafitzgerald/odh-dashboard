import { SortableData } from '#~/components/table';
import { getDisplayNameFromK8sResource } from '#~/concepts/k8s/utils';
import { RayClusterKind } from '#~/k8sTypes';

export const columns: SortableData<RayClusterKind>[] = [
  {
    field: 'name',
    label: 'Name',
    width: 25,
    sortable: (a, b) =>
      getDisplayNameFromK8sResource(a).localeCompare(getDisplayNameFromK8sResource(b)),
  },
  {
    field: 'status',
    label: 'Status',
    width: 15,
    sortable: (a, b) => (a.status?.state || '').localeCompare(b.status?.state || ''),
  },
  {
    field: 'kueueStatus',
    label: 'Kueue status',
    width: 15,
    sortable: false,
  },
  {
    field: 'workerNodes',
    label: 'Worker nodes',
    width: 15,
    sortable: (a, b) =>
      (a.status?.availableWorkerReplicas || 0) - (b.status?.availableWorkerReplicas || 0),
  },
  {
    field: 'rayDashboard',
    label: 'Ray dashboard',
    width: 20,
    sortable: false,
  },
  {
    field: 'kebab',
    label: '',
    sortable: false,
  },
];
