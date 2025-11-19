import type {
  HrefNavItemExtension,
  AreaExtension,
  RouteExtension,
} from '@odh-dashboard/plugin-core/extension-points';
// Allow this import as it consists of types and enums only.
// eslint-disable-next-line no-restricted-syntax
import { SupportedArea } from '@odh-dashboard/internal/concepts/areas/types';

const PLUGIN_MODEL_TRAINING_V1 = 'plugin-model-training-v1';

const extensions: (AreaExtension | HrefNavItemExtension | RouteExtension)[] = [
  // Plugin area no longer needed - Jobs is built-in now
];

export default extensions;
