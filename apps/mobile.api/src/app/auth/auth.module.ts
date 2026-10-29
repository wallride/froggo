import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

import { Configuration } from '../../Configuration';
import { CONFIGURATION } from '../configuration/configuration.token';
import { PlayerAuthGuard } from './player-auth.guard';
import { PlayerTokens } from './player-tokens';

@Global()
@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [CONFIGURATION],
      useFactory: ({ auth }: Configuration) => ({
        secret: auth.tokenSecret,
        signOptions: { algorithm: 'HS256', expiresIn: auth.accessTokenTtlMinutes * 60 },
        verifyOptions: { algorithms: ['HS256'] },
      }),
    }),
  ],
  providers: [PlayerTokens, PlayerAuthGuard],
  exports: [PlayerTokens, PlayerAuthGuard],
})
export class AuthModule {}
