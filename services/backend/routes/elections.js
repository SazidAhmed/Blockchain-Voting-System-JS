const router = require("express").Router();
router.use("/", require("./elections/crud"));
router.use("/", require("./elections/candidates"));
router.use("/", require("./elections/voting"));
router.use("/", require("./elections/results"));
module.exports = router;
