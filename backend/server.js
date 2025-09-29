require('dotenv').config();

const fastify = require('fastify')({ 
  logger: true,
  cors: {
    origin: ["http://localhost:3000"],
    credentials: true
  }
});
const { Server } = require('socket.io');
const axios = require('axios');

const { db, verifyFirebaseToken } = require('./config/firebase');
const redisClient = require('./config/redis');

fastify.register(require('@fastify/cors'), {
  origin: ["http://localhost:3000"],
  credentials: true
});

fastify.get('/health', async (request, reply) => {
  return { status: 'OK', timestamp: new Date().toISOString() };
});

fastify.get('/api/count', { preHandler: verifyFirebaseToken }, async (request, reply) => {
  try {
    const userId = request.user.uid;
    
    let count = await redisClient.getUserCount(userId);
    
    if (count === null) {
      const userDoc = await db.collection('userCounts').doc(userId).get();
      count = userDoc.exists ? (userDoc.data().count || 0) : 0;
      
      await redisClient.setUserCount(userId, count);
    }
    
    return { count, userId };
  } catch (error) {
    console.error('Error getting count:', error);
    reply.code(500).send({ error: 'Internal server error' });
  }
});

fastify.post('/api/count', { preHandler: verifyFirebaseToken }, async (request, reply) => {
  try {
    const userId = request.user.uid;
    const { count } = request.body;
    
    if (typeof count !== 'number') {
      reply.code(400).send({ error: 'Invalid count value' });
      return;
    }
    
    await redisClient.setUserCount(userId, count);
    
    await redisClient.publishCountUpdate(userId, count);
    
    return { success: true, count, userId };
  } catch (error) {
    console.error('Error updating count:', error);
    reply.code(500).send({ error: 'Internal server error' });
  }
});

fastify.post('/api/compute', { preHandler: verifyFirebaseToken }, async (request, reply) => {
  try {
    const { data } = request.body;
    
    console.log('Calling GPU service...');
    console.log('URL:', process.env.GPU_SERVICE_URL);
    console.log('Token:', process.env.GPU_SERVICE_TOKEN ? 'SET' : 'NOT SET');
    
    const response = await axios.post(`${process.env.GPU_SERVICE_URL}/compute`, {
      data: data || 'test computation'
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.GPU_SERVICE_TOKEN}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });
    
    console.log('GPU service responded successfully');
    
    return {
      success: true,
      result: response.data,
      userId: request.user.uid
    };
  } catch (error) {
    console.error('Error calling GPU service:', error.message);
    console.error('Response data:', error.response?.data);
    console.error('Response status:', error.response?.status);
    reply.code(500).send({ 
      error: 'GPU service unavailable',
      details: error.message 
    });
  }
});

const start = async () => {
  try {
    await redisClient.connect();
    
    const address = await fastify.listen({ 
      port: process.env.PORT || 3001, 
      host: '0.0.0.0' 
    });
    
    console.log(`Server running at ${address}`);
    
    const io = new Server(fastify.server, {
      cors: {
        origin: ["http://localhost:3000"],
        methods: ["GET", "POST"],
        credentials: true
      }
    });
    
    io.on('connection', (socket) => {
      console.log('Client connected:', socket.id);
      
      socket.on('buttonClick', async (data) => {
        try {
          const { userId, count } = data;
          
          if (!userId || typeof count !== 'number') {
            socket.emit('error', { message: 'Invalid data format' });
            return;
          }
          
          await redisClient.setUserCount(userId, count);
        
          await redisClient.publishCountUpdate(userId, count);
          
          console.log(`Count updated for user ${userId}: ${count}`);
        } catch (error) {
          console.error('Error handling button click:', error);
          socket.emit('error', { message: 'Failed to update count' });
        }
      });
      
      socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
      });
    });
    
    await redisClient.subscribeToCountUpdates((message) => {
      try {
        const update = JSON.parse(message);
        io.emit('countUpdated', update);
        console.log(`Broadcasted count update:`, update);
      } catch (error) {
        console.error('Error broadcasting count update:', error);
      }
    });
    
    process.on('SIGTERM', async () => {
      console.log('Received SIGTERM, shutting down gracefully...');
      await redisClient.disconnect();
      await fastify.close();
      process.exit(0);
    });
    
  } catch (err) {
    console.error('Error starting server:', err);
    process.exit(1);
  }
};

start();