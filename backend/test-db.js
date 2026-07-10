const { testConnection, initializeDatabase } = require('./config/db');

async function runTests() {
  try {
    // Test database connection
    console.log('Testing database connection...');
    await testConnection();
    console.log('Connection test successful!');
    
    // Initialize database schema
    console.log('\nInitializing database schema...');
    await initializeDatabase();
    console.log('Database schema initialized successfully!');
    
    console.log('\nAll database tests completed successfully!');
  } catch (error) {
    console.error('Database test failed:', error);
    process.exit(1);
  }
}

runTests();