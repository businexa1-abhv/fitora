import { Module } from '@nestjs/common';
import { CrmController } from './crm.controller';
import { CrmService } from './crm.service';
import { ExpensesController } from './expenses.controller';
import { ExpensesService } from './expenses.service';
import { PayrollController } from './payroll.controller';
import { PayrollService } from './payroll.service';
import { SlotTypesController } from './slot-types.controller';
import { SlotTypesService } from './slot-types.service';
import { StaffController } from './staff.controller';
import { StaffService } from './staff.service';

@Module({
  controllers: [
    ExpensesController,
    SlotTypesController,
    StaffController,
    PayrollController,
    CrmController,
  ],
  providers: [ExpensesService, SlotTypesService, StaffService, PayrollService, CrmService],
  exports: [ExpensesService, SlotTypesService, StaffService, PayrollService, CrmService],
})
export class VenueOpsModule {}
