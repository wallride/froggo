import { render } from '@testing-library/react';

import App from './app';

describe('App', () => {
  it('should render successfully', () => {
    const { baseElement } = render(<App />);
    expect(baseElement).toBeTruthy();
  });

  it('should render the dashboard as the start page', () => {
    const { getByText } = render(<App />);
    expect(getByText('Hello, world!')).toBeTruthy();
  });

  it('should render navigation links for each section', () => {
    const { getByRole } = render(<App />);
    expect(getByRole('link', { name: 'Dashboard' })).toBeTruthy();
    expect(getByRole('link', { name: 'Boards' })).toBeTruthy();
    expect(getByRole('link', { name: 'Players' })).toBeTruthy();
  });
});
