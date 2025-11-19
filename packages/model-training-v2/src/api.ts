import {
  k8sDeleteResource,
  K8sStatus,
  k8sPatchResource,
  k8sListResourceItems,
  k8sGetResource,
  commonFetchText,
  getK8sResourceURL,
} from '@openshift/dynamic-plugin-sdk-utils';
import { applyK8sAPIOptions } from '@odh-dashboard/internal/api/apiMergeUtils';
import { K8sAPIOptions, WorkloadKind, PodKind } from '@odh-dashboard/internal/k8sTypes';
// Remove the problematic import - we'll implement listWorkloads directly
import { WorkloadModel } from '@odh-dashboard/internal/api/models/kueue';

// Local implementation of listWorkloads function
const listWorkloads = async (
  namespace?: string,
  labelSelector?: string,
): Promise<WorkloadKind[]> => {
  const queryOptions = {
    ns: namespace,
    ...(labelSelector && { queryParams: { labelSelector } }),
  };
  return k8sListResourceItems<WorkloadKind>({
    model: WorkloadModel,
    queryOptions,
  });
};
import * as React from 'react';
import { groupVersionKind } from '@odh-dashboard/internal/api/k8sUtils';
import { CustomWatchK8sResult } from '@odh-dashboard/internal/types';
import useK8sWatchResourceList from '@odh-dashboard/internal/utilities/useK8sWatchResourceList';
import { PyTorchJobModel, TrainJobModel, RayJobModel } from '@odh-dashboard/internal/api/models/kubeflow';
import { PyTorchJobKind, TrainJobKind, RayJobKind } from './k8sTypes';

// JobSet model for TrainJob hierarchy
const JobSetModel = {
  apiVersion: 'v1alpha2',
  apiGroup: 'jobset.x-k8s.io',
  kind: 'JobSet',
  plural: 'jobsets',
};

// Standard Kubernetes Job model
const JobModel = {
  apiVersion: 'v1',
  apiGroup: 'batch',
  kind: 'Job',
  plural: 'jobs',
};

// Standard Kubernetes Pod model
const PodModel = {
  apiVersion: 'v1',
  kind: 'Pod',
  plural: 'pods',
};

// Job type definition
export type JobKind = {
  apiVersion?: string;
  kind?: string;
  metadata: {
    name: string;
    namespace?: string;
    labels?: Record<string, string>;
  };
  spec?: {
    parallelism?: number;
    completions?: number;
    template: {
      spec: {
        containers: Array<{
          name: string;
          image?: string;
          volumeMounts?: Array<{
            name: string;
            mountPath: string;
            subPath?: string;
            readOnly?: boolean;
          }>;
          [key: string]: any;
        }>;
        volumes?: Array<{
          name: string;
          persistentVolumeClaim?: {
            claimName: string;
          };
          configMap?: {
            name: string;
          };
          secret?: {
            secretName: string;
          };
          [key: string]: any;
        }>;
      };
    };
  };
  status?: {
    active?: number;
    succeeded?: number;
    failed?: number;
    startTime?: string;
    completionTime?: string;
  };
};

export const usePyTorchJobs = (namespace: string): CustomWatchK8sResult<PyTorchJobKind[]> =>
  useK8sWatchResourceList(
    {
      isList: true,
      groupVersionKind: groupVersionKind(PyTorchJobModel),
      namespace,
    },
    PyTorchJobModel,
  );

export const useTrainJobs = (namespace: string): CustomWatchK8sResult<TrainJobKind[]> =>
  useK8sWatchResourceList(
    {
      isList: true,
      groupVersionKind: groupVersionKind(TrainJobModel),
      namespace,
    },
    TrainJobModel,
  );

export const useRayJobs = (namespace: string): CustomWatchK8sResult<RayJobKind[]> =>
  useK8sWatchResourceList(
    {
      isList: true,
      groupVersionKind: groupVersionKind(RayJobModel),
      namespace,
    },
    RayJobModel,
  );

export const deletePyTorchJob = (
  name: string,
  namespace: string,
  opts?: K8sAPIOptions,
): Promise<K8sStatus> =>
  k8sDeleteResource<PyTorchJobKind, K8sStatus>(
    applyK8sAPIOptions(
      {
        model: PyTorchJobModel,
        queryOptions: { name, ns: namespace },
      },
      opts,
    ),
  );

export const deleteTrainJob = (
  name: string,
  namespace: string,
  opts?: K8sAPIOptions,
): Promise<K8sStatus> =>
  k8sDeleteResource<TrainJobKind, K8sStatus>(
    applyK8sAPIOptions(
      {
        model: TrainJobModel,
        queryOptions: { name, ns: namespace },
      },
      opts,
    ),
  );

