import {
  Field,
  InputType
} from 'type-graphql';

// InputType() decorator used for multiple input arguments
// Alternative to adding each field to the @Arg() decorator
// Not returned

@InputType()
export class UsernamePasswordInput {
  @Field(() => String)
  username: string;

  @Field(() => String)
  email: string;

  @Field(() => String)
  password: string;
}
