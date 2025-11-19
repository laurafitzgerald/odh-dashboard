import React from 'react';
import { EmptyStateBody, EmptyStateVariant, EmptyState } from '@patternfly/react-core';
import { SearchIcon } from '@patternfly/react-icons';
import { useNavigate } from 'react-router-dom';
import ApplicationsPage from '@odh-dashboard/internal/pages/ApplicationsPage';
import { ProjectObjectType } from '@odh-dashboard/internal/concepts/design/utils';
import TitleWithIcon from '@odh-dashboard/internal/concepts/design/TitleWithIcon';
import { ModelTrainingContext } from './ModelTrainingContext';
import ModelTrainingLoading from './ModelTrainingLoading';
import TrainingJobListView from './trainingJobList/TrainingJobListView';
import ModelTrainingProjectSelector from '../components/ModelTrainingProjectSelector';

const title = 'Jobs';
const description =
  'View and manage distributed workload jobs across your data science projects. Includes PyTorch, Ray, and other job types.';

const ModelTraining = (): React.ReactElement => {
  const navigate = useNavigate();
  const { pytorchJobs, rayJobs, project, preferredProject, projects } =
    React.useContext(ModelTrainingContext);
  const [pytorchJobData, pytorchJobLoaded, pytorchJobLoadError] = pytorchJobs;
  const [rayJobData, rayJobLoaded, rayJobLoadError] = rayJobs;

  // Combine all jobs
  const allJobs = [...pytorchJobData, ...rayJobData];
  const allJobsLoaded = pytorchJobLoaded && rayJobLoaded;
  const allJobsLoadError = pytorchJobLoadError || rayJobLoadError;

  const emptyState = (
    <EmptyState
      headingLevel="h6"
      icon={SearchIcon}
      titleText="No jobs"
      variant={EmptyStateVariant.lg}
      data-testid="empty-state-title"
    >
      <EmptyStateBody data-testid="empty-state-body">
        No jobs have been found in this project.
      </EmptyStateBody>
    </EmptyState>
  );

  return (
    <ApplicationsPage
      empty={allJobs.length === 0}
      emptyStatePage={emptyState}
      title={<TitleWithIcon title={title} objectType={ProjectObjectType.modelCustomization} />}
      description={description}
      loadError={allJobsLoadError}
      loaded={allJobsLoaded}
      headerContent={
        <ModelTrainingProjectSelector getRedirectPath={(ns: string) => `/jobs/${ns}`} />
      }
      provideChildrenPadding
      loadingContent={
        project ? undefined : (
          <ModelTrainingLoading
            title="Loading"
            description="Retrieving jobs from all projects in the cluster. This can take a few minutes."
            onCancel={() => {
              const redirectProject = preferredProject ?? projects?.[0];
              if (redirectProject) {
                navigate(`/jobs/${redirectProject.metadata.name}`);
              }
            }}
          />
        )
      }
    >
      <TrainingJobListView trainingJobs={allJobs} />
    </ApplicationsPage>
  );
};

export default ModelTraining;
