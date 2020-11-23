import { MikroORM } from '@mikro-orm/core';
import { __prod__ } from './constants';
import { Post } from './entities/Post';
import mikroOrmConfig from './mikro-orm.config';


const main = async () => {
  const orm = await MikroORM.init(mikroOrmConfig);
  await orm.getMigrator().up();

  // Test orm create
  // const post = orm.em.create(Post, {title: 'Post One'});
  // await orm.em.persistAndFlush(post);

  // Test orm find
  const posts = await orm.em.find(Post, {});
  console.log(posts);
};

main()
  .catch((err) => console.log(err));