export const deleteRayJob = (
  name: string,
  namespace: string,
  opts?: K8sAPIOptions,
): Promise<K8sStatus> =>
  k8sDeleteResource<RayJobKind, K8sStatus>(
    applyK8sAPIOptions(
      {
        model: RayJobModel,
        queryOptions: { name, ns: namespace },
      },
      opts,
    ),
  );

export const getWorkloadForPyTorchJob = async (
  job: PyTorchJobKind,
): Promise<WorkloadKind | null> => {
  try {
    // Try to find workload by job UID (most reliable)
    const workloadsByUID = await listWorkloads(
      job.metadata.namespace,
      `kueue.x-k8s.io/job-uid=${job.metadata.uid}`,
    );
    if (workloadsByUID.length > 0) {
      return workloadsByUID[0];
    }

    // Fallback: try to find by job name if UID doesn't work
    const workloadsByName = await listWorkloads(
      job.metadata.namespace,
      `kueue.x-k8s.io/job-name=${job.metadata.name}`,
    );
    if (workloadsByName.length > 0) {
      return workloadsByName[0];
    }

    return null;
  } catch (error) {
    console.warn('Failed to fetch workload for PyTorchJob:', error);
    return null;
  }
};

export const getWorkloadForTrainJob = async (
  job: TrainJobKind,
): Promise<WorkloadKind | null> => {
  try {
    // Try to find workload by job UID (most reliable)
    const workloadsByUID = await listWorkloads(
      job.metadata.namespace,
      `kueue.x-k8s.io/job-uid=${job.metadata.uid}`,
    );
    if (workloadsByUID.length > 0) {
      return workloadsByUID[0];
    }

    // Fallback: try to find by job name if UID doesn't work
    const workloadsByName = await listWorkloads(
      job.metadata.namespace,
      `kueue.x-k8s.io/job-name=${job.metadata.name}`,
    );
    if (workloadsByName.length > 0) {
      return workloadsByName[0];
    }

    return null;
  } catch (error) {
    console.warn('Failed to fetch workload for TrainJob:', error);
    return null;
  }
};

export const getWorkloadForRayJob = async (
  job: RayJobKind,
): Promise<WorkloadKind | null> => {
  try {
    const workloadsByUID = await listWorkloads(
      job.metadata.namespace,
      `kueue.x-k8s.io/job-uid=${job.metadata.uid}`,
    );
    if (workloadsByUID.length > 0) {
      return workloadsByUID[0];
    }

    const workloadsByName = await listWorkloads(
      job.metadata.namespace,
      `kueue.x-k8s.io/job-name=${job.metadata.name}`,
    );
    if (workloadsByName.length > 0) {
      return workloadsByName[0];
    }

    return null;
  } catch (error) {
    console.warn('Failed to fetch workload for RayJob:', error);
    return null;
  }
};

export const patchWorkloadHibernation = async (
  workload: WorkloadKind,
  isHibernated: boolean,
  opts?: K8sAPIOptions,
): Promise<WorkloadKind> => {
  const result = await k8sPatchResource<WorkloadKind>(
    applyK8sAPIOptions(
      {
        model: WorkloadModel,
        queryOptions: {
          name: workload.metadata?.name || '',
          ns: workload.metadata?.namespace || '',
        },
        patches: [
          {
            op: 'replace',
            path: '/spec/active',
            value: !isHibernated,
          },
        ],
      },
      opts,
    ),
  );

  return result;
};

export const patchPyTorchJobSuspension = async (
  job: PyTorchJobKind,
  isSuspended: boolean,
  opts?: K8sAPIOptions,
): Promise<PyTorchJobKind> => {
  const result = await k8sPatchResource<PyTorchJobKind>(
    applyK8sAPIOptions(
      {
        model: PyTorchJobModel,
        queryOptions: {
          name: job.metadata.name || '',
          ns: job.metadata.namespace || '',
        },
        patches: [
          {
            op: 'replace',
            path: '/spec/runPolicy/suspend',
            value: isSuspended,
          },
        ],
      },
      opts,
    ),
  );

  return result;
};

