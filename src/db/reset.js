const fs = require("fs");

const { closeDatabase, resolveDatabasePath } = require("./connection");
const { setupDatabase } = require("./setup");

function resetDatabase() {
  closeDatabase();

  const databasePath = resolveDatabasePath();

  if (fs.existsSync(databasePath)) {
    fs.unlinkSync(databasePath);
  }

  setupDatabase();
  console.log("Database reset complete.");
}

if (require.main === module) {
  resetDatabase();
}

module.exports = { resetDatabase };
