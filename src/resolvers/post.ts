import { Post } from '../entities/Post';
import { Resolver, Query, Arg, Mutation, InputType, Field, Ctx } from 'type-graphql';
import { getConnection } from 'typeorm';
import { MyContext } from 'src/types';

@InputType()
class PostInput {
  @Field()
  title: string;

  @Field()
  text: string;
}

@Resolver()
export class PostResolver {
  @Query(() => [Post])
  posts(): Promise<Post[]> {
    return Post.find();
  }

  @Query(() => Post, {nullable: true})
  post(@Arg('id') id: number): Promise<Post | undefined> {
    return Post.findOne(id);
  }

  @Mutation(() => Post)
  async createPost(
    @Arg('input') input: PostInput,
    @Ctx() { req }: MyContext
  ): Promise<Post> {
    if (!req.session.userId) {
      throw new Error('Not authorized. Please login and try again');
    }

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
  async deletePost(@Arg('id') id: number): Promise<boolean> {
    await Post.delete(id);
    return true;
  }
}
