import { Controller, Get, Header } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('Home')
@Controller()
export class HomeController {
  @Get()
  @Header('Content-Type', 'text/html')
  @ApiOperation({ summary: 'Welcome page', description: 'Returns a welcome HTML page with links to health check and documentation.' })
  @ApiResponse({ status: 200, description: 'Welcome page rendered successfully' })
  getHome() {
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>PNS API - Welcome</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            background: linear-gradient(135deg, #000 0%, #111 100%);
            color: #fff;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .container {
            text-align: center;
            max-width: 600px;
            padding: 2rem;
          }
          .logo {
            width: 120px;
            height: 120px;
            border-radius: 12px;
            margin: 0 auto 2rem;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            font-size: 1.5rem;
          }
          h1 {
            font-size: 3rem;
            font-weight: 700;
            margin-bottom: 1rem;
            color: white;
          }
          p {
            font-size: 1.125rem;
            color: #888;
            margin-bottom: 2rem;
            line-height: 1.6;
          }
          .features {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 1rem;
            margin-top: 2rem;
          }
          .feature {
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 8px;
            padding: 1rem;
            backdrop-filter: blur(10px);
            transition: all 0.3s ease;
          }
          .feature:hover {
            background: rgba(255, 255, 255, 0.1);
            border-color: rgba(255, 255, 255, 0.2);
            transform: translateY(-2px);
          }
          .feature a {
            font-size: 1rem;
            color: white;
            text-decoration: none;
            display: block;
          }
          .feature.docs {
            background: rgba(225, 29, 72, 0.1);
            border-color: rgba(225, 29, 72, 0.2);
          }
          .feature.docs:hover {
            background: rgba(225, 29, 72, 0.2);
            border-color: rgba(225, 29, 72, 0.3);
          }
        </style>
      </head>
      <body>
        <div class="container">
          <img src="https://static-00.iconduck.com/assets.00/nestjs-icon-2048x2040-39on8772.png" alt="NestJS logo" class="logo" />
          <h1>PNS API Server</h1>
          <p>Restructured with NestJS for enterprise-grade scalability.</p>
          <div class="features">
            <div class="feature docs">
              <a href="/docs" target="_blank" rel="noreferrer">API Documentation</a>
            </div>
            <div class="feature">
              <a href="/health" target="_blank" rel="noreferrer">Health Check</a>
            </div>
            <div class="feature">
              <a href="https://docs.nestjs.com" target="_blank" rel="noreferrer">NestJS Docs</a>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
  }
}
