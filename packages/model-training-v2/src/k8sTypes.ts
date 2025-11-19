import { K8sResourceCommon } from '@openshift/dynamic-plugin-sdk-utils';
import { K8sResourceCommon as K8sResource } from '@openshift/dynamic-plugin-sdk-utils';

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

// TrainJob types based on trainer.kubeflow.org/v1alpha1
export type TrainJobKind = K8sResource & {
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
    runtimeRef: {
      name: string;
      apiGroup?: string;
      kind?: string;
    };
    initializer?: {
      dataset?: {
        storageUri?: string;
        env?: Array<{
          name: string;
          value: string;
        }>;
        secretRef?: {
          name: string;
        };
      };
      model?: {
        storageUri?: string;
        env?: Array<{
          name: string;
          value: string;
        }>;
        secretRef?: {
          name: string;
        };
      };
    };
    trainer?: {
      image?: string;
      command?: string[];
      args?: string[];
      env?: Array<{
        name: string;
        value: string;
      }>;
      numNodes?: number;
      resourcesPerNode?: {
        limits?: {
          cpu?: string;
          memory?: string;
          'nvidia.com/gpu'?: number;
        };
        requests?: {
          cpu?: string;
          memory?: string;
        };
      };
      numProcPerNode?: string | number;
    };
    suspend?: boolean;
    managedBy?: string;
    checkpointing?: {
      enabled?: boolean;
      storage?: {
        uri: string;
        secretRef?: {
          name: string;
        };
        accessMode?: string;
        persistentVolume?: {
          claimName: string;
          mountPath?: string;
          subPath?: string;
        };
      };
      interval?: string;
      maxCheckpoints?: number;
      resumeFromCheckpoint?: boolean;
      env?: Array<{
        name: string;
        value: string;
      }>;
    };
  };
  status?: {
    conditions?: Array<{
      type: string;
      status: string;
      lastTransitionTime: string;
      message?: string;
      reason?: string;
    }>;
    jobsStatus?: Array<{
      name: string;
      ready: number;
      succeeded: number;
      failed: number;
      active: number;
      suspended: number;
    }>;
    progressionStatus?: {
      currentStep?: number;
      totalSteps?: number;
      percentageComplete?: string;
      estimatedTimeRemaining?: number;
      currentEpoch?: number;
      totalEpochs?: number;
      lastUpdateTime?: string;
      message?: string;
      trainingMetrics?: {
        loss?: string;
        learningRate?: string;
        checkpointsStored?: number;
        latestCheckpointPath?: string;
        accuracy?: string;
      };
      metrics?: Record<string, string>;
    };
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
