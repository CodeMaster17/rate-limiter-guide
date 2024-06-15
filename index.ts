import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis/cloudflare";
import { Context, Hono } from "hono";
import { env } from "hono/adapter";
import { BlankInput, Env } from "hono/types";
import { todos } from "./todos.json";

declare module "hono" {
  interface ContextVariableMap {
    ratelimit: Ratelimit;
  }
}

const app = new Hono();

const cache = new Map();

// Creating class instance
class RedisRateLimiter {
  static Instance: Ratelimit | null = null;
  static getInstance(c: Context<Env, "/todos/:id", BlankInput>): Ratelimit {
    // Following singleton pattern
    if (!this.Instance) {
      const { UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN } = env<{
        UPSTASH_REDIS_REST_URL: string;
        UPSTASH_REDIS_REST_TOKEN: string;
      }>(c);

      // Access the database
      const redisClient = new Redis({
        token: UPSTASH_REDIS_REST_TOKEN,
        url: UPSTASH_REDIS_REST_URL,
      });

      this.Instance = new Ratelimit({
        redis: redisClient,
        limiter: Ratelimit.slidingWindow(10, "10 s"), // Sliding window algorithm will be used to do the rate limiting
        ephemeralCache: cache,
      });
    }
    return this.Instance;
  }
}

// Middleware to set the rateLimiter in the context
app.use(async (c, next) => {
  const ratelimit = RedisRateLimiter.getInstance(c);
  c.set("ratelimit", ratelimit);
  await next();
});

app.get("/todos/:id", async (c) => {
  const ratelimit = c.get("ratelimit");
  const ip = c.req.raw.headers.get("cf-connecting-ip") || "anonymous";
  const { success } = await ratelimit.limit(ip);

  if (success) {
    const todoId = c.req.param("id");
    const todoIndex = Number(todoId);
    const todo = todos[todoIndex] || {};
    return c.json({ todo });
  } else {
    return c.json({ message: "Rate limit exceeded" }, { status: 429 });
  }
});

export default app;
