import { WebService, Get } from '@alterior/web-server';

@WebService({

})
export class Service {
    @Get('/')
    info() {
        return {
            service: '@engagechat/server',
            version: '1.0'
        };
    }
}