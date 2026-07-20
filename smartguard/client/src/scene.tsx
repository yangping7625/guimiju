import { createContext, useContext, useState, ReactNode } from 'react';
import type { Scene } from './types';

interface SceneCtx {
  scene: Scene;
  setScene: (s: Scene) => void;
}
const Ctx = createContext<SceneCtx>({ scene: 'newenergy', setScene: () => {} });

export function SceneProvider({ children }: { children: ReactNode }) {
  const [scene, setScene] = useState<Scene>('newenergy');
  return <Ctx.Provider value={{ scene, setScene }}>{children}</Ctx.Provider>;
}
export const useScene = () => useContext(Ctx);
