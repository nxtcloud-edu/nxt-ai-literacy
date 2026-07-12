// Lambda 인스턴스별 메모리에만 적용되며 콜드스타트 때 초기화된다.
// 완전한 남용 방지가 아니라 짧은 시간의 반복 요청을 줄이는 완화책이다.
function createSlidingWindowLimiter({ limit, windowMs, now = Date.now }) {
  const entries = new Map();

  function prune(currentTime) {
    const cutoff = currentTime - windowMs;
    for (const [key, timestamps] of entries) {
      const active = timestamps.filter((timestamp) => timestamp > cutoff);
      if (active.length) entries.set(key, active);
      else entries.delete(key);
    }
  }

  function consume(key) {
    const currentTime = now();
    prune(currentTime);
    const timestamps = entries.get(key) || [];
    if (timestamps.length >= limit) return false;
    timestamps.push(currentTime);
    entries.set(key, timestamps);
    return true;
  }

  return { consume, size: () => entries.size };
}

function clientIp(req) {
  const forwarded = req.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return req.ip;
}

module.exports = { clientIp, createSlidingWindowLimiter };
