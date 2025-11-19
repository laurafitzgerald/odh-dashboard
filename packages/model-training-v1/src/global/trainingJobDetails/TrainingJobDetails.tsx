import * as React from 'react';
import {
  Breadcrumb,
  BreadcrumbItem,
  Spinner,
  Bullseye,
  EmptyState,
  EmptyStateBody,
  EmptyStateFooter,
  EmptyStateActions,
  Button,
} from '@patternfly/react-core';
import { ExclamationCircleIcon } from '@patternfly/react-icons';
import { Link, useParams, useNavigate } from 'react-router-dom';
import ApplicationsPage from '@odh-dashboard/internal/pages/ApplicationsPage';
import TrainingJobDetailsTabs from './TrainingJobDetailsTabs';
import { useModelTrainingContext } from '../ModelTrainingContext';
import { PyTorchJobKind } from '../../k8sTypes';

const ErrorContent: React.FC<{ error: Error }> = ({ error }) => {
  const navigate = useNavigate();
  const { namespace } = useParams<{ namespace: string }>();
  return (
    <Bullseye>
      <EmptyState
        headingLevel="h4"
        icon={ExclamationCircleIcon}
        titleText="Unable to load job details"
      >
        <EmptyStateBody>{error.message}</EmptyStateBody>
        <EmptyStateFooter>
          <EmptyStateActions>
            <Button variant="primary" onClick={() => navigate(`/jobs/${namespace ?? ''}`)}>
              Return to jobs
            </Button>
          </EmptyStateActions>
        </EmptyStateFooter>
      </EmptyState>
    </Bullseye>
  );
};

const TrainingJobDetails: React.FC = () => {
  const { namespace, jobName } = useParams<{ namespace: string; jobName: string }>();
  const navigate = useNavigate();
  const { pytorchJobs, rayJobs } = useModelTrainingContext();
  const [pytorchJobData, pytorchJobLoaded, pytorchJobLoadError] = pytorchJobs;
  const [rayJobData, rayJobLoaded, rayJobLoadError] = rayJobs;

  // Find the specific job from PyTorchJobs or RayJobs
  const job = React.useMemo(() => {
    const pytorchJob = pytorchJobData.find((j: PyTorchJobKind) => j.metadata.name === jobName);
    if (pytorchJob) return pytorchJob;
    
    const rayJob = rayJobData.find((j) => j.metadata.name === jobName);
    return rayJob;
  }, [pytorchJobData, rayJobData, jobName]);

  const allJobsLoaded = pytorchJobLoaded && rayJobLoaded;
  const loadError = pytorchJobLoadError || rayJobLoadError;

  // Handle load errors
  if (loadError) {
    return <ErrorContent error={loadError} />;
  }

  if (!allJobsLoaded) {
    return (
      <Bullseye>
        <Spinner />
      </Bullseye>
    );
  }

  // Handle job not found
  if (!job) {
    return (
      <ErrorContent
        error={new Error(`Job "${jobName}" not found in namespace "${namespace}".`)}
      />
    );
  }

  const displayName =
    job.metadata.annotations?.['opendatahub.io/display-name'] || job.metadata.name;

  const jobTypeLabel = job.kind === 'RayJob' ? 'Ray' : job.kind === 'PyTorchJob' ? 'PyTorch' : 'Job';

  return (
    <ApplicationsPage
      empty={false}
      title={displayName}
      description={`${jobTypeLabel} job in ${namespace ?? ''}`}
      loaded={allJobsLoaded}
      provideChildrenPadding
      breadcrumb={
        <Breadcrumb>
          <BreadcrumbItem
            render={() => <Link to={`/jobs/${namespace ?? ''}`}>Jobs</Link>}
          />
          <BreadcrumbItem isActive>{displayName}</BreadcrumbItem>
        </Breadcrumb>
      }
    >
      <TrainingJobDetailsTabs job={job} />
    </ApplicationsPage>
  );
};

export default TrainingJobDetails;
