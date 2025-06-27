import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();

  // Cloud Run은 PORT 환경 변수를 사용하여 포트를 지정합니다.
  const port = process.env.PORT || 8080;

  await app.listen(port);
  console.log(`Application is running on: ${await app.getUrl()}`);
}
bootstrap().catch((error) => {
  console.error('Application failed to start:', error);
});
