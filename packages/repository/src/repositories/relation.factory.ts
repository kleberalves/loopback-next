// Copyright IBM Corp. 2017,2018. All Rights Reserved.
// Node module: @loopback/example-todo
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

import {
  Repository,
  juggler,
  DefaultCrudRepository,
  EntityCrudRepository,
} from '.';
import {
  Model,
  RelationType,
  AnyObject,
  Options,
  Entity,
  Class,
  relation,
  FilterBuilder,
  Filter,
  WhereBuilder,
  Where,
  DataObject,
} from '..';
import {Constructor} from '../../../context';
import {cloneDeep, isArray} from 'lodash';
import {HasManyEntityCrudRepository, DefaultHasManyEntityCrudRepository} from './relation.repository';

export declare type RelationDefinitionBase = {
  // type: RelationType;
  as: string;
  modelFrom: Class<Entity> | string;
  target: Class<Entity> | string;
  keyFrom: string;
  keyTo: string;
};

export interface HasManyDefinition extends RelationDefinitionBase {
  type: RelationType.hasMany;
}

export interface BelongsToDefinition extends RelationDefinitionBase {
  type: RelationType.belongsTo;
}

export type RelationDefinition = HasManyDefinition | BelongsToDefinition;

export function constrainedRepositoryFactory<T extends Entity, ID>(
  constraint: AnyObject,
  relationMetadata: HasManyDefinition,
  targetRepository: EntityCrudRepository<T, ID>,
): HasManyEntityCrudRepository<T, ID>;

export function constrainedRepositoryFactory<T extends Entity, ID>(
  constraint: AnyObject,
  relationMetadata: RelationDefinition,
  targetRepository: EntityCrudRepository<T, ID>,
) {
  switch(relationMetadata.type) {
    case RelationType.hasMany
      return new DefaultHasManyEntityCrudRepository(
      // ...
    );
  }
};

/**
 * A utility function which takes a filter and enforces constraint(s)
 * on it
 * @param originalFilter the filter to apply the constrain(s) to
 * @param constraint the constraint which is to be applied on the filter
 * @returns Filter the modified filter with the constraint, otherwise
 * the original filter
 */
export function constrainFilter(
  originalFilter: Filter | undefined,
  constraint: AnyObject,
): Filter {
  let constrainedFilter: Filter = {};
  let constrainedWhere = new WhereBuilder();
  for (const c in constraint) {
    constrainedWhere.eq(c, constraint[c]);
  }
  if (originalFilter) {
    constrainedFilter = cloneDeep(originalFilter);
    if (originalFilter.where) {
      constrainedFilter.where = constrainedWhere.and(
        originalFilter.where,
      ).where;
    }
  } else if (originalFilter === undefined) {
    constrainedFilter.where = constrainedWhere.where;
  }
  return constrainedFilter;
}

/**
 * A utility function which takes a filter and enforces constraint(s)
 * on it
 * @param originalFilter the filter to apply the constrain(s) to
 * @param constraint the constraint which is to be applied on the filter
 * @returns Filter the modified filter with the constraint, otherwise
 * the original filter
 */
export function constrainWhere(
  originalWhere: Where | undefined,
  constraint: AnyObject,
): Where {
  let constrainedWhere = new WhereBuilder();
  for (const c in constraint) {
    constrainedWhere.eq(c, constraint[c]);
  }
  if (originalWhere) {
    constrainedWhere.where = constrainedWhere.and(originalWhere).where;
  }
  return constrainedWhere.where;
}

function constrainDataObject<T extends Entity>(
  originalData: DataObject<T>,
  constraint: AnyObject,
): DataObject<T>;

function constrainDataObject<T extends Entity>(
  originalData: DataObject<T>[],
  constraint: AnyObject,
): DataObject<T>[];
/**
 * A utility function which takes a model instance data and enforces constraint(s)
 * on it
 * @param originalData the model data to apply the constrain(s) to
 * @param constraint the constraint which is to be applied on the filter
 * @returns the modified data with the constraint, otherwise
 * the original instance data
 */
// tslint:disable-next-line:no-any
function constrainDataObject(originalData: any, constraint: any): any {
  let constrainedData = cloneDeep(originalData);
  if (typeof originalData === 'object') {
    addConstraintToDataObject(constraint, constrainedData);
  } else if (isArray(originalData)) {
    for (const data in originalData) {
      addConstraintToDataObject(constraint, constrainedData);
    }
  }
  return constrainedData;

  // tslint:disable-next-line:no-any
  function addConstraintToDataObject(constrainObject: any, modelData: any) {
    for (const c in constraint) {
      if (constrainedData[c]) {
        console.warn(
          'Overwriting %s with %s',
          constrainedData[c],
          constraint[c],
        );
      }
      constrainedData[c] = constraint[c];
    }
  }
}
