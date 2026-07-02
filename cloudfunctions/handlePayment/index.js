// 诡谜局 V2 - 支付处理云函数
// 双模式：微信 Native 扫码支付（生产） / 模拟支付（开发降级）
const cloudbase = require('@cloudbase/node-sdk');
const app = cloudbase.init({ env: cloudbase.SYMBOL_CURRENT_ENV });
const db = app.database();

// ============ 支付模式配置 ============
// 设为 true 启用微信 Native 扫码支付（需先在集成中心创建微信支付集成）
// 设为 false 使用模拟支付（开发/测试环境）
const USE_WECHAT_PAY = !!process.env.WECHAT_PAY_FUNCTION_NAME;

// 微信支付云函数名（在 CloudBase 集成中心创建微信支付后自动生成，如 "pay-common"）
const WECHAT_PAY_FN = process.env.WECHAT_PAY_FUNCTION_NAME || 'pay-common';

// ============ 商品定义 ============
const PRODUCTS = {
  // 兑换码解锁全部内容（唯一付费商品）
  unlock_all_90: { name: '解锁全部谜题', amount: 699, description: '解锁所有谜题与多人联机功能', type: 'unlock', reward: {} }
};

// ============ 主入口 ============
exports.main = async (event, context) => {
  const { action } = event;

  switch (action) {
    case 'createOrder':
      return createOrder(event, context);
    case 'checkOrder':
      return checkOrder(event, context);
    case 'getProducts':
      return getProducts();
    case 'paymentCallback':
      return paymentCallback(event, context);
    case 'redeemCode':
      return redeemCode(event, context);
    case 'generateCodes':
      return generateCodes(event, context);
    case 'queryBatch':
      return queryBatch(event, context);
    case 'mockPay':
      return mockPay(event, context);
    default:
      return { code: -1, message: '未知操作' };
  }
};

// ============ 获取商品列表 ============
async function getProducts() {
  const products = Object.entries(PRODUCTS).map(([productId, info]) => ({
    productId,
    name: info.name,
    amount: info.amount,
    description: info.description
  }));
  return { code: 0, data: { products } };
}

// ============ 创建订单 ============
async function createOrder(event, context) {
  const { productId } = event;
  const openid = context.OPENID || 'anonymous';

  const product = PRODUCTS[productId];
  if (!product) {
    return { code: -1, message: '商品不存在' };
  }

  try {
    const orderId = 'ORD' + Date.now() + Math.random().toString(36).substr(2, 6);

    // 写入订单
    await db.collection('orders').add({
      _openid: openid,
      orderId,
      productId,
      amount: product.amount,
      description: product.description,
      status: 'pending',
      createdAt: new Date(),
      paidAt: null,
      payChannel: USE_WECHAT_PAY ? 'wechat_native' : 'mock'
    });

    if (USE_WECHAT_PAY) {
      // ===== 微信 Native 扫码支付 =====
      try {
        const payResult = await app.callFunction({
          name: WECHAT_PAY_FN,
          data: {
            action: 'nativeOrder',
            orderId,
            amount: product.amount,
            description: product.description,
            openid
          }
        });

        if (payResult.result && payResult.result.code_url) {
          return {
            code: 0,
            data: {
              orderId,
              codeUrl: payResult.result.code_url,  // 前端渲染为二维码
              payChannel: 'wechat_native'
            }
          };
        }

        // 微信支付调用失败，回退模拟支付
        console.warn('微信支付返回异常，回退模拟支付:', JSON.stringify(payResult));
      } catch (wechatErr) {
        console.warn('微信支付调用失败，回退模拟支付:', wechatErr.message);
      }
    }

    // ===== 模拟支付（开发降级） =====
    const paymentUrl = `https://ai-native-d6gdsx2agc8c46199-1448179936.tcloudbaseapp.com/pay-confirm.html?orderId=${orderId}`;

    return {
      code: 0,
      data: {
        orderId,
        paymentUrl,
        payChannel: 'mock'
      }
    };
  } catch (e) {
    console.error('创建订单失败:', e.message);
    return { code: -1, message: '创建订单失败: ' + e.message };
  }
}

