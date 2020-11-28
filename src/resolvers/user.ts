import argon2 from 'argon2';
import { v4 as uuidv4 } from 'uuid';
import { getConnection } from 'typeorm';
import {
  Resolver,
  Mutation,
  Arg,
  Field,
  Ctx,
  ObjectType,
  Query,
  FieldResolver,
  Root
} from 'type-graphql';
import { MyContext } from '../types';
import { User } from '../entities/User';
import { COOKIE_NAME, FORGET_PASSWORD_PREFIX } from '../constants';
import { UsernamePasswordInput } from './UsernamePasswordInput';
import { validateRegister } from '../utils/validateRegister';
import { sendEmail } from '../utils/sendEmail';

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

@Resolver(User)
export class UserResolver {
  @FieldResolver(() => String)
  email(@Root() user: User, @Ctx() { req }: MyContext) {
    // This is the current user, ok to show their own email
    if (req.session.userId === user.id) {
      return user.email;
    }

    // Current user cannot see other users email
    return '';
  }

  @Mutation(() => UserResponse)
  async changePassword(
    @Arg('token') token: string,
    @Arg('newPassword') newPassword: string,
    @Ctx() { req, redis } : MyContext
  ): Promise<UserResponse> {
    if (newPassword.length <= 3) {
      return { 
        errors: [
          {
            field: 'newPassword',
            message: 'Password length must be greater than 3',
          },
        ],
      };
    }

    const key = FORGET_PASSWORD_PREFIX + token;
    const userId = await redis.get(key);
    if (!userId) {
      return { 
        errors: [
          {
            field: 'token',
            message: 'Token Expired',
          },
        ],
      };
    }

    const userIdNum = parseInt(userId);
    const user = await User.findOne(userIdNum);

    if (!user) {
      return { 
        errors: [
          {
            field: 'Token',
            message: 'User does not exist',
          },
        ],
      };
    }

    await User.update(
      {id: userIdNum},
      {password: await argon2.hash(newPassword)}
    )

    // Delete user passwor reset from redis
    await redis.del(key);

    // log in user after password change
    req.session.userId = user.id;

    return { user };
  }

  @Mutation(() => Boolean)
  async forgotPassword(
    @Arg('email') email: string,
    @Ctx() { redis }: MyContext
  ) {
    const user = await User.findOne({where: {email}});
    if (!user) {
      // email not in database
      return true;
    }

    const token = uuidv4();

    await redis.set(FORGET_PASSWORD_PREFIX + token, user.id, 'ex', 1000 * 60 * 60 * 24 * 3); // 3 days

    sendEmail(
      email,
      `<a href="http://localhost:3000/change-password/${token}">reset password</a>`
    );

    return true;
  }

  @Query(() => User, {nullable: true})
  me(@Ctx() { req }: MyContext) {
    // User not logged in
    if (!req.session.userId) {
      return null;
    }

    return User.findOne(req.session.userId);
  }

  @Mutation(() => UserResponse)
  async register(
    @Arg('options') options: UsernamePasswordInput,
    @Ctx() { req }: MyContext
  ): Promise<UserResponse> {
    const errors = validateRegister(options);

    if (errors) {
      return { errors };
    }

    const hashedPassword = await argon2.hash(options.password);
    let user;

    try {
      const result = await getConnection()
        .createQueryBuilder()
        .insert()
        .into(User)
        .values({
          username: options.username,
          email: options.email,
          password: hashedPassword,
        })
        .returning('*')
        .execute();

      user = result.raw[0];
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
    @Arg('usernameOrEmail') usernameOrEmail: string,
    @Arg('password') password: string,
    @Ctx() { req }: MyContext
  ): Promise<UserResponse> {
    const user = await User.findOne(
      usernameOrEmail.includes('@')
        ? {where: {email: usernameOrEmail}}
        : {where: {username: usernameOrEmail}}
    );

    if (!user) {
      return {
        errors: [{
          field: 'usernameOrEmail',
          message: 'Username or password is incorrect',
        }],
      };
    }

    const valid = await argon2.verify(user.password, password);

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

  @Mutation(() => Boolean)
  logout(
    @Ctx() { req, res }: MyContext
  ) {
    return new Promise((resolve) => req.session.destroy((err) => {
      res.clearCookie(COOKIE_NAME);
      if (err) {
        console.log(err);
        resolve(false);
      } else {
        resolve(true);
      }
    }));
  }

}
