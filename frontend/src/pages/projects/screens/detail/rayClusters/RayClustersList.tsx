import * as React from 'react';
import { ProjectSectionID } from '#~/pages/projects/screens/detail/types';
import { ProjectSectionTitles } from '#~/pages/projects/screens/detail/const';
import { ProjectDetailsContext } from '#~/pages/projects/ProjectDetailsContext';
import DetailsSection from '#~/pages/projects/screens/detail/DetailsSection';
import EmptyDetailsView from '#~/components/EmptyDetailsView';
import { ProjectObjectType, typedEmptyImage } from '#~/concepts/design/utils';
import useWorkloads from '#~/concepts/distributedWorkloads/useWorkloads';
import { useMakeFetchObject } from '#~/utilities/useMakeFetchObject';
import RayClusterTable from './RayClusterTable';

const RayClustersList: React.FC = () => {
  const { currentProject, rayClusters } = React.useContext(ProjectDetailsContext);

  const projectName = currentProject.metadata.name;
  const rayClustersData = rayClusters[0];
  const rayClustersLoaded = rayClusters[1];
  const rayClustersError = rayClusters[2];
  const isRayClustersEmpty = rayClustersData.length === 0;

  // Fetch workloads for Kueue status
  const workloadsState = useWorkloads(projectName);
  const workloads = useMakeFetchObject(workloadsState);

  const refreshAll = () => {
    workloads.refresh();
  };

  return (
    <DetailsSection
      id={ProjectSectionID.RAY_CLUSTERS}
      objectType={ProjectObjectType.project}
      title={ProjectSectionTitles[ProjectSectionID.RAY_CLUSTERS] || ''}
      isLoading={!rayClustersLoaded}
      loadError={rayClustersError}
      isEmpty={isRayClustersEmpty}
      emptyState={
        <EmptyDetailsView
          title="No Ray clusters"
          description="Ray clusters are not currently being created from the dashboard. To create a Ray cluster, use the CLI or API."
          iconImage={typedEmptyImage(ProjectObjectType.project)}
          imageAlt="no ray clusters"
        />
      }
    >
      {!isRayClustersEmpty ? (
        <RayClusterTable
          rayClusters={rayClustersData}
          workloads={workloads.data}
          refresh={refreshAll}
        />
      ) : null}
    </DetailsSection>
  );
};

export default RayClustersList;
