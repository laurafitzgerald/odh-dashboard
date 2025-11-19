import * as React from 'react';
import { PodKind } from '@odh-dashboard/internal/k8sTypes';
import { getPodContainers } from '@odh-dashboard/internal/concepts/k8s/pods/utils';

export type PodContainer = {
  name: string;
  isInitContainer?: boolean;
};

export type PodStatus = {
  podInitializing?: boolean;
};

const useTrainJobPodContainerLogState = (
  pod: PodKind | null,
) => {
  const [selectedContainer, setSelectedContainer] = React.useState<PodContainer | null>(null);

  // Extract containers and init containers from pod spec using existing utility
  const podContainers: PodContainer[] = React.useMemo(() => {
    const { containers, initContainers } = getPodContainers(pod);
    const allContainers: PodContainer[] = [];
    
    // Add init containers first
    initContainers.forEach((container) => {
      allContainers.push({
        name: container.name,
        isInitContainer: true,
      });
    });
    
    // Add regular containers
    containers.forEach((container) => {
      allContainers.push({
        name: container.name,
        isInitContainer: false,
      });
    });
    
    return allContainers;
  }, [pod]);

  // Fallback container name based on pod name pattern
  const getContainerNameFromPodName = (podName: string): string => {
    if (podName.includes('dataset-initializer')) {
      return 'dataset-initializer';
    } else if (podName.includes('model-initializer')) {
      return 'model-initializer';
    } else if (podName.includes('node-')) {
      return 'node';
    }
    return 'main'; // fallback
  };

  // Default container name (first container or fallback based on pod name)
  const defaultContainerName = React.useMemo(() => {
    if (podContainers.length > 0) {
      return podContainers[0].name;
    }
    if (pod?.metadata.name) {
      return getContainerNameFromPodName(pod.metadata.name);
    }
    return '';
  }, [podContainers, pod?.metadata.name]);

  // Set default selected container (prefer regular containers over init containers)
  React.useEffect(() => {
    if (podContainers.length > 0) {
      // Find first regular container, fallback to first container
      const regularContainer = podContainers.find(c => !c.isInitContainer);
      setSelectedContainer(regularContainer || podContainers[0]);
    } else if (pod?.metadata.name && defaultContainerName) {
      // Create a fallback container object
      setSelectedContainer({ name: defaultContainerName, isInitContainer: false });
    }
  }, [podContainers, pod?.metadata.name, defaultContainerName]);

  // Pod status
  const podStatus: PodStatus = React.useMemo(() => {
    const phase = pod?.status?.phase;
    return {
      podInitializing: phase === 'Pending' || phase === 'ContainerCreating',
    };
  }, [pod]);

  return {
    pod,
    podLoaded: !!pod,
    podStatus,
    podError: null, // We'll handle errors in the parent component
    podContainers,
    selectedContainer,
    defaultContainerName,
    setSelectedContainer,
  };
};

export default useTrainJobPodContainerLogState;
