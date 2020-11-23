import { Entity, PrimaryKey, Property } from "@mikro-orm/core";
import { Field, ObjectType, Int } from "type-graphql";

@ObjectType()
@Entity() // Database Table Decorator
export class Post {
  @Field(() => Int) // Exposes column to graphql schema (omit to prevent queries on this property)
  @PrimaryKey() // PK Column Decorator
  id!: number;

  @Field(() => String)
  @Property({type: 'date'}) // Column Decorator
  createdAt = new Date();

  @Field(() => String)
  @Property({ type: 'date', onUpdate: () => new Date() })
  updatedAt = new Date();

  @Field()
  @Property({type: 'text'})
  title!: string;
}