// ============ 查询订单状态 ============
async function checkOrder(event, context) {
  const { orderId } = event;
  const openid = context.OPENID || 'anonymous';

  if (!orderId) {
    return { code: -1, message: '缺少订单ID' };
  }

  try {
    const result = await db.collection('orders')
      .where({ orderId, _openid: openid })
      .limit(1)
      .get();

    if (!result.data || result.data.length === 0) {
      return { code: -1, message: '订单不存在' };
    }

    const order = result.data[0];

    // 如果是微信支付订单且状态 pending，主动查询微信侧状态
    if (order.payChannel === 'wechat_native' && order.status === 'pending' && USE_WECHAT_PAY) {
      try {
        const queryResult = await app.callFunction({
          name: WECHAT_PAY_FN,
          data: {
            action: 'queryOrder',
            orderId
          }
        });
        if (queryResult.result && queryResult.result.trade_state === 'SUCCESS') {
          await markOrderPaid(orderId, openid);
          order.status = 'paid';
        }
      } catch (e) {
        console.warn('查询微信支付状态失败:', e.message);
      }
    }

    if (order.status === 'paid') {
      // 确认已支付，发放奖励
      await deliverReward(openid, order.productId);
      return { code: 0, data: { paid: true } };
    }

    return { code: 0, data: { paid: false } };
  } catch (e) {
    console.error('查询订单失败:', e.message);
    return { code: -1, message: '查询失败: ' + e.message };
  }
}

// ============ 微信支付回调（由集成中心生成的支付云函数触发） ============
async function paymentCallback(event, context) {
  const { orderId, trade_state, transaction_id } = event;

  if (!orderId) {
    return { code: -1, message: '缺少订单ID' };
  }

  try {
    if (trade_state === 'SUCCESS') {
      // 查找订单
      const result = await db.collection('orders')
        .where({ orderId })
        .limit(1)
        .get();

      if (!result.data || result.data.length === 0) {
        return { code: -1, message: '订单不存在' };
      }

      const order = result.data[0];
      if (order.status === 'paid') {
        return { code: 0, message: '订单已处理' };
      }

      // 标记已支付
      await markOrderPaid(orderId, order._openid, transaction_id);

      // 发放奖励
      await deliverReward(order._openid, order.productId);

      console.log('支付回调处理成功:', orderId, transaction_id);
      return { code: 0, message: 'success' };
    }

    return { code: 0, message: '非成功状态: ' + trade_state };
  } catch (e) {
    console.error('支付回调处理失败:', e.message);
    return { code: -1, message: '回调处理失败' };
  }
}

// ============ 标记订单已支付 ============
async function markOrderPaid(orderId, openid, transactionId) {
  const updateData = {
    status: 'paid',
    paidAt: new Date()
  };
  if (transactionId) {
    updateData.transactionId = transactionId;
  }
  await db.collection('orders')
    .where({ orderId, _openid: openid })
    .update(updateData);
}

// ============ 发放奖励 ============
async function deliverReward(openid, productId, accountId) {
  const product = PRODUCTS[productId];
  if (!product) return;

  try {
    // 防重：检查是否已发放
    const alreadyDelivered = await db.collection('orders')
      .where({ _openid: openid, productId, status: 'paid', rewardDelivered: true })
      .limit(1)
      .get();
    if (alreadyDelivered.data && alreadyDelivered.data.length > 0) {
      console.log('奖励已发放，跳过:', openid, productId);
      return;
    }

    if (product.type === 'unlock') {
      await ensureUnlock(openid, productId, accountId);
    }

    // 标记奖励已发放
    await db.collection('orders')
      .where({ _openid: openid, productId, status: 'paid' })
      .update({ rewardDelivered: true });

    console.log('奖励发放成功:', openid, productId);
  } catch (e) {
    console.error('发放奖励失败:', e.message);
  }
}

// ============ 确认解锁 ============
// 统一 productId = 'unlock_all_90'（V1/V2 通用）
async function ensureUnlock(openid, productId, accountId) {
  // 统一映射：所有解锁产品都写入标准 productId
  const unifiedProductId = 'unlock_all_90';
  
  try {
    const existing = await db.collection('user_unlocks')
      .where({ _openid: openid, productId: unifiedProductId })
      .limit(1)
      .get();

    if (existing.data && existing.data.length > 0) {
      return;
    }

    const record = {
      _openid: openid,
      productId: unifiedProductId,
      unlockedAt: new Date()
    };
    // 同时写入 accountId，方便前端用用户名查询
    if (accountId) {
      record.accountId = accountId;
    }

    await db.collection('user_unlocks').add(record);

    console.log('用户解锁成功:', openid, productId, accountId || '');
  } catch (e) {
    console.error('写入解锁记录失败:', e.message);
  }
}

