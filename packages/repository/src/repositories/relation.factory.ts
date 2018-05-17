// Copyright IBM Corp. 2017,2018. All Rights Reserved.
// Node module: @loopback/example-todo
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

import {EntityCrudRepository} from '.';
import {
  Model,
  RelationType,
  AnyObject,
  Options,
  Entity,
  Class,
  FilterBuilder,
  Filter,
  WhereBuilder,
  Where,
  DataObject,
} from '..';
import {cloneDeep, isArray} from 'lodash';
import {
  HasManyEntityCrudRepository,
  DefaultHasManyEntityCrudRepository,
} from './relation.repository';

export declare type RelationDefinitionBase = {
  type: RelationType;
  modelFrom: Class<Entity> | string;
  keyTo: string;
  keyFrom: string;
};

export interface HasManyDefinition extends RelationDefinitionBase {
  type: RelationType.hasMany;
}

export function constrainedRepositoryFactory<T extends Entity, ID>(
  constraint: AnyObject,
  relationMetadata: HasManyDefinition,
  targetRepository: EntityCrudRepository<T, ID>,
): HasManyEntityCrudRepository<T, ID> {
  switch (relationMetadata.type) {
    case RelationType.hasMany:
      const fkConstraint: AnyObject = {};
      fkConstraint[relationMetadata.keyTo] =
        constraint[relationMetadata.keyFrom];

      return new DefaultHasManyEntityCrudRepository(
        targetRepository,
        fkConstraint,
      );
  }
}

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
  const constrainedWhere = new WhereBuilder();
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
  const constrainedWhere = new WhereBuilder();
  for (const c in constraint) {
    constrainedWhere.eq(c, constraint[c]);
  }
  if (originalWhere) {
    constrainedWhere.where = constrainedWhere.and(originalWhere).where;
  }
  return constrainedWhere.where;
}

export function constrainDataObject<T extends Entity>(
  originalData: DataObject<T>,
  constraint: AnyObject,
): DataObject<T>;

export function constrainDataObject<T extends Entity>(
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
export function constrainDataObject(originalData: any, constraint: any): any {
  const constrainedData = cloneDeep(originalData);
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
    for (const c in constrainObject) {
      if (modelData[c]) {
        console.warn(
          'Overwriting %s with %s',
          modelData[c],
          constrainObject[c],
        );
      }
      modelData[c] = constrainObject[c];
    }
  }
}
