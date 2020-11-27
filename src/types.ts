import { Request, Response } from 'express';
import { SessionData } from "express-session";
import { Redis } from 'ioredis';

declare module 'express-session' {
  interface SessionData {
      userId: number;
  }
}

export type MyContext = {
  req: Request & {session: SessionData};
  redis: Redis;
  res: Response;
};
