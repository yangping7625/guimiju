import { io } from 'socket.io-client';

// 开发时同源 5173，vite 代理 /socket.io → 3001；
// 生产：若设置了 VITE_API_BASE 则连该后端，否则同源直连。
const SOCKET_URL = import.meta.env.VITE_API_BASE;
export const socket = io(SOCKET_URL || undefined, { autoConnect: true });
