const express = require("express");

const healthRouter = express.Router();

healthRouter.get("/", (req, res) => {
  res.json({
    status: "ok",
    service: "jom-makcik-careride-backend",
  });
});

module.exports = { healthRouter };
