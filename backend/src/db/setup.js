const { getDatabase, closeDatabase, resolveDatabasePath } = require("./connection");
const { createBaseTables } = require("./schema");
const { seedDatabase } = require("./seed");

function setupDatabase() {
  const db = getDatabase();

  createBaseTables(db);
  seedDatabase(db);

  console.log(`Database ready at ${resolveDatabasePath()}`);
}

if (require.main === module) {
  try {
    setupDatabase();
  } finally {
    closeDatabase();
  }
}

module.exports = { setupDatabase };
