import { Entity, PrimaryKey, Property } from "@mikro-orm/core";

@Entity() // Database Table Decorator
export class Post {
  @PrimaryKey() // PK Column Decorator
  id!: number;

  @Property({type: 'date'}) // Column Decorator
  createdAt = new Date();

  @Property({ type: 'date', onUpdate: () => new Date() })
  updatedAt = new Date();

  @Property({type: 'text'})
  title!: string;
}
