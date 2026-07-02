// 诡谜局 V2 - 好友管理云函数
const cloudbase = require('@cloudbase/node-sdk');
const app = cloudbase.init({ env: cloudbase.SYMBOL_CURRENT_ENV });
const db = app.database();
const _ = db.command;

// ============ 辅助函数 ============
function getOpenid(context) {
  return (context.OPENID || 'anonymous').trim();
}

// 生成唯一请求 ID
function generateRequestId() {
  return 'fr_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
}

// ============ 主入口 ============
exports.main = async (event, context) => {
  const { action } = event;
  const openid = getOpenid(context);

  if (!openid) {
    return { code: -1, message: '请先登录' };
  }

  switch (action) {
    case 'searchUser':        return searchUser(event, openid);
    case 'sendRequest':       return sendRequest(event, openid);
    case 'acceptRequest':     return acceptRequest(event, openid);
    case 'rejectRequest':     return rejectRequest(event, openid);
    case 'removeFriend':      return removeFriend(event, openid);
    case 'getFriends':        return getFriends(openid);
    case 'getPendingRequests': return getPendingRequests(openid);
    case 'getSentRequests':   return getSentRequests(openid);
    case 'getUserProfile':    return getUserProfile(event, openid);
    default:
      return { code: -1, message: '未知操作: ' + action };
  }
};

// ============ 搜索用户（按昵称或ID） ============
async function searchUser(event, openid) {
  const { keyword } = event;
  if (!keyword || keyword.trim().length < 1) {
    return { code: -1, message: '请输入搜索关键词' };
  }

  const kw = keyword.trim();

  try {
    // 从 rooms 集合中收集用户信息（昵称和最近活跃时间）
    const rooms = await db.collection('rooms')
      .where(
        _.or([
          { 'players.name': db.RegExp({ regexp: kw, options: 'i' }) },
          { 'players.id': kw }
        ])
      )
      .orderBy('updatedAt', 'desc')
      .limit(10)
      .get();

    // 去重收集用户信息
    const userMap = {};
    for (const room of rooms.data || []) {
      for (const p of room.players || []) {
        // 按昵称模糊匹配 或 精确ID匹配
        if (userMap[p.id]) continue;
        const nameMatch = p.name && p.name.toLowerCase().includes(kw.toLowerCase());
        const idMatch = p.id === kw;
        if (nameMatch || idMatch) {
          userMap[p.id] = {
            id: p.id,
            name: p.name || '玩家',
            avatar: p.avatar || '🕵️',
            characterId: p.characterId || 'detective_m',
            lastSeen: room.updatedAt || room.createdAt || Date.now()
          };
        }
      }
    }

    // 也查 user_characters 获取装备的角色
    const users = Object.values(userMap);
    for (const u of users) {
      try {
        const charResult = await db.collection('user_characters')
          .where({ _openid: u.id, isEquipped: true })
          .limit(1)
          .get();
        if (charResult.data && charResult.data.length > 0) {
          u.characterId = charResult.data[0].characterId || u.characterId;
        }
      } catch (e) { /* ignore */ }
    }

    // 检查是否已经是好友
    if (users.length > 0) {
      const friends = await db.collection('user_friends')
        .where({ _openid: openid, friendId: _.in(users.map(u => u.id)), status: 'accepted' })
        .get();
      const friendIds = new Set((friends.data || []).map(f => f.friendId));
      for (const u of users) {
        u.isFriend = friendIds.has(u.id);
        // 检查是否有待处理的请求
        const pending = await db.collection('user_friends')
          .where({
            _openid: _.in([openid, u.id]),
            friendId: _.in([openid, u.id]),
            status: 'pending'
          })
          .get();
        u.hasPending = (pending.data || []).length > 0;
      }
    }

    return {
      code: 0,
      data: { users: users.filter(u => u.id !== openid) }  // 排除自己
    };
  } catch (err) {
    console.error('搜索用户失败:', err.message);
    return { code: -1, message: '搜索失败，请重试' };
  }
}

