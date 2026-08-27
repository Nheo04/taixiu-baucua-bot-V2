// Quản lý "phòng chơi" đang diễn ra theo channelId.
// Vì chỉ chạy 1 process nên lưu thẳng trong bộ nhớ (Map) là đủ;
// lưu ý: nếu bot restart giữa ván, ván đang chơi sẽ bị mất (không có ai chờ kết quả nữa).

const sessions = new Map(); // channelId -> session object

function getSession(channelId) {
  return sessions.get(channelId);
}

function createSession(channelId, session) {
  sessions.set(channelId, session);
  return session;
}

function endSession(channelId) {
  const session = sessions.get(channelId);
  if (session?.intervalId) clearInterval(session.intervalId);
  sessions.delete(channelId);
}

module.exports = { getSession, createSession, endSession };
