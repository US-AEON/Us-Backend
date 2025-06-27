import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { FirebaseModule } from './firebase/firebase.module';
import { GeminiModule } from './integrations/gemini/gemini.module';

@Module({
  imports: [FirebaseModule, GeminiModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
