import { Ratelimit } from "@upstash/ratelimit";
import { Context, Hono } from "hono";
import { env } from "hono/adapter";
import { BlankInput, Env } from "hono/types";
const app = new Hono();

const cache = new Map<string, string>();

// creating class instance
class RedisRateLimiter {
  static Instance: Ratelimit;
  static getInstance(c: Context<Env, "/todos/:id", BlankInput>) {
    // following singelton pattern
    if (!this.Instance) {
      const {REDIS_URL, REDIS_TOKEN} = env<{
        REDIS_URL: string;
        REDIS_TOKEN: string;
      }>(c);
    } else {
      return this.Instance;
    }
  }
}

app.get("/todos", (c) => {
  return c.json({ todos: [] });
});

export default app;
