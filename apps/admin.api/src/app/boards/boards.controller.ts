import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  UsePipes,
} from '@nestjs/common';

import { BaseBoard, Board, baseBoardSchema, boardSchema } from '@dead-lines-inc/common.models';

import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { BoardsService } from './boards.service';

@Controller('boards')
export class BoardsController {
  constructor(private readonly boardsService: BoardsService) {}

  @Get()
  getAll() {
    return this.boardsService.getAll();
  }

  @Get(':id')
  getById(@Param('id') id: string) {
    return this.boardsService.getById(id);
  }

  @Post()
  @UsePipes(new ZodValidationPipe(baseBoardSchema))
  add(@Body() board: BaseBoard) {
    return this.boardsService.add(board);
  }

  @Put()
  @UsePipes(new ZodValidationPipe(boardSchema))
  update(@Body() board: Board) {
    return this.boardsService.update(board);
  }
}
