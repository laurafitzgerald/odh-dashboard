import { k8sDeleteResource } from '@openshift/dynamic-plugin-sdk-utils';
import { RayClusterKind } from '#~/k8sTypes';
import { RayClusterModel } from '#~/api/models/kubeflow';
import { groupVersionKind } from '#~/api/k8sUtils';
import useK8sWatchResourceList from '#~/utilities/useK8sWatchResourceList';
import { CustomWatchK8sResult } from '#~/types';

export const useRayClusters = (namespace?: string): CustomWatchK8sResult<RayClusterKind[]> =>
  useK8sWatchResourceList<RayClusterKind[]>(
    namespace
      ? {
          groupVersionKind: groupVersionKind(RayClusterModel),
          namespace,
        }
      : null,
    RayClusterModel,
  );

export const deleteRayCluster = (name: string, namespace: string): Promise<RayClusterKind> =>
  k8sDeleteResource<RayClusterKind>({
    model: RayClusterModel,
    queryOptions: { name, ns: namespace },
  });
