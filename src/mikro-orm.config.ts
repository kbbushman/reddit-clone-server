import path from 'path';
import { __prod__ } from "./constants";
import { Post } from "./entities/Post";
import { MikroORM } from '@mikro-orm/core';

export default {
  migrations: {
    path: path.join(__dirname, './migrations'),
    pattern: /^[\w-]+\d+\.[tj]s$/,
  },
  entities: [Post],
  dbName: "redditclone",
  user: "kennybushman",
  type: "postgresql",
  debug: !__prod__,
} as Parameters<typeof MikroORM.init>[0]; // This returns an array of accepted parameters for MikroORM.init()
