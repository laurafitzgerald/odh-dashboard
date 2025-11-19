import React from 'react';
import { Skeleton } from '@patternfly/react-core';
import useClusterQueueFromLocalQueue from '../../hooks/useClusterQueueFromLocalQueue';

type TrainingJobClusterQueueProps = {
  localQueueName?: string;
  namespace: string;
};

const TrainingJobClusterQueue: React.FC<TrainingJobClusterQueueProps> = ({
  localQueueName,
  namespace,
}) => {
  // If no local queue name is present, the job is not using Kueue
  if (!localQueueName) {
    return <span style={{ color: 'var(--pf-v5-global--Color--200)' }}>N/A</span>;
  }

  const { clusterQueueName, loaded: clusterQueueLoaded } = useClusterQueueFromLocalQueue(
    localQueueName,
    namespace,
  );

  if (!clusterQueueLoaded) {
    return <Skeleton width="100px" />;
  }

  return <>{clusterQueueName || '-'}</>;
};

export default TrainingJobClusterQueue;
