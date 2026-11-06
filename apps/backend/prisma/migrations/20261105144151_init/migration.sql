-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('SUPER_ADMIN', 'ADMIN_CLIENTE', 'GERENTE_FAZENDA', 'OPERADOR', 'FINANCEIRO', 'AGRONOMO');

-- CreateEnum
CREATE TYPE "ClientStatus" AS ENUM ('ATIVO', 'BLOQUEADO');

-- CreateEnum
CREATE TYPE "FarmStatus" AS ENUM ('ATIVO', 'BLOQUEADO');

-- CreateEnum
CREATE TYPE "SoilType" AS ENUM ('ARGILOSO', 'ARENOSO', 'FRANCO', 'MISTO', 'LATOSSOLO', 'PODZOLICO', 'OUTRO');

-- CreateEnum
CREATE TYPE "IrrigationType" AS ENUM ('NENHUMA', 'GOTEJAMENTO', 'ASPERSAO', 'PIVO_CENTRAL', 'SULCO', 'OUTRO');

-- CreateEnum
CREATE TYPE "OperationType" AS ENUM ('PREPARO_SOLO', 'PLANTIO', 'ADUBACAO', 'PULVERIZACAO', 'IRRIGACAO', 'ROCAGEM', 'COLHEITA', 'TRANSPORTE', 'ADMINISTRATIVO', 'OUTRO');

-- CreateEnum
CREATE TYPE "OperationStatus" AS ENUM ('PLANEJADA', 'EM_ANDAMENTO', 'CONCLUIDA', 'ATRASADA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "AiStatus" AS ENUM ('PENDENTE', 'CONCLUIDO', 'ERRO');

-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "clientName" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "legalName" TEXT,
    "document" TEXT,
    "email" TEXT,
    "whatsapp" TEXT,
    "phone" TEXT,
    "city" TEXT,
    "state" TEXT,
    "address" TEXT,
    "notes" TEXT,
    "status" "ClientStatus" NOT NULL DEFAULT 'ATIVO',
    "blockedReason" TEXT,
    "blockedAt" TIMESTAMP(3),
    "simpleMode" BOOLEAN NOT NULL DEFAULT false,
    "aiMonthlyLimit" INTEGER,
    "userLimit" INTEGER,
    "evolutionServerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "companyId" TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'OPERADOR',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
    "phone" TEXT,
    "lastLoginAt" TIMESTAMP(3),
    "failedAttempts" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserFarm" (
    "userId" TEXT NOT NULL,
    "farmId" TEXT NOT NULL,

    CONSTRAINT "UserFarm_pkey" PRIMARY KEY ("userId","farmId")
);

