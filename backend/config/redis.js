const { createClient } = require('redis');

class RedisClient {
  constructor() {
    this.client = null;
    this.publisher = null;
    this.subscriber = null;
  }

  async connect() {
    try {
      this.client = createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379'
      });

      this.publisher = createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379'
      });

      this.subscriber = createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379'
      });

      await Promise.all([
        this.client.connect(),
        this.publisher.connect(),
        this.subscriber.connect()
      ]);

      console.log('Connected to Redis');

      this.client.on('error', (err) => console.error('Redis Client Error:', err));
      this.publisher.on('error', (err) => console.error('Redis Publisher Error:', err));
      this.subscriber.on('error', (err) => console.error('Redis Subscriber Error:', err));

    } catch (error) {
      console.error('Failed to connect to Redis:', error);
      throw error;
    }
  }

  async setUserCount(userId, count) {
    try {
      const key = `user_count:${userId}`;
      const ttl = parseInt(process.env.REDIS_TTL) || 300;
      
      await this.client.setEx(key, ttl, count.toString());
      return true;
    } catch (error) {
      console.error('Error setting user count in Redis:', error);
      return false;
    }
  }

  async getUserCount(userId) {
    try {
      const key = `user_count:${userId}`;
      const count = await this.client.get(key);
      return count ? parseInt(count) : null;
    } catch (error) {
      console.error('Error getting user count from Redis:', error);
      return null;
    }
  }

  async publishCountUpdate(userId, count) {
    try {
      const message = JSON.stringify({
        userId,
        count,
        timestamp: new Date().toISOString()
      });
      
      await this.publisher.publish('count_updates', message);
      return true;
    } catch (error) {
      console.error('Error publishing count update:', error);
      return false;
    }
  }

  async subscribeToCountUpdates(callback) {
    try {
      await this.subscriber.subscribe('count_updates', callback);
      console.log('Subscribed to count updates');
    } catch (error) {
      console.error('Error subscribing to count updates:', error);
    }
  }

  async disconnect() {
    try {
      await Promise.all([
        this.client?.disconnect(),
        this.publisher?.disconnect(),
        this.subscriber?.disconnect()
      ]);
      console.log('Disconnected from Redis');
    } catch (error) {
      console.error('Error disconnecting from Redis:', error);
    }
  }
}

module.exports = new RedisClient();