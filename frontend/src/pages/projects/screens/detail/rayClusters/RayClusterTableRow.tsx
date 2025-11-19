import * as React from 'react';
import { ActionsColumn, IAction, Td, Tr } from '@patternfly/react-table';
import { Button, Content, Label } from '@patternfly/react-core';
import { ExternalLinkAltIcon } from '@patternfly/react-icons';
import { RayClusterKind, WorkloadKind } from '#~/k8sTypes';
import { TableRowTitleDescription } from '#~/components/table';
import {
  getDescriptionFromK8sResource,
  getDisplayNameFromK8sResource,
} from '#~/concepts/k8s/utils';
import { getKueueStatus, getWorkloadForRayCluster, getRayClusterStatus } from './utils';
import { useRayDashboardRoute } from './useRayDashboardRoute';

type RayClusterTableRowProps = {
  rowIndex: number;
  obj: RayClusterKind;
  workloads: WorkloadKind[];
  onDeleteRayCluster: (rayCluster: RayClusterKind) => void;
};

const RayClusterTableRow: React.FC<RayClusterTableRowProps> = ({
  rowIndex,
  obj,
  workloads,
  onDeleteRayCluster,
}) => {
  const { data: rayDashboardUrl, loaded: routeLoaded } = useRayDashboardRoute(
    obj.metadata.name,
    obj.metadata.namespace,
  );

  const workload = getWorkloadForRayCluster(obj, workloads);
  const kueueStatus = getKueueStatus(workload);

  const state = getRayClusterStatus(obj, workload);
  const desiredWorkerReplicas = obj.status?.desiredWorkerReplicas ?? 0;
  const availableWorkerReplicas = obj.status?.availableWorkerReplicas ?? 0;

  const getStatusColor = (
    status: string,
  ): 'green' | 'red' | 'orange' | 'grey' | 'blue' | 'cyan' | 'purple' | 'gold' => {
    switch (status.toLowerCase()) {
      case 'ready':
        return 'green';
      case 'failed':
        return 'red';
      case 'suspended':
        return 'orange';
      case 'starting':
        return 'blue';
      case 'unhealthy':
        return 'gold';
      default:
        return 'grey';
    }
  };

  const actions: IAction[] = [
    {
      title: 'Delete Ray cluster',
      onClick: () => {
        onDeleteRayCluster(obj);
      },
    },
  ];

  return (
    <Tr {...(rowIndex % 2 === 0 && { isStriped: true })}>
      <Td dataLabel="Name">
        <TableRowTitleDescription
          title={getDisplayNameFromK8sResource(obj)}
          resource={obj}
          description={getDescriptionFromK8sResource(obj)}
        />
      </Td>

      <Td dataLabel="Status">
        <Label color={getStatusColor(state)} isCompact>
          {state}
        </Label>
      </Td>

      <Td dataLabel="Kueue status">
        <Content component="p">{kueueStatus}</Content>
      </Td>

      <Td dataLabel="Worker nodes">
        <Content component="p">
          {availableWorkerReplicas} / {desiredWorkerReplicas}
        </Content>
      </Td>

      <Td dataLabel="Ray dashboard">
        {rayDashboardUrl ? (
          <Button
            component="a"
            href={rayDashboardUrl}
            target="_blank"
            variant="link"
            icon={<ExternalLinkAltIcon />}
            iconPosition="end"
            isInline
          >
            Open dashboard
          </Button>
        ) : routeLoaded ? (
          <Content component="p">-</Content>
        ) : (
          <Content component="p">Loading...</Content>
        )}
      </Td>

      <Td isActionCell>
        <ActionsColumn items={actions} />
      </Td>
    </Tr>
  );
};

export default RayClusterTableRow;
