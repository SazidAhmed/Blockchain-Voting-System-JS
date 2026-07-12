const fs = require('fs').promises;
const path = require('path');

// Define the data directory
const DATA_DIR = path.join(__dirname, '../data');

// Ensure data directory exists
async function ensureDataDir() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch (err) {
    if (err.code !== 'EEXIST') {
      throw err;
    }
  }
}

// Initialize the database with default collections
async function initializeDatabase() {
  try {
    console.log('Initializing file-based database...');
    await ensureDataDir();
    
    // Define collections
    const collections = ['users', 'elections', 'candidates', 'voter_registrations', 'vote_receipts'];
    
    // Create collection files if they don't exist
    for (const collection of collections) {
      const filePath = path.join(DATA_DIR, `${collection}.json`);
      try {
        await fs.access(filePath);
        console.log(`Collection ${collection} already exists`);
      } catch (err) {
        // File doesn't exist, create it with empty array
        await fs.writeFile(filePath, JSON.stringify([]));
        console.log(`Created collection ${collection}`);
      }
    }
    
    console.log('Database initialization complete');
    return true;
  } catch (err) {
    console.error('Error initializing database:', err);
    throw err;
  }
}

// Get all documents from a collection
async function getAll(collection) {
  try {
    const filePath = path.join(DATA_DIR, `${collection}.json`);
    const data = await fs.readFile(filePath, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error(`Error reading from ${collection}:`, err);
    return [];
  }
}

// Get a document by ID
async function getById(collection, id) {
  try {
    const items = await getAll(collection);
    return items.find(item => item.id === id) || null;
  } catch (err) {
    console.error(`Error getting item from ${collection}:`, err);
    return null;
  }
}

// Find documents by query
async function find(collection, query) {
  try {
    const items = await getAll(collection);
    return items.filter(item => {
      for (const [key, value] of Object.entries(query)) {
        if (item[key] !== value) {
          return false;
        }
      }
      return true;
    });
  } catch (err) {
    console.error(`Error finding items in ${collection}:`, err);
    return [];
  }
}

// Insert a document
async function insert(collection, document) {
  try {
    const items = await getAll(collection);
    
    // Generate ID if not provided
    if (!document.id) {
      document.id = Date.now().toString();
    }
    
    // Add created_at timestamp
    if (!document.created_at) {
      document.created_at = new Date().toISOString();
    }
    
    items.push(document);
    
    const filePath = path.join(DATA_DIR, `${collection}.json`);
    await fs.writeFile(filePath, JSON.stringify(items, null, 2));
    
    return document;
  } catch (err) {
    console.error(`Error inserting into ${collection}:`, err);
    throw err;
  }
}

// Update a document
async function update(collection, id, updates) {
  try {
    const items = await getAll(collection);
    const index = items.findIndex(item => item.id === id);
    
    if (index === -1) {
      return null;
    }
    
    // Add updated_at timestamp
    updates.updated_at = new Date().toISOString();
    
    // Update the document
    items[index] = { ...items[index], ...updates };
    
    const filePath = path.join(DATA_DIR, `${collection}.json`);
    await fs.writeFile(filePath, JSON.stringify(items, null, 2));
    
    return items[index];
  } catch (err) {
    console.error(`Error updating in ${collection}:`, err);
    throw err;
  }
}

// Delete a document
async function remove(collection, id) {
  try {
    const items = await getAll(collection);
    const filteredItems = items.filter(item => item.id !== id);
    
    if (filteredItems.length === items.length) {
      return false; // No item was removed
    }
    
    const filePath = path.join(DATA_DIR, `${collection}.json`);
    await fs.writeFile(filePath, JSON.stringify(filteredItems, null, 2));
    
    return true;
  } catch (err) {
    console.error(`Error deleting from ${collection}:`, err);
    throw err;
  }
}

module.exports = {
  initializeDatabase,
  getAll,
  getById,
  find,
  insert,
  update,
  remove
};