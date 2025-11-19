import React from 'react';
import { Label, Skeleton } from '@patternfly/react-core';
import { getJobStatus, getStatusInfo, TrainingJob } from '../utils';
import { TrainingJobState } from '../../../types';

const TrainingJobStatus = ({
  job,
  jobStatus,
}: {
  job: TrainingJob;
  jobStatus?: TrainingJobState;
}): React.ReactElement => {
  const status = jobStatus || getJobStatus(job);
  const isLoadingStatus = jobStatus === undefined;
  const isRunning = status === 'Running';

  if (isLoadingStatus) {
    return <Skeleton height="24px" width="80px" />;
  }

  const statusInfo = getStatusInfo(status);

  return (
    <Label
      isCompact
      status={statusInfo.status}
      color={statusInfo.color}
      icon={<statusInfo.IconComponent />}
      data-testid="training-job-status"
    >
      {statusInfo.label}
    </Label>
  );
};

export default TrainingJobStatus;
