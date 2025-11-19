import React from 'react';
import { getDisplayNameFromK8sResource } from '#~/concepts/k8s/utils';
import { RayClusterKind } from '#~/k8sTypes';
import DeleteModal from '#~/pages/projects/components/DeleteModal';
import { deleteRayCluster } from '#~/api/k8s/rayClusters';

type Props = {
  rayCluster: RayClusterKind;
  onClose: (deleted?: boolean) => void;
};

export const DeleteRayClusterModal: React.FC<Props> = ({ rayCluster, onClose }) => {
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [error, setError] = React.useState<Error>();

  return (
    <DeleteModal
      title="Delete Ray cluster?"
      onClose={onClose}
      submitButtonLabel="Delete"
      onDelete={() => {
        setIsDeleting(true);
        setError(undefined);
        deleteRayCluster(rayCluster.metadata.name, rayCluster.metadata.namespace)
          .then(() => {
            onClose(true);
          })
          .catch((e) => {
            setError(e);
            setIsDeleting(false);
          });
      }}
      deleting={isDeleting}
      error={error}
      deleteName={getDisplayNameFromK8sResource(rayCluster)}
    >
      The <b>{getDisplayNameFromK8sResource(rayCluster)}</b> Ray cluster will be deleted and its
      resources will be removed.
    </DeleteModal>
  );
};
