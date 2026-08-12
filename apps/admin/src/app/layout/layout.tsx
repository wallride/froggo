import { NavLink, Outlet } from 'react-router-dom';

import styles from './layout.module.css';

const NAV_ITEMS = [
  { label: 'Dashboard', to: '/' },
  { label: 'Boards', to: '/boards' },
  { label: 'Players', to: '/players' },
];

export function Layout() {
  return (
    <div className={styles['container']}>
      <nav className={styles['sidebar']}>
        <ul>
          {NAV_ITEMS.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  isActive ? styles['active'] : undefined
                }
              >
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <main className={styles['content']}>
        <Outlet />
      </main>
    </div>
  );
}

export default Layout;
