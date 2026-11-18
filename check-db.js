
const Database = require("better-sqlite3");

const db = new Database("campus_canteen.db");

const tables = db.prepare(`
    SELECT name
    FROM sqlite_master
    WHERE type = 'table'
    AND name NOT LIKE 'sqlite_%'
`).all();

console.log("DATABASE TABLES:");
console.table(tables);

for (const table of tables) {
    console.log("\nTABLE:", table.name);

    const rows = db.prepare(
        `SELECT * FROM "${table.name}" LIMIT 10`
    ).all();

    console.table(rows);
}

db.close();
