import React from 'react';
import { Skeleton, Tooltip } from '@patternfly/react-core';
import useClusterQueueFromLocalQueue from '../../hooks/useClusterQueueFromLocalQueue';
import useClusterQueueDetails from '../../hooks/useClusterQueueDetails';
import ClusterQueueResourceTooltip from './ClusterQueueResourceTooltip';

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

  const { clusterQueue, loaded: clusterQueueDetailsLoaded } = useClusterQueueDetails(
    clusterQueueName || undefined,
  );

  if (!clusterQueueLoaded) {
    return <Skeleton width="100px" />;
  }

  const clusterQueueDisplayName = clusterQueueName || '-';

  // If we have cluster queue details, show tooltip with resource information
  if (clusterQueueDetailsLoaded && clusterQueue && clusterQueueName) {
    return (
      <Tooltip
        content={<ClusterQueueResourceTooltip clusterQueue={clusterQueue} />}
        position="top"
        maxWidth="420px"
      >
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '2px 6px',
            borderRadius: '4px',
            transition: 'all 0.2s ease',
            backgroundColor: 'transparent',
            cursor: 'pointer',
            textDecoration: 'underline dotted',
            textDecorationColor: 'var(--pf-v5-global--link--Color)',
            color: 'var(--pf-v5-global--link--Color)',
            fontSize: '14px',
            fontWeight: '500',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--pf-v5-global--BackgroundColor--200)';
            e.currentTarget.style.textDecoration = 'underline solid';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.textDecoration = 'underline dotted';
          }}
        >
          {clusterQueueDisplayName}
        </div>
      </Tooltip>
    );
  }

  // Fallback to plain text if no details available
  return <>{clusterQueueDisplayName}</>;
};

export default TrainingJobClusterQueue;