// ============ 模拟支付（pay-confirm.html 调用） ============
async function mockPay(event, context) {
  const { orderId } = event;
  const openid = context.OPENID || 'anonymous';
  const accountId = event._accountId || '';

  if (!orderId) {
    return { code: -1, message: '缺少订单ID' };
  }

  try {
    // 查找订单
    const result = await db.collection('orders')
      .where({ orderId })
      .limit(1)
      .get();

    if (!result.data || result.data.length === 0) {
      return { code: -1, message: '订单不存在' };
    }

    const order = result.data[0];
    if (order.status === 'paid') {
      // 已支付，直接发放奖励
      await deliverReward(order._openid, order.productId, accountId);
      return { code: 0, message: '解锁成功' };
    }

    // 标记已支付
    await db.collection('orders')
      .where({ orderId })
      .update({ status: 'paid', paidAt: new Date() });

    // 发放奖励
    await deliverReward(order._openid || openid, order.productId, accountId);

    console.log('模拟支付成功:', orderId, openid);
    return { code: 0, message: '支付成功，谜题已解锁' };
  } catch (e) {
    console.error('模拟支付失败:', e.message);
    return { code: -1, message: '支付失败: ' + e.message };
  }
}

// ============ 兑换码系统 ============

/**
 * 兑换码验证与使用
 * @param {string} code - 用户输入的兑换码
 */
async function redeemCode(event, context) {
  const { code } = event;

  // 🔑 获取用户标识（优先级：前端传入 > context.OPENID > Node SDK）
  let openid = event._uid || context.OPENID || context.openid;
  if (!openid && context.userInfo) {
    openid = context.userInfo.openId || context.userInfo.uid;
  }
  // Node SDK 兜底
  if (!openid) {
    try {
      const { userInfo } = await app.auth().getUserInfo();
      if (userInfo) {
        openid = userInfo.uid || userInfo.openId;
      }
    } catch (authErr) {
      console.error('app.auth().getUserInfo() 失败:', authErr.message);
    }
  }

  console.log('redeemCode 诊断:', JSON.stringify({
    'event._uid': event._uid,
    'event._loginType': event._loginType,
    'context.OPENID': context.OPENID,
    'final_openid': openid
  }));

  if (!code) {
    return { code: -1, message: '请输入兑换码' };
  }
  if (!openid) {
    console.error('redeemCode: 所有方式均无法获取用户 openid');
    return { code: -1, message: '登录状态异常，请刷新页面后重试' };
  }

  console.log('最终使用 openid:', openid);

  try {
    // 查找兑换码
    const result = await db.collection('redeem_codes')
      .where({ code: code.toUpperCase() })
      .limit(1)
      .get();

    if (!result.data || result.data.length === 0) {
      return { code: -1, message: '兑换码不存在' };
    }

    const redeemCode = result.data[0];

    // 检查状态
    if (redeemCode.status === 'used') {
      // 如果已使用，记录是谁在用（用于防举报追溯）
      console.log('⚠️ 兑换码已被使用，尝试使用人:', openid, '原始使用者:', redeemCode.usedBy);
      return { code: -1, message: '该兑换码已被使用' };
    }
    if (redeemCode.status === 'disabled') {
      return { code: -1, message: '该兑换码已失效' };
    }

    // 检查是否过期（如果有有效期）
    if (redeemCode.expireAt && new Date(redeemCode.expireAt) < new Date()) {
      return { code: -1, message: '兑换码已过期' };
    }

    // 标记为已使用（含完整追溯信息）
    // 避免 redeemedContext 原值为 null 导致嵌套写入失败
    await db.collection('redeem_codes')
      .doc(redeemCode._id)
      .update({
        status: 'used',
        usedBy: openid,
        usedAt: new Date(),
        // 追溯信息写到顶级字段，不受原 null 值影响
        redeemTimestamp: new Date().toISOString(),
        redeemUserAgent: context.USER_AGENT || 'unknown',
        redeemClientIp: context.CLIENT_IP || 'unknown'
      });

    // 发放奖励：解锁全部谜题（统一 productId = 'unlock_all_90'）
    await ensureUnlock(openid, 'unlock_all_90', event._accountId || '');

    // 详细日志：关键追溯依据
    console.log('✅ 兑换码使用成功:', JSON.stringify({
      code,
      openid,
      batchId: redeemCode.batchId || 'N/A',
      channel: redeemCode.channel || 'N/A',
      buyerNote: redeemCode.buyerNote || 'N/A',
      soldAt: redeemCode.soldAt || 'N/A',
      usedAt: new Date().toISOString()
    }));

    return { code: 0, message: '兑换成功！全部谜题已解锁' };
  } catch (e) {
    console.error('兑换码处理失败:', e.message);
    return { code: -1, message: '兑换失败: ' + e.message };
  }
}

