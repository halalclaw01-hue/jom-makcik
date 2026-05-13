const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");

const { config } = require("../config/env");

let database;

function resolveDatabasePath() {
  return path.resolve(process.cwd(), config.databasePath);
}

function getDatabase() {
  if (!database) {
    const databasePath = resolveDatabasePath();
    fs.mkdirSync(path.dirname(databasePath), { recursive: true });

    database = new Database(databasePath);
    database.pragma("foreign_keys = ON");
  }

  return database;
}

function closeDatabase() {
  if (database) {
    database.close();
    database = undefined;
  }
}

module.exports = { getDatabase, closeDatabase, resolveDatabasePath };
