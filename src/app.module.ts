import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { FirebaseModule } from './firebase/firebase.module';
import { GeminiModule } from './integrations/gemini/gemini.module';
import { SpeechModule } from './speech/speech.module';

@Module({
  imports: [FirebaseModule, SpeechModule, GeminiModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
