import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { AppService } from './app.service';
import { FirebaseService } from './firebase/firebase.service';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { StandardResponse } from './shared/interfaces/standard-response.interface';

@ApiTags('기본')
@Controller('api')
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly firebaseService: FirebaseService,
  ) {}

  @ApiOperation({ summary: '헬스 체크', description: '서버가 정상적으로 동작하는지 확인합니다.' })
  @ApiResponse({ 
    status: 200, 
    description: '서버 정상 동작',
    schema: {
      type: 'object',
      properties: {
        success: {
          type: 'boolean',
          example: true,
        },
        message: {
          type: 'string',
          example: '서버가 정상적으로 동작 중입니다.',
        },
        data: {
          type: 'string',
          example: 'Hello World!',
        },
      },
    },
  })
  @Get()
  @HttpCode(HttpStatus.OK)
  getHello(): StandardResponse<string> {
    return {
      success: true,
      message: '서버가 정상적으로 동작 중입니다.',
      data: this.appService.getHello()
    };
  }

  @ApiOperation({ summary: 'Firebase 연결 테스트', description: 'Firebase 연결이 정상적으로 동작하는지 확인합니다.' })
  @ApiResponse({ 
    status: 200, 
    description: 'Firebase 연결 정상',
    schema: {
      type: 'object',
      properties: {
        success: {
          type: 'boolean',
          example: true,
        },
        message: {
          type: 'string',
          example: 'Firebase 연결이 정상입니다.',
        },
        data: {
          type: 'string',
          example: 'Firebase 연결 테스트 성공',
        },
      },
    },
  })
  @Get('firebase-test')
  @HttpCode(HttpStatus.OK)
  async testFirebase(): Promise<StandardResponse<string>> {
    return {
      success: true,
      message: 'Firebase 연결이 정상입니다.',
      data: 'Firebase 연결 테스트 성공'
    };
  }
}
