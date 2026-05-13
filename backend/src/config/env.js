require("dotenv").config();

function parseCorsOrigins(raw) {
  if (!raw) {
    // Development defaults — allow localhost
    return [
      "http://localhost:5173",
      "http://localhost:3000",
      "http://127.0.0.1:5173",
      "http://127.0.0.1:3000",
    ];
  }
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

const config = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT || 4000),
  databasePath: process.env.DATABASE_PATH || "./data/jom-makcik.sqlite",
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "8h",
  corsOrigins: parseCorsOrigins(process.env.CORS_ORIGINS),
};

module.exports = { config };
