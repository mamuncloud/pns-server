import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  WASocket,
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import * as qrcode from 'qrcode-terminal';
import * as path from 'path';
import * as fs from 'fs';
import pino from 'pino';

export enum WhatsappStatus {
  INITIALIZING = 'INITIALIZING',
  QR_READY = 'QR_READY',
  CONNECTED = 'CONNECTED',
  DISCONNECTED = 'DISCONNECTED',
  ERROR = 'ERROR',
}

@Injectable()
export class WhatsappService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WhatsappService.name);
  private sock: WASocket | null = null;
  private status: WhatsappStatus = WhatsappStatus.INITIALIZING;
  private qrCode: string | null = null;
  private sessionDir = path.join(process.cwd(), 'sessions/whatsapp');

  constructor() {
    // Ensure session directory exists
    if (!fs.existsSync(this.sessionDir)) {
      fs.mkdirSync(this.sessionDir, { recursive: true });
    }
  }

  async onModuleInit() {
    await this.connectToWhatsApp();
  }

  onModuleDestroy() {
    if (this.sock) {
      this.sock.ev.removeAllListeners('connection.update');
      this.sock.ev.removeAllListeners('creds.update');
      this.sock.end(undefined);
    }
  }

  private async connectToWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState(this.sessionDir);
    const { version, isLatest } = await fetchLatestBaileysVersion();
    
    this.logger.log(`Using WhatsApp version v${version.join('.')}, isLatest: ${isLatest}`);

    this.sock = makeWASocket({
      version,
      printQRInTerminal: false, // We'll handle it manually for better control
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' })),
      },
      logger: pino({ level: 'silent' }),
    });

    this.sock.ev.on('creds.update', saveCreds);

    this.sock.ev.on('connection.update', (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        this.qrCode = qr;
        this.status = WhatsappStatus.QR_READY;
        this.logger.warn('Scan the QR code below to pair WhatsApp:');
        qrcode.generate(qr, { small: true });
      }

      if (connection === 'close') {
        const shouldReconnect = (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
        this.logger.error(`Connection closed due to ${lastDisconnect?.error}, reconnecting: ${shouldReconnect}`);
        this.status = WhatsappStatus.DISCONNECTED;
        
        if (shouldReconnect) {
          this.connectToWhatsApp();
        } else {
          this.status = WhatsappStatus.ERROR;
          this.logger.error('WhatsApp Session Logged Out. Please delete the session folder and pair again.');
        }
      } else if (connection === 'open') {
        this.logger.log('WhatsApp connection opened successfully!');
        this.status = WhatsappStatus.CONNECTED;
        this.qrCode = null;
      }
    });
  }

  async sendMessage(to: string, text: string) {
    if (this.status !== WhatsappStatus.CONNECTED || !this.sock) {
      throw new Error('WhatsApp is not connected.');
    }

    // Format phone number: remove non-digits, ensure country code
    let jid = to.replace(/\D/g, '');
    if (!jid.startsWith('62') && jid.startsWith('0')) {
      jid = '62' + jid.slice(1);
    } else if (!jid.startsWith('62')) {
      // Assuming Indonesia default if no country code provided and doesn't start with 0
      jid = '62' + jid;
    }
    jid += '@s.whatsapp.net';

    await this.sock.sendMessage(jid, { text });
  }

  getStatus(): WhatsappStatus {
    return this.status;
  }

  getQrCode(): string | null {
    return this.qrCode;
  }

  async logout() {
    if (this.sock) {
      await this.sock.logout();
      this.sock = null;
    }
    this.status = WhatsappStatus.DISCONNECTED;
    
    // Clear session files
    if (fs.existsSync(this.sessionDir)) {
      fs.rmSync(this.sessionDir, { recursive: true, force: true });
      fs.mkdirSync(this.sessionDir, { recursive: true });
    }

    // Explicitly reconnect to get a new QR
    await this.connectToWhatsApp();
  }
}
