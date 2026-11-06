import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { SupplyService } from './supply.service';
import {
  CreateCustomerDto,
  CreateProductDto,
  CreatePurchaseDto,
  CreateSaleDto,
  CreateSupplierDto,
  LineItemDto,
  MovementDto,
  ProductFilterDto,
  UpdateProductDto,
  UpdatePurchaseDto,
  UpdateSaleDto,
  UpdateSupplierDto,
} from './dto/supply.dto';
import { AuthUser, CurrentUser, RequireModule, Roles } from '../common/decorators';
import { PaginationDto } from '../common/dto/pagination.dto';

const WRITERS = [UserRole.ADMIN_CLIENTE, UserRole.GERENTE_FAZENDA, UserRole.OPERADOR];

@ApiTags('Operacional · Estoque, Compras e Vendas')
@ApiBearerAuth()
@Controller()
export class SupplyController {
  constructor(private readonly service: SupplyService) {}

  // Produtos / Estoque
  @RequireModule('inventory')
  @Get('products')
  listProducts(@CurrentUser() user: AuthUser, @Query() q: ProductFilterDto) {
    return this.service.listProducts(user, q);
  }

  @RequireModule('inventory')
  @Roles(...WRITERS)
  @Post('products')
  createProduct(@CurrentUser() user: AuthUser, @Body() dto: CreateProductDto) {
    return this.service.createProduct(user, dto);
  }

  @RequireModule('inventory')
  @Roles(...WRITERS)
  @Patch('products/:id')
  updateProduct(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.service.updateProduct(user, id, dto);
  }

  @RequireModule('inventory')
  @Roles(UserRole.ADMIN_CLIENTE, UserRole.GERENTE_FAZENDA)
  @Delete('products/:id')
  removeProduct(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.removeProduct(user, id);
  }

  @RequireModule('inventory')
  @Roles(...WRITERS)
  @Post('inventory/:productId/move')
  move(@CurrentUser() user: AuthUser, @Param('productId') productId: string, @Body() dto: MovementDto) {
    return this.service.moveProduct(user, productId, dto);
  }

  @RequireModule('inventory')
  @Get('inventory/movements')
  movements(
    @CurrentUser() user: AuthUser,
    @Query('productId') productId: string | undefined,
    @Query() q: PaginationDto,
  ) {
    return this.service.listMovements(user, productId, Number(q.page) || 1, Number(q.pageSize) || 30);
  }

  // Fornecedores
  @RequireModule('purchases')
  @Get('suppliers')
  listSuppliers(@CurrentUser() user: AuthUser, @Query() q: PaginationDto) {
    return this.service.listSuppliers(user, q);
  }

  @RequireModule('purchases')
  @Roles(...WRITERS)
  @Post('suppliers')
  createSupplier(@CurrentUser() user: AuthUser, @Body() dto: CreateSupplierDto) {
    return this.service.createSupplier(user, dto);
  }

  @RequireModule('purchases')
  @Roles(...WRITERS)
  @Patch('suppliers/:id')
  updateSupplier(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateSupplierDto) {
    return this.service.updateSupplier(user, id, dto);
  }

  @RequireModule('purchases')
  @Roles(UserRole.ADMIN_CLIENTE, UserRole.GERENTE_FAZENDA)
  @Delete('suppliers/:id')
  removeSupplier(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.removeSupplier(user, id);
  }

  // Compras
  @RequireModule('purchases')
  @Get('purchases')
  listPurchases(@CurrentUser() user: AuthUser, @Query() q: any) {
    return this.service.listPurchases(user, q);
  }

  @RequireModule('purchases')
  @Roles(...WRITERS)
  @Post('purchases')
  createPurchase(@CurrentUser() user: AuthUser, @Body() dto: CreatePurchaseDto) {
    return this.service.createPurchase(user, dto);
  }

  @RequireModule('purchases')
  @Roles(...WRITERS)
  @Patch('purchases/:id')
  updatePurchase(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdatePurchaseDto) {
    return this.service.updatePurchase(user, id, dto);
  }

  @RequireModule('purchases')
  @Roles(...WRITERS)
  @Post('purchases/:id/receive')
  receive(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.receivePurchase(user, id);
  }

  @RequireModule('purchases')
  @Roles(UserRole.ADMIN_CLIENTE, UserRole.GERENTE_FAZENDA)
  @Delete('purchases/:id')
  removePurchase(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.removePurchase(user, id);
  }

  // Clientes de venda
  @RequireModule('sales')
  @Get('customers')
  listCustomers(@CurrentUser() user: AuthUser, @Query() q: PaginationDto) {
    return this.service.listCustomers(user, q);
  }

  @RequireModule('sales')
  @Roles(...WRITERS)
  @Post('customers')
  createCustomer(@CurrentUser() user: AuthUser, @Body() dto: CreateCustomerDto) {
    return this.service.createCustomer(user, dto);
  }

  @RequireModule('sales')
  @Roles(...WRITERS)
  @Patch('customers/:id')
  updateCustomer(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateSupplierDto) {
    return this.service.updateCustomer(user, id, dto);
  }

  @RequireModule('sales')
  @Roles(UserRole.ADMIN_CLIENTE, UserRole.GERENTE_FAZENDA)
  @Delete('customers/:id')
  removeCustomer(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.removeCustomer(user, id);
  }

  // Vendas
  @RequireModule('sales')
  @Get('sales')
  listSales(@CurrentUser() user: AuthUser, @Query() q: any) {
    return this.service.listSales(user, q);
  }

  @RequireModule('sales')
  @Roles(...WRITERS)
  @Post('sales')
  createSale(@CurrentUser() user: AuthUser, @Body() dto: CreateSaleDto) {
    return this.service.createSale(user, dto);
  }

  @RequireModule('sales')
  @Roles(...WRITERS)
  @Patch('sales/:id')
  updateSale(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateSaleDto) {
    return this.service.updateSale(user, id, dto);
  }

  @RequireModule('sales')
  @Roles(UserRole.ADMIN_CLIENTE, UserRole.GERENTE_FAZENDA)
  @Delete('sales/:id')
  removeSale(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.removeSale(user, id);
  }
}
