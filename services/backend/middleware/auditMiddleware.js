const AdminAuditLogger = require("../utils/adminAuditLogger");
const { pool } = require("../config/db");

const adminLogger = new AdminAuditLogger(pool);

function withAdminAudit(actionType, resourceType) {
  return (req, res, next) => {
    const originalJson = res.json.bind(res);
    res.json = function (body) {
      const adminId = req.user?.id;
      const clientIp = req.headers['x-forwarded-for']?.split(',')[0] || req.connection?.remoteAddress || 'unknown';
      if (res.statusCode < 400) {
        adminLogger.logAdminAction(
          adminId,
          actionType,
          resourceType,
          {
            ...(req.body || {}),
            ...(req.params || {}),
            statusCode: res.statusCode,
          },
          { ipAddress: clientIp, userAgent: req.get('user-agent') }
        );
      } else {
        adminLogger.logFailedAction(
          adminId,
          actionType,
          resourceType,
          {
            ...(req.body || {}),
            error: body,
          },
          { ipAddress: clientIp }
        );
      }
      return originalJson(body);
    };
    next();
  };
}

module.exports = { withAdminAudit };
