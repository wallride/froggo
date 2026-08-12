import { createContext, PropsWithChildren, useContext } from 'react';

import { ApiContainer, apiContainer } from './api-container';

const ApiContext = createContext<ApiContainer>(apiContainer);

export function ApiProvider({ children }: PropsWithChildren) {
  return (
    <ApiContext.Provider value={apiContainer}>{children}</ApiContext.Provider>
  );
}

export function useApi(): ApiContainer {
  return useContext(ApiContext);
}
