import * as React from 'react';
import { PodContainer } from '@odh-dashboard/internal/types';
import usePod from '@odh-dashboard/internal/concepts/k8s/pods/usePod';
import usePodsByJobName from './usePodsByJobName';
import { getPodContainers } from '@odh-dashboard/internal/concepts/k8s/pods/utils';
import { PodContainerStatus, PodKind } from '@odh-dashboard/internal/k8sTypes';
import {
  checkPodContainersStatus,
  PodStatus,
} from '@odh-dashboard/internal/concepts/pipelines/content/pipelinesDetails/pipelineRun/utils';

const useTrainingJobPodContainerLogState = (
  namespace: string,
  podName: string,
  jobKind?: string,
  jobName?: string,
): {
  pod: PodKind | null;
  podLoaded: boolean;
  podError: Error | undefined;
  podStatus: PodStatus | null;
  podContainers: PodContainer[];
  podContainerStatuses: PodContainerStatus[];
  selectedContainer: PodContainer | null;
  defaultContainerName: string | undefined;
  setSelectedContainer: (podContainer: PodContainer | null) => void;
} => {
  // For RayJobs, find pods by label selector instead of pod name
  const useRayJobPods = jobKind === 'RayJob';
  const [podsByLabel, podsByLabelLoaded, podsByLabelError] = usePodsByJobName(
    namespace,
    jobName || '',
    useRayJobPods,
  );
  
  // For PyTorch jobs, use direct pod lookup (pass empty string to skip when using RayJob)
  const [podByName, podByNameLoaded, podByNameError] = usePod(
    namespace,
    useRayJobPods ? '' : podName,
  );
  
  // Select the appropriate pod based on job type
  const pod = useRayJobPods ? (podsByLabel && podsByLabel.length > 0 ? podsByLabel[0] : null) : podByName;
  const podLoaded = useRayJobPods ? podsByLabelLoaded : podByNameLoaded;
  const podError = useRayJobPods ? podsByLabelError : podByNameError;
  
  console.log('[useTrainingJobPodContainerLogState] Job kind:', jobKind);
  console.log('[useTrainingJobPodContainerLogState] useRayJobPods:', useRayJobPods);
  console.log('[useTrainingJobPodContainerLogState] podsByLabel:', podsByLabel?.length, podsByLabel?.[0]?.metadata?.name);
  console.log('[useTrainingJobPodContainerLogState] podByName:', podByName?.metadata?.name);
  console.log('[useTrainingJobPodContainerLogState] Selected pod:', pod?.metadata?.name);
  const { containers: podContainers, containerStatuses: podContainerStatuses } =
    getPodContainers(pod);
  const [selectedContainer, setSelectedContainer] = React.useState<PodContainer | null>(null);
  const defaultContainerName =
    pod?.metadata.annotations?.['kubectl.kubernetes.io/default-container'];

  React.useEffect(() => {
    // Pod name changed value -- our selected container isn't part of this pod
    setSelectedContainer(null);
  }, [podName]);

  const firstPodContainer =
    podContainers.length > 0
      ? podContainers.find((podContainer) => podContainer.name === defaultContainerName) ??
        podContainers[0]
      : undefined;
  React.useEffect(() => {
    if (!selectedContainer && firstPodContainer) {
      setSelectedContainer(firstPodContainer);
    }
  }, [firstPodContainer, selectedContainer]);
  const podStatus = checkPodContainersStatus(pod, selectedContainer);

  return {
    pod,
    podLoaded,
    podStatus,
    podError,
    podContainers,
    podContainerStatuses,
    selectedContainer,
    defaultContainerName,
    setSelectedContainer,
  };
};

export default useTrainingJobPodContainerLogState;
