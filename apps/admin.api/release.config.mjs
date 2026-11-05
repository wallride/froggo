// semantic-release configuration of admin.api:
// `npx nx run admin.api:release` (`--dry-run` to look without changing).
import { backendReleaseConfig } from '../../tools/release/backend-release-config.mjs';

export default backendReleaseConfig('admin.api');
