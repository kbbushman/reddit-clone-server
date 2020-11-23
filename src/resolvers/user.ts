import {
  Resolver,
  Mutation,
  Arg,
  Field,
  InputType,
  Ctx
} from 'type-graphql';
import argon2 from 'argon2';
import { MyContext } from '../types';
import { User } from '../entities/User';

// Alternative to adding each field to the @Arg() decorator
@InputType()
class UsernamePasswordInput {
  @Field(() => String)
  username: string

  @Field(() => String)
  password: string
}

@Resolver()
export class UserResolver {
  @Mutation(() => User)
  async register(
    @Arg('options') options: UsernamePasswordInput,
    @Ctx() { em }: MyContext
  ) {
    const hashedPassword = await argon2.hash(options.password);

    const user = em.create(User, {
      username: options.username,
      password: hashedPassword,
    });

    await em.persistAndFlush(user);

    return user;
  }
}
