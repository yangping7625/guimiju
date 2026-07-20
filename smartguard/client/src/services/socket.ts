import { io } from 'socket.io-client';

// 开发时同源 5173，vite 代理 /socket.io → 3001；
// 生产由后端托管，同源直连。
export const socket = io({ autoConnect: true });