/**
 * 批量生成兑换码（管理后台使用）
 * @param {number} count - 生成数量，默认10
 * @param {string} prefix - 前缀，默认 "GMJ"
 * @param {string} channel - 销售渠道: wechat/xianyu/taobao/other
 * @param {string} buyerNote - 买家备注（微信昵称/闲鱼ID等）
 * @param {string} adminKey - 管理密钥，防止滥用
 */
async function generateCodes(event, context) {
  const { count = 10, prefix = 'GMJ', channel = 'other', buyerNote = '', adminKey } = event;

  // 简单管理密钥保护
  const ADMIN_KEY = process.env.ADMIN_KEY || 'guimiju2026';
  if (adminKey !== ADMIN_KEY) {
    return { code: -1, message: '无权限' };
  }

  // 生成批次号：前缀+日期+随机码
  const batchId = prefix + '-' + new Date().toISOString().slice(0, 10).replace(/-/g, '') + '-' + Math.random().toString(36).substr(2, 4).toUpperCase();

  const codes = [];
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 去掉易混淆字符

  for (let i = 0; i < count; i++) {
    let code = '';
    for (let j = 0; j < 8; j++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    code = prefix + '-' + code;

    try {
      await db.collection('redeem_codes').add({
        code,
        status: 'active',
        prefix,
        batchId,              // 批次号，用于追溯整批兑换码
        channel,              // 销售渠道
        buyerNote,            // 买家备注
        soldAt: buyerNote ? new Date() : null,  // 有买家信息才记录卖出时间
        createdAt: new Date(),
        createdBy: context.OPENID || 'admin',
        usedBy: null,
        usedAt: null,
        redeemedContext: null, // 兑换时填充上下文
        expireAt: null        // 永不过期
      });
      codes.push(code);
    } catch (e) {
      // 重复跳过
      if (e.code === 'DUPLICATE_KEY' || e.message.includes('duplicate')) {
        i--; continue;
      }
      console.error('生成兑换码失败:', code, e.message);
    }
  }

  console.log('批量生成兑换码:', JSON.stringify({
    batchId,
    channel,
    buyerNote,
    count: codes.length
  }));

  return { code: 0, data: { codes, count: codes.length, batchId, channel } };
}

/**
 * 查询兑换码批次（管理后台使用）
 */
async function queryBatch(event, context) {
  const { batchId, adminKey } = event;

  const ADMIN_KEY = process.env.ADMIN_KEY || 'guimiju2026';
  if (adminKey !== ADMIN_KEY) {
    return { code: -1, message: '无权限' };
  }

  try {
    const result = await db.collection('redeem_codes')
      .where({ batchId })
      .orderBy('createdAt', 'asc')
      .get();

    const codes = (result.data || []).map(c => ({
      code: c.code,
      status: c.status,
      channel: c.channel,
      buyerNote: c.buyerNote,
      soldAt: c.soldAt,
      usedBy: c.usedBy,
      usedAt: c.usedAt,
      createdAt: c.createdAt,
      redeemedContext: c.redeemedContext
    }));

    const stats = {
      total: codes.length,
      active: codes.filter(c => c.status === 'active').length,
      used: codes.filter(c => c.status === 'used').length,
      disabled: codes.filter(c => c.status === 'disabled').length
    };

    return { code: 0, data: { batchId, stats, codes } };
  } catch (e) {
    console.error('查询批次失败:', e.message);
    return { code: -1, message: '查询失败: ' + e.message };
  }
}
