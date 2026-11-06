import { Module } from '@nestjs/common';
import { UploadController } from './upload.controller';
import { FilesController } from './files.controller';

@Module({ controllers: [UploadController, FilesController] })
export class UploadModule {}
