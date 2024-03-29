import 'reflect-metadata';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import hpp from 'hpp';
import morgan from 'morgan';
import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { NODE_ENV, PORT, LOG_FORMAT, ORIGIN, CREDENTIALS } from '@config';
import { Routes } from '@interfaces/routes.interface';
import { ErrorMiddleware } from '@middlewares/error.middleware';
import { logger, stream } from '@utils/logger';
import https from "https";
import http from "http";
import WebSocket, {WebSocketServer} from "ws";

export class App {
  public app: express.Application;
  public httpServer: http.Server;
  public env: string;
  public port: string | number;
  public wss: WebSocketServer;
  public isAlive = true;


  constructor(routes: Routes[]) {
    this.app = express();
    this.env = NODE_ENV || 'development';
    this.port = PORT || 3000;

    this.initializeMiddlewares();
    this.initializeRoutes(routes);
    this.initializeSwagger();
    this.initializeErrorHandling();
    this.httpServer = http.createServer(this.app);
    this.wss  = new WebSocketServer({ server: this.httpServer });
    this.initializeWSS();
  }

  public listen() {
    this.httpServer.listen(this.port, () => {
      logger.info(`=================================`);
      logger.info(`======= ENV: ${this.env} =======`);
      logger.info(`🚀 App listening on the port ${this.port}`);
      logger.info(`=================================`);
    });
  }

  public getServer() {
    return this.app;
  }

  private initializeMiddlewares() {
    this.app.use(morgan(LOG_FORMAT, { stream }));
    this.app.use(cors({ origin: ORIGIN, credentials: CREDENTIALS }));
    this.app.use(hpp());
    this.app.use(helmet());
    this.app.use(compression());
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
    this.app.use(cookieParser());
  }

  private initializeRoutes(routes: Routes[]) {
    routes.forEach(route => {
      this.app.use('/', route.router);
    });
  }

  private initializeSwagger() {
    const options = {
      swaggerDefinition: {
        info: {
          title: 'REST API',
          version: '1.0.0',
          description: 'Example docs',
        },
      },
      apis: ['swagger.yaml'],
    };

    const specs = swaggerJSDoc(options);
    this.app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));
  }

  private initializeErrorHandling() {
    this.app.use(ErrorMiddleware);
  }

  private initializeWSS() {
    this.wss.on('connection', function connection(ws,req) {
      ws.on('error', console.error);

      ws.on('message', function message(data) {
        console.log({
          msg: `received: ${JSON.parse(data)}`,
          time: Date.now()
        });
        ws.send(JSON.stringify({
          msg: 'server send hello, client!',
          date: Date.now()
        }));
        this.wss.clients.forEach(function each(client) {
          if (client.readyState === WebSocket.OPEN) {
            client.send("broadcast");
          }
        });
      }.bind(this));
      ws.on('pong', this.heartbeat.bind(this));

    }.bind(this));
    const interval = setInterval(function ping() {
      this.wss.clients.forEach(function each(ws) {
        console.log("inside interval isAlive: " + this.isAlive);
        if (this.isAlive === false) return ws.terminate();

        this.isAlive = false;
        ws.ping("ping");
      }.bind(this));
    }.bind(this), 5000);

    this.wss.on('close', function close() {
      console.log({
        msg: 'close called',
        date: Date.now()
      });
      clearInterval(interval);
    });
  };

  private heartbeat() {
    console.log("heartbeat isAlive: " + this.isAlive);
    this.isAlive = true;
  }
}
