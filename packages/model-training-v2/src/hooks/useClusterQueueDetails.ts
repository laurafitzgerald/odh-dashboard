import * as React from 'react';
import { ClusterQueueKind } from '@odh-dashboard/internal/k8sTypes';
import { listClusterQueues } from '@odh-dashboard/internal/api/k8s/clusterQueues';
import { NotReadyError } from '@odh-dashboard/internal/utilities/useFetchState';
import useFetch from '@odh-dashboard/internal/utilities/useFetch';

type UseClusterQueueDetailsResult = {
  clusterQueue: ClusterQueueKind | null;
  loaded: boolean;
  error: Error | undefined;
};

/**
 * Hook to get cluster queue details by name
 * @param clusterQueueName - The name of the cluster queue
 * @returns Object containing cluster queue details, loading state, and error
 */
const useClusterQueueDetails = (
  clusterQueueName?: string,
): UseClusterQueueDetailsResult => {
  const {
    data: clusterQueues,
    loaded: clusterQueuesLoaded,
    error: clusterQueuesError,
  } = useFetch<ClusterQueueKind[]>(
    React.useCallback(() => {
      if (!clusterQueueName) {
        return Promise.reject(new NotReadyError('Missing cluster queue name'));
      }
      return listClusterQueues();
    }, [clusterQueueName]),
    [],
    { initialPromisePurity: true },
  );

  const clusterQueue = React.useMemo(() => {
    if (!clusterQueuesLoaded || !clusterQueueName) {
      return null;
    }

    const matchingClusterQueue = clusterQueues.find(
      (cq) => cq.metadata?.name === clusterQueueName
    );

    return matchingClusterQueue || null;
  }, [clusterQueues, clusterQueuesLoaded, clusterQueueName]);

  return {
    clusterQueue,
    loaded: clusterQueuesLoaded,
    error: clusterQueuesError,
  };
};

export default useClusterQueueDetails;
