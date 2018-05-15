import {Repository, juggler, DefaultCrudRepository} from '.';
import {Model, RelationType, AnyObject, Options, Entity, Class} from '..';

export declare type RelationDefinition = {
  type: RelationType;
  as: string;
  modelFrom: Class<Entity> | string;
  keyFrom: string;
  keyTo: string;
};

export const ConstrainedRepositoryFactory = function<T extends Entity, ID>(
  constraint: AnyObject,
  relationMetadata: RelationDefinition,
  targetRepository: DefaultCrudRepository<T, ID>,
): DefaultCrudRepository<T, ID> {};
