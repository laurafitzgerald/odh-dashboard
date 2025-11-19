import * as React from 'react';
import useFetchState, { FetchState, NotReadyError } from '@odh-dashboard/internal/utilities/useFetchState';
import { getPodContainerLogText } from '../../api';

const LOG_REFRESH_RATE = 5000; // 5 seconds
const LOG_TAIL_LINES = 10000; // Increased to get more logs

const useTrainJobFetchLogs = (
  namespace: string,
  podName: string,
  containerName: string,
  activelyRefresh?: boolean,
  tail?: number,
): FetchState<string> => {
  const callback = React.useCallback(() => {
    if (!podName || !containerName || !namespace) {
      return Promise.reject(new NotReadyError('Not enough information to fetch from pod'));
    }

    return getPodContainerLogText(namespace, podName, containerName, tail || LOG_TAIL_LINES);
  }, [podName, containerName, namespace, tail]);

  return useFetchState(callback, '', {
    refreshRate: activelyRefresh ? LOG_REFRESH_RATE : 0,
    initialPromisePurity: true,
  });
};

export default useTrainJobFetchLogs;
