import * as React from 'react';
import { Breadcrumb, BreadcrumbItem, Spinner, Bullseye } from '@patternfly/react-core';
import { Link, useParams } from 'react-router-dom';
import ApplicationsPage from '@odh-dashboard/internal/pages/ApplicationsPage';
import TrainingJobDetailsTabs from './TrainingJobDetailsTabs';
import TrainJobDetailsLayout from './TrainJobDetailsLayout';
import { useModelTrainingContext } from '../ModelTrainingContext';
import { PyTorchJobKind, TrainJobKind } from '../../k8sTypes';
import { TrainingJob } from '../trainingJobList/utils';

const TrainingJobDetails: React.FC = () => {
  const { namespace, jobName } = useParams<{ namespace: string; jobName: string }>();
  const { pytorchJobs, trainJobs, rayJobs } = useModelTrainingContext();
  const [pytorchJobData, pytorchJobLoaded, pytorchJobLoadError] = pytorchJobs;
  const [trainJobData, trainJobLoaded, trainJobLoadError] = trainJobs;
  const [rayJobData, rayJobLoaded, rayJobLoadError] = rayJobs;

  // Find the specific job from PyTorchJobs, TrainJobs, and RayJobs
  const job: TrainingJob | undefined = React.useMemo(() => {
    // First check PyTorchJobs
    const pytorchJob = pytorchJobData.find((j: PyTorchJobKind) => j.metadata.name === jobName);
    if (pytorchJob) return pytorchJob;
    
    // Then check TrainJobs
    const trainJob = trainJobData.find((j: TrainJobKind) => j.metadata.name === jobName);
    if (trainJob) return trainJob;
    
    // Finally check RayJobs
    const rayJob = rayJobData.find((j) => j.metadata.name === jobName);
    return rayJob;
  }, [pytorchJobData, trainJobData, rayJobData, jobName]);

  const allJobsLoaded = pytorchJobLoaded && trainJobLoaded && rayJobLoaded;
  const loadError = pytorchJobLoadError || trainJobLoadError || rayJobLoadError;

  if (!allJobsLoaded) {
    return (
      <Bullseye>
        <Spinner />
      </Bullseye>
    );
  }

  if (!job) {
    return (
      <ApplicationsPage
        empty
        emptyStatePage={
          <div>
            <h1>Training job not found</h1>
            <p>
              The training job &quot;{jobName}&quot; was not found in namespace &quot;{namespace}
              &quot;.
            </p>
          </div>
        }
        title="Training job not found"
        loaded={allJobsLoaded}
        loadError={loadError}
      />
    );
  }

  const displayName =
    job.metadata.annotations?.['opendatahub.io/display-name'] || job.metadata.name;

  const jobTypeDescription = job.kind === 'PyTorchJob' ? 'PyTorch' : 'TrainJob';

  return (
    <ApplicationsPage
      empty={false}
      title={displayName}
      description={`${jobTypeDescription} training job in ${namespace ?? ''}`}
      loadError={loadError}
      loaded={allJobsLoaded}
      provideChildrenPadding
      breadcrumb={
        <Breadcrumb>
          <BreadcrumbItem
            render={() => <Link to={`/modelTraining/${namespace ?? ''}`}>Model training</Link>}
          />
          <BreadcrumbItem isActive>{displayName}</BreadcrumbItem>
        </Breadcrumb>
      }
    >
      {job.kind === 'PyTorchJob' ? (
        <TrainingJobDetailsTabs job={job as PyTorchJobKind} />
      ) : (
        <TrainJobDetailsLayout job={job as TrainJobKind} />
      )}
    </ApplicationsPage>
  );
};

export default TrainingJobDetails;
