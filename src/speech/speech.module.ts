import { Module } from '@nestjs/common';
import { SpeechController } from './speech.controller';
import { SpeechToTextService } from './services/speech-to-text.service';
import { TextToSpeechService } from './services/text-to-speech.service';
import { ConversationService } from './services/conversation.service';
import { GeminiModule } from '../integrations/gemini/gemini.module';
import { FirebaseModule } from '../firebase/firebase.module';

@Module({
  imports: [GeminiModule, FirebaseModule],
  controllers: [SpeechController],
  providers: [SpeechToTextService, TextToSpeechService, ConversationService],
  exports: [ConversationService],
})
export class SpeechModule {}
