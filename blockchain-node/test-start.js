// Test script to diagnose blockchain node issues
console.log('Starting test...');

try {
    console.log('Loading dependencies...');
    const express = require('express');
    const bodyParser = require('body-parser');
    const cors = require('cors');
    const crypto = require('crypto-js');
    const http = require('http');
    const socketIo = require('socket.io');
    const Blockchain = require('./blockchain');
    const Block = require('./block');
    
    console.log('Dependencies loaded successfully');
    
    console.log('Creating blockchain instance...');
    const blockchain = new Blockchain('test-node');
    console.log('Blockchain instance created');
    
    console.log('Creating express app...');
    const app = express();
    app.use(bodyParser.json());
    app.use(cors());
    
    console.log('Creating HTTP server...');
    const server = http.createServer(app);
    
    console.log('Setting up routes...');
    app.get('/test', (req, res) => {
        res.json({ message: 'Test successful' });
    });
    
    console.log('Starting server...');
    server.listen(3001, () => {
        console.log('✓ Server is running on port 3001');
        console.log('Test successful - all components working');
    });
    
    // Keep process alive
    setInterval(() => {
        console.log('Server still running...');
    }, 5000);
    
} catch (error) {
    console.error('ERROR:', error);
    console.error('Stack:', error.stack);
    process.exit(1);
}
