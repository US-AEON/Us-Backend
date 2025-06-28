import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { FirebaseModule } from './firebase/firebase.module';
import { GeminiModule } from './integrations/gemini/gemini.module';
import { SpeechModule } from './speech/speech.module';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { ConfigModule } from '@nestjs/config';
import { WorkspaceModule } from './workspace/workspace.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    FirebaseModule, 
    SpeechModule, 
    GeminiModule,
    AuthModule,
    UserModule,
    WorkspaceModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}