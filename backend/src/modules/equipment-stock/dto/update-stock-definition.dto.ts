import { PartialType } from '@nestjs/mapped-types';
import { CreateStockDefinitionDto } from './create-stock-definition.dto';

export class UpdateStockDefinitionDto extends PartialType(CreateStockDefinitionDto) {}
