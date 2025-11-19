import * as React from 'react';
import { Flex, FlexItem, Tooltip } from '@patternfly/react-core';
import { CubeIcon, RocketIcon } from '@patternfly/react-icons';
import { RayIcon } from '@odh-dashboard/internal/images/icons';
import { TrainingJob } from '../utils';

type TrainingJobTypeProps = {
  job: TrainingJob;
};

const TrainingJobType: React.FC<TrainingJobTypeProps> = ({ job }) => {
  const getJobTypeInfo = () => {
    if (job.kind === 'RayJob') {
      return {
        label: 'Ray',
        icon: <RayIcon />,
        color: '#00A3E0',
        tooltip: 'Ray Job - Distributed computing framework',
      };
    } else if (job.kind === 'TrainJob') {
      return {
        label: 'TrainJob',
        icon: <RocketIcon />,
        color: '#8A3FFC',
        tooltip: 'TrainJob - Kubeflow Training Operator v2',
      };
    } else if (job.kind === 'PyTorchJob') {
      return {
        label: 'PyTorch',
        icon: <CubeIcon />,
        color: '#EE4C2C',
        tooltip: 'PyTorch Job - Kubeflow Training Operator',
      };
    }
    return {
      label: job.kind || 'Unknown',
      icon: <CubeIcon />,
      color: '#6A6E73',
      tooltip: 'Training job type',
    };
  };

  const typeInfo = getJobTypeInfo();

  return (
    <Tooltip content={typeInfo.tooltip}>
      <Flex
        alignItems={{ default: 'alignItemsCenter' }}
        spaceItems={{ default: 'spaceItemsXs' }}
        style={{ cursor: 'default' }}
      >
        <FlexItem style={{ color: typeInfo.color, display: 'flex', alignItems: 'center' }}>
          {typeInfo.icon}
        </FlexItem>
        <FlexItem>
          <span style={{ fontWeight: 500 }}>{typeInfo.label}</span>
        </FlexItem>
      </Flex>
    </Tooltip>
  );
};

export default TrainingJobType;


