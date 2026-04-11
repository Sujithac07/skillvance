const UAParser = require('ua-parser-js');

function normalizeText(value) {
 return String(value || '').trim();
}

function getClientIp(req) {
 const forwarded = req.headers['x-forwarded-for'];
 if (typeof forwarded === 'string' && forwarded.length > 0) {
 return forwarded.split(',')[0].trim();
 }

 return req.socket?.remoteAddress || req.ip || 'unknown';
}

function classifySource(userAgent) {
 const ua = normalizeText(userAgent).toLowerCase();

 if (!ua) {
 return 'unknown';
 }

 if (ua.includes('windowspowershell') || ua.includes('curl/') || ua.includes('postmanruntime') || ua.includes('insomnia')) {
 return 'script';
 }

 return 'browser';
}

function buildLoginClientInfo(req) {
 const userAgent = normalizeText(req.get('user-agent'));
 const parser = new UAParser(userAgent);
 const parsed = parser.getResult();

 const browser = normalizeText(parsed.browser?.name) || 'Unknown';
 const browserVersion = normalizeText(parsed.browser?.version) || '';

 const osFromUa = normalizeText(parsed.os?.name);
 const osHint = normalizeText(req.get('sec-ch-ua-platform')).replace(/^"|"$/g, '');
 const os = osFromUa || osHint || 'Unknown';
 const osVersion = normalizeText(parsed.os?.version) || normalizeText(req.get('sec-ch-ua-platform-version')).replace(/^"|"$/g, '');

 const deviceTypeUa = normalizeText(parsed.device?.type);
 const mobileHint = normalizeText(req.get('sec-ch-ua-mobile'));
 const deviceType = deviceTypeUa || (mobileHint === '?1' ? 'mobile' : 'desktop');
 const deviceVendor = normalizeText(parsed.device?.vendor);
 const deviceModel = normalizeText(parsed.device?.model) || normalizeText(req.get('sec-ch-ua-model')).replace(/^"|"$/g, '');

 return {
 ipAddress: getClientIp(req),
 userAgent,
 browser,
 browserVersion,
 os,
 osVersion,
 deviceType,
 deviceVendor,
 deviceModel,
 source: classifySource(userAgent)
 };
}

module.exports = {
 buildLoginClientInfo
};
