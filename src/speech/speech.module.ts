import { Module } from '@nestjs/common';
import { SpeechController } from './speech.controller';
import { SpeechService } from './speech.service';
import { SpeechToTextService } from './services/speech-to-text.service';
import { TextToSpeechService } from './services/text-to-speech.service';

@Module({
  controllers: [SpeechController],
  providers: [SpeechService, SpeechToTextService, TextToSpeechService],
  exports: [SpeechService],
})
export class SpeechModule {}
