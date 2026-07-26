const AdminAuditLogger = require("../utils/adminAuditLogger");
const { pool } = require("../config/db");

const adminLogger = new AdminAuditLogger(pool);

function withAdminAudit(actionType, resourceType) {
  return (req, res, next) => {
    res.on("finish", () => {
      const adminId = req.user?.id;
      const clientIp =
        req.headers["x-forwarded-for"]?.split(",")[0] ||
        req.connection?.remoteAddress ||
        "unknown";
      const resourceId = req.params.id
        ? Number(req.params.id)
        : res.locals.body?.electionId || null;
      const body = res.locals.body || req.body || {};
      if (res.statusCode < 400) {
        adminLogger.logAdminAction(
          adminId,
          actionType,
          resourceType,
          resourceId,
          body,
          { ipAddress: clientIp, userAgent: req.get("user-agent") },
        );
      } else {
        adminLogger.logFailedAction(
          adminId,
          actionType,
          resourceType,
          resourceId,
          body,
          { ipAddress: clientIp },
        );
      }
    });
    next();
  };
}

module.exports = { withAdminAudit };
