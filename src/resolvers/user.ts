import argon2 from 'argon2';
import {
  Resolver,
  Mutation,
  Arg,
  Field,
  InputType,
  Ctx,
  ObjectType,
  Query
} from 'type-graphql';
import { EntityManager } from '@mikro-orm/postgresql';
import { MyContext } from '../types';
import { User } from '../entities/User';

// InputType() decorator used for multiple input arguments
// Alternative to adding each field to the @Arg() decorator
// Not returned
@InputType()
class UsernamePasswordInput {
  @Field(() => String)
  username: string;

  @Field(() => String)
  password: string;
}

@ObjectType()
class FieldError {
  @Field()
  field: string;
  
  @Field()
  message: string;
}

// ObjectType() decorator is returned
@ObjectType()
class UserResponse {
  @Field(() => [FieldError], {nullable: true})
  errors?: FieldError[];
  
  @Field(() => User, {nullable: true})
  user?: User;
}

@Resolver()
export class UserResolver {
  @Query(() => User, {nullable: true})
  async me(@Ctx() { em, req }: MyContext) {
    // User not logged in
    if (!req.session.userId) {
      return null;
    }

    const user = await em.findOne(User, {id: req.session.userId});

    return user;
  }

  @Mutation(() => UserResponse)
  async register(
    @Arg('options') options: UsernamePasswordInput,
    @Ctx() { em, req }: MyContext
  ): Promise<UserResponse> {
    if (options.username.length <= 2) {
      return {
        errors: [{
          field: 'username',
          message: 'Username length must be greater than 2',
        }],
      };
    }

    if (options.password.length <= 3) {
      return {
        errors: [{
          field: 'password',
          message: 'Password length must be greater than 3',
        }],
      };
    }

    const hashedPassword = await argon2.hash(options.password);

    let user;

    try {
      const result = await (em as EntityManager)
        .createQueryBuilder(User)
        .getKnexQuery()
        .insert({
          username: options.username,
          password: hashedPassword,
          created_at: new Date(),
          updated_at: new Date(),
        })
        .returning('*');
      
      user = result[0];
    } catch (err) {
      // Duplicate username error
      if (err.code === '23505') {
        return {
          errors: [{
            field: 'username',
            message: 'Username is already registered',
          }],
        };
      }
    }

    // Store user id session
    req.session.userId = user.id;

    return { user };
  }

  @Mutation(() => UserResponse)
  async login(
    @Arg('options') options: UsernamePasswordInput,
    @Ctx() { em, req }: MyContext
  ): Promise<UserResponse> {
    const user = await em.findOne(User, {username: options.username});

    if (!user) {
      return {
        errors: [{
          field: 'username',
          message: 'Username or password is incorrect',
        }],
      };
    }

    const valid = await argon2.verify(user.password, options.password);

    if (!valid) {
      return {
        errors: [{
          field: 'password',
          message: 'Username or password is incorrect',
        }],
      };
    }

    req.session.userId = user.id;

    return { user };
  }
}
