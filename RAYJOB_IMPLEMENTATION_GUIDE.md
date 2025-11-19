# Adding RayJob Support to Model Training UI

This guide shows you how to add RayJobs to the Model Training UI with suspend/resume actions greyed out.

## Step 1: Add RayJob K8s Types

**File:** `packages/model-training-v2/src/k8sTypes.ts`

Add after the TrainJob type definition:

```typescript
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
    // RayJob spec - simplified version
    rayClusterSpec?: {
      headGroupSpec?: any;
      workerGroupSpecs?: any[];
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
```

## Step 2: Add RayJob Model and API

**File:** `frontend/src/api/models/kubeflow.ts`

Add after TrainJobModel:

```typescript
export const RayJobModel: K8sModelCommon = {
  apiVersion: 'v1',
  apiGroup: 'ray.io',
  kind: 'RayJob',
  plural: 'rayjobs',
};
```

**File:** `packages/model-training-v2/src/api.ts`

Add these imports and functions:

```typescript
import { RayJobModel } from '@odh-dashboard/internal/api/models/kubeflow';
import { RayJobKind } from './k8sTypes';

// Add the hook
export const useRayJobs = (namespace: string): CustomWatchK8sResult<RayJobKind[]> =>
  useK8sWatchResourceList(
    {
      isList: true,
      groupVersionKind: groupVersionKind(RayJobModel),
      namespace,
    },
    RayJobModel,
  );

// Add delete function
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

// Add workload fetcher (for Kueue integration)
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
```

## Step 3: Add RayJob States and Types

**File:** `packages/model-training-v2/src/types.ts`

Update the enums and types:

```typescript
export enum RayJobState {
  NEW = 'New',
  RUNNING = 'Running',
  SUCCEEDED = 'Succeeded',
  FAILED = 'Failed',
  STOPPED = 'Stopped',
  SUSPENDED = 'Suspended',
  UNKNOWN = 'Unknown',
}

export type TrainingJobState = PyTorchJobState | TrainJobState | RayJobState;

export enum TrainingJobType {
  PYTORCH = 'PyTorchJob',
  TRAIN = 'TrainJob',
  RAY = 'RayJob',  // Add this
}
```

## Step 4: Update Context to Include RayJobs

**File:** `packages/model-training-v2/src/global/ModelTrainingContext.tsx`

```typescript
import { usePyTorchJobs, useTrainJobs, useRayJobs } from '../api';  // Add useRayJobs
import { PyTorchJobKind, TrainJobKind, RayJobKind } from '../k8sTypes';  // Add RayJobKind

type ModelTrainingContextType = {
  pytorchJobs: CustomWatchK8sResult<PyTorchJobKind[]>;
  trainJobs: CustomWatchK8sResult<TrainJobKind[]>;
  rayJobs: CustomWatchK8sResult<RayJobKind[]>;  // Add this
  project?: ProjectKind | null;
  preferredProject?: ProjectKind | null;
  projects?: ProjectKind[] | null;
};

export const ModelTrainingContext = React.createContext<ModelTrainingContextType>({
  pytorchJobs: DEFAULT_LIST_WATCH_RESULT,
  trainJobs: DEFAULT_LIST_WATCH_RESULT,
  rayJobs: DEFAULT_LIST_WATCH_RESULT,  // Add this
  project: null,
  preferredProject: null,
  projects: null,
});

export const ModelTrainingContextProvider: React.FC<ModelTrainingContextProviderProps> = ({
  children,
  namespace,
}) => {
  const { projects, preferredProject } = React.useContext(ProjectsContext);
  const project = projects.find(byName(namespace)) ?? null;

  const pytorchJobs = usePyTorchJobs(namespace ?? '');
  const trainJobs = useTrainJobs(namespace ?? '');
  const rayJobs = useRayJobs(namespace ?? '');  // Add this

  const contextValue = React.useMemo(
    () => ({
      pytorchJobs,
      trainJobs,
      rayJobs,  // Add this
      project,
      preferredProject,
      projects,
    }),
    [pytorchJobs, trainJobs, rayJobs, project, preferredProject, projects],  // Add rayJobs
  );

  return (
    <ModelTrainingContext.Provider value={contextValue}>{children}</ModelTrainingContext.Provider>
  );
};
```

