import React from 'react';
import { getRoute } from '#~/api/k8s/routes';
import useFetch, { FetchStateCallbackPromise, FetchStateObject } from '#~/utilities/useFetch';
import { K8sAPIOptions } from '#~/k8sTypes';

export const useRayDashboardRoute = (
  rayClusterName: string,
  namespace: string,
  refreshRate?: number,
): FetchStateObject<string | null> => {
  const fetchRoute = React.useCallback<FetchStateCallbackPromise<string | null>>(
    (opts: K8sAPIOptions): Promise<string | null> => {
      if (!rayClusterName || !namespace) {
        return Promise.resolve(null);
      }

      // RayCluster creates a route with the pattern: {raycluster-name}-dashboard
      return getRoute(`${rayClusterName}-dashboard`, namespace, opts)
        .then((fetchedRoute) => `https://${fetchedRoute.spec.host}${fetchedRoute.spec.path || ''}`)
        .catch((e) => {
          // Silently handle 404s (route doesn't exist yet)
          if (e.statusObject?.code === 404) {
            return null;
          }
          return Promise.reject(e);
        });
    },
    [rayClusterName, namespace],
  );

  return useFetch<string | null>(fetchRoute, null, {
    refreshRate,
    initialPromisePurity: true,
  });
};
