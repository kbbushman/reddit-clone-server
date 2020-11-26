import { EntityManager, IDatabaseDriver, Connection } from "@mikro-orm/core";
import { Request, Response } from 'express';
import { SessionData } from "express-session";
import { Redis } from 'ioredis';

declare module 'express-session' {
  interface SessionData {
      userId: number;
  }
}

export type MyContext = {
  em: EntityManager<any> & EntityManager<IDatabaseDriver<Connection>>;
  req: Request & {session: SessionData};
  redis: Redis;
  res: Response;
};