export const togglePyTorchJobHibernation = async (
  job: PyTorchJobKind,
  opts?: K8sAPIOptions,
): Promise<{
  success: boolean;
  workload?: WorkloadKind;
  updatedJob?: PyTorchJobKind;
  error?: string;
}> => {
  try {
    const workload = await getWorkloadForPyTorchJob(job);

    if (workload) {
      // Path 1: Kueue-enabled job - use workload hibernation
      const isCurrentlyHibernated = workload.spec.active === false;
      const updatedWorkload = await patchWorkloadHibernation(
        workload,
        !isCurrentlyHibernated,
        opts,
      );

      return {
        success: true,
        workload: updatedWorkload,
      };
    }

    // Path 2: Non-Kueue job - use PyTorchJob runPolicy.suspend
    const isCurrentlySuspended = job.spec.runPolicy?.suspend === true;
    const updatedJob = await patchPyTorchJobSuspension(job, !isCurrentlySuspended, opts);

    return {
      success: true,
      updatedJob,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return {
      success: false,
      error: `Failed to toggle hibernation: ${errorMessage}`,
    };
  }
};

// TrainJob hierarchy API functions
export const getJobSetForTrainJob = async (
  trainJob: TrainJobKind,
  opts?: K8sAPIOptions,
): Promise<any | null> => {
  try {
    const jobSetName = trainJob.metadata.name;
    const namespace = trainJob.metadata.namespace;
    
    const result = await k8sListResourceItems(
      applyK8sAPIOptions(
        {
          model: JobSetModel,
          queryOptions: {
            ns: namespace,
            name: jobSetName,
          },
        },
        opts || {},
      ),
    );
    
    return result.length > 0 ? result[0] : null;
  } catch (error) {
    console.error('Failed to fetch JobSet for TrainJob:', error);
    return null;
  }
};

export const getJobsForTrainJob = async (
  trainJob: TrainJobKind,
  opts?: K8sAPIOptions,
): Promise<JobKind[]> => {
  try {
    const jobSetName = trainJob.metadata.name;
    const namespace = trainJob.metadata.namespace;
    
    const result = await k8sListResourceItems(
      applyK8sAPIOptions(
        {
          model: JobModel,
          queryOptions: {
            ns: namespace,
            queryParams: {
              labelSelector: `jobset.sigs.k8s.io/jobset-name=${jobSetName}`,
            },
          },
        },
        opts || {},
      ),
    );
    
    return (result || []) as JobKind[];
  } catch (error) {
    console.error('Failed to fetch Jobs for TrainJob:', error);
    return [];
  }
};

export const getPodsForTrainJob = async (
  trainJob: TrainJobKind,
  opts?: K8sAPIOptions,
): Promise<PodKind[]> => {
  try {
    const jobSetName = trainJob.metadata.name;
    const namespace = trainJob.metadata.namespace;
    
    const result = await k8sListResourceItems(
      applyK8sAPIOptions(
        {
          model: PodModel,
          queryOptions: {
            ns: namespace,
            queryParams: {
              labelSelector: `jobset.sigs.k8s.io/jobset-name=${jobSetName}`,
            },
          },
        },
        opts || {},
      ),
    );
    
    return (result || []) as PodKind[];
  } catch (error) {
    console.error('Failed to fetch Pods for TrainJob:', error);
    return [];
  }
};

// Pod log fetching function with direct fetch for large logs
export const getPodContainerLogText = (
  namespace: string,
  podName: string,
  containerName: string,
  tail?: number,
): Promise<string> => {
  // If tail is 0 or undefined, get all logs without tail parameter
  const logPath = tail && tail > 0 
    ? `log?container=${containerName}&tailLines=${tail}`
    : `log?container=${containerName}`;
    
  const url = getK8sResourceURL(PodModel, undefined, {
    name: podName,
    ns: namespace,
    path: logPath,
  });
  
  // Try direct fetch first for large logs
  if (!tail || tail === 0) {
    return fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'text/plain',
        'Content-Type': 'text/plain',
      },
      credentials: 'same-origin',
    })
    .then(response => {
      if (!response.ok) {
        if (response.status === 400) {
          throw new Error(`Container logs not available (pod may be completed or logs garbage collected)`);
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return response.text();
    })
    .then((result) => {
      return result;
    })
    .catch((error) => {
      // Fallback to original method
      return commonFetchText(url, undefined, undefined, true);
    });
  }
  
  // Use commonFetchText for tailed logs
  return commonFetchText(url, undefined, undefined, true)
    .then((result) => {
      return result;
    })
    .catch((error) => {
      console.error('Error fetching logs:', error);
      if (error.message && error.message.includes('unable to retrieve container logs')) {
        throw new Error('Container logs not available (pod may be completed or logs garbage collected)');
      }
      throw error;
    });
};