## Step 5: Update ModelTraining.tsx to Show RayJobs

**File:** `packages/model-training-v2/src/global/ModelTraining.tsx`

```typescript
const ModelTraining = (): React.ReactElement => {
  const navigate = useNavigate();
  const { trainJobs, rayJobs, project, preferredProject, projects } =  // Add rayJobs
    React.useContext(ModelTrainingContext);
  const [trainJobData, trainJobLoaded, trainJobLoadError] = trainJobs;
  const [rayJobData, rayJobLoaded, rayJobLoadError] = rayJobs;  // Add this

  // Combine all jobs
  const allJobs = [...trainJobData, ...rayJobData];
  const allJobsLoaded = trainJobLoaded && rayJobLoaded;
  const allJobsLoadError = trainJobLoadError || rayJobLoadError;

  const emptyState = (
    <EmptyState
      headingLevel="h6"
      icon={SearchIcon}
      titleText="No training jobs"
      variant={EmptyStateVariant.lg}
      data-testid="empty-state-title"
    >
      <EmptyStateBody data-testid="empty-state-body">
        No training jobs have been found in this project.
      </EmptyStateBody>
    </EmptyState>
  );

  return (
    <ApplicationsPage
      empty={allJobs.length === 0}  // Changed
      emptyStatePage={emptyState}
      title={<TitleWithIcon title={title} objectType={ProjectObjectType.modelCustomization} />}
      description={description}
      loadError={allJobsLoadError}  // Changed
      loaded={allJobsLoaded}  // Changed
      headerContent={
        <ModelTrainingProjectSelector getRedirectPath={(ns: string) => `/modelTraining/${ns}`} />
      }
      provideChildrenPadding
      loadingContent={
        project ? undefined : (
          <ModelTrainingLoading
            title="Loading"
            description="Retrieving training jobs from all projects in the cluster. This can take a few minutes."
            onCancel={() => {
              const redirectProject = preferredProject ?? projects?.[0];
              if (redirectProject) {
                navigate(`/modelTraining/${redirectProject.metadata.name}`);
              }
            }}
          />
        )
      }
    >
      <TrainingJobListView trainingJobs={allJobs as any} />  {/* Changed */}
    </ApplicationsPage>
  );
};
```

## Step 6: Add RayJob Status Handling

**File:** `packages/model-training-v2/src/global/trainingJobList/utils.ts`

Add after the TrainJob status functions:

```typescript
/**
 * Get RayJob status from conditions
 */
const getBasicRayJobStatus = (job: RayJobKind): RayJobState => {
  if (!job.status) {
    return RayJobState.NEW;
  }

  const jobStatus = job.status.jobStatus;
  const deploymentStatus = job.status.jobDeploymentStatus;

  // Check deployment status first for suspended state
  if (deploymentStatus === 'Suspended' || job.spec.suspend === true) {
    return RayJobState.SUSPENDED;
  }

  // Map RayJob statuses
  switch (jobStatus) {
    case 'SUCCEEDED':
      return RayJobState.SUCCEEDED;
    case 'FAILED':
      return RayJobState.FAILED;
    case 'RUNNING':
      return RayJobState.RUNNING;
    case 'STOPPED':
      return RayJobState.STOPPED;
    case 'NEW':
    default:
      return RayJobState.NEW;
  }
};

// Update the generic getJobStatus function
export const getJobStatus = (job: TrainingJob): TrainingJobState => {
  if (job.kind === 'TrainJob') {
    return getBasicTrainJobStatus(job as TrainJobKind);
  }
  if (job.kind === 'RayJob') {
    return getBasicRayJobStatus(job as RayJobKind);  // Add this
  }
  return getTrainingJobStatusSync(job as PyTorchJobKind);
};
```

