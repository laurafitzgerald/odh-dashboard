import { K8sResourceCommon } from '@openshift/dynamic-plugin-sdk-utils';

export type PyTorchJobKind = K8sResourceCommon & {
  metadata: {
    annotations?: Partial<{
      'opendatahub.io/display-name': string;
    }>;
    name: string;
    namespace: string;
    labels?: {
      'kueue.x-k8s.io/queue-name'?: string;
      [key: string]: string | undefined;
    };
    uid: string;
  };
  spec: {
    runPolicy?: {
      suspend?: boolean;
    };
    pytorchReplicaSpecs: {
      Master?: {
        replicas: number;
        restartPolicy?: string;
        template?: {
          spec: {
            containers: Array<{
              name: string;
              image: string;
              args?: string[];
              resources?: {
                limits?: {
                  'nvidia.com/gpu'?: number;
                  cpu?: string;
                  memory?: string;
                };
                requests?: {
                  cpu?: string;
                  memory?: string;
                };
              };
            }>;
          };
        };
      };
      Worker?: {
        replicas: number;
        restartPolicy?: string;
        template?: {
          spec: {
            containers: Array<{
              name: string;
              image: string;
              args?: string[];
              resources?: {
                limits?: {
                  'nvidia.com/gpu'?: number;
                  cpu?: string;
                  memory?: string;
                };
                requests?: {
                  cpu?: string;
                  memory?: string;
                };
              };
            }>;
          };
        };
      };
    };
  };
  status?: {
    completionPercentage?: number;
    conditions?: Array<{
      type: string;
      status: string;
      lastUpdateTime?: string;
      lastTransitionTime?: string;
      reason?: string;
      message?: string;
    }>;
    replicaStatuses?: {
      Master?: {
        active?: number;
        succeeded?: number;
        failed?: number;
      };
      Worker?: {
        active?: number;
        succeeded?: number;
        failed?: number;
      };
    };
    startTime?: string;
    completionTime?: string;
  };
};

// RayJob types based on ray.io/v1
export type RayJobKind = K8sResourceCommon & {
  metadata: {
    annotations?: Partial<{
      'opendatahub.io/display-name': string;
    }>;
    name: string;
    namespace: string;
    labels?: {
      'kueue.x-k8s.io/queue-name'?: string;
      [key: string]: string | undefined;
    };
    uid: string;
  };
  spec: {
    rayClusterSpec?: {
      headGroupSpec?: any;
      workerGroupSpecs?: Array<{
        replicas?: number;
        groupName?: string;
        [key: string]: any;
      }>;
    };
    entrypoint?: string;
    runtimeEnv?: string;
    shutdownAfterJobFinishes?: boolean;
    ttlSecondsAfterFinished?: number;
    suspend?: boolean;
  };
  status?: {
    jobStatus?: 'NEW' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'STOPPED';
    jobDeploymentStatus?: 'Running' | 'Complete' | 'Failed' | 'Suspended';
    startTime?: string;
    endTime?: string;
    message?: string;
  };
};
