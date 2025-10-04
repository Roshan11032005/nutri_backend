import { createClient } from "redis";

const redisClient = createClient({
  username: process.env.REDIS_USERNAME || "default",
  password: process.env.REDIS_PASSWORD,
  socket: {
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT, 10),
  },
});

redisClient.on("error", (err) => console.error("Redis Client Error", err));

await redisClient.connect();

console.log("✅ Redis connected successfully");

export default redisClient;
