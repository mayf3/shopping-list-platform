import { closeDb, initializeDatabase } from './db.js';
import { config } from './config.js';

initializeDatabase();

console.log(`Seed complete: ${config.databasePath}`);
console.log(`Users ensured: ${config.adminUsername}, ${config.familyUsername}`);

closeDb();

