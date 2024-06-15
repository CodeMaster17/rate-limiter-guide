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

// creating class instance
class RedisRateLimiter {
  static Instance: Ratelimit;
  static getInstance(c: Context<Env, "/todos/:id", BlankInput>) {
    // following singelton pattern
    if (!this.Instance) {
      const { REDIS_URL, REDIS_TOKEN } = env<{
        REDIS_URL: string;
        REDIS_TOKEN: string;
      }>(c);

      // access the database
      const redisClient = new Redis({
        token: REDIS_TOKEN,
        url: REDIS_URL,
      });

      const rateLimit = new Ratelimit({
        redis: redisClient,
        limiter: Ratelimit.slidingWindow(10, "10 s"), // sliding window algorithm will be used to do the rate limiting
        ephemeralCache: cache,
      });
    } else {
      return this.Instance;
    }
  }
}

// middleware to set the rateLimiter in the context
app.use(async (c, next) => {
  const ratelimit = RedisRateLimiter.getInstance(c);
  if (ratelimit) {
    c.set('ratelimit', ratelimit);
  }
  await next();
});

app.get("/todos/:id", (c) => {

  

  const todoId = c.req.param("id");
  const todoIndex = Number(todoId);
  const todo = todos[todoIndex] || {};
  return c.json({ todos: [] });
});

export default app;
