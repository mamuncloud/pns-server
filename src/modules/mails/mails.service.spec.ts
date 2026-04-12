import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { MailsService } from './mails.service';

// Mock Resend globally
jest.mock('resend', () => {
  return {
    Resend: jest.fn().mockImplementation(() => ({
      emails: {
        send: jest.fn().mockResolvedValue({ data: { id: 'test-id' }, error: null }),
      },
    })),
  };
});

describe('MailsService', () => {
  let service: MailsService;
  let mockSend: jest.Mock;

  beforeEach(async () => {
    // Reset mocks before each test
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MailsService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'RESEND_API_KEY') return 're_test_key';
              if (key === 'MAIL_FROM') return 'test@example.com';
              return null;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<MailsService>(MailsService);

    // Access the send mock from the created instance

    mockSend = service['resend'].emails.send as jest.Mock;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should send a magic link email', async () => {
    const email = 'user@example.com';
    const magicLink = 'http://localhost:3000/verify?token=abc';
    const userName = 'John Doe';

    const result = await service.sendMagicLink(email, magicLink, userName);

    expect(result.success).toBe(true);
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        from: 'test@example.com',
        to: email,
        subject: 'Your Magic Login Link - PNS',
        html: expect.stringContaining(magicLink),
      }),
    );
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        html: expect.stringContaining(userName),
      }),
    );
  });

  it('should handle email sending errors', async () => {
    mockSend.mockResolvedValueOnce({
      data: null,
      error: { message: 'Failed to send' },
    });

    const result = await service.sendMagicLink('test@example.com', 'link', 'name');

    expect(result.success).toBe(false);
    expect(result.error).toEqual({ message: 'Failed to send' });
  });
});
