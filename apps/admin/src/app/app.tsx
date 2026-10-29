import { BrowserRouter, Route, Routes } from 'react-router-dom';

import { ApiProvider } from '../api/api-context';
import { Layout } from './layout/layout';
import { Dashboard } from './pages/dashboard/dashboard';
import { Boards } from './pages/boards/boards';
import { BoardAdd } from './pages/boards/add/board-add';
import { BoardEdit } from './pages/boards/edit/board-edit';
import { BoardTest } from './pages/boards/test/board-test';
import { Players } from './pages/players/players';

export function App() {
  return (
    <ApiProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="boards" element={<Boards />} />
            <Route path="boards/add" element={<BoardAdd />} />
            <Route path="boards/edit" element={<BoardEdit />} />
            <Route path="boards/test" element={<BoardTest />} />
            <Route path="players" element={<Players />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ApiProvider>
  );
}

export default App;