-- CreateTable
CREATE TABLE "RefreshToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "companyId" TEXT,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "ip" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModulePermission" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ModulePermission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "companyId" TEXT,
    "userId" TEXT,
    "actorRole" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "before" JSONB,
    "after" JSONB,
    "ip" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Farm" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "code" TEXT,
    "name" TEXT NOT NULL,
    "ownerName" TEXT,
    "municipality" TEXT,
    "state" TEXT,
    "address" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "totalAreaHa" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "agriculturalAreaHa" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "availableAreaHa" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "predominantProduction" TEXT,
    "notes" TEXT,
    "status" "FarmStatus" NOT NULL DEFAULT 'ATIVO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Farm_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Plot" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "farmId" TEXT NOT NULL,
    "code" TEXT,
    "name" TEXT NOT NULL,
    "areaHa" DOUBLE PRECISION NOT NULL,
    "soilType" "SoilType" DEFAULT 'OUTRO',
    "irrigationType" "IrrigationType" NOT NULL DEFAULT 'NENHUMA',
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "boundary" JSONB,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Plot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Crop" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "farmId" TEXT NOT NULL,
    "plotId" TEXT,
    "culture" TEXT NOT NULL,
    "variety" TEXT,
    "areaHa" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "cycle" TEXT,
    "notes" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Crop_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Season" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "farmId" TEXT NOT NULL,
    "cropId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "plantingDatePlan" TIMESTAMP(3),
    "plantingDateDone" TIMESTAMP(3),
    "harvestDatePlan" TIMESTAMP(3),
    "harvestDateDone" TIMESTAMP(3),
    "estimatedProduction" DOUBLE PRECISION,
    "harvestedProduction" DOUBLE PRECISION,
    "estimatedYield" DOUBLE PRECISION,
    "actualYield" DOUBLE PRECISION,
    "unit" TEXT NOT NULL DEFAULT 'sc',
    "plannedCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "actualCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "estimatedRevenue" DOUBLE PRECISION,
    "actualRevenue" DOUBLE PRECISION,
    "status" TEXT NOT NULL DEFAULT 'PLANEJADA',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Season_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CropCulture" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "cropId" TEXT NOT NULL,
    "cultureName" TEXT NOT NULL,
    "hectares" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "production" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "unit" TEXT NOT NULL DEFAULT 'sc',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CropCulture_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FieldOperation" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "farmId" TEXT NOT NULL,
    "seasonId" TEXT,
    "plotId" TEXT,
    "type" "OperationType" NOT NULL,
    "description" TEXT,
    "plannedDate" TIMESTAMP(3),
    "doneDate" TIMESTAMP(3),
    "status" "OperationStatus" NOT NULL DEFAULT 'PLANEJADA',
    "employeeId" TEXT,
    "machineId" TEXT,
    "areaHa" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "hours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "fuelLiters" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "cost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notes" TEXT,
    "attachments" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FieldOperation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OperationInput" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "operationId" TEXT NOT NULL,
    "productId" TEXT,
    "description" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "unitCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalCost" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "OperationInput_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Harvest" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "farmId" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "harvestDate" TIMESTAMP(3) NOT NULL,
    "areaHarvested" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "quantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "unit" TEXT NOT NULL DEFAULT 'sc',
    "moisture" DOUBLE PRECISION,
    "quality" TEXT,
    "losses" DOUBLE PRECISION,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Harvest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryMovement" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unitCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lot" TEXT,
    "expiresAt" TIMESTAMP(3),
    "notes" TEXT,
    "referenceId" TEXT,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InventoryMovement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Machine" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "farmId" TEXT,
    "code" TEXT,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "brand" TEXT,
    "model" TEXT,
    "year" INTEGER,
    "plate" TEXT,
    "hoursMeter" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "mileage" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "fuelType" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ATIVO',
    "acquisitionDate" TIMESTAMP(3),
    "acquisitionValue" DOUBLE PRECISION,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Machine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Maintenance" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "machineId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "hoursMeter" DOUBLE PRECISION,
    "mileage" DOUBLE PRECISION,
    "parts" TEXT,
    "cost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "nextServiceDate" TIMESTAMP(3),
    "nextServiceHours" DOUBLE PRECISION,
    "status" TEXT NOT NULL DEFAULT 'CONCLUIDA',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Maintenance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FuelLog" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "machineId" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "liters" DOUBLE PRECISION NOT NULL,
    "unitPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "hoursMeter" DOUBLE PRECISION,
    "mileage" DOUBLE PRECISION,
    "station" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FuelLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Employee" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "farmId" TEXT,
    "name" TEXT NOT NULL,
    "document" TEXT,
    "role" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "salary" DOUBLE PRECISION,
    "dailyRate" DOUBLE PRECISION,
    "hireDate" TIMESTAMP(3),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Employee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimeEntry" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "farmId" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "hours" DOUBLE PRECISION NOT NULL,
    "activity" TEXT,
    "cost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notes" TEXT,

    CONSTRAINT "TimeEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FieldJournal" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "farmId" TEXT NOT NULL,
    "plotId" TEXT,
    "seasonId" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "activity" TEXT NOT NULL,
    "employeeId" TEXT,
    "machineId" TEXT,
    "inputs" TEXT,
    "cost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "photos" JSONB,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FieldJournal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "farmId" TEXT,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'un',
    "sku" TEXT,
    "quantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "minStock" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "unitCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "storageLocation" TEXT,
    "notes" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Supplier" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "document" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "category" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Supplier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "document" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Purchase" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "number" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ABERTA',
    "total" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "discount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "freight" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notes" TEXT,
    "attachments" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Purchase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseItem" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "purchaseId" TEXT NOT NULL,
    "productId" TEXT,
    "description" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'un',
    "unitPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "received" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "PurchaseItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sale" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "customerId" TEXT,
    "number" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ABERTA',
    "culture" TEXT,
    "seasonId" TEXT,
    "total" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "discount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notes" TEXT,
    "attachments" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Sale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SaleItem" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "saleId" TEXT NOT NULL,
    "productId" TEXT,
    "description" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'sc',
    "unitPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "delivered" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "SaleItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinancialTransaction" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "farmId" TEXT,
    "type" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "paidAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "paidDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'PENDENTE',
    "seasonId" TEXT,
    "notes" TEXT,
    "attachments" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinancialTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvolutionServer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "baseUrl" TEXT NOT NULL,
    "apiKey" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ATIVO',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EvolutionServer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhatsappInstance" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "serverId" TEXT,
    "name" TEXT NOT NULL,
    "instanceKey" TEXT NOT NULL,
    "phone" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DESCONECTADO',
    "notificationsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "qrCode" TEXT,
    "lastConnectedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsappInstance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhatsappMessage" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "instanceId" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "fromNumber" TEXT,
    "toNumber" TEXT,
    "body" TEXT,
    "mediaType" TEXT,
    "status" TEXT NOT NULL DEFAULT 'RECEBIDA',
    "raw" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WhatsappMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiUsage" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "promptTokens" INTEGER NOT NULL DEFAULT 0,
    "completionTokens" INTEGER NOT NULL DEFAULT 0,
    "totalTokens" INTEGER NOT NULL DEFAULT 0,
    "costUsd" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" "AiStatus" NOT NULL DEFAULT 'PENDENTE',
    "question" TEXT,
    "answer" TEXT,
    "source" TEXT NOT NULL DEFAULT 'WEB',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiUsage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "link" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiMessageCache" (
    "id" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiMessageCache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeatherCache" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WeatherCache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Company_document_key" ON "Company"("document");