// ============ 发送好友请求 ============
async function sendRequest(event, openid) {
  const { targetId, message = '' } = event;
  if (!targetId) return { code: -1, message: '缺少目标用户ID' };
  if (targetId === openid) return { code: -1, message: '不能添加自己为好友' };

  try {
    // 检查是否已经是好友
    const existingFriend = await db.collection('user_friends')
      .where({
        _openid: openid,
        friendId: targetId,
        status: 'accepted'
      })
      .limit(1)
      .get();
    if (existingFriend.data && existingFriend.data.length > 0) {
      return { code: -1, message: '已经是好友了' };
    }

    // 检查是否已有待处理请求（任意方向）
    const existingReq = await db.collection('user_friends')
      .where({
        _openid: _.in([openid, targetId]),
        friendId: _.in([openid, targetId]),
        status: 'pending'
      })
      .limit(1)
      .get();
    if (existingReq.data && existingReq.data.length > 0) {
      // 如果对方已经向我发了好友请求，自动接受
      const req = existingReq.data[0];
      if (req._openid === targetId && req.friendId === openid) {
        await db.collection('user_friends')
          .where({ requestId: req.requestId })
          .update({ status: 'accepted', acceptedAt: Date.now(), updatedAt: Date.now() });
        return { code: 0, data: { status: 'accepted', message: '你们互相添加了对方，已成为好友！' } };
      }
      return { code: -1, message: '已存在待处理的好友请求' };
    }

    // 获取请求者昵称
    let requesterName = '玩家';
    try {
      const roomResult = await db.collection('rooms')
        .where({ 'players.id': openid })
        .orderBy('updatedAt', 'desc')
        .limit(1)
        .get();
      if (roomResult.data && roomResult.data.length > 0) {
        const player = roomResult.data[0].players.find(p => p.id === openid);
        if (player) requesterName = player.name || '玩家';
      }
    } catch (e) { /* ignore */ }

    const requestId = generateRequestId();
    const now = Date.now();

    // 创建好友请求记录
    await db.collection('user_friends').add({
      _openid: openid,
      requestId,
      friendId: targetId,
      requesterName,
      status: 'pending',
      message: message.slice(0, 50),
      createdAt: now,
      updatedAt: now
    });

    return {
      code: 0,
      data: { status: 'pending', message: '好友请求已发送' }
    };
  } catch (err) {
    console.error('发送好友请求失败:', err.message);
    return { code: -1, message: '发送失败，请重试' };
  }
}

// ============ 接受好友请求 ============
async function acceptRequest(event, openid) {
  const { requestId } = event;
  if (!requestId) return { code: -1, message: '缺少请求ID' };

  try {
    const result = await db.collection('user_friends')
      .where({ requestId, friendId: openid, status: 'pending' })
      .limit(1)
      .get();

    if (!result.data || result.data.length === 0) {
      return { code: -1, message: '好友请求不存在或已过期' };
    }

    const req = result.data[0];
    const now = Date.now();

    // 更新当前请求为已接受
    await db.collection('user_friends')
      .where({ requestId })
      .update({
        status: 'accepted',
        acceptedAt: now,
        updatedAt: now
      });

    // 为对方也创建双向好友记录
    const reverseExists = await db.collection('user_friends')
      .where({ _openid: req.friendId, friendId: req._openid, status: 'accepted' })
      .limit(1)
      .get();

    if (!reverseExists.data || reverseExists.data.length === 0) {
      await db.collection('user_friends').add({
        _openid: req.friendId,
        requestId: generateRequestId(),
        friendId: req._openid,
        requesterName: req.requesterName || '玩家',
        status: 'accepted',
        acceptedAt: now,
        createdAt: now,
        updatedAt: now
      });
    }

    return { code: 0, data: { status: 'accepted', message: '已成为好友！' } };
  } catch (err) {
    console.error('接受好友请求失败:', err.message);
    return { code: -1, message: '操作失败，请重试' };
  }
}

// ============ 拒绝好友请求 ============
async function rejectRequest(event, openid) {
  const { requestId } = event;
  if (!requestId) return { code: -1, message: '缺少请求ID' };

  try {
    await db.collection('user_friends')
      .where({ requestId, friendId: openid, status: 'pending' })
      .update({
        status: 'rejected',
        rejectedAt: Date.now(),
        updatedAt: Date.now()
      });

    return { code: 0, data: { message: '已拒绝' } };
  } catch (err) {
    console.error('拒绝好友请求失败:', err.message);
    return { code: -1, message: '操作失败' };
  }
}

// ============ 删除好友 ============
async function removeFriend(event, openid) {
  const { friendId } = event;
  if (!friendId) return { code: -1, message: '缺少好友ID' };

  try {
    // 删除双方的好友关系
    await db.collection('user_friends')
      .where({
        _openid: _.in([openid, friendId]),
        friendId: _.in([openid, friendId]),
        status: 'accepted'
      })
      .remove();

    return { code: 0, data: { message: '已删除好友' } };
  } catch (err) {
    console.error('删除好友失败:', err.message);
    return { code: -1, message: '操作失败' };
  }
}