Update the status info function to include RayJob states:

```typescript
export const getStatusInfo = (
  status: TrainingJobState,
): {
  label: string;
  status?: LabelProps['status'];
  color?: LabelProps['color'];
  IconComponent: React.ComponentType;
} => {
  switch (status) {
    case PyTorchJobState.SUCCEEDED:
    case TrainJobState.COMPLETE:
    case RayJobState.SUCCEEDED:  // Add this
      return {
        label: status === TrainJobState.COMPLETE ? 'Complete' : 'Succeeded',
        color: 'green',
        IconComponent: CheckCircleIcon,
      };
    case PyTorchJobState.FAILED:
    case TrainJobState.FAILED:
    case RayJobState.FAILED:  // Add this
      return {
        label: 'Failed',
        color: 'red',
        IconComponent: ExclamationCircleIcon,
      };
    case PyTorchJobState.RUNNING:
    case TrainJobState.RUNNING:
    case RayJobState.RUNNING:  // Add this
      return {
        label: 'Running',
        color: 'blue',
        IconComponent: InProgressIcon,
      };
    case RayJobState.NEW:  // Add this
      return {
        label: 'New',
        color: 'grey',
        IconComponent: PendingIcon,
      };
    case RayJobState.STOPPED:  // Add this
      return {
        label: 'Stopped',
        color: 'grey',
        IconComponent: PauseIcon,
      };
    case RayJobState.SUSPENDED:  // Add this case
      return {
        label: 'Suspended',
        color: 'grey',
        IconComponent: PauseIcon,
      };
    // ... rest of cases
  }
};
```

Update TrainingJob type:

```typescript
export type TrainingJob = PyTorchJobKind | TrainJobKind | RayJobKind;  // Add RayJobKind

export const getJobType = (job: TrainingJob): TrainingJobType => {
  if (job.kind === 'TrainJob') return TrainingJobType.TRAIN;
  if (job.kind === 'RayJob') return TrainingJobType.RAY;  // Add this
  return TrainingJobType.PYTORCH;
};
```

## Step 7: Update TableRow to Disable Suspend for RayJobs

**File:** `packages/model-training-v2/src/global/trainingJobList/TrainingJobTableRow.tsx`

Update the actions section:

```typescript
// Build kebab menu actions
const actions = React.useMemo(() => {
  const items = [];

  // Add hibernation toggle action
  // Only enable for PyTorchJobs and TrainJobs (NOT RayJobs)
  if (!isTerminalState) {
    if (job.kind === 'PyTorchJob' || job.kind === 'TrainJob') {
      items.push({
        title: isSuspended ? 'Resume' : 'Suspend',
        onClick: () => setHibernationModalOpen(true),
      });
    } else if (job.kind === 'RayJob') {
      // Add greyed-out suspend action for RayJobs
      items.push({
        title: isSuspended ? 'Resume' : 'Suspend',
        onClick: () => {}, // No-op
        isDisabled: true,
        tooltipProps: {
          content: 'Suspend/Resume is not supported for RayJobs',
        },
      });
    }
  }

  // Add delete action
  items.push({
    title: 'Delete',
    onClick: () => onDelete(job),
  });

  return items;
}, [status, isSuspended, isTerminalState, job, onDelete]);
```

## Step 8: Add Worker Nodes Logic for RayJobs

**File:** `packages/model-training-v2/src/global/trainingJobList/components/WorkerNodesIcon.tsx`

Update to handle RayJobs:

```typescript
// Inside the component, add RayJob handling:
let workerCount = 0;

if (job.kind === 'PyTorchJob') {
  workerCount = (job as PyTorchJobKind).spec.pytorchReplicaSpecs?.Worker?.replicas || 0;
} else if (job.kind === 'TrainJob') {
  workerCount = (job as TrainJobKind).spec.trainer?.numNodes || 0;
} else if (job.kind === 'RayJob') {
  // Calculate total workers from RayJob worker groups
  const workerGroups = (job as RayJobKind).spec.rayClusterSpec?.workerGroupSpecs || [];
  workerCount = workerGroups.reduce((sum, group) => sum + (group.replicas || 0), 0);
}
```

