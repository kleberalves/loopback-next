// Copyright IBM Corp. 2017,2018. All Rights Reserved.
// Node module: @loopback/example-todo
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

import {repository, ConstrainedRepositoryFactory} from '../../../../../';
import {CustomerRepository, OrderRepository} from '../../hasMany/repositories';
import {Customer, Order} from '../models';
import {requestBody, get, post} from '@loopback/rest';

export class CustomerController {
  constructor(
    @repository(CustomerRepository) protected customerRepo: CustomerRepository,
    @repository(OrderRepository) protected orderRepo: OrderRepository,
  ) {}

  @post('/customers/{id}/orders')
  async createCustomerOrders(
    @param.path.number('id') customerId: number,
    @requestBody order: Order,
  ) {
    const customer: Customer = await this.customerRepo.findById(customerId);
    return await customer.customerOrders.create(order);
  }

  @get('/customers/{id}/orders')
  async getCustomerOrders(
    @param.path.number('id') id: number,
  ): Promise<Order[]> {
    //given a customer id, fetch the orders for the customer
  }
}
