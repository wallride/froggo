// semantic-release configuration of mobile.api:
// `npx nx run mobile.api:release` (`--dry-run` to look without changing).
import { backendReleaseConfig } from '../../tools/release/backend-release-config.mjs';

export default backendReleaseConfig('mobile.api');
