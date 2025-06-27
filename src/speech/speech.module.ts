import { Module } from '@nestjs/common';
import { SpeechController } from './speech.controller';
import { SpeechService } from './speech.service';
import { SpeechToTextService } from './services/speech-to-text.service';

@Module({
  controllers: [SpeechController],
  providers: [SpeechService, SpeechToTextService],
  exports: [SpeechService],
})
export class SpeechModule {}
