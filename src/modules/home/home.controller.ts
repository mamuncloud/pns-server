import { Controller, Get, Redirect } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';

@ApiExcludeController()
@Controller()
export class HomeController {
  @Get()
  @Redirect('/docs', 301)
  getHome() {
    return { url: '/docs' };
  }
}
