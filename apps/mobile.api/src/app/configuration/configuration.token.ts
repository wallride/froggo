// Kept apart from ConfigurationModule so the module's own controllers can
// inject it without a circular import.
export const CONFIGURATION = Symbol('CONFIGURATION');
