import { isAppVersionSupported } from './app-version';

describe('isAppVersionSupported', () => {
  it('accepts the minimum and anything newer', () => {
    expect(isAppVersionSupported('1.0.0', '1.0.0')).toBe(true);
    expect(isAppVersionSupported('1.0.1', '1.0.0')).toBe(true);
    expect(isAppVersionSupported('1.1.0', '1.0.9')).toBe(true);
    expect(isAppVersionSupported('2.0.0', '1.99.99')).toBe(true);
  });

  it('refuses anything older', () => {
    expect(isAppVersionSupported('0.9.9', '1.0.0')).toBe(false);
    expect(isAppVersionSupported('1.0.0', '1.0.1')).toBe(false);
    expect(isAppVersionSupported('1.9.9', '2.0.0')).toBe(false);
  });

  it('compares parts numerically, not as strings', () => {
    expect(isAppVersionSupported('1.10.0', '1.9.0')).toBe(true);
    expect(isAppVersionSupported('1.9.0', '1.10.0')).toBe(false);
  });

  it('refuses a version it cannot read', () => {
    expect(isAppVersionSupported(undefined, '1.0.0')).toBe(false);
    expect(isAppVersionSupported(null, '1.0.0')).toBe(false);
    expect(isAppVersionSupported('', '1.0.0')).toBe(false);
    expect(isAppVersionSupported('1.0', '1.0.0')).toBe(false);
    expect(isAppVersionSupported('v1.0.0', '1.0.0')).toBe(false);
    expect(isAppVersionSupported('1.0.0-beta.1', '1.0.0')).toBe(false);
  });
});
