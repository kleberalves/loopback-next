// Copyright IBM Corp. 2017,2018. All Rights Reserved.
// Node module: @loopback/repository
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

import {
  model,
  property,
  Entity,
  DefaultCrudRepository,
  juggler,
  EntityCrudRepository,
  relatedRepositoryFactory,
  HasManyDefinition,
  RelationType,
} from '../..';
import {expect} from '@loopback/testlab';

describe('HasMany relation', () => {
  // Given a Customer and Order models - see definitions at the bottom

  beforeEach(givenCrudRepositoriesForCustomerAndOrder);

  let existingCustomer: Customer;
  let existingCustomerId: number;
  let existingCustomerName: string;
  beforeEach(async () => {
    existingCustomer = await givenPersistedCustomerInstance();
    existingCustomerId = existingCustomer.id;
    existingCustomerName = existingCustomer.name;
  });

  it('can create an instance of the related model', async () => {
    // A controller method - CustomerOrdersController.create()
    // customerRepo and orderRepo would be injected via constructor arguments
    async function create(
      customerId: number,
      customerName: string,
      orderData: Partial<Order>,
    ) {
      // Ideally, we would like to write
      // customerRepo.orders.create([customerId, customerName], orderData);
      // or customerRepo.orders({customerId: customerId, customerName: customerName}).*
      // The initial "involved" implementation is below

      //FIXME: this should be inferred from relational decorators
      const customerHasManyOrdersRelationMeta: HasManyDefinition = {
        modelFrom: Customer,
        keyFrom: ['id', 'name'],
        keyTo: ['customerId', 'customerName'],
        type: RelationType.hasMany,
      };

      //FIXME: should be automagically instantiated via DI or other means
      const customerOrders = relatedRepositoryFactory(
        [customerId, customerName],
        customerHasManyOrdersRelationMeta,
        orderRepo,
      );
      return await customerOrders.create(orderData);
    }

    const description = 'an order desc';
    const order = await create(existingCustomerId, existingCustomerName, {
      description,
    });

    expect(order.toObject()).to.containDeep({
      customerId: existingCustomerId,
      description,
    });
    const persisted = await orderRepo.findById(order.id);
    expect(persisted.toObject()).to.deepEqual(order.toObject());
  });

  // This should be enforced by the database to avoid race conditions
  it('reject create request when the customer does not exist');

  //--- HELPERS ---//

  @model()
  class Customer extends Entity {
    @property({
      type: 'number',
      id: true,
    })
    id: number;

    @property({
      type: 'string',
    })
    name: string;
  }

  @model()
  class Order extends Entity {
    @property({
      type: 'number',
      id: true,
    })
    id: number;

    @property({
      type: 'string',
      required: true,
    })
    description: string;

    @property({
      type: 'number',
      required: true,
    })
    customerId: number;

    @property({
      type: 'string',
      required: true,
    })
    customerName: string;
  }

  let customerRepo: EntityCrudRepository<
    Customer,
    typeof Customer.prototype.id
  >;
  let orderRepo: EntityCrudRepository<Order, typeof Order.prototype.id>;
  function givenCrudRepositoriesForCustomerAndOrder() {
    const db = new juggler.DataSource({connector: 'memory'});

    customerRepo = new DefaultCrudRepository(Customer, db);
    orderRepo = new DefaultCrudRepository(Order, db);
  }

  async function givenPersistedCustomerInstance() {
    return customerRepo.create({name: 'a customer'});
  }
});
