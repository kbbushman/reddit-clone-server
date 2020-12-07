import { getConnection } from 'typeorm';
import {
  Resolver,
  Query,
  Arg,
  Mutation,
  InputType,
  Field,
  Ctx,
  UseMiddleware,
  Int,
  FieldResolver,
  Root,
  ObjectType,
} from 'type-graphql';
import { Post } from '../entities/Post';
import { MyContext } from '../types';
import { isAuth } from '../middleware/isAuth';
import { Updoot } from '../entities/Updoot';

@InputType()
class PostInput {
  @Field()
  title: string;

  @Field()
  text: string;
}

@ObjectType()
class PaginatedPosts {
  @Field(() => [Post])
  posts: Post[]

  @Field()
  hasMore: boolean;
}

@Resolver(Post)
export class PostResolver {
  @FieldResolver(() => String)
  textSnippet(
    @Root() root: Post
  ) {
    return root.text.slice(0, 50);
  }

  @Mutation(() => Boolean)
  @UseMiddleware(isAuth)
  async vote(
    @Arg('postId', () => Int) postId: number,
    @Arg('value', () => Int) value: number,
    @Ctx() { req }: MyContext
  ) {
    const isUpdoot = value !== -1;
    const realValue = isUpdoot ? 1 : -1;
    const { userId } = req.session;

    const updoot = await Updoot.findOne({where: {postId, userId}});

    // Current user has voted on the post already
    if (updoot && updoot.value !== realValue) {
      await getConnection().transaction(async (tm) => {
        await tm.query(`
          update updoot
          set value = $1
          where "postId" = $2 and "userId" = $3
        `, [realValue, postId, userId]);

        await tm.query(`
          update post
          set points = points + $1
          where id = $2
        `, [2 * realValue, postId]);
      });
    } else if (!updoot) {
      // Current user has not vote on this post
      await getConnection().transaction(async (tm) => {
        await tm.query(`
          insert into updoot ("userId", "postId", value)
          values($1, $2, $3)
        `, [userId, postId, realValue]);

        await tm.query(`
          update post
          set points = points + $1
          where id = $2
        `, [realValue, postId]);
      });
    }
    
    return true;
  }

  @Query(() => PaginatedPosts)
  async posts(
    @Arg('limit', () => Int) limit: number,
    // Cursor is a better option than offset in this application
    // Cursor is the current post createAt data. Returns all posts from cursor forward
    @Arg('cursor', () => String, {nullable: true}) cursor: string | null,
    @Ctx() { req }: MyContext
  ): Promise<PaginatedPosts> {
    const realLimit = Math.min(50, limit);
    const realLimitPlusOne = Math.min(50, limit) + 1;

    const replacements: any[] = [realLimitPlusOne];

    if (req.session.userId) {
      replacements.push(req.session.userId);
    }

    let cursorIndex = 3;
    if (cursor) {
      replacements.push(new Date(parseInt(cursor)));
      cursorIndex = replacements.length;
    }

    const posts = await getConnection().query(
      `
        select p.*,
        json_build_object(
          'id', u.id,
          'username',  u.username,
          'email', u.email,
          'createdAt', u."createdAt",
          'updatedAt', u."updatedAt"
        ) creator,
        ${req.session.userId ? '(select value from updoot where "userId" = $2 and "postId" = p.id) "voteStatus"' : 'null as "voteStatus"'}
        from post p
        inner join public.user u on u.id = p."creatorId"
        ${cursor ? `where p."createdAt" < $${cursorIndex}` : ''}
        order by p."createdAt" DESC
        limit $1
      `,
      replacements
    );

    // const qb = getConnection()
    //   .getRepository(Post)
    //   .createQueryBuilder('p')
    //   .innerJoinAndSelect(
    //     'p.creator',
    //     'u',
    //     'u.id = p."creatorId"',
    //     {isRemoved: false}
    //   )
    //   .orderBy('p."createdAt"', 'DESC')
    //   .take(realLimitPlusOne)

    // if (cursor) {
    //   qb.where('p."createdAt" < :cursor', {
    //     cursor: new Date(parseInt(cursor)),
    //   });
    // }

    // const posts = await qb.getMany();

    return {
      posts: posts.slice(0, realLimit),
      hasMore: posts.length === realLimitPlusOne,
    };
  }

  @Query(() => Post, {nullable: true})
  post(@Arg('id', () => Int) id: number): Promise<Post | undefined> {
    return Post.findOne(id, {relations: ['creator']});
  }

  @Mutation(() => Post)
  @UseMiddleware(isAuth)
  async createPost(
    @Arg('input') input: PostInput,
    @Ctx() { req }: MyContext
  ): Promise<Post> {
    const result = await getConnection()
      .createQueryBuilder()
      .insert()
      .into(Post)
      .values({
        ...input,
        creatorId: req.session.userId,
      })
      .returning('*')
      .execute();

    return result.raw[0];
  }

  @Mutation(() => Post)
  async updatePost(
    @Arg('id') id: number,
    @Arg('title', () => String, {nullable: true}) title: string
  ): Promise<Post | null> {
    const post = await Post.findOne(id);

    if (!post) {
      return null;
    }

    if (typeof title !== 'undefined') {
      await Post.update({ id }, { title });
    }

    return post;
  }

  @Mutation(() => Boolean)
  @UseMiddleware(isAuth)
  async deletePost(
    @Arg('id') id: number,
    @Ctx() { req }: MyContext
  ): Promise<boolean> {
    await Post.delete({id, creatorId: req.session.userId});
    return true;
  }
}