-- CreateIndex
CREATE INDEX "Company_status_idx" ON "Company"("status");

-- CreateIndex
CREATE INDEX "Company_createdAt_idx" ON "Company"("createdAt");

-- CreateIndex
CREATE INDEX "User_companyId_idx" ON "User"("companyId");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_tokenHash_key" ON "RefreshToken"("tokenHash");

-- CreateIndex
CREATE INDEX "RefreshToken_userId_idx" ON "RefreshToken"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ModulePermission_companyId_module_key" ON "ModulePermission"("companyId", "module");

-- CreateIndex
CREATE INDEX "AuditLog_companyId_createdAt_idx" ON "AuditLog"("companyId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_entity_entityId_idx" ON "AuditLog"("entity", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- CreateIndex
CREATE INDEX "Farm_companyId_idx" ON "Farm"("companyId");

-- CreateIndex
CREATE INDEX "Farm_companyId_municipality_idx" ON "Farm"("companyId", "municipality");

-- CreateIndex
CREATE INDEX "Plot_companyId_idx" ON "Plot"("companyId");

-- CreateIndex
CREATE INDEX "Plot_farmId_idx" ON "Plot"("farmId");

-- CreateIndex
CREATE INDEX "Crop_companyId_idx" ON "Crop"("companyId");

-- CreateIndex
CREATE INDEX "Crop_farmId_idx" ON "Crop"("farmId");

-- CreateIndex
CREATE INDEX "Season_companyId_idx" ON "Season"("companyId");

-- CreateIndex
CREATE INDEX "Season_farmId_idx" ON "Season"("farmId");

-- CreateIndex
CREATE INDEX "Season_status_idx" ON "Season"("status");

-- CreateIndex
CREATE INDEX "CropCulture_companyId_idx" ON "CropCulture"("companyId");

-- CreateIndex
CREATE INDEX "FieldOperation_companyId_idx" ON "FieldOperation"("companyId");

-- CreateIndex
CREATE INDEX "FieldOperation_farmId_status_idx" ON "FieldOperation"("farmId", "status");

-- CreateIndex
CREATE INDEX "FieldOperation_plannedDate_idx" ON "FieldOperation"("plannedDate");

-- CreateIndex
CREATE INDEX "OperationInput_companyId_idx" ON "OperationInput"("companyId");

-- CreateIndex
CREATE INDEX "Harvest_companyId_idx" ON "Harvest"("companyId");

-- CreateIndex
CREATE INDEX "Harvest_farmId_idx" ON "Harvest"("farmId");

-- CreateIndex
CREATE INDEX "InventoryMovement_companyId_idx" ON "InventoryMovement"("companyId");

-- CreateIndex
CREATE INDEX "InventoryMovement_productId_idx" ON "InventoryMovement"("productId");

-- CreateIndex
CREATE INDEX "Machine_companyId_idx" ON "Machine"("companyId");

-- CreateIndex
CREATE INDEX "Maintenance_companyId_idx" ON "Maintenance"("companyId");

-- CreateIndex
CREATE INDEX "Maintenance_machineId_idx" ON "Maintenance"("machineId");

-- CreateIndex
CREATE INDEX "FuelLog_companyId_idx" ON "FuelLog"("companyId");

-- CreateIndex
CREATE INDEX "FuelLog_machineId_idx" ON "FuelLog"("machineId");

-- CreateIndex
CREATE INDEX "Employee_companyId_idx" ON "Employee"("companyId");

-- CreateIndex
CREATE INDEX "TimeEntry_companyId_idx" ON "TimeEntry"("companyId");

-- CreateIndex
CREATE INDEX "FieldJournal_companyId_idx" ON "FieldJournal"("companyId");

-- CreateIndex
CREATE INDEX "FieldJournal_farmId_idx" ON "FieldJournal"("farmId");

-- CreateIndex
CREATE INDEX "Product_companyId_idx" ON "Product"("companyId");

-- CreateIndex
CREATE INDEX "Supplier_companyId_idx" ON "Supplier"("companyId");

-- CreateIndex
CREATE INDEX "Customer_companyId_idx" ON "Customer"("companyId");

-- CreateIndex
CREATE INDEX "Purchase_companyId_idx" ON "Purchase"("companyId");

-- CreateIndex
CREATE INDEX "Purchase_supplierId_idx" ON "Purchase"("supplierId");

-- CreateIndex
CREATE INDEX "PurchaseItem_companyId_idx" ON "PurchaseItem"("companyId");

-- CreateIndex
CREATE INDEX "Sale_companyId_idx" ON "Sale"("companyId");

-- CreateIndex
CREATE INDEX "SaleItem_companyId_idx" ON "SaleItem"("companyId");

-- CreateIndex
CREATE INDEX "FinancialTransaction_companyId_status_idx" ON "FinancialTransaction"("companyId", "status");

-- CreateIndex
CREATE INDEX "FinancialTransaction_companyId_dueDate_idx" ON "FinancialTransaction"("companyId", "dueDate");

-- CreateIndex
CREATE INDEX "FinancialTransaction_farmId_idx" ON "FinancialTransaction"("farmId");

-- CreateIndex
CREATE UNIQUE INDEX "WhatsappInstance_instanceKey_key" ON "WhatsappInstance"("instanceKey");

-- CreateIndex
CREATE INDEX "WhatsappInstance_companyId_idx" ON "WhatsappInstance"("companyId");

-- CreateIndex
CREATE INDEX "WhatsappMessage_companyId_idx" ON "WhatsappMessage"("companyId");

-- CreateIndex
CREATE INDEX "WhatsappMessage_instanceId_idx" ON "WhatsappMessage"("instanceId");

-- CreateIndex
CREATE INDEX "AiUsage_companyId_createdAt_idx" ON "AiUsage"("companyId", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_companyId_read_idx" ON "Notification"("companyId", "read");

-- CreateIndex
CREATE UNIQUE INDEX "AiMessageCache_hash_key" ON "AiMessageCache"("hash");

-- CreateIndex
CREATE UNIQUE INDEX "WeatherCache_key_key" ON "WeatherCache"("key");

-- AddForeignKey
ALTER TABLE "Company" ADD CONSTRAINT "Company_evolutionServerId_fkey" FOREIGN KEY ("evolutionServerId") REFERENCES "EvolutionServer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserFarm" ADD CONSTRAINT "UserFarm_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserFarm" ADD CONSTRAINT "UserFarm_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "Farm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModulePermission" ADD CONSTRAINT "ModulePermission_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Farm" ADD CONSTRAINT "Farm_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Plot" ADD CONSTRAINT "Plot_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "Farm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Crop" ADD CONSTRAINT "Crop_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "Farm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Crop" ADD CONSTRAINT "Crop_plotId_fkey" FOREIGN KEY ("plotId") REFERENCES "Plot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Season" ADD CONSTRAINT "Season_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "Farm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Season" ADD CONSTRAINT "Season_cropId_fkey" FOREIGN KEY ("cropId") REFERENCES "Crop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CropCulture" ADD CONSTRAINT "CropCulture_cropId_fkey" FOREIGN KEY ("cropId") REFERENCES "Crop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldOperation" ADD CONSTRAINT "FieldOperation_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OperationInput" ADD CONSTRAINT "OperationInput_operationId_fkey" FOREIGN KEY ("operationId") REFERENCES "FieldOperation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Harvest" ADD CONSTRAINT "Harvest_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Maintenance" ADD CONSTRAINT "Maintenance_machineId_fkey" FOREIGN KEY ("machineId") REFERENCES "Machine"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FuelLog" ADD CONSTRAINT "FuelLog_machineId_fkey" FOREIGN KEY ("machineId") REFERENCES "Machine"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeEntry" ADD CONSTRAINT "TimeEntry_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Purchase" ADD CONSTRAINT "Purchase_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseItem" ADD CONSTRAINT "PurchaseItem_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "Purchase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseItem" ADD CONSTRAINT "PurchaseItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleItem" ADD CONSTRAINT "SaleItem_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleItem" ADD CONSTRAINT "SaleItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialTransaction" ADD CONSTRAINT "FinancialTransaction_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "Farm"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsappInstance" ADD CONSTRAINT "WhatsappInstance_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsappInstance" ADD CONSTRAINT "WhatsappInstance_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "EvolutionServer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsappMessage" ADD CONSTRAINT "WhatsappMessage_instanceId_fkey" FOREIGN KEY ("instanceId") REFERENCES "WhatsappInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiUsage" ADD CONSTRAINT "AiUsage_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