// TrainJob suspend/resume functionality
export const patchTrainJobSuspension = async (
  job: TrainJobKind,
  isSuspended: boolean,
  opts?: K8sAPIOptions,
): Promise<TrainJobKind> => {
  const result = await k8sPatchResource<TrainJobKind>(
    applyK8sAPIOptions(
      {
        model: TrainJobModel,
        queryOptions: {
          name: job.metadata.name || '',
          ns: job.metadata.namespace || '',
        },
        patches: [
          {
            op: 'replace',
            path: '/spec/suspend',
            value: isSuspended,
          },
        ],
      },
      opts,
    ),
  );

  return result;
};


export const resumeTrainJob = async (
  job: TrainJobKind,
  opts?: K8sAPIOptions,
): Promise<{
  success: boolean;
  workload?: WorkloadKind;
  updatedJob?: TrainJobKind;
  error?: string;
}> => {
  try {
    const workload = await getWorkloadForTrainJob(job);

    if (workload) {
      // Path 1: Kueue-enabled job - update workload first (Kueue should auto-sync TrainJob)
      const updatedWorkload = await patchWorkloadHibernation(
        workload,
        false, // false = not hibernated = active
        opts,
      );

      // Wait a moment for Kueue to sync the TrainJob automatically
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Check if TrainJob was automatically unsuspended
      const refreshedJob = await k8sGetResource<TrainJobKind>({
        model: TrainJobModel,
        queryOptions: {
          name: job.metadata.name || '',
          ns: job.metadata.namespace || '',
        },
      });

      // If TrainJob is still suspended, manually unsuspend it (fallback for webhook issues)
      let updatedJob = refreshedJob;
      if (refreshedJob.spec.suspend === true) {
        updatedJob = await patchTrainJobSuspension(refreshedJob, false, opts);
      }

      return {
        success: true,
        workload: updatedWorkload,
        updatedJob,
      };
    }

    // Path 2: Non-Kueue job - set spec.suspend = false
    const updatedJob = await patchTrainJobSuspension(job, false, opts);

    return {
      success: true,
      updatedJob,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return {
      success: false,
      error: `Failed to resume job: ${errorMessage}`,
    };
  }
};

export const pauseTrainJob = async (
  job: TrainJobKind,
  opts?: K8sAPIOptions,
): Promise<{
  success: boolean;
  workload?: WorkloadKind;
  updatedJob?: TrainJobKind;
  error?: string;
}> => {
  try {
    const workload = await getWorkloadForTrainJob(job);

    if (workload) {
      // Path 1: Kueue-enabled job - update workload first (Kueue should auto-sync TrainJob)
      const updatedWorkload = await patchWorkloadHibernation(
        workload,
        true, // true = hibernated = not active
        opts,
      );

      // Wait a moment for Kueue to sync the TrainJob automatically
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Check if TrainJob was automatically suspended
      const refreshedJob = await k8sGetResource<TrainJobKind>({
        model: TrainJobModel,
        queryOptions: {
          name: job.metadata.name || '',
          ns: job.metadata.namespace || '',
        },
      });

      // If TrainJob is still not suspended, manually suspend it (fallback for webhook issues)
      let updatedJob = refreshedJob;
      if (refreshedJob.spec.suspend !== true) {
        updatedJob = await patchTrainJobSuspension(refreshedJob, true, opts);
      }

      return {
        success: true,
        workload: updatedWorkload,
        updatedJob,
      };
    }

    // Path 2: Non-Kueue job - set spec.suspend = true
    const updatedJob = await patchTrainJobSuspension(job, true, opts);

    return {
      success: true,
      updatedJob,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return {
      success: false,
      error: `Failed to pause job: ${errorMessage}`,
    };
  }
};

export const toggleTrainJobHibernation = async (
  job: TrainJobKind,
  opts?: K8sAPIOptions,
): Promise<{
  success: boolean;
  workload?: WorkloadKind;
  updatedJob?: TrainJobKind;
  error?: string;
}> => {
  try {
    const workload = await getWorkloadForTrainJob(job);

    if (workload) {
      // Path 1: Kueue-enabled job - determine current state and toggle
      const isCurrentlySuspended = job.spec.suspend === true;
      
      if (isCurrentlySuspended) {
        // Resume the job
        return resumeTrainJob(job, opts);
      } else {
        // Pause the job  
        return pauseTrainJob(job, opts);
      }
    }

    // Path 2: Non-Kueue job - use TrainJob spec.suspend
    const isCurrentlySuspended = job.spec.suspend === true;
    const updatedJob = await patchTrainJobSuspension(job, !isCurrentlySuspended, opts);

    return {
      success: true,
      updatedJob,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return {
      success: false,
      error: `Failed to toggle hibernation: ${errorMessage}`,
    };
  }
};
