import { Hono } from "hono";
const app = new Hono();
app.get("/todos", (c) => {
  return c.json({ todos: [] });
});

export default app;
