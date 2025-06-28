import { Module } from '@nestjs/common';
import { PostController } from './post.controller';
import { PostService } from './post.service';
import { FirebaseModule } from '../firebase/firebase.module';
import { AuthModule } from '../auth/auth.module';
import { GeminiModule } from '../integrations/gemini/gemini.module';

@Module({
  imports: [FirebaseModule, AuthModule, GeminiModule],
  controllers: [PostController],
  providers: [PostService],
  exports: [PostService],
})
export class PostModule {} 