import * as React from 'react';
import { getDisplayNameFromK8sResource } from '@odh-dashboard/internal/concepts/k8s/utils';
import TrainingJobTable from './TrainingJobTable';
import TrainingJobToolbar from './TrainingJobToolbar';
import { initialTrainingJobFilterData, TrainingJobFilterDataType } from './const';
import { getJobStatus, getJobStatusWithHibernationGeneric, TrainingJob } from './utils';
import { TrainingJobState } from '../../types';

type TrainingJobListViewProps = {
  trainingJobs: TrainingJob[];
};

const TrainingJobListView: React.FC<TrainingJobListViewProps> = ({
  trainingJobs: unfilteredTrainingJobs,
}) => {
  const [filterData, setFilterData] = React.useState<TrainingJobFilterDataType>(
    initialTrainingJobFilterData,
  );
  const [jobStatuses, setJobStatuses] = React.useState<Map<string, TrainingJobState>>(new Map());

  // Update job statuses with hibernation check for all jobs
  const updateStatuses = React.useCallback(async () => {
    if (unfilteredTrainingJobs.length === 0) {
      setJobStatuses(new Map());
      return;
    }

    const statusMap = new Map<string, TrainingJobState>();

    const statusPromises = unfilteredTrainingJobs.map(async (job) => {
      try {
        const status = await getJobStatusWithHibernationGeneric(job);
        return { jobId: job.metadata.uid || job.metadata.name, status };
      } catch {
        return {
          jobId: job.metadata.uid || job.metadata.name,
          status: getJobStatus(job),
        };
      }
    });

    const results = await Promise.all(statusPromises);
    results.forEach(({ jobId, status }) => {
      statusMap.set(jobId, status);
    });

    setJobStatuses(statusMap);
  }, [unfilteredTrainingJobs]);

  // Initial status update when jobs change
  React.useEffect(() => {
    updateStatuses();
  }, [updateStatuses]);

  // Periodic status refresh for active jobs
  React.useEffect(() => {
    // Only set up polling if there are jobs
    if (unfilteredTrainingJobs.length === 0) {
      return;
    }

    // Check if there are any non-terminal jobs that need status updates
    const hasActiveJobs = unfilteredTrainingJobs.some((job) => {
      const currentStatus = jobStatuses.get(job.metadata.uid || job.metadata.name);
      return currentStatus && !['Complete', 'Succeeded', 'Failed', 'Suspended'].includes(currentStatus);
    });

    if (!hasActiveJobs) {
      return;
    }

    // Refresh status every 10 seconds for active jobs
    const interval = setInterval(() => {
      updateStatuses();
    }, 10000);

    return () => clearInterval(interval);
  }, [unfilteredTrainingJobs, jobStatuses, updateStatuses]);

  const onClearFilters = React.useCallback(
    () => setFilterData(initialTrainingJobFilterData),
    [setFilterData],
  );

  // Handle status updates from hibernation toggle
  const handleStatusUpdate = React.useCallback((jobId: string, newStatus: TrainingJobState) => {
    setJobStatuses((prev) => {
      const updated = new Map(prev);
      updated.set(jobId, newStatus);
      return updated;
    });
  }, []);

  const filteredTrainingJobs = React.useMemo(
    () =>
      unfilteredTrainingJobs.filter((job) => {
        const nameFilter = filterData.Name?.toLowerCase();
        const statusFilter = filterData.Status?.toLowerCase();
        const clusterQueueFilter = filterData['Cluster queue']?.toLowerCase();

        if (nameFilter && !getDisplayNameFromK8sResource(job).toLowerCase().includes(nameFilter)) {
          return false;
        }

        if (statusFilter) {
          const jobId = job.metadata.uid || job.metadata.name;
          const jobStatus = jobStatuses.get(jobId) || getJobStatus(job);
          if (!jobStatus.toLowerCase().includes(statusFilter)) {
            return false;
          }
        }

        if (
          clusterQueueFilter &&
          !(job.metadata.labels?.['kueue.x-k8s.io/queue-name'] || '')
            .toLowerCase()
            .includes(clusterQueueFilter)
        ) {
          return false;
        }

        return true;
      }),
    [filterData, unfilteredTrainingJobs, jobStatuses],
  );

  const onFilterUpdate = React.useCallback(
    (key: string, value: string | { label: string; value: string } | undefined) =>
      setFilterData((prevValues) => ({ ...prevValues, [key]: value })),
    [setFilterData],
  );

  return (
    <TrainingJobTable
      trainingJobs={filteredTrainingJobs}
      jobStatuses={jobStatuses}
      onStatusUpdate={handleStatusUpdate}
      onClearFilters={onClearFilters}
      clearFilters={Object.values(filterData).some((value) => !!value) ? onClearFilters : undefined}
      toolbarContent={
        <TrainingJobToolbar filterData={filterData} onFilterUpdate={onFilterUpdate} />
      }
    />
  );
};

export default TrainingJobListView;