## Step 9: Update Delete Modal

**File:** `packages/model-training-v2/src/global/trainingJobList/DeleteTrainingJobModal.tsx`

Update the delete handler:

```typescript
const handleDelete = async () => {
  setIsDeleting(true);
  try {
    if (job.kind === 'PyTorchJob') {
      await deletePyTorchJob(job.metadata.name, job.metadata.namespace);
    } else if (job.kind === 'TrainJob') {
      await deleteTrainJob(job.metadata.name, job.metadata.namespace);
    } else if (job.kind === 'RayJob') {  // Add this
      await deleteRayJob(job.metadata.name, job.metadata.namespace);
    }
    onClose(true);
  } catch (error) {
    console.error('Failed to delete job:', error);
    setError((error as Error).message);
  } finally {
    setIsDeleting(false);
  }
};
```

## Step 10: Create Mock RayJob for Testing

**File:** `frontend/src/__mocks__/mockRayJobK8sResource.ts` (create new file)

```typescript
import * as _ from 'lodash-es';
import { genUID } from './mockUtils';
import { RayJobState } from '../../../packages/model-training-v2/src/types';
import { RayJobKind } from '../../../packages/model-training-v2/src/k8sTypes';

type MockRayJobConfig = {
  name?: string;
  namespace?: string;
  status?: RayJobState;
  localQueueName?: string;
  workerReplicas?: number;
};

export const mockRayJobK8sResource = ({
  name = 'test-rayjob',
  namespace = 'test-project',
  status = RayJobState.RUNNING,
  localQueueName = 'default-queue',
  workerReplicas = 2,
}: MockRayJobConfig = {}): RayJobKind => ({
  apiVersion: 'ray.io/v1',
  kind: 'RayJob',
  metadata: {
    name,
    namespace,
    uid: genUID('rayjob'),
    creationTimestamp: '2024-01-15T10:30:00Z',
    labels: {
      'kueue.x-k8s.io/queue-name': localQueueName,
    },
  },
  spec: {
    rayClusterSpec: {
      workerGroupSpecs: [
        {
          replicas: workerReplicas,
          groupName: 'worker-group',
        },
      ],
    },
    entrypoint: 'python train.py',
    shutdownAfterJobFinishes: true,
  },
  status: {
    jobStatus: status === RayJobState.RUNNING ? 'RUNNING' : 
              status === RayJobState.SUCCEEDED ? 'SUCCEEDED' :
              status === RayJobState.FAILED ? 'FAILED' : 'NEW',
    jobDeploymentStatus: status,
    startTime: '2024-01-15T10:32:00Z',
  },
});
```

## Step 11: Update Main ModelTraining Component

**File:** `packages/model-training-v2/src/global/ModelTraining.tsx`

Already covered above in Step 5.

## Key Points:

### ✅ What Gets Enabled:
- RayJobs appear in the training jobs list
- Show status, worker nodes, cluster queue
- Delete action works normally
- Viewing RayJob details

### 🚫 What Gets Disabled (Greyed Out):
- Suspend/Resume actions - disabled with tooltip explanation
- Only PyTorchJobs and TrainJobs support suspend/resume

### Why Suspend is Disabled for RayJobs:
RayJobs use a different lifecycle model than Kubeflow training jobs. While they have a `suspend` field in the spec, the Ray ecosystem handles job lifecycle differently, and the Kueue workload hibernation may not work reliably with RayJobs.

## Testing:

1. Create a test RayJob in your cluster
2. Verify it appears in the training jobs list
3. Confirm suspend/resume is greyed out with tooltip
4. Test delete functionality

Would you like me to implement these changes for you now?
