export enum PyTorchJobState {
  CREATED = 'Created',
  PENDING = 'Pending',
  QUEUED = 'Queued',
  RUNNING = 'Running',
  RESTARTING = 'Restarting',
  SUCCEEDED = 'Succeeded',
  FAILED = 'Failed',
  PAUSED = 'Paused',
  SUSPENDED = 'Suspended',
  PREEMPTED = 'Preempted',
  UNKNOWN = 'Unknown',
}

export enum RayJobState {
  NEW = 'New',
  RUNNING = 'Running',
  SUCCEEDED = 'Succeeded',
  FAILED = 'Failed',
  STOPPED = 'Stopped',
  SUSPENDED = 'Suspended',
  UNKNOWN = 'Unknown',
}

export type TrainingJobState = PyTorchJobState | RayJobState;

export enum TrainingJobType {
  PYTORCH = 'PyTorchJob',
  RAY = 'RayJob',
}
