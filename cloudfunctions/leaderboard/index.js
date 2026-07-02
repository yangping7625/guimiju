// ================================================================
// 诡谜局 V2 · 排行榜云函数
// 查询全局排行榜：胜场 / 积分 / 胜率
// ================================================================
const cloudbase = require('@cloudbase/node-sdk');

const app = cloudbase.init({ env: cloudbase.SYMBOL_DEFAULT_ENV });
const db = app.database();

exports.main = async (event, context) => {
  const { action, type = 'wins', limit = 50 } = event;

  try {
    switch (action) {
      case 'getRanking':
        return await getRanking(type, limit);
      default:
        return { code: -1, message: '未知操作' };
    }
  } catch (err) {
    console.error('排行榜查询失败:', err.message);
    return { code: -1, message: '查询失败' };
  }
};

// ============ 获取排行榜 ============
async function getRanking(type, limit) {
  // 查询所有已完成的房间
  const roomResult = await db.collection('rooms')
    .where({ status: 'finished' })
    .get();

  const rooms = roomResult.data || [];

  // 按玩家聚合统计
  const playerStats = {};

  for (const room of rooms) {
    for (const player of (room.players || [])) {
      if (!player.id || player.id === 'system') continue;
      if (!playerStats[player.id]) {
        playerStats[player.id] = {
          id: player.id,
          name: player.name || '匿名玩家',
          totalGames: 0,
          wins: 0,
          totalScore: 0
        };
      }
      const stat = playerStats[player.id];
      stat.totalGames++;
      if (room.winnerId === player.id) {
        stat.wins++;
        stat.totalScore += player.score || 0;
      }
    }
  }

  // 转换为数组并排序
  const rankings = Object.values(playerStats).map(s => ({
    id: s.id,
    name: s.name,
    totalGames: s.totalGames,
    wins: s.wins,
    totalScore: s.totalScore,
    winRate: s.totalGames > 0 ? Math.round((s.wins / s.totalGames) * 100) : 0
  }));

  // 按不同维度排序
  switch (type) {
    case 'score':
      rankings.sort((a, b) => b.totalScore - a.totalScore);
      break;
    case 'winRate':
      rankings.sort((a, b) => {
        if (b.winRate !== a.winRate) return b.winRate - a.winRate;
        return b.wins - a.wins;
      });
      break;
    case 'wins':
    default:
      rankings.sort((a, b) => b.wins - a.wins);
      break;
  }

  return {
    code: 0,
    data: {
      type,
      rankings: rankings.slice(0, limit),
      total: rankings.length
    }
  };
}
