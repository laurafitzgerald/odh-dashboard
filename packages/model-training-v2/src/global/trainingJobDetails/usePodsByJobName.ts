import * as React from 'react';
import { PodKind } from '@odh-dashboard/internal/k8sTypes';
import { k8sListResourceItems } from '@openshift/dynamic-plugin-sdk-utils';
import { applyK8sAPIOptions } from '@odh-dashboard/internal/api/apiMergeUtils';

const PodModel = {
  apiVersion: 'v1',
  kind: 'Pod',
  plural: 'pods',
};

/**
 * Hook to find pods for a RayJob by label selector
 * RayJobs create pods with labels like ray.io/cluster-name=<job-name>
 */
const usePodsByJobName = (
  namespace: string,
  jobName: string,
  enabled: boolean,
): [PodKind[] | null, boolean, Error | undefined] => {
  const [pods, setPods] = React.useState<PodKind[] | null>(null);
  const [loaded, setLoaded] = React.useState(false);
  const [error, setError] = React.useState<Error | undefined>();

  React.useEffect(() => {
    if (!enabled || !jobName || !namespace) {
      setPods(null);
      setLoaded(true);
      return;
    }

    setLoaded(false);
    setError(undefined);

    // For RayJobs, pods are labeled with job-name
    // We'll try to find submitter pod first (contains the actual job logs)
    const labelSelector = `job-name=${jobName}`;

    console.log('[usePodsByJobName] Looking for RayJob pods with selector:', labelSelector);

    k8sListResourceItems<PodKind>(
      applyK8sAPIOptions({
        model: PodModel,
        queryOptions: {
          ns: namespace,
          queryParams: {
            labelSelector,
          },
        },
      }),
    )
      .then((result) => {
        console.log('[usePodsByJobName] Found pods:', result?.length || 0);
        if (result && result.length > 0) {
          console.log('[usePodsByJobName] Pod names:', result.map(p => p.metadata.name));
          console.log('[usePodsByJobName] First pod labels:', result[0]?.metadata?.labels);
        }
        
        // Sort pods to prioritize submitter pod (has the job logs), then head node
        const sortedPods = (result || []).sort((a, b) => {
          const aIsSubmitter = a.metadata.name?.includes('-submitter-') || a.metadata.name?.includes('rayjob-') ? 2 : 0;
          const bIsSubmitter = b.metadata.name?.includes('-submitter-') || b.metadata.name?.includes('rayjob-') ? 2 : 0;
          const aIsHead = a.metadata.name?.includes('-head-') ? 1 : 0;
          const bIsHead = b.metadata.name?.includes('-head-') ? 1 : 0;
          return (bIsSubmitter + bIsHead) - (aIsSubmitter + aIsHead);
        });
        
        console.log('[usePodsByJobName] Selected pod:', sortedPods[0]?.metadata?.name);
        setPods(sortedPods);
        setLoaded(true);
      })
      .catch((err) => {
        console.error('[usePodsByJobName] Error fetching pods:', err);
        setError(err);
        setLoaded(true);
      });
  }, [namespace, jobName, enabled]);

  return [pods, loaded, error];
};

export default usePodsByJobName;

