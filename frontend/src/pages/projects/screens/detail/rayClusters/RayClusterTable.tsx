import * as React from 'react';
import { Table } from '#~/components/table';
import { RayClusterKind, WorkloadKind } from '#~/k8sTypes';
import { DeleteRayClusterModal } from './DeleteRayClusterModal';
import RayClusterTableRow from './RayClusterTableRow';
import { columns } from './data';

type RayClusterTableProps = {
  rayClusters: RayClusterKind[];
  workloads: WorkloadKind[];
  refresh: () => void;
};

const RayClusterTable: React.FC<RayClusterTableProps> = ({ rayClusters, workloads, refresh }) => {
  const [deleteRayCluster, setDeleteRayCluster] = React.useState<RayClusterKind | undefined>();

  return (
    <>
      <Table
        data={rayClusters}
        columns={columns}
        data-testid="ray-cluster-table"
        variant="compact"
        rowRenderer={(rayCluster, i) => (
          <RayClusterTableRow
            key={rayCluster.metadata.uid}
            rowIndex={i}
            obj={rayCluster}
            workloads={workloads}
            onDeleteRayCluster={setDeleteRayCluster}
          />
        )}
      />
      {deleteRayCluster ? (
        <DeleteRayClusterModal
          rayCluster={deleteRayCluster}
          onClose={(deleted) => {
            if (deleted) {
              refresh();
            }
            setDeleteRayCluster(undefined);
          }}
        />
      ) : null}
    </>
  );
};

export default RayClusterTable;
