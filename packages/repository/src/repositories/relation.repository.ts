// Copyright IBM Corp. 2017,2018. All Rights Reserved.
// Node module: @loopback/example-todo
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

import {DefaultCrudRepository, EntityCrudRepository} from '.';
import {
  Entity,
  Filter,
  AnyObject,
  Where,
  DataObject,
  Options,
  WhereBuilder,
} from '..';

/**
 * CRUD operations for a target repository of a HasMany relation
 */
export interface HasManyEntityCrudRepository<T extends Entity, ID> {
  /**
   * Create a target model instance
   * @param targetModelData The target model data
   * @param options Options for the operation
   * @returns A promise which resolves to the newly created target model instance
   */
  create(targetModelData: Partial<T>, options?: Options): Promise<T>;
  /**
   * Find target model instance(s)
   * @param Filter A filter object for where, order, limit, etc.
   * @param options Options for the operation
   * @returns A promise which resolves with the found target instance(s)
   */
  find(filter?: Filter | undefined, options?: Options): Promise<T[]>;
}

export class DefaultHasManyEntityCrudRepository<
  S extends Entity,
  T extends Entity,
  TargetRepository extends DefaultCrudRepository<T, typeof Entity.prototype.id>,
  ID
> implements HasManyEntityCrudRepository<T, ID> {
  public constraint: AnyObject = {};
  /**
   * Constructor of DefaultHasManyEntityCrudRepository
   * @param sourceInstance the source model instance
   * @param targetRepository the related target model repository instance
   * @param foreignKeyName the foreign key name to constrain the target repository
   * instance
   */
  constructor(
    public sourceInstance: S,
    public targetRepository: TargetRepository,
    public foreignKeyName: string,
  ) {
    let targetProp = this.targetRepository.entityClass.definition.properties[
      this.foreignKeyName
    ].type;
    this.constraint[
      this.foreignKeyName
    ] = sourceInstance.getId() as typeof targetProp;
  }

  async create(targetModelData: Partial<T>, options?: Options): Promise<T> {
    return await this.targetRepository.create(
      constrainDataObject(targetModelData, this.constraint),
      options,
    );
  }

  async find(filter?: Filter | undefined, options?: Options): Promise<T[]> {
    return await this.targetRepository.find(
      constrainFilter(filter, this.constraint),
      options,
    );
  }
}