// ============ 获取好友列表 ============
async function getFriends(openid) {
  try {
    const result = await db.collection('user_friends')
      .where({ _openid: openid, status: 'accepted' })
      .orderBy('updatedAt', 'desc')
      .get();

    const friends = result.data || [];

    // 补充好友的昵称和在线信息
    const enriched = [];
    for (const f of friends) {
      const info = {
        friendId: f.friendId,
        name: '玩家',
        avatar: '🕵️',
        characterId: 'detective_m',
        isOnline: false,
        since: f.acceptedAt || f.createdAt
      };

      // 从最近房间获取昵称
      try {
        const roomResult = await db.collection('rooms')
          .where({ 'players.id': f.friendId })
          .orderBy('updatedAt', 'desc')
          .limit(1)
          .get();
        if (roomResult.data && roomResult.data.length > 0) {
          const player = roomResult.data[0].players.find(p => p.id === f.friendId);
          if (player) {
            info.name = player.name || '玩家';
            info.avatar = player.avatar || '🕵️';
            info.characterId = player.characterId || 'detective_m';
            info.isOnline = player.isOnline || false;
          }
        }
      } catch (e) { /* ignore */ }

      enriched.push(info);
    }

    return { code: 0, data: { friends: enriched } };
  } catch (err) {
    console.error('获取好友列表失败:', err.message);
    return { code: -1, message: '获取好友列表失败' };
  }
}

// ============ 获取收到的待处理请求 ============
async function getPendingRequests(openid) {
  try {
    const result = await db.collection('user_friends')
      .where({ friendId: openid, status: 'pending' })
      .orderBy('createdAt', 'desc')
      .get();

    return {
      code: 0,
      data: {
        requests: (result.data || []).map(r => ({
          requestId: r.requestId,
          fromId: r._openid,
          fromName: r.requesterName || '玩家',
          message: r.message || '',
          createdAt: r.createdAt
        }))
      }
    };
  } catch (err) {
    console.error('获取好友请求失败:', err.message);
    return { code: -1, message: '获取失败' };
  }
}

// ============ 获取发出的待处理请求 ============
async function getSentRequests(openid) {
  try {
    const result = await db.collection('user_friends')
      .where({ _openid: openid, status: 'pending' })
      .orderBy('createdAt', 'desc')
      .get();

    return {
      code: 0,
      data: {
        requests: (result.data || []).map(r => ({
          requestId: r.requestId,
          toId: r.friendId,
          message: r.message || '',
          createdAt: r.createdAt
        }))
      }
    };
  } catch (err) {
    console.error('获取发出的请求失败:', err.message);
    return { code: -1, message: '获取失败' };
  }
}

// ============ 获取用户公开资料（游戏中点击查看） ============
async function getUserProfile(event, openid) {
  const { targetId } = event;
  if (!targetId) return { code: -1, message: '缺少目标用户ID' };

  try {
    // 从最近房间获取用户信息
    const roomResult = await db.collection('rooms')
      .where({ 'players.id': targetId })
      .orderBy('updatedAt', 'desc')
      .limit(1)
      .get();

    let userInfo = {
      id: targetId,
      name: '玩家',
      avatar: '🕵️',
      characterId: 'detective_m',
      isOnline: false,
      lastSeen: null
    };

    if (roomResult.data && roomResult.data.length > 0) {
      const player = roomResult.data[0].players.find(p => p.id === targetId);
      if (player) {
        userInfo.name = player.name || '玩家';
        userInfo.avatar = player.avatar || '🕵️';
        userInfo.characterId = player.characterId || 'detective_m';
        userInfo.isOnline = player.isOnline || false;
        userInfo.lastSeen = roomResult.data[0].updatedAt;
      }
    }

    // 获取装备的角色
    try {
      const charResult = await db.collection('user_characters')
        .where({ _openid: targetId, isEquipped: true })
        .limit(1)
        .get();
      if (charResult.data && charResult.data.length > 0) {
        userInfo.characterId = charResult.data[0].characterId || userInfo.characterId;
      }
    } catch (e) { /* ignore */ }

    // 检查好友关系
    const friendResult = await db.collection('user_friends')
      .where({
        _openid: openid,
        friendId: targetId,
        status: 'accepted'
      })
      .limit(1)
      .get();
    userInfo.isFriend = friendResult.data && friendResult.data.length > 0;

    // 检查是否有待处理请求
    const pendingResult = await db.collection('user_friends')
      .where({
        _openid: _.in([openid, targetId]),
        friendId: _.in([openid, targetId]),
        status: 'pending'
      })
      .limit(1)
      .get();
    userInfo.hasPending = pendingResult.data && pendingResult.data.length > 0;

    return { code: 0, data: { user: userInfo } };
  } catch (err) {
    console.error('获取用户资料失败:', err.message);
    return { code: -1, message: '获取失败' };
  }
}
